from flask import Blueprint, request, jsonify
from models import db, FaceEnrollment
from services.face_service import face_service
from utils.security import token_required
from utils.validators import decode_base64_image
import numpy as np
import logging

logger = logging.getLogger(__name__)
face_bp = Blueprint('face_bp', __name__, url_prefix='/api/face')

@face_bp.route('/enroll', methods=['POST'])
@token_required
def enroll_face(current_user):
    data = request.get_json(silent=True) or {}
    
    # Check if user already has active enrollment
    existing = FaceEnrollment.query.filter_by(user_id=current_user.id, enrollment_status='enrolled').first()
    if existing:
        return jsonify({
            'success': False,
            'message': 'Face is already enrolled for this account. Use the re-enrollment endpoint with password confirmation to update.'
        }), 400

    # Accept either an array of images (multiple angles) or a single image
    images_b64 = data.get('images', [])
    if not images_b64 and data.get('image'):
        images_b64 = [data['image']]

    if not images_b64 or len(images_b64) == 0:
        return jsonify({'success': False, 'message': 'At least one face image is required for enrollment.'}), 400

    embeddings = []
    quality_scores = []
    rejection_reasons = []

    for idx, img_b64 in enumerate(images_b64):
        img_bgr, decode_err = decode_base64_image(img_b64)
        if img_bgr is None:
            rejection_reasons.append(f"Sample {idx+1}: {decode_err}")
            continue

        ok, msg, face_crop, meta = face_service.detect_and_extract_face(img_bgr)
        if not ok:
            rejection_reasons.append(f"Sample {idx+1}: {msg}")
            continue

        emb = face_service.generate_embedding(face_crop)
        embeddings.append(emb)
        quality_scores.append(meta.get('sharpness', 100.0))

    if len(embeddings) == 0:
        return jsonify({
            'success': False,
            'message': 'Face enrollment failed. None of the provided samples met quality standards.',
            'errors': rejection_reasons
        }), 422

    # Average and L2-normalize the gathered embeddings across captured angles
    avg_embedding = np.mean(embeddings, axis=0)
    norm = np.linalg.norm(avg_embedding)
    if norm > 1e-6:
        avg_embedding = avg_embedding / norm

    avg_quality = float(np.mean(quality_scores)) if quality_scores else 1.0

    enrollment = FaceEnrollment(user_id=current_user.id)
    enrollment.set_embedding(avg_embedding, num_samples=len(embeddings), quality=avg_quality)
    
    db.session.add(enrollment)
    db.session.commit()

    return jsonify({
        'success': True,
        'message': f'Face enrolled successfully with {len(embeddings)} sample(s).',
        'data': enrollment.to_dict()
    }), 201

@face_bp.route('/enrollment-status', methods=['GET'])
@token_required
def get_enrollment_status(current_user):
    enrollment = FaceEnrollment.query.filter_by(user_id=current_user.id).first()
    if not enrollment or enrollment.enrollment_status != 'enrolled':
        return jsonify({
            'success': True,
            'is_enrolled': False,
            'message': 'No active biometric enrollment found.'
        }), 200

    return jsonify({
        'success': True,
        'is_enrolled': True,
        'data': enrollment.to_dict()
    }), 200

@face_bp.route('/re-enroll', methods=['POST'])
@token_required
def re_enroll_face(current_user):
    data = request.get_json(silent=True) or {}
    password = data.get('password', '')

    # Enforce security verification before allowing biometric re-enrollment
    if not current_user.check_password(password):
        return jsonify({
            'success': False,
            'message': 'Authorization failed: Invalid password. Current account password required to re-enroll face biometrics.'
        }), 403

    images_b64 = data.get('images', [])
    if not images_b64 and data.get('image'):
        images_b64 = [data['image']]

    if not images_b64:
        return jsonify({'success': False, 'message': 'New face images are required for re-enrollment.'}), 400

    embeddings = []
    quality_scores = []
    rejection_reasons = []

    for idx, img_b64 in enumerate(images_b64):
        img_bgr, decode_err = decode_base64_image(img_b64)
        if img_bgr is None:
            rejection_reasons.append(f"Sample {idx+1}: {decode_err}")
            continue

        ok, msg, face_crop, meta = face_service.detect_and_extract_face(img_bgr)
        if not ok:
            rejection_reasons.append(f"Sample {idx+1}: {msg}")
            continue

        emb = face_service.generate_embedding(face_crop)
        embeddings.append(emb)
        quality_scores.append(meta.get('sharpness', 100.0))

    if len(embeddings) == 0:
        return jsonify({
            'success': False,
            'message': 'Re-enrollment failed: None of the captured samples met quality criteria.',
            'errors': rejection_reasons
        }), 422

    avg_embedding = np.mean(embeddings, axis=0)
    norm = np.linalg.norm(avg_embedding)
    if norm > 1e-6:
        avg_embedding = avg_embedding / norm

    enrollment = FaceEnrollment.query.filter_by(user_id=current_user.id).first()
    if not enrollment:
        enrollment = FaceEnrollment(user_id=current_user.id)
        db.session.add(enrollment)

    enrollment.set_embedding(avg_embedding, num_samples=len(embeddings), quality=float(np.mean(quality_scores)))
    db.session.commit()

    return jsonify({
        'success': True,
        'message': f'Face re-enrolled successfully with {len(embeddings)} new sample(s).',
        'data': enrollment.to_dict()
    }), 200
