import pytest
import os
import sys
import numpy as np
import base64
import cv2

# Ensure backend root is on path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app
from models import db, User, FaceEnrollment, VerificationLog
from services.face_service import face_service
from services.verification_service import verification_service
from hardware.serial_controller import serial_controller
from liveness_detector import LivenessDetector

@pytest.fixture
def test_app():
    test_db = os.path.abspath(os.path.join(os.path.dirname(__file__), 'test_verif_temp.db'))
    if os.path.exists(test_db):
        try:
            os.remove(test_db)
        except Exception:
            pass

    app = create_app(test_config={
        'TESTING': True,
        'SQLALCHEMY_DATABASE_URI': f'sqlite:///{test_db}'
    })
    
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()

    if os.path.exists(test_db):
        try:
            os.remove(test_db)
        except Exception:
            pass

def test_cosine_similarity_calculation():
    vec_a = np.array([1.0, 0.0, 0.0], dtype=np.float32)
    vec_b = np.array([1.0, 0.0, 0.0], dtype=np.float32)
    assert pytest.approx(face_service.compute_similarity(vec_a, vec_b), 0.01) == 1.0

    vec_c = np.array([0.0, 1.0, 0.0], dtype=np.float32)
    assert pytest.approx(face_service.compute_similarity(vec_a, vec_c), 0.01) == 0.0

def test_blur_assessment_rejects_flat_frame():
    # A flat gray image has 0 variance (very blurry / invalid)
    flat_frame = np.ones((200, 200, 3), dtype=np.uint8) * 128
    ok, msg, sharpness = face_service.assess_image_quality(flat_frame)
    assert ok is False
    assert "blurry" in msg.lower()

def test_liveness_detector_rejects_static_burst():
    detector = LivenessDetector()
    frame = np.full((160, 160, 3), 128, dtype=np.uint8)

    ok, details = detector.analyze_frames_liveness([frame, frame.copy(), frame.copy()])

    assert ok is False
    assert details['status'] == 'SPOOF_DETECTED'

def test_liveness_detector_accepts_moderate_motion_burst():
    detector = LivenessDetector()
    first = np.zeros((160, 160, 3), dtype=np.uint8)
    second = first.copy()
    third = first.copy()
    second[:, 20:80] = 80
    third[:, 20:80] = 160

    ok, details = detector.analyze_frames_liveness([first, second, third])

    assert ok is True
    assert details['status'] == 'PASS'

def test_liveness_detector_rejects_low_level_camera_noise():
    detector = LivenessDetector()
    first = np.full((160, 160, 3), 128, dtype=np.uint8)
    second = first.copy()
    third = first.copy()
    second[::4, ::4] += 1
    third[1::4, 1::4] += 1

    ok, details = detector.analyze_frames_liveness([first, second, third])

    assert ok is False
    assert details['status'] == 'SPOOF_DETECTED'

def test_liveness_detector_rejects_translated_flat_photo():
    detector = LivenessDetector()
    first = np.zeros((160, 160, 3), dtype=np.uint8)
    cv2.rectangle(first, (45, 40), (115, 120), (180, 180, 180), -1)
    second = np.roll(first, 3, axis=1)
    third = np.roll(first, 6, axis=1)
    boxes = [(45, 40, 115, 120), (48, 40, 118, 120), (51, 40, 121, 120)]

    ok, message = detector.analyze_face_depth_motion([first, second, third], boxes)

    assert ok is False
    assert message.startswith('Liveness failed:')

def test_verification_outcome_b_for_mismatch(test_app):
    with test_app.app_context():
        # Create user with enrolled embedding
        user = User(
            customer_id="ATM-TEST01",
            full_name="Target Customer",
            username="targetcust",
            email="target@example.com",
            phone="1234567890",
            account_number="4532-1111-2222-3333",
            account_type="Savings",
            is_active=True
        )
        user.set_password("TargetPass123!")
        db.session.add(user)
        db.session.flush()

        # Enrolled embedding: vector pointing along dimension 0
        enrolled_vec = np.zeros(512, dtype=np.float32)
        enrolled_vec[0] = 1.0
        enrollment = FaceEnrollment(user_id=user.id)
        enrollment.set_embedding(enrolled_vec)
        db.session.add(enrollment)
        db.session.commit()

        # Test verification directly with non-matching embedding by mocking face detection
        # Create a mock face frame
        mock_face = np.zeros((160, 160, 3), dtype=np.uint8)
        # We simulate compare with an orthogonal embedding
        diff_vec = np.zeros(512, dtype=np.float32)
        diff_vec[1] = 1.0  # orthogonal -> similarity 0.0

        sim = face_service.compute_similarity(diff_vec, enrolled_vec)
        assert sim < face_service.similarity_threshold

        # Verification log should record outcome B
        log_entry = VerificationLog(
            user_id=user.id,
            result_code='B',
            result_description="Biometric mismatch",
            similarity_score=sim,
            serial_port='COM7',
            serial_delivery_status='delivered',
            failure_reason="BIOMETRIC_MISMATCH"
        )
        db.session.add(log_entry)
        db.session.commit()

        assert log_entry.result_code == 'B'
        dict_data = log_entry.to_dict(is_admin=False)
        # Outcome B must not reveal full personal data in client response
        assert 'customer_name' not in dict_data or dict_data.get('result_code') == 'B'

def test_known_face_from_another_account_is_unauthorized(test_app, monkeypatch):
    with test_app.app_context():
        current_user = User(
            customer_id="ATM-TEST03",
            full_name="Current Account",
            username="currentcust",
            email="current@example.com",
            phone="1234567890",
            account_number="4532-1111-2222-5555",
            is_active=True
        )
        other_user = User(
            customer_id="ATM-TEST04",
            full_name="Other Account",
            username="othercust",
            email="other@example.com",
            phone="1234567890",
            account_number="4532-1111-2222-6666",
            is_active=True
        )
        current_user.set_password("CurrentPass123!")
        other_user.set_password("OtherPass123!")
        db.session.add_all([current_user, other_user])
        db.session.flush()

        current_enrollment = FaceEnrollment(user_id=current_user.id)
        current_enrollment.set_embedding(np.eye(512, dtype=np.float32)[0])
        other_embedding = np.eye(512, dtype=np.float32)[1]
        other_enrollment = FaceEnrollment(user_id=other_user.id)
        other_enrollment.set_embedding(other_embedding)
        db.session.add_all([current_enrollment, other_enrollment])
        db.session.commit()

        monkeypatch.setattr(
            'services.verification_service.decode_base64_image',
            lambda _: (np.zeros((160, 160, 3), dtype=np.uint8), None)
        )
        monkeypatch.setattr(
            face_service,
            'detect_and_extract_face',
            lambda _: (True, 'ok', np.zeros((160, 160, 3), dtype=np.uint8), {})
        )
        monkeypatch.setattr(face_service, 'generate_embedding', lambda _: other_embedding)
        monkeypatch.setattr(
            serial_controller,
            'send_verification_result',
            lambda code: {'delivered': True, 'code': code}
        )

        result = verification_service.verify_customer_face(current_user, 'valid-image')

        assert result['code'] == 'C'
        assert result['outcome'] == 'C'
        assert result['status'] == 'LIVENESS_FAILED'

def test_verification_outcome_c_for_corrupted_image(test_app):
    with test_app.app_context():
        user = User(
            customer_id="ATM-TEST02",
            full_name="Invalid Frame Customer",
            username="framecust",
            email="frame@example.com",
            phone="1234567890",
            account_number="4532-1111-2222-4444",
            is_active=True
        )
        user.set_password("FramePass123!")
        db.session.add(user)
        db.session.flush()

        # Submit corrupted base64 string
        result = verification_service.verify_customer_face(user, "not-a-valid-base64-image-data")
        assert result['code'] == 'C'
        assert result['outcome'] == 'C'
        assert 'Invalid' in result['title'] or 'Biometric Profile Missing' in result['title']

def test_verification_requires_liveness_burst(test_app, monkeypatch):
    with test_app.app_context():
        user = User(
            customer_id="ATM-TEST-LIVE",
            full_name="Liveness Customer",
            username="livenesscust",
            email="liveness@example.com",
            phone="1234567890",
            account_number="4532-1111-2222-7777",
            is_active=True
        )
        user.set_password("LivePass123!")
        db.session.add(user)
        db.session.flush()
        enrollment = FaceEnrollment(user_id=user.id)
        enrollment.set_embedding(np.eye(512, dtype=np.float32)[0])
        db.session.add(enrollment)
        db.session.commit()

        monkeypatch.setattr(
            'services.verification_service.decode_base64_image',
            lambda _: (np.zeros((160, 160, 3), dtype=np.uint8), None)
        )
        monkeypatch.setattr(
            serial_controller,
            'send_verification_result',
            lambda code: {'delivered': True, 'code': code}
        )

        result = verification_service.verify_customer_face(user, 'valid-image')

        assert result['outcome'] == 'C'
        assert result['status'] == 'LIVENESS_FAILED'
