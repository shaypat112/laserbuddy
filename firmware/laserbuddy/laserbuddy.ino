/*
  LaserBuddy firmware - pan/tilt laser pointer
  Works on Arduino Uno/Nano (Servo library) or ESP32 (install "ESP32Servo" library).

  Serial commands (115200 baud, one per line):
    P <pan> <tilt>   move to angles in degrees, e.g.  P 90 60   (smooth move)
    J <pan> <tilt>   jump instantly (used during calibration)
    L 1 / L 0        laser on / off
    C                center both servos (90, 90), laser off
    ?                report current angles
  Replies "OK ..." after each command so the PC knows the move finished.

  Safety: the laser switches itself off after LASER_TIMEOUT_MS with no commands.
*/

#if defined(ESP32)
  #include <ESP32Servo.h>
  const int PAN_PIN = 18, TILT_PIN = 19, LASER_PIN = 23;
#else
  #include <Servo.h>
  const int PAN_PIN = 9,  TILT_PIN = 10, LASER_PIN = 7;
#endif

// Limits keep the servos from hitting the frame. Tighten if yours binds.
const int PAN_MIN = 10,  PAN_MAX = 170;
const int TILT_MIN = 20, TILT_MAX = 160;
const unsigned long LASER_TIMEOUT_MS = 15000;

Servo panServo, tiltServo;
float panNow = 90, tiltNow = 90;
unsigned long lastCmd = 0;
bool laserOn = false;
String line;

void setLaser(bool on) {
  laserOn = on;
  digitalWrite(LASER_PIN, on ? HIGH : LOW);
}

void writeServos() {
  // writeMicroseconds gives finer steps than whole degrees
  panServo.writeMicroseconds(map((long)(panNow * 10), 0, 1800, 500, 2400));
  tiltServo.writeMicroseconds(map((long)(tiltNow * 10), 0, 1800, 500, 2400));
}

void moveTo(float p, float t, bool smooth) {
  p = constrain(p, (float)PAN_MIN, (float)PAN_MAX);
  t = constrain(t, (float)TILT_MIN, (float)TILT_MAX);
  if (!smooth) {
    panNow = p; tiltNow = t; writeServos();
    delay(350);                       // let it settle
    return;
  }
  float dp = p - panNow, dt = t - tiltNow;
  int steps = max(1, (int)(max(fabs(dp), fabs(dt)) / 1.5));   // ~1.5 deg per step
  float p0 = panNow, t0 = tiltNow;
  for (int i = 1; i <= steps; i++) {
    float k = (float)i / steps;
    k = k * k * (3 - 2 * k);          // ease in/out
    panNow = p0 + dp * k; tiltNow = t0 + dt * k;
    writeServos();
    delay(12);
  }
  delay(150);
}

// Parse "X <a> <b>" (AVR's sscanf can't read floats, so do it by hand)
bool parseTwo(const String &cmd, float &p, float &t) {
  int s1 = cmd.indexOf(' ');
  if (s1 < 0) return false;
  String rest = cmd.substring(s1 + 1); rest.trim();
  int s2 = rest.indexOf(' ');
  if (s2 < 0) return false;
  p = rest.substring(0, s2).toFloat();
  t = rest.substring(s2 + 1).toFloat();
  return true;
}

void handle(String cmd) {
  cmd.trim();
  if (cmd.length() == 0) return;
  char c = toupper(cmd.charAt(0));
  lastCmd = millis();

  if (c == 'P' || c == 'J') {
    float p, t;
    if (parseTwo(cmd, p, t)) {
      moveTo(p, t, c == 'P');
      Serial.print("OK "); Serial.print(panNow, 1); Serial.print(' '); Serial.println(tiltNow, 1);
    } else Serial.println("ERR usage: P <pan> <tilt>");
  } else if (c == 'L') {
    setLaser(cmd.indexOf('1') > 0);
    Serial.println(laserOn ? "OK laser on" : "OK laser off");
  } else if (c == 'C') {
    setLaser(false);
    moveTo(90, 90, true);
    Serial.println("OK centered");
  } else if (c == '?') {
    Serial.print("OK "); Serial.print(panNow, 1); Serial.print(' '); Serial.println(tiltNow, 1);
  } else {
    Serial.println("ERR unknown command");
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(LASER_PIN, OUTPUT);
  setLaser(false);
#if defined(ESP32)
  panServo.setPeriodHertz(50);
  tiltServo.setPeriodHertz(50);
#endif
  panServo.attach(PAN_PIN, 500, 2400);
  tiltServo.attach(TILT_PIN, 500, 2400);
  writeServos();
  Serial.println("LaserBuddy ready");
}

void loop() {
  while (Serial.available()) {
    char ch = Serial.read();
    if (ch == '\n' || ch == '\r') { handle(line); line = ""; }
    else if (line.length() < 40) line += ch;
  }
  if (laserOn && millis() - lastCmd > LASER_TIMEOUT_MS) setLaser(false);
}
