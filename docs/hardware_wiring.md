# Hardware Wiring & Interface Specification

## ATmega328P / Arduino Uno Biometric Authorization Controller

This document outlines the wiring schematics, pin assignments, electrical ratings, and safety precautions for connecting the physical microcontroller prototype to the AI face verification backend.

---

## 1. Components Checklist

| Component | Quantity | Purpose | Specification |
| :--- | :---: | :--- | :--- |
| **Arduino Uno / ATmega328P** | 1 | Microcontroller Board | 16 MHz, 5V Logic Level |
| **Green LED** | 1 | Outcome A (Authorized) Indicator | Standard 5mm LED (~2.0V forward voltage) |
| **Red LED** | 1 | Outcome B & C Indicator | Standard 5mm LED (~1.8V forward voltage) |
| **Resistor 220Ω (1/4W)** | 2 | Current Limiting for LEDs | $I = \frac{5V - 2V}{220\Omega} \approx 13.6\text{ mA}$ (Safe for ATmega pins) |
| **Active Buzzer Module** | 1 | Audio Outcome Feedback | 5V DC Active Buzzer |
| **Half-Size Breadboard** | 1 | Circuit Prototyping | Standard tie-point breadboard |
| **Jumper Wires (M/M)** | 6 | Circuit Interconnects | Standard Dupont wires |
| **USB Type-A to Type-B** | 1 | Serial Communications & Power | 5V bus-powered from Host PC |

---

## 2. Pin Connection Map

| Arduino Uno Pin | Component Terminal | Component | Description / Function |
| :--- | :--- | :--- | :--- |
| **Digital Pin 12** | Anode (+) via 220Ω resistor | **Green LED** | Lights up when **Outcome A** (Authorized) received. |
| **Digital Pin 11** | Anode (+) via 220Ω resistor | **Red LED** | Lights up when **Outcome B** or **C** received. |
| **Digital Pin 8** | Signal / Positive (+) | **Active Buzzer** | Produces audio beeps corresponding to outcome. |
| **GND** | Cathode (-) of Green LED | Breadboard Rail | Common ground rail. |
| **GND** | Cathode (-) of Red LED | Breadboard Rail | Common ground rail. |
| **GND** | Negative (-) of Buzzer | Breadboard Rail | Common ground rail. |
| **USB Port** | Host Computer USB | Host PC Port | Default **COM7** at 9600 Baud. |

---

## 3. Schematic Diagram (ASCII Representation)

```text
       Arduino Uno / ATmega328P
       +-------------------------+
       |                         |
       |  [Pin 12] --------------+---> [ 220Ω Resistor ] ---> (Anode) Green LED (Cathode) ---+
       |                         |                                                            |
       |  [Pin 11] --------------+---> [ 220Ω Resistor ] ---> (Anode)  Red LED  (Cathode) ---+
       |                         |                                                            |
       |  [Pin 8]  --------------+---> (+) Active Buzzer (-) ---------------------------------+
       |                         |                                                            |
       |  [GND]    --------------+------------------------------------------------------------+ (Common GND)
       |                         |
       |  [USB]    ==============+===> Host Computer Running Flask Backend (COM7 @ 9600 Baud)
       +-------------------------+
```

---

## 4. Signal and Audio Feedback Timing

| Command Code | Visual Output | Acoustic Output | State Duration | Watchdog Action |
| :---: | :---: | :---: | :---: | :---: |
| **`A\n`** | **Green LED ON**, Red LED OFF | 1 Short Beep (150ms) | **5000 ms** (5 seconds) | Auto-reverts to safe Idle state (All LEDs OFF). |
| **`B\n`** | **Red LED ON**, Green LED OFF | 2 Beeps (200ms on, 120ms off) | **4000 ms** (4 seconds) | Auto-reverts to safe Idle state. |
| **`C\n`** | **Red LED ON**, Green LED OFF | 3 Beeps (100ms on, 100ms off) | **4000 ms** (4 seconds) | Auto-reverts to safe Idle state. |
| **`P\n`** | *No LED state change* | *Silent* | Immediate Reply | Responds `PONG:ATMEGA328P_ATM_V1.0\n`. |

---

## 5. Electrical and Safety Considerations

1. **Current Limiting:**
   The ATmega328P has a maximum DC current rating of 40 mA per I/O pin (200 mA across the whole chip). Using 220Ω resistors limits the current to approximately 14 mA per LED, well within safe operating limits.
2. **Fail-Safe Watchdog:**
   Under no circumstances will the microcontroller keep the authorized state active indefinitely. If communication drops or 5 seconds elapse, the timer returns all pins to `LOW`.
3. **Educational Prototype Disclaimer:**
   This setup is an educational biometric prototype. It operates LEDs and a buzzer and must **never** be directly connected to a real cash dispensing mechanism or physical vault lock.
