// ESP32 Arduino symbols need an explicit include for editor analysis.
#include <Arduino.h>

#ifndef ARDUINO
class MockSerialClass {
public:
  void begin(int) {}
  void print(const char *) {}
  void print(int) {}
  void print(float, int = 2) {}
  void println(const char *) {}
  void println(int) {}
  void println(float, int = 2) {}
  void println() {}
};

static MockSerialClass Serial;
constexpr int INPUT = 0;
constexpr int OUTPUT = 1;
constexpr int ADC_11db = 0;

inline void pinMode(int, int) {}
inline int digitalRead(int) { return 0; }
inline void digitalWrite(int, int) {}
inline int analogRead(int) { return 0; }
inline void analogReadResolution(int) {}
inline void analogSetPinAttenuation(int, int) {}
inline void delay(int) {}
#endif

const int fan1Switch = 18;
const int fan2Switch = 19;
const int light1Switch = 21;
const int light2Switch = 22;
const int light3Switch = 23;

const int fan1Led = 26;
const int fan2Led = 27;
const int light1Led = 13;
const int light2Led = 12;
const int light3Led = 14;

const int currentSensorPin = 34;

void setup() {
  Serial.begin(115200);

  pinMode(fan1Switch, INPUT);
  pinMode(fan2Switch, INPUT);
  pinMode(light1Switch, INPUT);
  pinMode(light2Switch, INPUT);
  pinMode(light3Switch, INPUT);

  pinMode(fan1Led, OUTPUT);
  pinMode(fan2Led, OUTPUT);
  pinMode(light1Led, OUTPUT);
  pinMode(light2Led, OUTPUT);
  pinMode(light3Led, OUTPUT);

  analogReadResolution(12);
  analogSetPinAttenuation(currentSensorPin, ADC_11db);
}

void loop() {
  int fan1 = digitalRead(fan1Switch);
  int fan2 = digitalRead(fan2Switch);
  int light1 = digitalRead(light1Switch);
  int light2 = digitalRead(light2Switch);
  int light3 = digitalRead(light3Switch);

  digitalWrite(fan1Led, fan1);
  digitalWrite(fan2Led, fan2);
  digitalWrite(light1Led, light1);
  digitalWrite(light2Led, light2);
  digitalWrite(light3Led, light3);

  int currentValue = analogRead(currentSensorPin);

  Serial.println("---- LumaWarden Room Status ----");
  Serial.print("Fan 1: "); Serial.println(fan1 ? "ON" : "OFF");
  Serial.print("Fan 2: "); Serial.println(fan2 ? "ON" : "OFF");
  Serial.print("Light 1: "); Serial.println(light1 ? "ON" : "OFF");
  Serial.print("Light 2: "); Serial.println(light2 ? "ON" : "OFF");
  Serial.print("Light 3: "); Serial.println(light3 ? "ON" : "OFF");
  int totalPower = 0;

if (fan1) totalPower += 60;
if (fan2) totalPower += 60;
if (light1) totalPower += 15;
if (light2) totalPower += 15;
if (light3) totalPower += 15;

float estimatedCurrent = totalPower / 220.0;

Serial.print("Total simulated power: ");
Serial.print(totalPower);
Serial.println(" W");

Serial.print("Estimated current draw: ");
Serial.print(estimatedCurrent, 2);
Serial.println(" A");
  Serial.print("Current sensor value: "); Serial.println(currentValue);
  Serial.println();

  delay(500);
}