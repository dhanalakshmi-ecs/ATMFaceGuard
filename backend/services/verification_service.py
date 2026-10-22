from datetime import datetime, timedelta
import logging
from models import db, User, FaceEnrollment, VerificationLog, SimulatedTransaction
from services.face_service import face_service
from hardware.serial_controller import serial_controller
from utils.validators import decode_base64_image

logger = logging.getLogger(__name__)

class VerificationService:
    """
    Orchestrates biometric face verification, outcome decision making (A, B, C),
    serial transmission to ATmega328P, rate limiting, and verification audit logging.
    """
    def __init__(self):
        # In-memory tracking for rate limiting failed attempts: user_id or ip -> list of timestamps
        self.failed_attempts = {}

    def _is_rate_limited(self, identifier: str, max_attempts: int = 5, window_seconds: int = 600) -> bool:
        """Checks if consecutive failed attempts exceed security threshold."""
        now = datetime.utcnow()
        if identifier not in self.failed_attempts:
            self.failed_attempts[identifier] = []
            return False

        # Prune old timestamps
        cutoff = now - timedelta(seconds=window_seconds)
        self.failed_attempts[identifier] = [t for t in self.failed_attempts[identifier] if t > cutoff]

        return len(self.failed_attempts[identifier]) >= max_attempts

    def _record_failed_attempt(self, identifier: str):
        now = datetime.utcnow()
        if identifier not in self.failed_attempts:
            self.failed_attempts[identifier] = []
        self.failed_attempts[identifier].append(now)

    def _clear_failed_attempts(self, identifier: str):
        if identifier in self.failed_attempts:
            del self.failed_attempts[identifier]

    def verify_customer_face(self, current_user: User, image_data: str, additional_frames: list[str] = None) -> dict:
        """
        Executes complete verification flow for an authenticated customer session.
        Determines outcome A, B, or C, dispatches serial signal to microcontroller,
        and logs the audit record in the database.
        """
        rate_key = f"user_{current_user.id}"
        if self._is_rate_limited(rate_key):
            # Still dispatch 'B' or 'C' and log security lockout
            err_msg = "Too many failed verification attempts. Account verification temporarily locked for 10 minutes."
            serial_res = serial_controller.send_verification_result('B')
            
            log_entry = VerificationLog(
                user_id=current_user.id,
                result_code='B',
                result_description=err_msg,
                similarity_score=0.0,
                serial_port=serial_controller.port,
                serial_delivery_status='delivered' if serial_res.get('delivered') else 'failed',
                failure_reason="RATE_LIMIT_EXCEEDED"
            )
            db.session.add(log_entry)
            db.session.commit()

            return {
                'outcome': 'B',
                'status': 'FAILED',
                'title': 'Verification Locked',
                'message': err_msg,
                'code': 'B',
                'serial_status': serial_res,
                'log_id': log_entry.id,
                'timestamp': log_entry.timestamp.isoformat()
            }

        # Check if user has enrolled their face
        enrollment = FaceEnrollment.query.filter_by(user_id=current_user.id, enrollment_status='enrolled').first()
        if not enrollment:
            serial_res = serial_controller.send_verification_result('C')
            log_entry = VerificationLog(
                user_id=current_user.id,
                result_code='C',
                result_description="User has not completed face biometric enrollment.",
                similarity_score=None,
                serial_port=serial_controller.port,
                serial_delivery_status='delivered' if serial_res.get('delivered') else 'failed',
                failure_reason="NO_ENROLLMENT_FOUND"
            )
            db.session.add(log_entry)
            db.session.commit()

            return {
                'outcome': 'C',
                'status': 'UNAUTHORIZED',
                'title': 'Biometric Profile Missing',
                'message': 'No enrolled face template found for this account. Please complete face enrollment first.',
                'code': 'C',
                'serial_status': serial_res,
                'log_id': log_entry.id,
                'timestamp': log_entry.timestamp.isoformat()
            }

        # 1. Decode primary image
        img, decode_err = decode_base64_image(image_data)
        if img is None:
            serial_res = serial_controller.send_verification_result('C')
            log_entry = VerificationLog(
                user_id=current_user.id,
                result_code='C',
                result_description=f"Corrupted or invalid image frame: {decode_err}",
                similarity_score=None,
                serial_port=serial_controller.port,
                serial_delivery_status='delivered' if serial_res.get('delivered') else 'failed',
                failure_reason="INVALID_IMAGE_PAYLOAD"
            )
            db.session.add(log_entry)
            db.session.commit()

            return {
                'outcome': 'C',
                'status': 'INVALID_FRAME',
                'title': 'Invalid Camera Frame',
                'message': f"Verification could not proceed: {decode_err}",
                'code': 'C',
                'serial_status': serial_res,
                'log_id': log_entry.id,
                'timestamp': log_entry.timestamp.isoformat()
            }

        # 2. Liveness is mandatory before any face embedding is generated.
        if not additional_frames or len(additional_frames) < 2:
            liveness_ok = False
            liveness_msg = "Liveness failed: A complete camera challenge is required."
        else:
            frame_imgs = [img]
            for f_b64 in additional_frames:
                f_dec, decode_err = decode_base64_image(f_b64)
                if f_dec is None:
                    liveness_ok = False
                    liveness_msg = f"Liveness failed: Invalid burst frame ({decode_err})."
                    break
                frame_imgs.append(f_dec)
            else:
                liveness_ok, liveness_msg = face_service.evaluate_liveness(frame_imgs)

        if not liveness_ok:
                self._record_failed_attempt(rate_key)
                serial_res = serial_controller.send_verification_result('C')
                log_entry = VerificationLog(
                    user_id=current_user.id,
                    result_code='C',
                    result_description=f"Liveness check failed: {liveness_msg}",
                    similarity_score=None,
                    serial_port=serial_controller.port,
                    serial_delivery_status='delivered' if serial_res.get('delivered') else 'failed',
                    failure_reason="LIVENESS_CHECK_FAILED"
                )
                db.session.add(log_entry)
                db.session.commit()

                return {
                    'outcome': 'C',
                    'status': 'LIVENESS_FAILED',
                    'title': 'Liveness Verification Failed',
                    'message': liveness_msg,
                    'code': 'C',
                    'serial_status': serial_res,
                    'log_id': log_entry.id,
                    'timestamp': log_entry.timestamp.isoformat()
                }

        # 3. Detect and extract single usable face
        detect_ok, detect_msg, face_crop, meta = face_service.detect_and_extract_face(img)
        if not detect_ok:
            # Outcome C: No usable face, multiple faces, blurry, or poor lighting
            serial_res = serial_controller.send_verification_result('C')
            log_entry = VerificationLog(
                user_id=current_user.id,
                result_code='C',
                result_description=detect_msg,
                similarity_score=None,
                serial_port=serial_controller.port,
                serial_delivery_status='delivered' if serial_res.get('delivered') else 'failed',
                failure_reason="UNUSABLE_FACE_FRAME"
            )
            db.session.add(log_entry)
            db.session.commit()

            return {
                'outcome': 'C',
                'status': 'NO_VALID_FACE',
                'title': 'Face Quality Issue',
                'message': detect_msg,
                'code': 'C',
                'serial_status': serial_res,
                'log_id': log_entry.id,
                'timestamp': log_entry.timestamp.isoformat()
            }

        # 4. Generate 512-dim embedding for the live crop
        try:
            live_embedding = face_service.generate_embedding(face_crop)
        except Exception as e:
            logger.error(f"Embedding computation error: {str(e)}")
            serial_res = serial_controller.send_verification_result('C')
            log_entry = VerificationLog(
                user_id=current_user.id,
                result_code='C',
                result_description=f"Neural network inference error: {str(e)}",
                similarity_score=None,
                serial_port=serial_controller.port,
                serial_delivery_status='delivered' if serial_res.get('delivered') else 'failed',
                failure_reason="EMBEDDING_INFERENCE_ERROR"
            )
            db.session.add(log_entry)
            db.session.commit()

            return {
                'outcome': 'C',
                'status': 'ERROR',
                'title': 'Processing Error',
                'message': 'Failed to extract neural biometric representation.',
                'code': 'C',
                'serial_status': serial_res,
                'log_id': log_entry.id,
                'timestamp': log_entry.timestamp.isoformat()
            }

        # 5. Retrieve enrolled template and compare similarity
        enrolled_embedding = enrollment.get_embedding()
        similarity = face_service.compute_similarity(live_embedding, enrolled_embedding)
        threshold = face_service.similarity_threshold

        logger.info(f"Verification score for user {current_user.id} ({current_user.username}): {similarity:.4f} vs threshold {threshold:.4f}")

        # 6. Authorization is account-scoped: a face enrolled on another
        # account must never authorize the currently signed-in account.
        matched_current_user = similarity >= threshold and current_user.is_active
        outcome_code = getattr(enrollment, 'assigned_code', 'A') or 'A'

        logger.info(
            f"Biometric matching decision: similarity={similarity:.4f}, "
            f"threshold={threshold:.4f}, current_user_matched={matched_current_user}"
        )

        if matched_current_user:
            # === CURRENT ACCOUNT FACE (CODE A or B) ===
            outcome_code = outcome_code if outcome_code in ('A', 'B') else 'A'
            self._clear_failed_attempts(rate_key)
            serial_res = serial_controller.send_verification_result(outcome_code)

            log_entry = VerificationLog(
                user_id=current_user.id,
                result_code=outcome_code,
                result_description=f"Authorized face for current account ({current_user.full_name}). Score: {similarity*100:.1f}%.",
                similarity_score=similarity,
                serial_port=serial_controller.port,
                serial_delivery_status='delivered' if serial_res.get('delivered') else 'failed',
                failure_reason=None
            )
            
            # Log simulated transaction record
            txn = SimulatedTransaction(
                user_id=current_user.id,
                transaction_type="ATM_VERIFICATION",
                amount=0.0,
                status="COMPLETED",
                description=f"ATM Face Verification - Outcome {outcome_code} (Current Account: {current_user.full_name})"
            )
            db.session.add(log_entry)
            db.session.add(txn)
            db.session.commit()

            return {
                'outcome': outcome_code,
                'status': 'AUTHORIZED',
                'title': f'Access Authorized - Face {outcome_code}',
                'message': f'Identity confirmed for {current_user.full_name}. ATM access granted.',
                'code': outcome_code,
                'similarity_score': round(similarity * 100, 1),
                'threshold': round(threshold * 100, 1),
                'verified_user': {
                    'customer_id': current_user.customer_id,
                    'full_name': current_user.full_name,
                    'masked_account': current_user.masked_account_number,
                    'account_type': current_user.account_type,
                    'balance': current_user.simulated_balance
                },
                'timestamp': log_entry.timestamp.isoformat(),
                'serial_status': serial_res,
                'log_id': log_entry.id
            }

        else:
            # === OUTCOME C: UNAUTHORIZED / UNKNOWN FACE / MISMATCH ===
            self._record_failed_attempt(rate_key)
            serial_res = serial_controller.send_verification_result('C')

            log_entry = VerificationLog(
                user_id=current_user.id,
                result_code='C',
                result_description=f"Unauthorized: Face does not match the current account (Score: {similarity:.4f} < {threshold:.4f}).",
                similarity_score=similarity,
                serial_port=serial_controller.port,
                serial_delivery_status='delivered' if serial_res.get('delivered') else 'failed',
                failure_reason="UNAUTHORIZED_CURRENT_ACCOUNT_MISMATCH"
            )
            db.session.add(log_entry)
            db.session.commit()

            # NEVER reveal private customer data for unauthorized faces
            return {
                'outcome': 'C',
                'status': 'DENIED',
                'title': 'Unauthorized Face',
                'message': 'Biometric verification failed: This face is not enrolled for the current account. Access denied.',
                'code': 'C',
                'similarity_score': round(similarity * 100, 1),
                'threshold': round(threshold * 100, 1),
                'serial_status': serial_res,
                'log_id': log_entry.id,
                'timestamp': log_entry.timestamp.isoformat()
            }

# Global singleton
verification_service = VerificationService()
