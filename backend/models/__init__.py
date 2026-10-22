from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

from models.user import User
from models.face_enrollment import FaceEnrollment
from models.verification_log import VerificationLog
from models.simulated_transaction import SimulatedTransaction
from models.hardware_settings import HardwareSettings

__all__ = ['db', 'User', 'FaceEnrollment', 'VerificationLog', 'SimulatedTransaction', 'HardwareSettings']
