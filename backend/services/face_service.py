import cv2
import numpy as np
import torch
from facenet_pytorch import MTCNN, InceptionResnetV1
from PIL import Image
import logging
from liveness_detector import LivenessDetector

logger = logging.getLogger(__name__)

class FaceService:
    """
    Computer vision and deep learning service for face detection, image quality
    assessment, liveness heuristic checks, and 512-dim embedding extraction using FaceNet.
    """
    def __init__(self, similarity_threshold: float = 0.65, blur_threshold: float = 40.0):
        self.device = torch.device('cuda:0' if torch.cuda.is_available() else 'cpu')
        self.similarity_threshold = similarity_threshold
        self.blur_threshold = blur_threshold

        logger.info(f"Initializing MTCNN and FaceNet on device: {self.device}")
        
        # MTCNN for robust face detection, bounding box extraction, and multi-face counting
        self.detector = MTCNN(
            image_size=160,
            margin=14,
            min_face_size=40,
            thresholds=[0.6, 0.7, 0.7],
            factor=0.709,
            post_process=True,
            keep_all=True,
            device=self.device
        )

        # InceptionResnetV1 pre-trained on VGGFace2 for 512-dim face representation
        self.resnet = InceptionResnetV1(pretrained='vggface2').eval().to(self.device)
        logger.info("Face recognition models loaded successfully.")

    def assess_image_quality(self, img_bgr: np.ndarray) -> tuple[bool, str, float]:
        """
        Assesses image quality:
        - Resolution / size
        - Blurriness using Laplacian variance
        - Brightness / illumination levels
        """
        if img_bgr is None or img_bgr.size == 0:
            return False, "Empty or corrupted image frame.", 0.0

        h, w = img_bgr.shape[:2]
        if h < 120 or w < 120:
            return False, f"Image resolution ({w}x{h}) is too low for reliable biometric verification.", 0.0

        # Convert to grayscale for blurriness and brightness evaluation
        gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)

        # Laplacian variance check for blurriness
        laplacian_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())
        if laplacian_var < self.blur_threshold:
            return False, f"Image is too blurry (sharpness score: {laplacian_var:.1f}, minimum required: {self.blur_threshold}). Please hold still.", laplacian_var

        # Brightness check
        mean_brightness = float(np.mean(gray))
        if mean_brightness < 30:
            return False, "Lighting is too dark. Please ensure sufficient ambient light.", laplacian_var
        if mean_brightness > 235:
            return False, "Lighting is overexposed or washed out. Please adjust ambient light.", laplacian_var

        return True, "Quality acceptable", laplacian_var

    def detect_and_extract_face(self, img_bgr: np.ndarray) -> tuple[bool, str, np.ndarray | None, dict | None]:
        """
        Detects faces in frame.
        Rules:
        - Exactly ONE face must be present.
        - Zero faces -> reject (Outcome C)
        - >1 faces -> reject (Outcome C)
        - Blurry / bad lighting -> reject (Outcome C)
        Returns: (success, reason_or_status, face_crop_bgr, face_metadata)
        """
        # Quality check
        qual_ok, qual_msg, sharpness = self.assess_image_quality(img_bgr)
        if not qual_ok:
            return False, qual_msg, None, None

        # Convert BGR to RGB for PIL & MTCNN
        img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
        pil_img = Image.fromarray(img_rgb)

        try:
            boxes, probs, landmarks = self.detector.detect(pil_img, landmarks=True)
        except Exception as e:
            logger.error(f"MTCNN detection error: {str(e)}")
            return False, f"Face detection algorithm error: {str(e)}", None, None

        if boxes is None or len(boxes) == 0:
            return False, "No face detected in the camera frame. Please center your face inside the guide.", None, None

        # Filter boxes by detection confidence >= 0.70
        valid_indices = [i for i, p in enumerate(probs) if p is not None and p >= 0.70]
        if len(valid_indices) == 0:
            return False, "Face detected with insufficient confidence. Please look directly at the camera.", None, None

        if len(valid_indices) > 1:
            return False, f"Multiple faces ({len(valid_indices)}) detected. ATM security requires exactly one individual.", None, None

        idx = valid_indices[0]
        box = boxes[idx].astype(int)
        conf = float(probs[idx])
        lms = landmarks[idx].tolist() if landmarks is not None else []

        h, w = img_bgr.shape[:2]
        # Clamp bounding box coordinates
        x1 = max(0, box[0])
        y1 = max(0, box[1])
        x2 = min(w, box[2])
        y2 = min(h, box[3])

        face_w = x2 - x1
        face_h = y2 - y1

        if face_w < 60 or face_h < 60:
            return False, "Face is too small or too far from the camera. Please move closer.", None, None

        # Extract aligned face crop
        face_crop = img_bgr[y1:y2, x1:x2]

        metadata = {
            'bbox': [int(x1), int(y1), int(face_w), int(face_h)],
            'confidence': round(conf, 3),
            'sharpness': round(sharpness, 1),
            'landmarks': lms
        }

        return True, "Face detected successfully.", face_crop, metadata

    def generate_embedding(self, face_bgr: np.ndarray) -> np.ndarray:
        """
        Takes a cropped face image, resizes to 160x160, normalizes,
        and computes the 512-dimensional FaceNet embedding.
        """
        # Resize to 160x160
        resized = cv2.resize(face_bgr, (160, 160))
        rgb = cv2.cvtColor(resized, cv2.COLOR_BGR2RGB)
        
        # Standardize: (x - 127.5) / 128.0
        tensor = torch.tensor(rgb, dtype=torch.float32).permute(2, 0, 1).unsqueeze(0)
        tensor = (tensor - 127.5) / 128.0
        tensor = tensor.to(self.device)

        with torch.no_grad():
            embedding = self.resnet(tensor).cpu().numpy().flatten()

        # L2-normalize
        norm = np.linalg.norm(embedding)
        if norm > 1e-6:
            embedding = embedding / norm

        return embedding

    def compute_similarity(self, embedding1: np.ndarray, embedding2: np.ndarray) -> float:
        """
        Computes cosine similarity between two unit-normalized 512-dim face embeddings.
        Returns score clamped to [0.0, 1.0].
        """
        if embedding1 is None or embedding2 is None:
            return 0.0
        e1 = np.array(embedding1, dtype=np.float32).flatten()
        e2 = np.array(embedding2, dtype=np.float32).flatten()
        
        # Guard against zero vectors
        n1 = np.linalg.norm(e1)
        n2 = np.linalg.norm(e2)
        if n1 < 1e-6 or n2 < 1e-6:
            return 0.0

        sim = float(np.dot(e1, e2) / (n1 * n2))
        return max(0.0, min(1.0, sim))

    def evaluate_liveness(self, frames: list[np.ndarray]) -> tuple[bool, str]:
        """
        Evaluates basic motion/liveness consistency across a burst of frames.
        
        DISCLAIMER & SECURITY NOTICE:
        Basic software liveness heuristics (micro-movement and structural frame variance)
        provide basic defense against simple static print-outs. However, they CAN be spoofed
        by pre-recorded video loops or synthetic deepfakes and DO NOT equal production-grade
        hardware liveness systems (e.g. 3D structured light, IR stereo depth sensors).
        """
        detector = LivenessDetector()
        liveness_ok, details = detector.analyze_frames_liveness(frames)
        if not liveness_ok:
            return False, f"Liveness failed: {details.get('reason', 'Camera burst rejected.')}"

        # A still photo can be moved to create pixel motion. Require the face
        # geometry itself to change, which happens when a live user turns their
        # head but not when a flat photo is translated in front of the camera.
        normalized_landmarks = []
        face_boxes = []
        yaw_values = []
        for frame in frames:
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            boxes, _, landmarks = self.detector.detect(Image.fromarray(rgb_frame), landmarks=True)
            if boxes is None or landmarks is None or len(boxes) != 1:
                return False, "Liveness failed: Keep one face visible and turn your head slightly."

            x1, y1, x2, y2 = boxes[0]
            face_boxes.append((x1, y1, x2, y2))
            face_width = max(float(x2 - x1), 1.0)
            face_height = max(float(y2 - y1), 1.0)
            points = np.asarray(landmarks[0], dtype=np.float32)
            eye_distance = max(float(np.linalg.norm(points[1] - points[0])), 1.0)
            nose_position = (points[2, 0] - points[0, 0]) / eye_distance
            yaw_values.append(float(nose_position))
            points[:, 0] = (points[:, 0] - x1) / face_width
            points[:, 1] = (points[:, 1] - y1) / face_height
            normalized_landmarks.append(points.flatten())

        landmark_variation = float(np.mean(np.std(normalized_landmarks, axis=0)))

        # Require a meaningful change in head orientation, not just detector
        # jitter. The UI asks for a left/right turn during the capture burst.
        yaw_range = max(yaw_values) - min(yaw_values)
        logger.info(
            "[LIVENESS CHALLENGE] yaw_range=%.4f landmark_variation=%.4f",
            yaw_range,
            landmark_variation,
        )
        # Landmark jitter alone is not sufficient: JPEG noise and detector
        # variation can make a flat photo appear to move. Require a real
        # change in head orientation during the user-directed challenge.
        if yaw_range < 0.08:
            return False, "Liveness failed: Head-turn challenge was not completed. Turn left, then right."

        depth_ok, depth_message = detector.analyze_face_depth_motion(frames, face_boxes)
        # Landmark yaw is the primary challenge. Optical-flow depth motion is
        # useful as a fallback, but can be noisy for a real face in low light.
        if not depth_ok:
            return False, depth_message

        return True, details.get('message', 'Basic liveness validated.')

# Global singleton
face_service = FaceService()
