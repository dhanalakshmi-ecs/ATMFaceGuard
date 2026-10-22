from datetime import datetime
import json
import numpy as np
from models import db

class FaceEnrollment(db.Model):
    __tablename__ = 'face_enrollments'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, unique=True, index=True)
    
    # Serialized embedding array (512-dim vector for FaceNet)
    embedding_data = db.Column(db.Text, nullable=False)
    model_name = db.Column(db.String(64), default='facenet-vggface2', nullable=False)
    enrollment_status = db.Column(db.String(32), default='enrolled', nullable=False)  # 'enrolled', 'pending', 'revoked'
    num_samples = db.Column(db.Integer, default=1, nullable=False)
    quality_score = db.Column(db.Float, default=1.0)
    assigned_code = db.Column(db.String(2), default='A', nullable=False)  # 'A' for Known Face 1, 'B' for Known Face 2
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def set_embedding(self, embedding_vector: np.ndarray, num_samples: int = 1, quality: float = 1.0):
        """Serializes normalized numpy vector into stored JSON representation."""
        if isinstance(embedding_vector, np.ndarray):
            clean_list = embedding_vector.flatten().astype(float).tolist()
        else:
            clean_list = list(embedding_vector)
        self.embedding_data = json.dumps(clean_list)
        self.num_samples = num_samples
        self.quality_score = quality
        self.enrollment_status = 'enrolled'
        self.updated_at = datetime.utcnow()

    def get_embedding(self) -> np.ndarray:
        """Retrieves and deserializes embedding back into numpy array."""
        if not self.embedding_data:
            return None
        data = json.loads(self.embedding_data)
        return np.array(data, dtype=np.float32)

    def to_dict(self):
        """Sanitized representation for API responses - never leaks raw embedding vectors."""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'model_name': self.model_name,
            'enrollment_status': self.enrollment_status,
            'num_samples': self.num_samples,
            'quality_score': round(self.quality_score, 2),
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
