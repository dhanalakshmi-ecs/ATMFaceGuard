from flask import Blueprint, request, jsonify
from models import db, User, VerificationLog, FaceEnrollment
from utils.security import admin_required
from hardware.serial_controller import serial_controller
from services.face_service import face_service

admin_bp = Blueprint('admin_bp', __name__, url_prefix='/api/admin')

@admin_bp.route('/dashboard-stats', methods=['GET'])
@admin_required
def get_dashboard_stats(admin_user):
    """Calculates administrative system KPIs."""
    total_users = User.query.filter_by(role='customer').count()
    total_enrolled = FaceEnrollment.query.filter_by(enrollment_status='enrolled').count()
    
    total_verifications = VerificationLog.query.count()
    count_a = VerificationLog.query.filter_by(result_code='A').count()
    count_b = VerificationLog.query.filter_by(result_code='B').count()
    count_c = VerificationLog.query.filter_by(result_code='C').count()

    # Success rate
    success_rate = round((count_a / total_verifications * 100), 1) if total_verifications > 0 else 0.0

    return jsonify({
        'success': True,
        'data': {
            'total_customers': total_users,
            'total_enrolled_faces': total_enrolled,
            'total_verifications': total_verifications,
            'outcomes': {
                'authorized_A': count_a,
                'failed_B': count_b,
                'unusable_C': count_c
            },
            'success_rate_percent': success_rate,
            'current_threshold': face_service.similarity_threshold,
            'hardware': serial_controller.get_status()
        }
    }), 200

@admin_bp.route('/users', methods=['GET'])
@admin_required
def get_all_users(admin_user):
    """Returns list of registered users for administrator audit."""
    users = User.query.order_by(User.created_at.desc()).all()
    return jsonify({
        'success': True,
        'count': len(users),
        'data': [u.to_dict(include_sensitive=False) for u in users]
    }), 200

@admin_bp.route('/verification-logs', methods=['GET'])
@admin_required
def get_all_verification_logs(admin_user):
    """Returns full audit trail of verification logs with outcome breakdown."""
    limit = request.args.get('limit', 100, type=int)
    outcome_filter = request.args.get('outcome', None)

    query = VerificationLog.query
    if outcome_filter and outcome_filter.upper() in ('A', 'B', 'C'):
        query = query.filter_by(result_code=outcome_filter.upper())

    logs = query.order_by(VerificationLog.timestamp.desc()).limit(min(limit, 500)).all()

    return jsonify({
        'success': True,
        'count': len(logs),
        'data': [l.to_dict(is_admin=True) for l in logs]
    }), 200

@admin_bp.route('/user/<int:user_id>/toggle-status', methods=['POST'])
@admin_required
def toggle_user_status(admin_user, user_id):
    """Enables or disables a customer account."""
    target_user = db.session.get(User, user_id)
    if not target_user:
        return jsonify({'success': False, 'message': 'User not found.'}), 404

    if target_user.id == admin_user.id:
        return jsonify({'success': False, 'message': 'Cannot deactivate own administrator account.'}), 400

    target_user.is_active = not target_user.is_active
    db.session.commit()

    action = "activated" if target_user.is_active else "deactivated"
    return jsonify({
        'success': True,
        'message': f"Customer account {target_user.customer_id} has been {action}.",
        'user': target_user.to_dict()
    }), 200

@admin_bp.route('/threshold', methods=['PUT'])
@admin_required
def update_threshold(admin_user):
    """Updates active biometric face matching similarity threshold."""
    data = request.get_json(silent=True) or {}
    new_threshold = data.get('threshold')

    if new_threshold is None:
        return jsonify({'success': False, 'message': 'Threshold value required.'}), 400

    try:
        val = float(new_threshold)
        if not (0.3 <= val <= 0.95):
            return jsonify({'success': False, 'message': 'Threshold must be between 0.30 and 0.95.'}), 400
        face_service.similarity_threshold = val
        return jsonify({
            'success': True,
            'message': f"Face recognition threshold updated to {val:.2f}.",
            'threshold': val
        }), 200
    except ValueError:
        return jsonify({'success': False, 'message': 'Invalid numerical threshold value.'}), 400
