from flask import Blueprint, request, jsonify
from services.auth_service import AuthService
from utils.security import token_required

auth_bp = Blueprint('auth_bp', __name__, url_prefix='/api/auth')

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json(silent=True) or {}
    success, message, result = AuthService.register_user(data)
    if not success:
        return jsonify({'success': False, 'message': message}), 400
    return jsonify({
        'success': True,
        'message': message,
        'data': result
    }), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json(silent=True) or {}
    identifier = data.get('username') or data.get('email', '')
    password = data.get('password', '')

    success, message, result = AuthService.authenticate_user(identifier, password)
    if not success:
        return jsonify({'success': False, 'message': message}), 401
    return jsonify({
        'success': True,
        'message': message,
        'data': result
    }), 200

@auth_bp.route('/logout', methods=['POST'])
@token_required
def logout(current_user):
    # Stateless JWT - frontend clears token; endpoint confirms session closure
    return jsonify({
        'success': True,
        'message': 'Successfully logged out.'
    }), 200

@auth_bp.route('/me', methods=['GET'])
@token_required
def get_current_user_profile(current_user):
    return jsonify({
        'success': True,
        'data': {
            'user': current_user.to_dict()
        }
    }), 200
