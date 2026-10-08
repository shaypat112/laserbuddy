# Laser Buddy Cam: local workbench setup

This repository is the frontend-only product introduction. Its 3D scenes and laptop screen illustrate the complete workbench; they do not capture a camera, call AI providers, save projects, or control a laser. It has no `/hub`, `/remote`, or `/remote/aim` implementation and does not receive project share fragments.

Use the [complete source project](https://github.com/Panchangam30/laser-buddy-cam) for the workbench and its current firmware, hardware wiring, and calibration instructions. The bundled `app/` Python programs and hardware assets here are legacy/reference materials, not the current workbench setup. `docs/laserbuddy_sim.html` is a separate illustrative hardware demo, not a circuit solver or live workbench; it is not linked from the landing page.

## Requirements

- A browser with WebGL, an Arduino, USB data cable, jumpers, and the parts required by your lesson.
- The supplied 830-point solderless breadboard profile for camera mapping: A–J, 63 columns, 2.54 mm pitch. Registered perfboard and PCB locators are unavailable.
- A webcam and camera permission, the local Node API, and Python/OpenCV for tracking. Component labeling uses configured AI access.
- An OpenAI key and connectivity for photo scanning and proposed plans. Inspect uncertain identification and wiring before building.
- Optional voice: microphone permission, the local API, and a configured Grok or OpenAI key and connectivity. Optional narration uses configured xAI speech. Headphones help prevent Grok hearing its own output.
- Optional targeting: a serial-connected Arduino pan/tilt head, two servos, a switched laser, current source firmware, and valid camera-based calibration. Use current source wiring instructions and a suitable external supply with common ground. Keep the beam away from eyes.

Authored lessons load without a provider key once the app is available; this does not establish a fully offline install. Servo lessons require a separate regulated 5 V supply and common ground. Sound lessons use a small passive piezo transducer.

## Run the complete project

Clone the source project and run from **that repository's root**, not this website directory:

```sh
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
cp .env.example .env
# Edit root .env with keys for your chosen features.
cd web
npm install
npm run dev
```

Open `http://localhost:5173`. This starts Vite on :5173, Node on :8787, and Python vision on :8788. Browser requests go through Node. Keys stay in the root server-side `.env`; never use a `VITE_` variable for a secret.

Main settings include `OPENAI_API_KEY`, `OPENAI_MODEL`, `XAI_API_KEY`, `XAI_VOICE_ID`, `VOICE_PROVIDER`, `GROK_VOICE_MODEL`, `VISION_PORT`, and `VISION_URL`; the API also supports `REALTIME_MODEL` and `REALTIME_VOICE`. See the source `.env.example` for current defaults.

## Build, check, and test

1. Choose one of 50 authored tutorials in five categories (LEDs, Buttons, Analog, Servos, Sound), or scan visible parts for a proposed plan. Unsupported named goals are refused; the deterministic catalog includes button-controlled servo sweep.
2. Review requirements and warnings, then follow 3D wiring steps. The 32 visual starter-kit entries are editor models, not 32 verified circuits or recognition guarantees.
3. Compare visible placements against modeled nodes. Inspect hidden leads, resistor terminals, off-board wiring, polarity, and power manually. The app does not measure voltage, current, resistance, firmware output, or actual contact continuity. Touching same-color parts can merge; red rail wires can split; edges receive lower confidence.
4. Use configured voice or optional calibrated targeting. Board tracking must run during browser-driven calibration. Recalibrate after moving the camera or head; movement invalidation is not automatic. Last calibration RMS is not guaranteed targeting accuracy. Half the board pitch (1.27 mm) is a tolerance reference. The 15-second no-command beam timeout is not eye-safety certification.
5. Upload supplied code in the Arduino IDE and perform the lesson's manual test. Animated behavior preview is not an electrical solver or Arduino emulator. Visual jumper attachments do not prove electrical correctness.

The local Learning Hub includes 216 symptom records across 12 categories, 11 beginner guides, and eight authored 3D fault challenges. Records share category-level checks and link to official Arduino help; they are not automatic diagnoses. Challenges offer feedback and three hints; exact laser-answer guidance is gated until the third hint. “Frequently searched ideas” is an authored collection label, not live analytics.

## Keep and share work

Plans and progress persist in browser-local IndexedDB, without an account. JSON exports include plans, required parts, code, progress, and recorded snapshots. Imports create separate local copies. Compressed links also provide independent editable copies in a compatible workbench; this site has no such handler. Localhost and private-LAN links are not automatically reachable by others. File imports are limited to 10 MB and links to 32,000 characters; JSON is the fallback for large projects or missing compression support.

Tracking records meaningful changes after three consistent observations and retains up to 300 recent structured snapshots. Replay offers scrub, step, playback, and return to live; voice and laser always use the live board. Snapshots contain measurements, issues, plan, and step, not video or audio. Freeform editor additions are not all persisted or exported. There is no cloud sync, automatic cross-device backup, or live remote supervision.

Camera images/crops may go to OpenAI; voice uses the configured provider. Local storage is not a promise of offline processing. Recipients can read shared text, code, and snapshots. Check providers' retention policies; no retention guarantee is made here. This website loads Google Fonts; no analytics integration is present in the inspected frontend code.

## Companion and terminal tools

The source `/remote` and `/remote/aim` pages control a reachable running local workbench. Camera actions need the main tab open; laser actions need connected hardware. The phone is not a second camera and this public site cannot operate a disconnected rig.

Separate tools include `identify.py` for webcam/terminal identification, optional `speech.py`, standalone camera/debug mode (`python -m vision.service --camera 0`), synthetic boards, detector self-tests, and a simulated laser head. `python -m vision.follow --camera 0` is a separate surface-calibrated pixel-following utility whose accuracy depends on target depth. These are not browser features or universal 3D tracking.
