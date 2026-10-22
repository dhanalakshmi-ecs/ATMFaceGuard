# ATMFaceGuard — Face and Fingerprint-Based ATM Authentication System

## 1. Project Overview

ATMFaceGuard is a final-year project that demonstrates a multi-factor authentication system for ATM access. It combines face recognition, liveness detection, and fingerprint verification to improve the authentication process.

The system first checks the user's face using a webcam. Liveness detection helps identify possible attempts to fool the camera using a photograph or similar presentation. If the face is authorized, the Python application communicates with an Arduino Uno, which initiates fingerprint verification. Access is granted only when the required authentication steps are successful.

This project is an educational prototype and is not intended for direct deployment in real banking ATMs.

## 2. Objectives

- Verify a user's identity using face recognition.
- Add liveness checks to help detect face spoofing attempts.
- Use fingerprint verification as a second authentication factor.
- Establish serial communication between Python software and Arduino hardware.
- Display authentication status using an LCD.
- Provide audible alerts for authentication failures.
- Demonstrate an additional security layer for ATM authentication.

## 3. System Workflow

1. **Face detection:** The webcam captures the user's face.
2. **Face recognition:** The software compares the detected face with the authorized user's face data.
3. **Liveness detection:** The system checks for signs that the face belongs to a live person rather than a simple photograph.
4. **Face authorization:** The Python application sends the authorization signal `A` when the face is authorized. It sends `C` when the face is unauthorized.
5. **Fingerprint verification:** After face authorization, the Arduino system requests fingerprint verification through the fingerprint sensor.
6. **Result display:** The LCD displays the authentication result, and the buzzer or GSM module can provide alerts where configured.
7. **Final decision:** The system accepts the authentication only after the required face and fingerprint checks succeed.

## 4. Technologies Used

### Software
- Python
- OpenCV
- MediaPipe
- Flask, where used by the application
- Serial communication using PySerial
- HTML, CSS and JavaScript, where used by the web interface

### Hardware
- Arduino Uno
- Webcam
- AS608 fingerprint sensor
- LCD display
- Buzzer
- GSM module, if enabled in the hardware setup
- USB cable and connecting wires

## 5. Key Features

- Face-based user authentication
- Liveness detection to help resist simple photo-based spoofing
- Two-factor biometric authentication using face and fingerprint
- Serial communication between Python and Arduino
- LCD-based status display
- Audible authentication alerts
- Hardware and software integration
- Unauthorized-user detection and alert functionality, where configured

## 6. Project Architecture

The project has three main components:

**1. Python application**

Captures webcam images, performs face recognition and liveness checks, and communicates the face-verification result to the Arduino.

**2. Arduino firmware**

Receives the serial authorization signal, manages the fingerprint verification process, and controls the connected output devices.

**3. Authentication hardware**

Includes the fingerprint sensor, LCD, buzzer and optional GSM module for displaying results and providing alerts.

## 7. Serial Communication

The Python application communicates with the Arduino over a serial connection.

| Signal | Meaning |
|---|---|
| `A` | Face authorization successful; proceed to fingerprint verification |
| `C` | Face authorization unsuccessful |

The Arduino must interpret these signals according to the firmware logic. A successful face check alone must not be treated as final authentication.

**Important:** The baud rate, COM port and message format must match the values configured in the Python application and Arduino sketch.

## 8. Installation and Setup

### Prerequisites

- Python installed on the computer
- Arduino IDE
- Arduino Uno
- Webcam
- Compatible fingerprint sensor
- Required hardware drivers and libraries
- USB connection between the computer and Arduino

### Step 1: Clone the Repository

Open PowerShell or Command Prompt and run:

```bash
git clone https://github.com/dhanalakshmi-ecs/ATMFaceGuard.git
cd ATMFaceGuard
```

### Step 2: Install Python Dependencies

If the repository contains a `requirements.txt` file, run:

```bash
python -m pip install -r requirements.txt
```

If dependencies are listed differently in the project, install the packages specified by the application.

### Step 3: Configure the Arduino

1. Open the Arduino sketch in Arduino IDE.
2. Select the correct Arduino Uno board.
3. Select the correct serial port.
4. Check the fingerprint sensor and peripheral wiring.
5. Upload the sketch to the Arduino Uno.

### Step 4: Configure Serial Communication

1. Connect the Arduino to the computer using USB.
2. Identify the correct COM port in Arduino IDE or Windows Device Manager.
3. Configure the same port and baud rate in the Python application.
4. Close Arduino Serial Monitor before running the application if it is using the same port.

### Step 5: Run the Application

Run the Python entry point used by your project. For example, if `app.py` is the correct entry point:

```bash
python app.py
```

If the project uses a separate face-recognition or liveness-detection script, start the application according to its actual implementation.

## 9. Testing

The following scenarios can be used to evaluate the prototype:

| Test case | Expected behaviour |
|---|---|
| Authorized face | Face verification succeeds and fingerprint verification begins |
| Unauthorized face | Authorization is rejected |
| Photograph presented to the camera | Liveness checks attempt to detect the spoof |
| Correct fingerprint after authorized face | Authentication succeeds if all required checks pass |
| Incorrect fingerprint | Authentication is rejected |
| Arduino disconnected | Hardware communication failure is handled |
| Fingerprint sensor disconnected | Fingerprint verification cannot complete |
| Unauthorized face with alert enabled | The configured alert mechanism is triggered |

Actual results depend on the implementation, sensor quality and test conditions.

## 10. Security Considerations and Limitations

- Face recognition and software-based liveness checks are not completely resistant to spoofing.
- Fingerprint templates and face data must be stored and handled securely.
- Serial communication failures must not result in unauthorized access.
- A failed or unavailable authentication factor should not be treated as a successful verification.
- GSM alerts require a compatible module, SIM card, network coverage and correct configuration.
- The prototype does not establish compliance with banking security regulations.
- Real ATM deployment would require additional security testing, secure hardware, privacy safeguards and professional validation.

## 11. Future Enhancements

- Stronger presentation-attack detection and active liveness challenges
- Secure biometric template storage
- Encrypted communication and improved device authentication
- Better handling of sensor and communication failures
- Tamper detection and security event logging
- More extensive testing under different lighting and environmental conditions

## 12. Author

**Project:** ATMFaceGuard — Face and Fingerprint-Based ATM Authentication System  
**Developer:** Dhanalakshmi S  
**Course:** B.Tech Electronics and Computer Engineering (Honors in Data Science)  
**Institution:** VELS Institute of Science, Technology & Advanced Studies (VISTAS)

## 13. Disclaimer

ATMFaceGuard is developed for academic and demonstration purposes. It is not a certified banking security product and should not be used to protect real financial accounts or ATM infrastructure.
