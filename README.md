# AI-Based ATM Face Verification and Authorization System with ATmega Serial Communication

[![Build Status](https://img.shields.io/badge/Build-Passing-brightgreen.svg)](#)
[![Python](https://img.shields.io/badge/Python-3.10%2B-blue.svg)](#)
[![React](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-cyan.svg)](#)
[![Hardware](https://img.shields.io/badge/Microcontroller-ATmega328P%20%2F%20Arduino-red.svg)](#)
[![Biometrics](https://img.shields.io/badge/Neural%20Network-MTCNN%20%2B%20FaceNet-orange.svg)](#)

A complete, production-grade, end-to-end ATM Face Verification and Authorization System featuring modern customer enrollment, sign-in, neural biometric matching (FaceNet 512-dim embeddings), simulated banking actions, and real-time USB serial communication with an ATmega328P microcontroller (Arduino Uno).

---

## 1. System Architecture

```text
+-----------------------------------------------------------------------------------+
|                            REACT 18 + VITE FRONTEND                               |
|   - Live Webcam HUD & Face Reticle Overlay                                        |
|   - Multi-Sample Enrollment Wizard (3 angles)                                     |
|   - Customer Dashboard & Synthetic ATM Operations                                 |
|   - Admin Audit Console & Dynamic Threshold Slider                                |
|   - Hardware Serial Manager & LED Mirror Widget                                   |
+-----------------------------------------------------------------------------------+
                                        |  REST API / JWT Bearer
                                        v
+-----------------------------------------------------------------------------------+
|                               FLASK AI BACKEND                                    |
|   - Computer Vision: MTCNN (Detection, Count, Quality, Blur Assessment)           |
|   - Biometric Neural Model: InceptionResnetV1 (FaceNet 512-dim Vectors)           |
|   - Security: Bcrypt Password Hashing, Rate Limiting, Audit Logging               |
|   - SQLAlchemy Database: SQLite / PostgreSQL Ready                                |
|   - Serial Controller: PySerial Singleton, Port Auto-Discovery (COM1-COM10)       |
+-----------------------------------------------------------------------------------+
                                        |  USB Serial Protocol (9600 Baud)
                                        |  Outcome Codes: 'A\n', 'B\n', 'C\n', 'P\n'
                                        v
+-----------------------------------------------------------------------------------+
|                      ATMEGA328P / ARDUINO UNO FIRMWARE                            |
|   - Digital Pin 12: Green LED (Outcome A - Authorized Face)                       |
|   - Digital Pin 11: Red LED   (Outcome B & C - Failed / Invalid)                  |
|   - Digital Pin 8:  Active Buzzer (1 Beep: Auth, 2 Beeps: Fail, 3 Beeps: Invalid)|
|   - Watchdog Timer: Automatic Reset to Idle (5s for A, 4s for B/C)                |
+-----------------------------------------------------------------------------------+
```

---

## 2. Tri-State Authorization Protocol

The system enforces three outcome codes strictly synchronized across the Python backend, React frontend, and ATmega firmware:

| Code | Outcome Name | Criteria | Visual Indicator | Acoustic Pattern | Data Exposure |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **`A`** | **Authorized Face** | Active user, exactly 1 face, quality OK, cosine similarity &ge; threshold (e.g. 65%) | **Green LED ON** (5s) | 1 Confirmation Beep (150ms) | Unlocks customer name, ID, and masked account. |
| **`B`** | **Authorization Failed** | Valid face detected, but identity mismatch or score &lt; threshold | **Red LED ON** (4s) | 2 Warning Beeps | Generic failure message. **No** other customer data exposed. |
| **`C`** | **Unauthorized / Invalid** | No face detected, multiple faces, blurry image, bad lighting, or liveness failure | **Red LED ON** (4s) | 3 Rapid Warning Beeps | Generic usability guidance. **No** private data exposed. |
| **`P`** | **Diagnostic Ping** | Safe hardware probe from admin settings | *No change* | *Silent* | Replies `PONG:ATMEGA328P_ATM_V1.0`. **Never authorizes**. |

---

## 3. Technology Stack

- **Frontend:** React 18, Vite, React Router v6, Axios, Lucide React, HTML5 Canvas/Webcam API, Custom Cyber-Fintech CSS.
- **Backend:** Python 3.10+, Flask 3.1+, Flask-CORS, Flask-SQLAlchemy 3.1+, PyJWT, Bcrypt, PySerial 3.5.
- **Computer Vision & Deep Learning:** OpenCV (Laplacian variance blur detection), MTCNN (Multi-task Cascaded Convolutional Networks), InceptionResnetV1 (`vggface2` pre-trained 512-dim embedding network).
- **Embedded Firmware:** ATmega328P C++ / Arduino sketch (`firmware/atm_face_verification.ino`).

---

## 4. Quick Start (Windows Execution)

### Step 1: Run the Backend
Open PowerShell:
```powershell
cd C:\Users\jodhu\.gemini\antigravity\scratch\atm-face-verification\backend

# Install dependencies
pip install -r requirements.txt

# Seed pre-configured demo users
python seed_demo_data.py

# Run backend automated tests (All 13 tests)
python -m pytest tests/

# Launch Flask Server on port 5000
python app.py
```

### Step 2: Run the Frontend
Open a second PowerShell window:
```powershell
cd C:\Users\jodhu\.gemini\antigravity\scratch\atm-face-verification\frontend

# Install node dependencies
npm.cmd install

# Start Vite Development Server
npm.cmd run dev
```
Open **`http://localhost:5173`** in your browser.

---

## 5. Pre-Configured Demo Accounts

| Account Role | Username | Password | Status / Face Profile |
| :--- | :--- | :--- | :--- |
| **Enrolled Customer** | `alice` | `CustomerPass123!` | Face Enrolled (3 samples). Ready for instant verification. |
| **Unenrolled Customer** | `bob` | `CustomerPass123!` | Unenrolled. Test the multi-sample face enrollment wizard. |
| **Security Administrator**| `admin` | `AdminPass123!` | Full access to Admin Audit Console & COM Port Manager. |

*Quick-fill demo buttons are provided directly on the Login page.*

---

## 6. Hardware Wiring (ATmega328P / Arduino Uno)

- **Digital Pin 12:** Green LED anode via 220Ω resistor &rarr; Cathode to GND.
- **Digital Pin 11:** Red LED anode via 220Ω resistor &rarr; Cathode to GND.
- **Digital Pin 8:** Active Buzzer positive (+) &rarr; Negative (-) to GND.
- **USB Cable:** Connected to PC (Default port **COM17**, selectable to any COM port in application settings).
- **Firmware Upload:** Open `firmware/atm_face_verification.ino` in Arduino IDE and upload to Uno.

*See [`docs/hardware_wiring.md`](file:///C:/Users/jodhu/.gemini/antigravity/scratch/atm-face-verification/docs/hardware_wiring.md) for full schematic.*

---

## 7. Security and Ethics Disclaimers

> [!IMPORTANT]
> **Synthetic Banking Environment:**
> All account numbers, balances, transactions, and customer identifiers are completely synthetic. This application does not connect to real banking networks or perform real financial transactions.

> [!WARNING]
> **2D Face Recognition Fallibility:**
> 2D software-based face recognition and heuristic motion checks can be spoofed by pre-recorded videos or high-resolution photographs. Production biometric security requires dedicated 3D depth sensors, infrared illumination, and active challenge-response protocols.

---

## 8. Troubleshooting

- **PowerShell Execution Policy Error:** Run commands with `powershell -ExecutionPolicy Bypass -Command "..."` or use `npm.cmd`.
- **Serial Port Permission Denied / Busy:** Ensure the Arduino Serial Monitor window in Arduino IDE is closed before connecting through the web application, as Windows restricts COM port sharing to a single active process.
- **Camera Access Blocked:** Ensure you grant camera permissions in your web browser. Check privacy settings in Windows Settings &rarr; Privacy & Security &rarr; Camera.
