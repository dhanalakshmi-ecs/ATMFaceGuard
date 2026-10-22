import jwt
from datetime import datetime, timedelta
from functools import wraps
from flask import request, jsonify, current_app
import random
import string
import re
from models.user import User

def generate_customer_id() -> str:
    """Generates unique synthetic ATM customer identifier, e.g. ATM-782914."""
    digits = ''.join(random.choices(string.digits, k=6))
    return f"ATM-{digits}"

def generate_account_number() -> str:
    """Generates synthetic 16-digit bank account number formatted in 4-digit groups."""
    p1 = "4532"  # Standard test bin
    p2 = ''.join(random.choices(string.digits, k=4))
    p3 = ''.join(random.choices(string.digits, k=4))
    p4 = ''.join(random.choices(string.digits, k=4))
    return f"{p1}-{p2}-{p3}-{p4}"

def mask_account_number(account_no: str) -> str:
    """Returns safe masked account number like ****-****-****-1234."""
    if not account_no:
        return "N/A"
    clean = re.sub(r'[^0-9]', '', account_no)
    if len(clean) >= 4:
        return f"****-****-****-{clean[-4:]}"
    return "****-****-****-0000"

def generate_token(user_id: int, role: str, expires_in_hours: int = 4) -> str:
    """Encodes JWT bearer authentication token."""
    secret = current_app.config.get('JWT_SECRET_KEY', 'jwt-super-secret-key-atm-2026')
    payload = {
        'sub': str(user_id),
        'role': role,
        'iat': datetime.utcnow(),
        'exp': datetime.utcnow() + timedelta(hours=expires_in_hours)
    }
    return jwt.encode(payload, secret, algorithm='HS256')

def decode_token(token: str) -> dict:
    """Decodes and validates JWT bearer token."""
    secret = current_app.config.get('JWT_SECRET_KEY', 'jwt-super-secret-key-atm-2026')
    try:
        payload = jwt.decode(token, secret, algorithms=['HS256'])
        return payload
    except jwt.ExpiredSignatureError:
        return {'error': 'Session token has expired. Please sign in again.'}
    except jwt.InvalidTokenError as e:
        return {'error': f'Invalid authentication token: {str(e)}'}

def get_current_user_from_request():
    """Extracts bearer token from request header and returns User or None."""
    auth_header = request.headers.get('Authorization', None)
    if not auth_header:
        return None, ('Missing Authorization header', 401)
    
    parts = auth_header.split()
    if len(parts) != 2 or parts[0].lower() != 'bearer':
        return None, ('Invalid Authorization header format. Must be Bearer <token>', 401)
    
    token = parts[1]
    decoded = decode_token(token)
    if 'error' in decoded:
        return None, (decoded['error'], 401)
    
    sub = decoded.get('sub')
    try:
        user_id = int(sub)
    except (TypeError, ValueError):
        return None, ('Malformed token subject', 401)

    from models import db
    user = db.session.get(User, user_id)
    if not user:
        return None, ('User account not found', 404)
    if not user.is_active:
        return None, ('User account has been deactivated', 403)
        
    return user, None

def token_required(f):
    """Decorator to enforce authentication on protected endpoints."""
    @wraps(f)
    def decorated(*args, **kwargs):
        user, err = get_current_user_from_request()
        if err:
            return jsonify({'success': False, 'message': err[0]}), err[1]
        return f(user, *args, **kwargs)
    return decorated

def admin_required(f):
    """Decorator to enforce admin role permission on administrative endpoints."""
    @wraps(f)
    def decorated(*args, **kwargs):
        user, err = get_current_user_from_request()
        if err:
            return jsonify({'success': False, 'message': err[0]}), err[1]
        if user.role != 'admin':
            return jsonify({
                'success': False, 
                'message': 'Access denied: Administrative privileges required'
            }), 403
        return f(user, *args, **kwargs)
    return decorated
