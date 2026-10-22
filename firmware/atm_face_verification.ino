/*
 * ======================================================================================
 * PROJECT: AI-BASED ATM FACE VERIFICATION AND AUTHORIZATION SYSTEM
 * FIRMWARE: ATmega328P / Arduino Uno Hardware Authorization Controller
 * ======================================================================================
 *
 * DESCRIPTION:
 * Receives verification commands ('A', 'B', 'C', 'P') over USB Serial at 9600 baud
 * from the Flask AI backend. Controls visual status indicators (Green and Red LEDs)
 * and an active buzzer module. Implements an automatic timeout fail-safe.
 *
 * STRICT PROTOCOL DEFINITION:
 * - 'A' : KNOWN FACE 1 (Authorized Person A)
 *         Action: Green LED ON, Red LED OFF, 1 crisp confirmation beep.
 *         Reverts to IDLE after AUTH_TIMEOUT_MS (5s).
 *
 * - 'B' : KNOWN FACE 2 (Authorized Person B)
 *         Action: Green LED ON, Red LED OFF, 2 confirmation beeps.
 *         Reverts to IDLE after AUTH_TIMEOUT_MS (5s).
 *
 * - 'C' : UNAUTHORIZED / UNKNOWN FACE / INTRUDER / INVALID
 *         Action: Red LED ON, Green LED OFF, 3 warning beeps.
 *         Reverts to IDLE after ALERT_TIMEOUT_MS (4s).
 *
 * - 'P' : DIAGNOSTIC PING
 *         Action: Responds "PONG:ATMEGA328P_ATM_V1.0\n" without changing authorization.
 *
 * SAFETY NOTICE:
 * Both A and B are KNOWN AUTHORIZED FACES activating the Green LED.
 * C is UNAUTHORIZED activating the Red LED and warning buzzer.
 * All indicators automatically return to safe IDLE after timeout.
 * ======================================================================================
 */

// ----------------- CONFIGURABLE PIN DEFINITIONS -----------------
const int PIN_LED_GREEN  = 12;  // Authorized indicator (Green LED via 220Ω resistor)
const int PIN_LED_RED    = 11;  // Unauthorized indicator (Red LED via 220Ω resistor)
const int PIN_BUZZER     = 8;   // Audio alert (Active buzzer module)

// ----------------- TIMEOUT AND TIMING SETTINGS -----------------
const unsigned long AUTH_TIMEOUT_MS  = 5000;  // Green authorization stays active for 5.0 seconds
const unsigned long ALERT_TIMEOUT_MS = 4000;  // Red alert stays active for 4.0 seconds
const unsigned long SERIAL_BAUD_RATE = 9600;

// ----------------- SYSTEM STATE MACHINE -----------------
enum SystemState {
  STATE_IDLE,              // Both LEDs OFF, Buzzer OFF (Default safe state)
  STATE_AUTHORIZED_A,      // Code 'A': Known Face 1 -> Green LED ON, 1 beep
  STATE_AUTHORIZED_B,      // Code 'B': Known Face 2 -> Green LED ON, 2 beeps
  STATE_UNAUTHORIZED_C     // Code 'C': Unauthorized face -> Red LED ON, 3 warning beeps
};

SystemState currentState = STATE_IDLE;
unsigned long stateChangeTimestamp = 0;

// Serial buffer
String inputBuffer = "";

// ----------------- BUZZER HELPER FUNCTIONS -----------------
void beep(int durationMs, int count, int pauseMs) {
  for (int i = 0; i < count; i++) {
    digitalWrite(PIN_BUZZER, HIGH);
    delay(durationMs);
    digitalWrite(PIN_BUZZER, LOW);
    if (i < count - 1) {
      delay(pauseMs);
    }
  }
}

// ----------------- STATE TRANSITION FUNCTION -----------------
void setSystemState(SystemState newState) {
  currentState = newState;
  stateChangeTimestamp = millis();

  switch (currentState) {
    case STATE_AUTHORIZED_A:
      digitalWrite(PIN_LED_GREEN, HIGH);
      digitalWrite(PIN_LED_RED, LOW);
      Serial.println(F("ACK:KNOWN_FACE_A_AUTHORIZED_GREEN_ON"));
      beep(150, 1, 0); // Single crisp confirmation beep for Person A
      break;

    case STATE_AUTHORIZED_B:
      digitalWrite(PIN_LED_GREEN, HIGH);
      digitalWrite(PIN_LED_RED, LOW);
      Serial.println(F("ACK:KNOWN_FACE_B_AUTHORIZED_GREEN_ON"));
      beep(120, 2, 80); // Two confirmation beeps for Person B
      break;

    case STATE_UNAUTHORIZED_C:
      digitalWrite(PIN_LED_GREEN, LOW);
      digitalWrite(PIN_LED_RED, HIGH);
      Serial.println(F("ACK:UNAUTHORIZED_FACE_C_RED_ON"));
      beep(100, 3, 100); // Three rapid warning beeps for Unauthorized
      break;

    case STATE_IDLE:
    default:
      digitalWrite(PIN_LED_GREEN, LOW);
      digitalWrite(PIN_LED_RED, LOW);
      digitalWrite(PIN_BUZZER, LOW);
      break;
  }
}

// ----------------- SETUP -----------------
void setup() {
  // Configure digital output pins
  pinMode(PIN_LED_GREEN, OUTPUT);
  pinMode(PIN_LED_RED, OUTPUT);
  pinMode(PIN_BUZZER, OUTPUT);

  // Initialize all outputs to safe inactive state
  digitalWrite(PIN_LED_GREEN, LOW);
  digitalWrite(PIN_LED_RED, LOW);
  digitalWrite(PIN_BUZZER, LOW);

  // Initialize Serial at 9600 baud
  Serial.begin(SERIAL_BAUD_RATE);
  inputBuffer.reserve(32);

  // Startup self-test flash (both LEDs flash once)
  digitalWrite(PIN_LED_GREEN, HIGH);
  digitalWrite(PIN_LED_RED, HIGH);
  delay(250);
  digitalWrite(PIN_LED_GREEN, LOW);
  digitalWrite(PIN_LED_RED, LOW);

  setSystemState(STATE_IDLE);
  Serial.println(F("READY:ATMEGA328P_ATM_CONTROLLER_V1.1"));
}

// ----------------- MAIN LOOP -----------------
void loop() {
  // 1. Process incoming serial data
  while (Serial.available() > 0) {
    char inChar = (char)Serial.read();

    if (inChar == '\n' || inChar == '\r') {
      if (inputBuffer.length() > 0) {
        inputBuffer.trim();
        processCommand(inputBuffer);
        inputBuffer = "";
      }
    } else {
      // Append printable characters, guard buffer overflow
      if (inputBuffer.length() < 30 && inChar >= 32 && inChar <= 126) {
        inputBuffer += inChar;
      }
    }
  }

  // 2. Timeout watchdog: Automatically revert to safe idle state
  unsigned long now = millis();
  if (currentState == STATE_AUTHORIZED_A || currentState == STATE_AUTHORIZED_B) {
    if (now - stateChangeTimestamp >= AUTH_TIMEOUT_MS) {
      Serial.println(F("TIMEOUT:AUTHORIZATION_EXPIRED_RETURN_IDLE"));
      setSystemState(STATE_IDLE);
    }
  } else if (currentState == STATE_UNAUTHORIZED_C) {
    if (now - stateChangeTimestamp >= ALERT_TIMEOUT_MS) {
      setSystemState(STATE_IDLE);
    }
  }
}

// ----------------- COMMAND DISPATCHER -----------------
void processCommand(String cmd) {
  if (cmd.length() == 0) return;

  char action = cmd.charAt(0);

  switch (action) {
    case 'A':
    case 'a':
      // Known Face 1 (Authorized Person A) -> Green LED ON
      setSystemState(STATE_AUTHORIZED_A);
      break;

    case 'B':
    case 'b':
      // Known Face 2 (Authorized Person B) -> Green LED ON
      setSystemState(STATE_AUTHORIZED_B);
      break;

    case 'C':
    case 'c':
      // Unauthorized / Unknown Face / Intruder / Mismatch -> Red LED ON
      setSystemState(STATE_UNAUTHORIZED_C);
      break;

    case 'P':
    case 'p':
      // Safe diagnostic ping test
      Serial.println(F("PONG:ATMEGA328P_ATM_V1.1:STATUS_OK"));
      break;

    case 'I':
    case 'i':
      // Reset to idle
      setSystemState(STATE_IDLE);
      Serial.println(F("ACK:RESET_TO_IDLE"));
      break;

    default:
      // Ignore unknown / malformed commands
      Serial.print(F("ERR:UNKNOWN_COMMAND_IGNORED:"));
      Serial.println(cmd);
      break;
  }
}
