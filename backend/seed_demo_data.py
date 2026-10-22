import os
import sys
from datetime import datetime, timedelta
import numpy as np

# Ensure backend root is on path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app import create_app
from models import db, User, FaceEnrollment, VerificationLog, SimulatedTransaction, HardwareSettings
from utils.security import generate_customer_id, generate_account_number

def seed():
    app = create_app()
    with app.app_context():
        print("[*] Seeding ATM Face Verification database...")
        db.create_all()

        # 1. Admin User
        admin = User.query.filter_by(username='admin').first()
        if not admin:
            admin = User(
                customer_id="ATM-000001",
                full_name="Chief Security Officer",
                username="admin",
                email="admin@atm-bank.local",
                phone="+1 (555) 019-2834",
                account_number=generate_account_number(),
                account_type="Supervisory",
                simulated_balance=1000000.00,
                is_active=True,
                role="admin"
            )
            admin.set_password("AdminPass123!")
            db.session.add(admin)
            print("  [+] Created Administrator: admin / AdminPass123!")
        else:
            print("  [i] Admin user already exists.")

        # 2. Demo Customer 1 (Alice Walker - Enrolled Customer)
        alice = User.query.filter_by(username='alice').first()
        if not alice:
            alice = User(
                customer_id="ATM-948201",
                full_name="Alice Walker",
                username="alice",
                email="alice.walker@example.com",
                phone="+1 (555) 321-9876",
                date_of_birth="1992-06-15",
                account_number=generate_account_number(),
                account_type="Savings",
                simulated_balance=34850.75,
                is_active=True,
                role="customer"
            )
            alice.set_password("CustomerPass123!")
            db.session.add(alice)
            db.session.flush()

            # Create synthetic normalized 512-dim embedding for Alice
            rng = np.random.RandomState(42)
            emb_vector = rng.randn(512).astype(np.float32)
            emb_vector = emb_vector / np.linalg.norm(emb_vector)

            alice_enrollment = FaceEnrollment(user_id=alice.id, assigned_code='A')
            alice_enrollment.set_embedding(emb_vector, num_samples=3, quality=94.2)
            db.session.add(alice_enrollment)
            print("  [+] Created Customer Alice Walker: alice / CustomerPass123! (Known Face A)")
        else:
            if alice.face_enrollment:
                alice.face_enrollment.assigned_code = 'A'
            print("  [i] Alice already exists.")

        # 3. Demo Customer 2 (Bob Martinez - Known Face B)
        bob = User.query.filter_by(username='bob').first()
        if not bob:
            bob = User(
                customer_id="ATM-739102",
                full_name="Bob Martinez",
                username="bob",
                email="bob.martinez@example.com",
                phone="+1 (555) 444-1234",
                date_of_birth="1988-11-20",
                account_number=generate_account_number(),
                account_type="Checking",
                simulated_balance=12400.00,
                is_active=True,
                role="customer"
            )
            bob.set_password("CustomerPass123!")
            db.session.add(bob)
            db.session.flush()

            # Create synthetic normalized 512-dim embedding for Bob (distinct vector)
            rng_bob = np.random.RandomState(84)
            emb_vector_bob = rng_bob.randn(512).astype(np.float32)
            emb_vector_bob = emb_vector_bob / np.linalg.norm(emb_vector_bob)

            bob_enrollment = FaceEnrollment(user_id=bob.id, assigned_code='B')
            bob_enrollment.set_embedding(emb_vector_bob, num_samples=3, quality=92.5)
            db.session.add(bob_enrollment)
            print("  [+] Created Customer Bob Martinez: bob / CustomerPass123! (Known Face B)")
        else:
            if not bob.face_enrollment:
                rng_bob = np.random.RandomState(84)
                emb_vector_bob = rng_bob.randn(512).astype(np.float32)
                emb_vector_bob = emb_vector_bob / np.linalg.norm(emb_vector_bob)
                bob_enrollment = FaceEnrollment(user_id=bob.id, assigned_code='B')
                bob_enrollment.set_embedding(emb_vector_bob, num_samples=3, quality=92.5)
                db.session.add(bob_enrollment)
            else:
                bob.face_enrollment.assigned_code = 'B'
            print("  [i] Bob updated as Known Face B.")

        # 4. Update Hardware Settings to COM17
        hw = HardwareSettings.query.first()
        if hw:
            hw.serial_port = 'COM17'
            hw.baud_rate = 9600
        else:
            hw = HardwareSettings(serial_port='COM17', baud_rate=9600, connection_status='DISCONNECTED')
            db.session.add(hw)
        print("  [+] Configured Hardware Target Port: COM17 (9600 Baud)")

        # 4. Seed sample audit logs
        if VerificationLog.query.count() == 0 and alice:
            now = datetime.utcnow()
            sample_logs = [
                VerificationLog(
                    user_id=alice.id,
                    result_code='A',
                    result_description="Biometric face verification authorized successfully.",
                    similarity_score=0.884,
                    serial_port='COM17',
                    serial_delivery_status='delivered',
                    timestamp=now - timedelta(hours=2)
                ),
                VerificationLog(
                    user_id=alice.id,
                    result_code='C',
                    result_description="Image is too blurry. Sharpness below security threshold.",
                    similarity_score=None,
                    serial_port='COM17',
                    serial_delivery_status='delivered',
                    failure_reason="UNUSABLE_FACE_FRAME",
                    timestamp=now - timedelta(days=1)
                ),
                VerificationLog(
                    user_id=bob.id if bob else None,
                    result_code='B',
                    result_description="Biometric face verification authorized successfully (Known Face B).",
                    similarity_score=0.912,
                    serial_port='COM17',
                    serial_delivery_status='delivered',
                    timestamp=now - timedelta(hours=5)
                )
            ]
            db.session.bulk_save_objects(sample_logs)
            print("  [+] Seeded sample verification audit logs.")

        db.session.commit()
        print("[*] Database seeding complete!")

if __name__ == '__main__':
    seed()
