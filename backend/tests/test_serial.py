import pytest
import os
import sys

# Ensure backend root is on path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from hardware.serial_controller import SerialController

def test_serial_controller_singleton():
    ctrl1 = SerialController()
    ctrl2 = SerialController()
    assert ctrl1 is ctrl2

def test_protocol_allowed_codes():
    ctrl = SerialController()
    
    # Valid outcome codes: 'A', 'B', 'C'
    for valid_code in ['A', 'B', 'C']:
        res = ctrl.send_verification_result(valid_code)
        assert isinstance(res, dict)
        assert res['code'] == valid_code
        # When physical port is not plugged in, delivered is False and clear error reported
        if not ctrl.is_connected:
            assert res['delivered'] is False
            assert 'not connected' in res['error']

def test_protocol_rejects_invalid_codes():
    ctrl = SerialController()
    invalid_codes = ['X', 'Z', '1', 'AUTH', 'true', '']

    for invalid in invalid_codes:
        with pytest.raises(ValueError):
            ctrl.send_verification_result(invalid)

def test_safe_ping_does_not_authorize():
    ctrl = SerialController()
    res = ctrl.test_connection()
    assert isinstance(res, dict)
    # The test must never send 'A' or report authorized
    assert res.get('command_sent') != 'A'

def test_list_ports_includes_standard_com_range():
    ctrl = SerialController()
    ports = ctrl.list_available_ports()
    assert isinstance(ports, list)
    port_names = [p['port'] for p in ports]
    # Check that COM1 to COM10 are available in the selectable list
    for i in range(1, 11):
        assert f"COM{i}" in port_names
