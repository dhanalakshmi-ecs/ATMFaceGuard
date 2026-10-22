from datetime import datetime
from models import db

class VerificationLog(db.Model):
    __tablename__ = 'verification_logs'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True, index=True)
    
    # Core outcome code: 'A' (Authorized), 'B' (Failed/Mismatch), 'C' (No valid face / Unusable)
    result_code = db.Column(db.String(2), nullable=False, index=True)
    result_description = db.Column(db.String(255), nullable=False)
    similarity_score = db.Column(db.Float, nullable=True)
    
    # Audit and hardware tracking
    serial_port = db.Column(db.String(32), default='COM7')
    serial_delivery_status = db.Column(db.String(64), default='pending')  # 'delivered', 'port_unavailable', 'failed'
    failure_reason = db.Column(db.String(255), nullable=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    def to_dict(self, is_admin=False):
        data = {
            'id': self.id,
            'result_code': self.result_code,
            'result_description': self.result_description,
            'similarity_score': round(self.similarity_score, 4) if self.similarity_score is not None else None,
            'serial_port': self.serial_port,
            'serial_delivery_status': self.serial_delivery_status,
            'failure_reason': self.failure_reason,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None
        }
        
        # Admin can view user linkage; regular user can only see their own
        if is_admin:
            data['user_id'] = self.user_id
            if self.user:
                data['customer_id'] = self.user.customer_id
                data['customer_name'] = self.user.full_name
        elif self.result_code == 'A' and self.user:
            data['customer_id'] = self.user.customer_id
            data['customer_name'] = self.user.full_name
            data['masked_account'] = self.user.masked_account_number

        return data
