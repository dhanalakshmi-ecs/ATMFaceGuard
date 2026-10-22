from datetime import datetime
from models import db

class SimulatedTransaction(db.Model):
    __tablename__ = 'simulated_transactions'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    transaction_type = db.Column(db.String(32), nullable=False)  # 'WITHDRAWAL', 'DEPOSIT', 'BALANCE_INQUIRY', 'ATM_VERIFICATION'
    amount = db.Column(db.Float, default=0.0, nullable=False)
    status = db.Column(db.String(32), default='COMPLETED', nullable=False)  # 'COMPLETED', 'FAILED', 'PENDING'
    description = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'transaction_type': self.transaction_type,
            'amount': round(self.amount, 2),
            'status': self.status,
            'description': self.description,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
