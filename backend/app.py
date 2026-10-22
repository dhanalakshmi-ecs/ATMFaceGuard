import os
import atexit
import logging
from flask import Flask, jsonify
from flask_cors import CORS

# Self-contained Configuration class to prevent any missing module errors
class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'atm-secure-key-12345')
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URI', 'sqlite:///atm.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SERIAL_PORT = os.environ.get('SERIAL_PORT', 'COM7')
    BAUD_RATE = 9600
    DEFAULT_SERIAL_PORT = 'COM7'
    DEFAULT_SERIAL_BAUDRATE = 9600
    CORS_ORIGINS = '*'

from models import db, User, HardwareSettings
from routes.auth_routes import auth_bp
from routes.face_routes import face_bp
from routes.verification_routes import verification_bp
from routes.hardware_routes import hardware_bp
from routes.admin_routes import admin_bp
from routes.transaction_routes import transaction_bp
from hardware.serial_controller import serial_controller

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s'
)
logger = logging.getLogger('atm_backend')

def create_app(config_class=Config, test_config=None):
    app = Flask(__name__)
    app.config.from_object(config_class)
    if test_config:
        app.config.update(test_config)

    # Initialize CORS for web dashboard communication
    CORS(app, resources={
        r"/api/*": {
            "origins": app.config.get('CORS_ORIGINS', '*'),
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"]
        }
    })

    # Initialize Database
    db.init_app(app)

    # Register Blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(face_bp)
    app.register_blueprint(verification_bp)
    app.register_blueprint(hardware_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(transaction_bp)

    @app.route('/api/health', methods=['GET'])
    def health_check():
        return jsonify({
            'status': 'healthy',
            'system': 'ATM Face Verification & ATmega Serial Controller',
            'version': '1.0.0',
            'liveness_gate': 'enforced-v4',
            'serial_port': serial_controller.port,
            'serial_connected': serial_controller.is_connected
        }), 200

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({'success': False, 'message': 'API endpoint not found'}), 404

    @app.errorhandler(500)
    def internal_error(e):
        logger.error(f"Internal server error: {str(e)}")
        return jsonify({'success': False, 'message': 'Internal system error occurred.'}), 500

    # Initialize database tables and seed default admin
    with app.app_context():
        db.create_all()
        _init_system_defaults()

    return app

def _init_system_defaults():
    """Initializes hardware settings record and default administrator account if not present."""
    try:
        # Hardware settings default
        settings = HardwareSettings.query.first()
        if not settings:
            settings = HardwareSettings(
                serial_port=Config.DEFAULT_SERIAL_PORT,
                baud_rate=Config.DEFAULT_SERIAL_BAUDRATE,
                connection_status='DISCONNECTED'
            )
            db.session.add(settings)
            db.session.commit()
            logger.info(f"Initialized default hardware settings for {Config.DEFAULT_SERIAL_PORT}")
        else:
            serial_controller.port = settings.serial_port
            serial_controller.baudrate = settings.baud_rate
            logger.info(f"Synced hardware settings target port to {settings.serial_port}")

        # Seed default admin user
        admin = User.query.filter_by(username='admin').first()
        if not admin:
            from utils.security import generate_customer_id, generate_account_number
            admin = User(
                customer_id=generate_customer_id(),
                full_name="System Security Administrator",
                username="admin",
                email="admin@atm-security.local",
                phone="18005550199",
                account_number=generate_account_number(),
                account_type="Supervisory",
                simulated_balance=1000000.00,
                is_active=True,
                role="admin"
            )
            admin.set_password("AdminPass123!")
            db.session.add(admin)
            db.session.commit()
            logger.info("Created default system administrator (username: admin)")
    except Exception as e:
        logger.warning(f"System defaults initialization warning: {str(e)}")

# Ensure serial connection is gracefully released on server shutdown
atexit.register(serial_controller.disconnect)

app = create_app()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    logger.info(f"Starting ATM Face Verification Backend on port {port}")
    app.run(host='0.0.0.0', port=port, debug=False)