from flask import Blueprint, request, jsonify
from hardware.serial_controller import serial_controller
from models import db, HardwareSettings
from utils.security import token_required

hardware_bp = Blueprint('hardware_bp', __name__, url_prefix='/api/hardware')

def get_or_create_hardware_settings():
    settings = HardwareSettings.query.first()
    if not settings:
        settings = HardwareSettings(
            serial_port=serial_controller.port,
            baud_rate=serial_controller.baudrate,
            connection_status='CONNECTED' if serial_controller.is_connected else 'DISCONNECTED'
        )
        db.session.add(settings)
        db.session.commit()
    return settings

@hardware_bp.route('/ports', methods=['GET'])
def get_available_ports():
    """Returns detected system ports and available COM1-COM10 list."""
    ports = serial_controller.list_available_ports()
    return jsonify({
        'success': True,
        'current_port': serial_controller.port,
        'current_baudrate': serial_controller.baudrate,
        'ports': ports
    }), 200

@hardware_bp.route('/status', methods=['GET'])
def get_hardware_status():
    """Returns real-time connection status and last activity."""
    settings = get_or_create_hardware_settings()
    if not serial_controller.is_connected and settings.serial_port:
        serial_controller.port = settings.serial_port
        serial_controller.baudrate = settings.baud_rate

    ctrl_status = serial_controller.get_status()

    # Sync DB state
    settings.serial_port = ctrl_status['port']
    settings.baud_rate = ctrl_status['baudrate']
    settings.connection_status = 'CONNECTED' if ctrl_status['is_connected'] else 'DISCONNECTED'
    settings.last_command_sent = ctrl_status['last_command']
    db.session.commit()

    return jsonify({
        'success': True,
        'status': ctrl_status,
        'saved_settings': settings.to_dict()
    }), 200

@hardware_bp.route('/connect', methods=['POST'])
@token_required
def connect_hardware(current_user):
    """Establishes serial communication with target COM port."""
    data = request.get_json(silent=True) or {}
    port = data.get('port') or serial_controller.port
    baudrate = int(data.get('baudrate') or serial_controller.baudrate)

    ok, msg = serial_controller.connect(port=port, baudrate=baudrate)

    settings = get_or_create_hardware_settings()
    settings.serial_port = port
    settings.baud_rate = baudrate
    settings.connection_status = 'CONNECTED' if ok else 'ERROR'
    settings.last_error = msg if not ok else None
    db.session.commit()

    if not ok:
        return jsonify({
            'success': False,
            'message': msg,
            'status': serial_controller.get_status()
        }), 503

    return jsonify({
        'success': True,
        'message': msg,
        'status': serial_controller.get_status()
    }), 200

@hardware_bp.route('/disconnect', methods=['POST'])
@token_required
def disconnect_hardware(current_user):
    """Closes serial connection."""
    ok, msg = serial_controller.disconnect()
    settings = get_or_create_hardware_settings()
    settings.connection_status = 'DISCONNECTED'
    db.session.commit()

    return jsonify({
        'success': True,
        'message': msg,
        'status': serial_controller.get_status()
    }), 200

@hardware_bp.route('/test', methods=['POST'])
@token_required
def test_hardware_connection(current_user):
    """
    Performs safe ping diagnostic test on the connected microcontroller.
    Never modifies authorization state.
    """
    result = serial_controller.test_connection()
    settings = get_or_create_hardware_settings()
    settings.last_test_result = str(result)
    db.session.commit()

    status_code = 200 if result.get('success') else 503
    return jsonify({
        'success': result.get('success', False),
        'data': result
    }), status_code

@hardware_bp.route('/settings', methods=['PUT'])
@token_required
def update_hardware_settings(current_user):
    """Updates and saves hardware settings."""
    data = request.get_json(silent=True) or {}
    port = data.get('port')
    baudrate = data.get('baudrate')

    if not port:
        return jsonify({'success': False, 'message': 'Serial port name is required.'}), 400

    settings = get_or_create_hardware_settings()
    settings.serial_port = port
    if baudrate:
        settings.baud_rate = int(baudrate)

    db.session.commit()
    serial_controller.port = settings.serial_port
    serial_controller.baudrate = settings.baud_rate

    return jsonify({
        'success': True,
        'message': f'Hardware settings updated to {settings.serial_port} at {settings.baud_rate} baud.',
        'data': settings.to_dict()
    }), 200
