from datetime import datetime
from models import db
import bcrypt

class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    customer_id = db.Column(db.String(32), unique=True, nullable=False, index=True)
    full_name = db.Column(db.String(120), nullable=False)
    username = db.Column(db.String(64), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    phone = db.Column(db.String(32), nullable=False)
    date_of_birth = db.Column(db.String(32), nullable=True)
    password_hash = db.Column(db.String(255), nullable=False)
    
    # Synthetic banking fields
    account_number = db.Column(db.String(32), unique=True, nullable=False)
    account_type = db.Column(db.String(32), default='Savings')
    simulated_balance = db.Column(db.Float, default=50000.00)
    
    # State and permissions
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    role = db.Column(db.String(20), default='customer', nullable=False)  # 'customer' or 'admin'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    face_enrollment = db.relationship('FaceEnrollment', backref='user', uselist=False, cascade='all, delete-orphan')
    verification_logs = db.relationship('VerificationLog', backref='user', lazy='dynamic', cascade='all, delete-orphan')
    transactions = db.relationship('SimulatedTransaction', backref='user', lazy='dynamic', cascade='all, delete-orphan')

    @property
    def masked_account_number(self):
        """Returns safe masked account representation (e.g. ****-****-****-1044)."""
        if not self.account_number:
            return "N/A"
        clean = self.account_number.replace('-', '')
        if len(clean) >= 4:
            last4 = clean[-4:]
            return f"****-****-****-{last4}"
        return "****-****-****-0000"

    def set_password(self, password: str):
        salt = bcrypt.gensalt(rounds=12)
        self.password_hash = bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

    def check_password(self, password: str) -> bool:
        if not self.password_hash:
            return False
        return bcrypt.checkpw(password.encode('utf-8'), self.password_hash.encode('utf-8'))

    def to_dict(self, include_sensitive=False):
        data = {
            'id': self.id,
            'customer_id': self.customer_id,
            'full_name': self.full_name,
            'username': self.username,
            'email': self.email,
            'phone': self.phone,
            'date_of_birth': self.date_of_birth,
            'account_number': self.masked_account_number,
            'account_type': self.account_type,
            'simulated_balance': round(self.simulated_balance, 2),
            'is_active': self.is_active,
            'role': self.role,
            'has_face_enrolled': self.face_enrollment is not None and self.face_enrollment.enrollment_status == 'enrolled',
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
        if include_sensitive:
            data['raw_account_number'] = self.account_number
        return data
