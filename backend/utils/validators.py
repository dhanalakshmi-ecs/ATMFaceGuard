import re
import base64
import numpy as np
import cv2

def validate_registration_data(data: dict) -> tuple[bool, str]:
    """Validates user registration input fields."""
    if not isinstance(data, dict):
        return False, "Payload must be a valid JSON object."
    
    full_name = data.get('full_name', '').strip()
    if not full_name or len(full_name) < 2:
        return False, "Full name must be at least 2 characters long."
    
    username = data.get('username', '').strip()
    if not username or not re.match(r'^[a-zA-Z0-9_]{3,30}$', username):
        return False, "Username must be 3-30 characters long and contain only alphanumeric characters and underscores."
    
    email = data.get('email', '').strip()
    email_regex = r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$'
    if not email or not re.match(email_regex, email):
        return False, "A valid email address is required."
    
    phone = data.get('phone', '').strip()
    phone_clean = re.sub(r'[\s\-\(\)\+]', '', phone)
    if not phone or len(phone_clean) < 7 or not phone_clean.isdigit():
        return False, "A valid phone number is required (at least 7 digits)."
    
    password = data.get('password', '')
    if not password or len(password) < 8:
        return False, "Password must be at least 8 characters long."
    if not re.search(r'[A-Z]', password):
        return False, "Password must contain at least one uppercase letter."
    if not re.search(r'[0-9]', password):
        return False, "Password must contain at least one digit."
    
    confirm_password = data.get('confirm_password', '')
    if password != confirm_password:
        return False, "Passwords do not match."
    
    return True, ""

def decode_base64_image(image_data: str) -> tuple[np.ndarray | None, str]:
    """Decodes a base64 encoded image string (with or without data URI prefix) into a cv2 BGR image."""
    if not image_data or not isinstance(image_data, str):
        return None, "Missing or invalid image data."
    
    # Strip data URL prefix if present (e.g., 'data:image/jpeg;base64,')
    if ',' in image_data:
        header, b64_str = image_data.split(',', 1)
    else:
        b64_str = image_data
    
    try:
        image_bytes = base64.b64decode(b64_str)
    except Exception as e:
        return None, f"Base64 decoding failed: {str(e)}"
    
    if len(image_bytes) > 10 * 1024 * 1024:  # 10MB limit
        return None, "Image exceeds maximum allowed size (10MB)."
    
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        return None, "Could not decode image buffer into valid graphic frame."
    
    return img, ""
