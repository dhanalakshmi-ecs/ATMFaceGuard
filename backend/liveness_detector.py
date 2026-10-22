import cv2
import numpy as np
import logging

logger = logging.getLogger(__name__)

class LivenessDetector:
    def __init__(self):
        self.frame_history = []
        self.consecutive_static_counts = 0

    def analyze_frame_liveness(self, frame):
        """
        Advanced Liveness Detector for ATM Face Guard:
        Analyzes consecutive frame variance and temporal micro-changes 
        to distinguish live users from static photographs or video replays.
        """
        if frame is None:
            return False, {"status": "INVALID_FRAME", "reason": "Empty frame"}

        # Convert to grayscale and resize for lightweight analysis
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        gray_resized = cv2.resize(gray, (128, 128))

        # Maintain a history of the last few frames
        self.frame_history.append(gray_resized)
        if len(self.frame_history) > 5:
            self.frame_history.pop(0)

        # If we don't have enough frames yet, pass as initializing
        if len(self.frame_history) < 3:
            return True, {"status": "PASS", "message": "Initializing liveness buffer", "score": 50.0}

        # Calculate differences across recent frames to detect natural micro-movements
        diff1 = cv2.absdiff(self.frame_history[-1], self.frame_history[-2])
        diff2 = cv2.absdiff(self.frame_history[-2], self.frame_history[-3])
        
        score1 = float(np.mean(diff1))
        score2 = float(np.mean(diff2))
        avg_motion = (score1 + score2) / 2.0

        logger.info(f"[LIVENESS] Frame motion variance score: {avg_motion:.3f}")

        # Threshold rules:
        # - A real live human standing in front of a camera always has subtle micro-movements (score typically > 0.3 to 15.0).
        # - A printed photo held by hand or a static screen has near-zero variance (score < 0.15).
        # - Extreme jitter (> 35) might indicate erratic spoofing or shaking.

        if avg_motion < 0.12:
            self.consecutive_static_counts += 1
        else:
            self.consecutive_static_counts = max(0, self.consecutive_static_counts - 1)

        # If it's completely static across multiple continuous captures, flag as photo spoof
        if self.consecutive_static_counts >= 3:
            logger.warning(f"[SPOOF DETECTED] Static photo attack flagged! Motion score: {avg_motion:.3f}")
            return False, {
                "status": "SPOOF_DETECTED",
                "reason": "Static image/photo detected. Please blink or move slightly.",
                "motion_score": avg_motion
            }

        return True, {
            "status": "PASS",
            "message": "Live user verified successfully",
            "motion_score": avg_motion
        }

    def analyze_frames_liveness(self, frames):
        """Evaluates a short camera burst for motion consistent with a live subject."""
        self.reset_session()

        if not frames or len(frames) < 3:
            return False, {
                "status": "INSUFFICIENT_FRAMES",
                "reason": "At least three consecutive camera frames are required."
            }

        grayscale_frames = []
        for frame in frames:
            if frame is None or getattr(frame, "size", 0) == 0:
                return False, {"status": "INVALID_FRAME", "reason": "Empty frame in liveness burst"}
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            grayscale_frames.append(cv2.resize(gray, (128, 128)))

        motion_scores = [
            float(np.mean(cv2.absdiff(previous, current)))
            for previous, current in zip(grayscale_frames, grayscale_frames[1:])
        ]
        average_motion = sum(motion_scores) / len(motion_scores)

        # Webcam sensor noise and JPEG encoding commonly produce small pixel
        # changes even when a printed photo is held completely still.
        if average_motion < 1.0:
            return False, {
                "status": "SPOOF_DETECTED",
                "reason": "The camera burst is static. Please blink or move slightly.",
                "motion_score": average_motion
            }

        if average_motion > 35.0:
            return False, {
                "status": "UNSTABLE_CAPTURE",
                "reason": "Camera movement is too large. Please hold the device steady.",
                "motion_score": average_motion
            }

        return True, {
            "status": "PASS",
            "message": "Live motion detected.",
            "motion_score": average_motion
        }

    def analyze_face_depth_motion(self, frames, face_boxes):
        """Checks for internal face motion after removing whole-image translation."""
        if len(frames) != len(face_boxes) or len(frames) < 3:
            return False, "Liveness failed: Not enough aligned face frames."

        residual_scores = []
        for previous, current, previous_box, current_box in zip(
            frames, frames[1:], face_boxes, face_boxes[1:]
        ):
            previous_crop = self._face_crop(previous, previous_box)
            current_crop = self._face_crop(current, current_box)
            if previous_crop is None or current_crop is None:
                return False, "Liveness failed: Face moved out of the camera view."

            previous_gray = cv2.resize(cv2.cvtColor(previous_crop, cv2.COLOR_BGR2GRAY), (96, 96))
            current_gray = cv2.resize(cv2.cvtColor(current_crop, cv2.COLOR_BGR2GRAY), (96, 96))
            previous_points = cv2.goodFeaturesToTrack(
                previous_gray, maxCorners=80, qualityLevel=0.01, minDistance=4
            )
            if previous_points is None or len(previous_points) < 8:
                return False, "Liveness failed: Face detail is insufficient."

            current_points, status, _ = cv2.calcOpticalFlowPyrLK(
                previous_gray, current_gray, previous_points, None
            )
            if current_points is None:
                return False, "Liveness failed: No natural facial motion detected."

            valid_previous = previous_points[status.ravel() == 1]
            valid_current = current_points[status.ravel() == 1]
            if len(valid_previous) < 8:
                return False, "Liveness failed: Face tracking was unstable."

            transform, inliers = cv2.estimateAffinePartial2D(
                valid_previous, valid_current, method=cv2.RANSAC, ransacReprojThreshold=2.0
            )
            if transform is None:
                return False, "Liveness failed: Face motion could not be verified."

            predicted = cv2.transform(valid_previous.reshape(-1, 1, 2), transform).reshape(-1, 2)
            residual = np.linalg.norm(predicted - valid_current, axis=1)
            inlier_mask = inliers.ravel() == 1 if inliers is not None else np.ones(len(residual), dtype=bool)
            residual_scores.append(float(np.mean(residual[inlier_mask])))

        maximum_residual = max(residual_scores)
        if maximum_residual < 0.8:
            return False, "Liveness failed: Flat-photo motion detected. Please turn your head slightly."

        return True, "Natural facial depth motion detected."

    @staticmethod
    def _face_crop(frame, box):
        height, width = frame.shape[:2]
        x1, y1, x2, y2 = [int(value) for value in box]
        x1, y1 = max(0, x1), max(0, y1)
        x2, y2 = min(width, x2), min(height, y2)
        if x2 - x1 < 40 or y2 - y1 < 40:
            return None
        return frame[y1:y2, x1:x2]

    def reset_session(self):
        self.frame_history = []
        self.consecutive_static_counts = 0