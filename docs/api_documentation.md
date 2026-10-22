# REST API Documentation

## ATM Face Verification & Microcontroller Authorization System

Base URL: `http://localhost:5000/api`

All protected endpoints require an `Authorization: Bearer <JWT>` header.

---

## 1. Authentication Endpoints

### Register User
- **POST** `/auth/register`
- **Payload:**
  ```json
  {
    "full_name": "Alice Walker",
    "username": "alice",
    "email": "alice@example.com",
    "phone": "+1 (555) 019-2834",
    "date_of_birth": "1994-08-12",
    "account_type": "Savings",
    "password": "Password123!",
    "confirm_password": "Password123!"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "message": "Account registered successfully.",
    "data": {
      "user": {
        "id": 1,
        "customer_id": "ATM-948201",
        "full_name": "Alice Walker",
        "username": "alice",
        "email": "alice@example.com",
        "phone": "+1 (555) 019-2834",
        "account_number": "****-****-****-1044",
        "account_type": "Savings",
        "simulated_balance": 50000.0,
        "is_active": true,
        "role": "customer",
        "has_face_enrolled": false
      },
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
  ```

### Sign In
- **POST** `/auth/login`
- **Payload:**
  ```json
  {
    "username": "alice",
    "password": "Password123!"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Authentication successful.",
    "data": {
      "user": { ... },
      "token": "..."
    }
  }
  ```

### Current User Profile
- **GET** `/auth/me`
- **Headers:** `Authorization: Bearer <token>`
- **Response (200 OK):** Returns authenticated customer profile.

---

## 2. Biometric Face Enrollment Endpoints

### Enroll Face
- **POST** `/face/enroll`
- **Headers:** `Authorization: Bearer <token>`
- **Payload:**
  ```json
  {
    "images": [
      "data:image/jpeg;base64,...",
      "data:image/jpeg;base64,...",
      "data:image/jpeg;base64,..."
    ]
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "message": "Face enrolled successfully with 3 sample(s).",
    "data": {
      "id": 1,
      "user_id": 2,
      "model_name": "facenet-vggface2",
      "enrollment_status": "enrolled",
      "num_samples": 3,
      "quality_score": 94.2
    }
  }
  ```

### Biometric Enrollment Status
- **GET** `/face/enrollment-status`
- **Headers:** `Authorization: Bearer <token>`
- **Response (200 OK):** Returns enrollment status and model metadata without exposing raw embeddings.

### Re-Enroll Face
- **POST** `/face/re-enroll`
- **Headers:** `Authorization: Bearer <token>`
- **Payload:**
  ```json
  {
    "password": "Password123!",
    "images": ["data:image/jpeg;base64,..."]
  }
  ```

---

## 3. ATM Verification Endpoints

### Start Verification Session
- **POST** `/verification/start`
- **Headers:** `Authorization: Bearer <token>`
- **Response (200 OK):** Verifies active user status, biometric enrollment existence, and hardware state.

### Submit Verification Frame
- **POST** `/verification/submit`
- **Headers:** `Authorization: Bearer <token>`
- **Payload:**
  ```json
  {
    "image": "data:image/jpeg;base64,...",
    "frames": [
      "data:image/jpeg;base64,...",
      "data:image/jpeg;base64,..."
    ]
  }
  ```
- **Responses:**

  **Outcome A (Authorized Face):**
  ```json
  {
    "success": true,
    "data": {
      "outcome": "A",
      "status": "AUTHORIZED",
      "title": "Access Authorized",
      "message": "Identity confirmed. ATM access granted.",
      "code": "A",
      "similarity_score": 91.4,
      "threshold": 65.0,
      "verified_user": {
        "customer_id": "ATM-948201",
        "full_name": "Alice Walker",
        "masked_account": "****-****-****-1044",
        "account_type": "Savings",
        "balance": 50000.0
      },
      "timestamp": "2026-10-21T13:45:00.000Z",
      "serial_status": {
        "success": true,
        "delivered": true,
        "code": "A",
        "port": "COM7"
      }
    }
  }
  ```

  **Outcome B (Authorization Failed):**
  ```json
  {
    "success": true,
    "data": {
      "outcome": "B",
      "status": "DENIED",
      "title": "Authorization Failed",
      "message": "Biometric verification did not match the account holder on file. Access denied.",
      "code": "B",
      "similarity_score": 38.2,
      "threshold": 65.0,
      "serial_status": { "delivered": true, "code": "B", "port": "COM7" }
    }
  }
  ```

  **Outcome C (Unauthorized / Invalid Face):**
  ```json
  {
    "success": true,
    "data": {
      "outcome": "C",
      "status": "NO_VALID_FACE",
      "title": "Face Quality Issue",
      "message": "Multiple faces (2) detected. ATM security requires exactly one individual.",
      "code": "C",
      "serial_status": { "delivered": true, "code": "C", "port": "COM7" }
    }
  }
  ```

---

## 4. Hardware Communication Endpoints

### List Available Ports
- **GET** `/hardware/ports`
- **Response (200 OK):** Lists active system ports and standard ports COM1 through COM10.

### Get Hardware Status
- **GET** `/hardware/status`
- **Response (200 OK):** Returns connection status, active port, baud rate, and last transmitted signal.

### Connect Port
- **POST** `/hardware/connect`
- **Payload:** `{"port": "COM7", "baudrate": 9600}`

### Disconnect Port
- **POST** `/hardware/disconnect`

### Safe Diagnostic Test (Ping)
- **POST** `/hardware/test`
- **Response (200 OK):** Sends safe probe `P\n`, returns firmware response without modifying authorization state.

---

## 5. Administration Endpoints (Admin Role Required)

- **GET** `/admin/dashboard-stats`: Aggregate metrics, verification counts, and success percentages.
- **GET** `/admin/users`: Audit list of all registered customer profiles.
- **GET** `/admin/verification-logs`: Full audit logs filtered optionally by `?outcome=A|B|C`.
- **POST** `/admin/user/<id>/toggle-status`: Activate or deactivate a customer account.
- **PUT** `/admin/threshold`: Update face recognition similarity threshold dynamically.
