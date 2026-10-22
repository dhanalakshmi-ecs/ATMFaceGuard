from flask import Blueprint, request, jsonify
from models import db, VerificationLog, FaceEnrollment
from services.verification_service import verification_service
from services.face_service import face_service
from hardware.serial_controller import serial_controller
from utils.security import token_required
from utils.validators import decode_base64_image
import cv2
import logging

logger = logging.getLogger(__name__)
verification_bp = Blueprint('verification_bp', __name__, url_prefix='/api/verification')

@verification_bp.route('/start', methods=['POST'])
@token_required
def start_verification_session(current_user):
    """
    Initializes a fresh ATM verification session.
    Verifies user status and biometric enrollment presence.
    """
    if not current_user.is_active:
        return jsonify({
            'success': False,
            'message': 'Account is deactivated. ATM verification unavailable.'
        }), 403

    enrollment = FaceEnrollment.query.filter_by(user_id=current_user.id, enrollment_status='enrolled').first()
    has_enrollment = enrollment is not None

    return jsonify({
        'success': True,
        'session_ready': True,
        'user': {
            'customer_id': current_user.customer_id,
            'has_enrollment': has_enrollment,
            'account_type': current_user.account_type
        },
        'hardware_status': serial_controller.get_status(),
        'instructions': 'Position your face directly in the camera view box in good lighting.'
    }), 200

@verification_bp.route('/submit', methods=['POST'])
@token_required
def submit_verification_frame(current_user):
    """
    Receives camera frame, checks liveness/texture anti-spoofing first,
    conducts AI face detection & FaceNet embedding comparison,
    determines outcome A, B, or C, and dispatches the serial command to ATmega.
    """
    data = request.get_json(silent=True) or {}
    image_data = data.get('image', '')
    additional_frames = data.get('frames', [])

    if not image_data:
        return jsonify({
            'success': False,
            'message': 'No image data provided for verification.'
        }), 400

    if not isinstance(additional_frames, list) or len(additional_frames) < 2:
        return jsonify({
            'success': False,
            'message': 'At least three consecutive camera frames are required for liveness detection.'
        }), 400

    # 1. Decode base64 image from web dashboard webcam stream
    img_bgr, decode_err = decode_base64_image(image_data)
    if img_bgr is None:
        return jsonify({
            'success': False,
            'message': f'Image decode error: {decode_err}'
        }), 400

    # The verification service performs the mandatory multi-frame liveness
    # challenge and the normal image-quality checks. Avoid a second strict
    # single-frame threshold here because lighting can make a real face appear
    # slightly below that cutoff.
    result = verification_service.verify_customer_face(
        current_user=current_user,
        image_data=image_data,
        additional_frames=additional_frames
    )
    result['liveness_gate'] = 'enforced-v4'

    return jsonify({
        'success': True,
        'data': result
    }), 200

@verification_bp.route('/history', methods=['GET'])
@token_required
def get_user_verification_history(current_user):
    """Retrieves chronological verification audit history for the active user."""
    limit = request.args.get('limit', 20, type=int)
    logs = VerificationLog.query.filter_by(user_id=current_user.id)\
        .order_by(VerificationLog.timestamp.desc())\
        .limit(min(limit, 100))\
        .all()

    return jsonify({
        'success': True,
        'count': len(logs),
        'data': [l.to_dict(is_admin=False) for l in logs]
    }), 200

@verification_bp.route('/status', methods=['GET'])
def get_verification_status():
    """Returns general ATM verification subsystem configuration and threshold."""
    return jsonify({
        'success': True,
        'threshold': face_service.similarity_threshold,
        'blur_threshold': face_service.blur_threshold,
        'hardware': serial_controller.get_status()
    }), 200