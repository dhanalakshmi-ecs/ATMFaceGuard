from datetime import datetime
from models import db

class HardwareSettings(db.Model):
    __tablename__ = 'hardware_settings'

    id = db.Column(db.Integer, primary_key=True)
    serial_port = db.Column(db.String(32), default='COM7', nullable=False)
    baud_rate = db.Column(db.Integer, default=9600, nullable=False)
    connection_status = db.Column(db.String(32), default='DISCONNECTED', nullable=False)  # 'CONNECTED', 'DISCONNECTED', 'ERROR'
    last_command_sent = db.Column(db.String(32), nullable=True)
    last_test_result = db.Column(db.String(255), nullable=True)
    last_error = db.Column(db.String(255), nullable=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'serial_port': self.serial_port,
            'baud_rate': self.baud_rate,
            'connection_status': self.connection_status,
            'last_command_sent': self.last_command_sent,
            'last_test_result': self.last_test_result,
            'last_error': self.last_error,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
