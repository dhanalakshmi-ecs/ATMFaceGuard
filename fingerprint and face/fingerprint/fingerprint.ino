#include <Adafruit_Fingerprint.h>
#include <SoftwareSerial.h>
#include <LiquidCrystal.h>

// =====================================================
// PIN CONFIGURATION
// =====================================================

// LCD: RS, EN, D4, D5, D6, D7
LiquidCrystal lcd(11, 12, 4, 5, 6, 7);

// Buzzer
#define BUZZER 8

// =====================================================
// GSM
// GSM TX -> Arduino D9
// GSM RX -> Arduino D10
// =====================================================

SoftwareSerial gsmSerial(9, 10);

// =====================================================
// FINGERPRINT
// Fingerprint TX -> Arduino D2
// Fingerprint RX -> Arduino D3
// =====================================================

SoftwareSerial fingerSerial(2, 3);

Adafruit_Fingerprint finger = Adafruit_Fingerprint(&fingerSerial);


// =====================================================
// PHONE NUMBER
// =====================================================

String phoneNumber = "6369813669";


// =====================================================
// SETUP
// =====================================================

void setup()
{
  // USB Serial Monitor
  Serial.begin(9600);

  // LCD
  lcd.begin(16, 2);

  // Buzzer
  pinMode(BUZZER, OUTPUT);
  digitalWrite(BUZZER, LOW);

  // GSM
  gsmSerial.begin(9600);

  // Fingerprint
  fingerSerial.begin(57600);


  // ===================================================
  // STARTING MESSAGE
  // ===================================================

  lcd.clear();

  lcd.setCursor(0, 0);
  lcd.print("Face + Finger");

  lcd.setCursor(0, 1);
  lcd.print("Authentication");

  delay(2500);


  // ===================================================
  // FINGERPRINT SENSOR CHECK
  // ===================================================

  lcd.clear();

  lcd.setCursor(0, 0);
  lcd.print("Checking");

  lcd.setCursor(0, 1);
  lcd.print("Fingerprint...");

  delay(1000);


  if (finger.verifyPassword())
  {
    Serial.println("Fingerprint sensor detected.");
  }
  else
  {
    Serial.println("Fingerprint sensor NOT detected.");

    lcd.clear();

    lcd.setCursor(0, 0);
    lcd.print("Fingerprint");

    lcd.setCursor(0, 1);
    lcd.print("Sensor Error");

    while (1)
    {
      delay(100);
    }
  }


  // ===================================================
  // GET FINGERPRINT COUNT
  // ===================================================

  finger.getTemplateCount();

  Serial.print("Stored fingerprints: ");
  Serial.println(finger.templateCount);


  // ===================================================
  // SYSTEM READY
  // ===================================================

  lcd.clear();

  lcd.setCursor(0, 0);
  lcd.print("System Ready");

  lcd.setCursor(0, 1);
  lcd.print("Scan Face");


  Serial.println("--------------------------------");
  Serial.println("FACE + FINGERPRINT SYSTEM");
  Serial.println("--------------------------------");
  Serial.println("A / B = Authorized Face");
  Serial.println("C     = Unauthorized Face");
  Serial.println("--------------------------------");
}


// =====================================================
// MAIN LOOP
// =====================================================

void loop()
{
  if (Serial.available())
  {
    char command = Serial.read();


    // =================================================
    // AUTHORIZED FACE
    // =================================================

    if (command == 'A' || command == 'B')
    {
      authorizedFace();
    }


    // =================================================
    // UNAUTHORIZED FACE
    // =================================================

    else if (command == 'C')
    {
      unauthorizedFace();
    }
  }
}


// =====================================================
// AUTHORIZED FACE
// =====================================================

void authorizedFace()
{
  Serial.println();
  Serial.println("FACE DETECTED");
  Serial.println("AUTHORIZED PERSON");


  // ===================================================
  // FACE DETECTED
  // ===================================================

  lcd.clear();

  lcd.setCursor(0, 0);
  lcd.print("Face Detected");

  lcd.setCursor(0, 1);
  lcd.print("Authorized");

  delay(2000);


  // ===================================================
  // STEP 1 COMPLETED
  // ===================================================

  lcd.clear();

  lcd.setCursor(0, 0);
  lcd.print("Step 1 Completed");

  lcd.setCursor(0, 1);
  lcd.print("Face Verified");

  Serial.println("Step 1 Completed");
  Serial.println("Face Verification Successful");

  delay(2000);


  // ===================================================
  // STEP 2
  // ===================================================

  fingerprintVerification();
}


// =====================================================
// FINGERPRINT VERIFICATION
// =====================================================

void fingerprintVerification()
{
  Serial.println();
  Serial.println("STEP 2");
  Serial.println("Waiting for Fingerprint...");


  lcd.clear();

  lcd.setCursor(0, 0);
  lcd.print("Step 2:");

  lcd.setCursor(0, 1);
  lcd.print("Place Finger");


  // Wait for fingerprint

  while (true)
  {
    uint8_t result = getFingerprintID();


    // =================================================
    // MATCH
    // =================================================

    if (result == FINGERPRINT_OK)
    {
      fingerprintSuccess();
      break;
    }


    // =================================================
    // NOT MATCH
    // =================================================

    else if (result == FINGERPRINT_NOTFOUND)
    {
      fingerprintFailure();
      break;
    }


    // =================================================
    // NO FINGER
    // =================================================

    else if (result == FINGERPRINT_NOFINGER)
    {
      delay(100);
    }


    else
    {
      delay(100);
    }
  }
}


// =====================================================
// GET FINGERPRINT
// =====================================================

uint8_t getFingerprintID()
{
  uint8_t p;


  // ===================================================
  // GET IMAGE
  // ===================================================

  p = finger.getImage();


  if (p == FINGERPRINT_NOFINGER)
  {
    return FINGERPRINT_NOFINGER;
  }


  if (p != FINGERPRINT_OK)
  {
    Serial.println("Fingerprint image error.");

    return p;
  }


  Serial.println("Fingerprint image captured.");


  // ===================================================
  // CONVERT IMAGE
  // ===================================================

  p = finger.image2Tz();


  if (p != FINGERPRINT_OK)
  {
    Serial.println("Fingerprint image conversion failed.");

    return p;
  }


  // ===================================================
  // SEARCH MATCH
  // ===================================================

  p = finger.fingerFastSearch();


  // ===================================================
  // MATCH FOUND
  // ===================================================

  if (p == FINGERPRINT_OK)
  {
    Serial.println("Fingerprint MATCHED!");

    Serial.print("Fingerprint ID: ");
    Serial.println(finger.fingerID);

    Serial.print("Confidence: ");
    Serial.println(finger.confidence);

    return FINGERPRINT_OK;
  }


  // ===================================================
  // NO MATCH
  // ===================================================

  if (p == FINGERPRINT_NOTFOUND)
  {
    Serial.println("Fingerprint NOT MATCHED.");

    return FINGERPRINT_NOTFOUND;
  }


  Serial.println("Fingerprint search error.");

  return p;
}


// =====================================================
// FINGERPRINT SUCCESS
// =====================================================

void fingerprintSuccess()
{
  Serial.println();
  Serial.println("--------------------------------");
  Serial.println("AUTHENTICATION SUCCESSFUL");
  Serial.println("--------------------------------");


  lcd.clear();

  lcd.setCursor(0, 0);
  lcd.print("Fingerprint");

  lcd.setCursor(0, 1);
  lcd.print("Matched");

  delay(2000);


  lcd.clear();

  lcd.setCursor(0, 0);
  lcd.print("ACCESS GRANTED");

  lcd.setCursor(0, 1);
  lcd.print("Welcome!");

  Serial.print("Authorized Finger ID: ");
  Serial.println(finger.fingerID);

  delay(3000);


  // ===================================================
  // RETURN TO READY
  // ===================================================

  lcd.clear();

  lcd.setCursor(0, 0);
  lcd.print("System Ready");

  lcd.setCursor(0, 1);
  lcd.print("Scan Face");
}


// =====================================================
// FINGERPRINT FAILURE
// =====================================================

void fingerprintFailure()
{
  Serial.println();
  Serial.println("--------------------------------");
  Serial.println("FINGERPRINT NOT MATCHED");
  Serial.println("ACCESS DENIED");
  Serial.println("--------------------------------");


  // ===================================================
  // LCD
  // ===================================================

  lcd.clear();

  lcd.setCursor(0, 0);
  lcd.print("Finger Not");

  lcd.setCursor(0, 1);
  lcd.print("Matched!");


  // ===================================================
  // BUZZER
  // ===================================================

  buzzerAlert();


  // ===================================================
  // SMS
  // ===================================================

  sendFingerprintSMS();


  delay(3000);


  lcd.clear();

  lcd.setCursor(0, 0);
  lcd.print("ACCESS DENIED");

  lcd.setCursor(0, 1);
  lcd.print("Alert Sent");

  delay(3000);


  // ===================================================
  // READY
  // ===================================================

  lcd.clear();

  lcd.setCursor(0, 0);
  lcd.print("System Ready");

  lcd.setCursor(0, 1);
  lcd.print("Scan Face");
}


// =====================================================
// UNAUTHORIZED FACE
// =====================================================

void unauthorizedFace()
{
  Serial.println();
  Serial.println("--------------------------------");
  Serial.println("UNAUTHORIZED PERSON");
  Serial.println("FACE VERIFICATION FAILED");
  Serial.println("--------------------------------");


  // ===================================================
  // LCD
  // ===================================================

  lcd.clear();

  lcd.setCursor(0, 0);
  lcd.print("Unauthorized");

  lcd.setCursor(0, 1);
  lcd.print("Person");

  delay(1500);


  // ===================================================
  // BUZZER
  // ===================================================

  buzzerAlert();


  // ===================================================
  // SMS
  // ===================================================

  sendFaceSMS();


  delay(3000);


  lcd.clear();

  lcd.setCursor(0, 0);
  lcd.print("ACCESS DENIED");

  lcd.setCursor(0, 1);
  lcd.print("Alert Sent");

  delay(3000);


  // ===================================================
  // READY
  // ===================================================

  lcd.clear();

  lcd.setCursor(0, 0);
  lcd.print("System Ready");

  lcd.setCursor(0, 1);
  lcd.print("Scan Face");
}


// =====================================================
// BUZZER ALERT
// =====================================================

void buzzerAlert()
{
  Serial.println("BUZZER ALERT");


  for (int i = 0; i < 5; i++)
  {
    digitalWrite(BUZZER, HIGH);

    delay(400);

    digitalWrite(BUZZER, LOW);

    delay(200);
  }
}


// =====================================================
// SMS - UNAUTHORIZED FACE
// =====================================================

void sendFaceSMS()
{
  Serial.println("Sending unauthorized face SMS...");


  gsmSerial.println("AT");

  delay(1000);


  gsmSerial.println("AT+CMGF=1");

  delay(1000);


  gsmSerial.print("AT+CMGS=\"");

  gsmSerial.print(phoneNumber);

  gsmSerial.println("\"");

  delay(1000);


  gsmSerial.println(
    "ALERT! Unauthorized person detected. Face authentication failed."
  );

  delay(500);


  // CTRL + Z
  gsmSerial.write(26);

  delay(5000);


  Serial.println("Unauthorized face SMS sent.");
}


// =====================================================
// SMS - FINGERPRINT FAILURE
// =====================================================

void sendFingerprintSMS()
{
  Serial.println("Sending fingerprint alert SMS...");


  gsmSerial.println("AT");

  delay(1000);


  gsmSerial.println("AT+CMGF=1");

  delay(1000);


  gsmSerial.print("AT+CMGS=\"");

  gsmSerial.print(phoneNumber);

  gsmSerial.println("\"");

  delay(1000);


  gsmSerial.println(
    "ALERT! Authorized face detected, but fingerprint verification failed. Access denied."
  );

  delay(500);


  // CTRL + Z
  gsmSerial.write(26);

  delay(5000);


  Serial.println("Fingerprint alert SMS sent.");
}