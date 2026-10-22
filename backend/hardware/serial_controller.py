import serial
import serial.tools.list_ports
import threading
import time
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

class SerialController:
    """
    Manages persistent serial communication with the ATmega328P / Arduino Uno board.
    Implements safe single-command dispatch, protocol validation, port enumeration,
    and thread-safe port access.
    """
    _instance = None
    _lock = threading.Lock()

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            with cls._lock:
                if not cls._instance:
                    cls._instance = super(SerialController, cls).__new__(cls)
        return cls._instance

    def __init__(self, default_port=None, default_baudrate=9600):
        # Guard against multiple re-initializations of singleton
        if hasattr(self, '_initialized') and self._initialized:
            return
        
        if default_port is None:
            import os
            default_port = os.environ.get('SERIAL_PORT', 'COM7')
        
        self.port = default_port
        self.baudrate = default_baudrate
        self.serial_conn = None
        self.is_connected = False
        self.last_command = None
        self.last_response = None
        self.last_error = None
        self.last_sent_timestamp = None
        self.op_lock = threading.Lock()
        self._initialized = True
        logger.info(f"SerialController initialized with default port: {self.port}, baud: {self.baudrate}")

    def list_available_ports(self) -> list[dict]:
        """
        Discovers all active COM ports on the system and always includes standard
        selectable ports (COM1 through COM10) to support user selection or simulated setups.
        """
        system_ports = list(serial.tools.list_ports.comports())
        detected_names = set()
        ports_info = []

        for p in system_ports:
            detected_names.add(p.device)
            ports_info.append({
                'port': p.device,
                'description': p.description or 'Serial Device',
                'hwid': p.hwid or 'Unknown',
                'is_active_device': True
            })

        # Ensure standard ports COM1 through COM10 are always accessible in the list
        standard_coms = [f"COM{i}" for i in range(1, 11)]
        for com in standard_coms:
            if com not in detected_names:
                ports_info.append({
                    'port': com,
                    'description': f'Serial Port {com} (Configurable Target)',
                    'hwid': 'Static Config',
                    'is_active_device': False
                })

        # Sort ports predictably
        def sort_key(item):
            name = item['port']
            if name.startswith('COM') and name[3:].isdigit():
                return (0, int(name[3:]))
            return (1, name)

        ports_info.sort(key=sort_key)
        return ports_info

    def auto_detect_usb_port(self) -> str | None:
        """Finds any active physical USB serial adapter or board (e.g. COM7)."""
        system_ports = list(serial.tools.list_ports.comports())
        for p in system_ports:
            desc = (p.description or '').lower()
            hwid = (p.hwid or '').lower()
            if 'usb' in desc or 'usb' in hwid or 'ch340' in desc or 'cp210' in desc or 'arduino' in desc:
                return p.device
        for p in system_ports:
            if p.device == 'COM7':
                return 'COM7'
        return None

    def connect(self, port: str = None, baudrate: int = None) -> tuple[bool, str]:
        """
        Connects to the specified or configured serial port.
        Safely closes any existing open connection.
        """
        with self.op_lock:
            # If no port specified or disconnected, try auto-detecting USB
            if not port:
                detected_usb = self.auto_detect_usb_port()
                target_port = detected_usb if detected_usb else self.port
            else:
                target_port = port

            target_baud = baudrate or self.baudrate

            # If already connected to the same port and baudrate, verify alive
            if self.is_connected and self.serial_conn and self.serial_conn.is_open:
                if self.port == target_port and self.baudrate == target_baud:
                    return True, f"Already connected to {target_port} at {target_baud} baud."
                else:
                    self._internal_disconnect()

            self.port = target_port
            self.baudrate = target_baud
            self.last_error = None

            try:
                # Open serial port with 1s timeout
                self.serial_conn = serial.Serial(
                    port=self.port,
                    baudrate=self.baudrate,
                    timeout=1.0,
                    write_timeout=1.0
                )
                
                # Arduino auto-resets on DTR toggle when serial opens. Wait 1.5s for bootloader.
                time.sleep(1.5)
                self.serial_conn.reset_input_buffer()
                self.serial_conn.reset_output_buffer()

                self.is_connected = True
                logger.info(f"Successfully connected to hardware on {self.port} at {self.baudrate} baud.")
                return True, f"Successfully connected to hardware on {self.port}."
            except serial.SerialException as se:
                self.is_connected = False
                self.serial_conn = None
                self.last_error = f"Serial port {self.port} error: {str(se)}"
                logger.warning(self.last_error)
                return False, self.last_error
            except Exception as e:
                self.is_connected = False
                self.serial_conn = None
                self.last_error = f"Connection error: {str(e)}"
                logger.error(self.last_error)
                return False, self.last_error

    def disconnect(self) -> tuple[bool, str]:
        """Closes the active serial connection."""
        with self.op_lock:
            return self._internal_disconnect()

    def _internal_disconnect(self) -> tuple[bool, str]:
        if self.serial_conn:
            try:
                if self.serial_conn.is_open:
                    self.serial_conn.close()
            except Exception as e:
                logger.warning(f"Error while closing serial connection: {str(e)}")
            finally:
                self.serial_conn = None
        self.is_connected = False
        return True, "Serial port disconnected."

    def test_connection(self) -> dict:
        """
        Executes a safe hardware probe using 'P' (Ping).
        NEVER sends 'A' or changes authorization state.
        Returns connection diagnostics.
        """
        with self.op_lock:
            if not self.is_connected or not self.serial_conn or not self.serial_conn.is_open:
                return {
                    'success': False,
                    'connected': False,
                    'port': self.port,
                    'message': f"Port {self.port} is not connected. Please connect before testing."
                }

            try:
                # Send safe ping command
                self.serial_conn.reset_input_buffer()
                self.serial_conn.write(b"P\n")
                self.serial_conn.flush()
                self.last_command = "P"
                self.last_sent_timestamp = datetime.utcnow().isoformat()

                # Read response
                response_line = self.serial_conn.readline().decode('ascii', errors='ignore').strip()
                self.last_response = response_line
                
                return {
                    'success': True,
                    'connected': True,
                    'port': self.port,
                    'baudrate': self.baudrate,
                    'command_sent': 'P (Diagnostic Ping)',
                    'firmware_response': response_line if response_line else "Transmitted (No ACK response returned within timeout)",
                    'timestamp': self.last_sent_timestamp
                }
            except Exception as e:
                self.last_error = str(e)
                self.is_connected = False
                return {
                    'success': False,
                    'connected': False,
                    'port': self.port,
                    'error': f"Hardware communication failure during test: {str(e)}"
                }

    def _internal_connect(self, port=None, baudrate=None) -> bool:
        target_port = port or self.auto_detect_usb_port() or self.port
        target_baud = baudrate or self.baudrate
        try:
            if self.serial_conn and self.serial_conn.is_open:
                try:
                    self.serial_conn.close()
                except Exception:
                    pass
            self.port = target_port
            self.baudrate = target_baud
            self.serial_conn = serial.Serial(
                port=self.port,
                baudrate=self.baudrate,
                timeout=1.0,
                write_timeout=1.0
            )
            time.sleep(1.5)
            self.serial_conn.reset_input_buffer()
            self.serial_conn.reset_output_buffer()
            self.is_connected = True
            logger.info(f"Auto-connected to hardware on {self.port} at {self.baudrate} baud.")
            return True
        except Exception as e:
            self.is_connected = False
            self.serial_conn = None
            self.last_error = str(e)
            return False

    def send_verification_result(self, code: str) -> dict:
        """
        Sends the verification outcome code to the ATmega328P microcontroller.
        
        Strict Protocol:
        - Only 'A' (Authorized Face 1), 'B' (Authorized Face 2), or 'C' (Unauthorized) accepted.
        - Transmits exact ASCII character followed by newline: e.g. "A\n".
        - Flushes serial buffer immediately.
        - Auto-connects if disconnected.
        - Never exposes sensitive embeddings or passwords in logs.
        """
        # Validate allowed command set
        if code not in ('A', 'B', 'C'):
            raise ValueError(f"Invalid verification result code: '{code}'. Only 'A', 'B', or 'C' allowed.")

        timestamp_iso = datetime.utcnow().isoformat()

        with self.op_lock:
            # Check physical connection, attempt auto-connect if disconnected
            if not self.is_connected or not self.serial_conn or not self.serial_conn.is_open:
                self._internal_connect()

            if not self.is_connected or not self.serial_conn or not self.serial_conn.is_open:
                err_msg = f"Hardware serial port {self.port} is not connected. Output code '{code}' could not be delivered to board."
                self.last_error = err_msg
                logger.warning(err_msg)
                return {
                    'success': False,
                    'delivered': False,
                    'code': code,
                    'port': self.port,
                    'baudrate': self.baudrate,
                    'timestamp': timestamp_iso,
                    'error': err_msg
                }

            try:
                # Transmit single ASCII character followed by newline
                command_bytes = f"{code}\n".encode('ascii')
                self.serial_conn.write(command_bytes)
                self.serial_conn.flush()

                # Read immediate response line from ATmega board
                time.sleep(0.08)
                ack = ""
                try:
                    if self.serial_conn.in_waiting > 0:
                        ack = self.serial_conn.readline().decode('ascii', errors='ignore').strip()
                except Exception:
                    pass

                self.last_command = code
                self.last_response = ack
                self.last_sent_timestamp = timestamp_iso
                self.last_error = None

                logger.info(f"Dispatched serial verification outcome: '{code}' to {self.port} (ACK: {ack})")
                return {
                    'success': True,
                    'delivered': True,
                    'code': code,
                    'port': self.port,
                    'baudrate': self.baudrate,
                    'firmware_ack': ack,
                    'timestamp': timestamp_iso,
                    'message': f"Serial signal '{code}' successfully written and flushed to {self.port}"
                }
            except Exception as e:
                self.is_connected = False
                self.last_error = f"Serial transmission error on {self.port}: {str(e)}"
                logger.error(self.last_error)
                return {
                    'success': False,
                    'delivered': False,
                    'code': code,
                    'port': self.port,
                    'baudrate': self.baudrate,
                    'timestamp': timestamp_iso,
                    'error': self.last_error
                }

    def get_status(self) -> dict:
        """Returns current operational status of the serial controller."""
        # Double check port liveness
        if self.serial_conn and not self.serial_conn.is_open:
            self.is_connected = False

        return {
            'port': self.port,
            'baudrate': self.baudrate,
            'is_connected': self.is_connected,
            'last_command': self.last_command,
            'last_response': self.last_response,
            'last_sent_timestamp': self.last_sent_timestamp,
            'last_error': self.last_error
        }

# Global singleton instance
serial_controller = SerialController()
