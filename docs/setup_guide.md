# Setup and Execution Guide

## AI-Based ATM Face Verification and Authorization System with ATmega Serial Communication

This guide walks you through setting up and running the complete end-to-end system on Windows.

---

## 1. Prerequisites

- **Operating System:** Windows 10/11
- **Python:** 3.10+ (64-bit recommended)
- **Node.js:** v18.0.0+ and **npm**
- **Hardware (Optional for physical testing):**
  - Arduino Uno or ATmega328P development board
  - USB Type-A to Type-B cable (or equivalent)
  - 1x Green LED (Authorized indicator)
  - 1x Red LED (Unauthorized/Failed indicator)
  - 2x 220Ω current-limiting resistors
  - 1x Active Buzzer module
  - Breadboard and jumper wires

---

## 2. Backend Setup (Flask + PyTorch + OpenCV)

1. Open PowerShell and navigate to the `backend` directory:
   ```powershell
   cd C:\Users\jodhu\.gemini\antigravity\scratch\atm-face-verification\backend
   ```

2. (Optional) Create and activate a Python virtual environment:
   ```powershell
   python -m venv venv
   .\venv\Scripts\Activate.ps1
   ```
   *(Note: If PowerShell execution policy blocks activation, run `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`)*

3. Install required Python packages:
   ```powershell
   pip install -r requirements.txt
   ```

4. Verify or create your `.env` configuration:
   ```ini
   SECRET_KEY=atm-face-auth-super-secret-key-prod-random-token-2026-secure-seed-9824719284
   JWT_SECRET_KEY=jwt-super-secret-key-atm-2026-production-grade-signing-key-92847192
   DATABASE_URL=sqlite:///atm_system.db
   SERIAL_PORT=COM7
   SERIAL_BAUDRATE=9600
   FACE_MATCH_THRESHOLD=0.65
   BLUR_THRESHOLD=45.0
   CORS_ORIGINS=http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173
   ```

5. Seed demo users and initial database records:
   ```powershell
   python seed_demo_data.py
   ```
   This creates:
   - **System Administrator:** `admin` / `AdminPass123!`
   - **Enrolled Customer:** `alice` / `CustomerPass123!` (Ready for instant verification)
   - **Unenrolled Customer:** `bob` / `CustomerPass123!` (Ready for new face enrollment)

6. Run automated test suite:
   ```powershell
   python -m pytest tests/
   ```

7. Start the Flask Backend Server:
   ```powershell
   python app.py
   ```
   The backend will start at `http://localhost:5000`.

---

## 3. Frontend Setup (React.js + Vite)

1. Open a new PowerShell terminal and navigate to `frontend`:
   ```powershell
   cd C:\Users\jodhu\.gemini\antigravity\scratch\atm-face-verification\frontend
   ```

2. Install npm dependencies:
   ```powershell
   npm install
   ```

3. Launch the Vite Development Server:
   ```powershell
   npm run dev
   ```
   The application dashboard will be accessible in your web browser at:
   **`http://localhost:5173`**

---

## 4. Hardware Firmware Setup (ATmega328P / Arduino Uno)

1. Connect your Arduino Uno board to your computer via USB.
2. Note the assigned COM port in Windows Device Manager (default configured in system: `COM7`).
3. Open the Arduino IDE.
4. Open the firmware sketch located at:
   `firmware/atm_face_verification.ino`
5. Select Board: **Arduino Uno**
6. Select Port: Your detected COM port (e.g., `COM7`).
7. Click **Upload** (Ctrl + U).
8. Once uploaded, both LEDs will flash briefly during self-test, indicating readiness at 9600 baud.

---

## 5. Verification Workflow Testing

1. Navigate to `http://localhost:5173`.
2. Sign in as demo customer **Alice Walker** (`alice` / `CustomerPass123!`).
3. Click **"Launch ATM Face Verification"**.
4. Allow browser camera permissions when prompted.
5. Align your face inside the HUD oval guide.
6. Click **"Verify Face & Authorize"**.
7. Observe the outcome:
   - **Outcome A:** Green LED on ATmega turns ON, confirmation beep sounds, verified customer details unlocked on screen.
   - **Outcome B:** Red LED on ATmega turns ON with 2 warning beeps, biometric mismatch reported.
   - **Outcome C:** Red LED on ATmega turns ON with 3 warning beeps, missing/unusable face notice displayed.
