# LaserBuddy build guide

A desk companion that looks at the parts in front of you, listens to what you want to
build, and points a laser at each part as it talks you through the steps.

```
  you talk ──► microphone ──► speech-to-text (Whisper, on your laptop)
                                     │
  webcam (overhead) ──► part finder ─┤──► Claude: names parts, plans the build, understands you
                                     │
                         laptop app (laserbuddy.py)
                           │                    │
                 USB serial commands        your cloned voice (ElevenLabs) ──► speakers
                           │
                  Arduino Uno ──► pan servo + tilt servo + laser
```

Files in this folder:

| File | What it is |
|---|---|
| `cad/fit_test.stl` | 15-minute test print to pick the right servo fit |
| `cad/laserbuddy_plate.stl` (+ `_tight`, `_loose`) | all 4 printed parts on one plate |
| `cad/laser_pointer.scad` | editable CAD source (optional, needs OpenSCAD) |
| `docs/wiring.svg` | wiring diagram (open in any browser) |
| `firmware/laserbuddy/laserbuddy.ino` | Arduino code |
| `app/laserbuddy.py`, `app/voice.py` | the laptop program |

---

## 1. Shopping list

Prices are approximate and change often. The starter kit covers the Arduino, breadboard,
wires, transistor, resistors, and every part used in the demo builds.

| Qty | Part | Link | ~Price |
|---|---|---|---|
| 1 | ELEGOO UNO R3 Super Starter Kit (Uno, breadboard, jumper wires, PN2222 transistors, resistors incl. 1 kΩ, LEDs, photoresistor, buttons, ultrasonic sensor, 1 servo) | https://amazon.com/dp/B01D8KOZF4 | $40 |
| 2 | Micro servo, TowerPro SG92R (SG90 size) for the pan/tilt. The kit's servo becomes a demo part. | https://www.adafruit.com/products/169 | $6 each |
| 1 | 1 mW 650 nm red laser module, 6 × 10 mm, 3 V (10-pack) | https://www.amazon.com/10pcs-6x10mm-650nm-Module-Focusable/dp/B0C3XPKZ3X | $10 |
| 1 | 5 V 2 A power supply, 2.1 mm plug | https://adafruit.com/products/276 | $8 |
| 1 | Female DC jack to screw terminal adapter | https://www.adafruit.com/products/368 | $2 |
| 1 | Logitech C270 HD webcam | https://www.amazon.com/dp/B004FHO5Y6 | $20 |
| 1 | SmallRig 4766 magic arm with desk clamp (holds the webcam overhead) | https://www.adorama.com/smallrig-4766-desktop-shooting-magic-arm-crab-clamp-kit/p/sr4766 | $30 |
| 1 | 1/4"-20 hex nut (hardware store) for the printed webcam adapter | any hardware store | $0.25 |
| – | White poster board (plain background for the parts) | any store | $2 |

**Total: about $125.** To save $30, skip the arm and tape or clip the webcam to the edge of a
shelf above your desk instead. Your laptop's microphone and speakers are fine for voice.

## 2. Print the parts (Creality Ender-3 V3)

All STLs were checked: each part is one solid piece, sits flat on the bed, and only needs
short bridges and shallow lead-in bevels (the longest span is about 15 mm, well under PLA's
usual 20–30 mm unsupported limit), so **no supports**.

1. Print `cad/fit_test.stl` first (about 15 minutes). Push a servo into each slot.
   1 notch = tight, 2 = normal, 3 = loose. Pick the slot that is snug without forcing.
2. Print the matching plate: `laserbuddy_plate_tight.stl`, `laserbuddy_plate.stl`, or
   `laserbuddy_plate_loose.stl`. It holds four parts: base, pan arm, laser arm, webcam adapter.
3. Settings: PLA, 0.2 mm layers, 3 walls, 25 % infill, supports off, 5 mm brim.

The base prints upside down on purpose. The pan arm's wall stands straight up; the brim
keeps it stuck to the bed.

Checked measurements: the servo openings press-fit SG90/SG92R bodies (22.2–23.0 mm long,
11.8–12.2 mm wide) across the three fit options, each with a lead-in bevel so the servo
self-centers going in straight; the laser tube is 6.3 mm for 6 mm lasers. A collision check
over the full 0–180° tilt range found no contact between the laser arm and the pan arm or
servo.

## 3. Wiring

Open `docs/wiring.svg` in your browser and follow it. The same thing as a checklist:

**Power rails**
- [ ] 5 V supply → screw-terminal adapter. Adapter **+** → breadboard red rail, **−** → blue rail.
- [ ] Arduino **GND** → blue rail. (Shared ground. Without it, the servos twitch randomly.)
- [ ] Never connect the supply's + to the Arduino's 5V pin.

**Servos** (use male-to-male jumpers into the servo plugs)
- [ ] Both servos: red → red rail, brown → blue rail.
- [ ] Pan servo orange → **D9**. Tilt servo orange → **D10**.

**Laser switch**
- [ ] PN2222 on the breadboard, flat face toward you: legs are **E B C** left to right.
- [ ] Arduino **D7** → 1 kΩ resistor → transistor **B**.
- [ ] Transistor **E** → blue rail.
- [ ] Laser red (+) → Arduino **3.3V**. Laser black/blue (−) → transistor **C**.

Why the transistor: the Arduino pin only has to flip a switch, and the laser's current flows
through the transistor instead of the pin.

## 4. Firmware

1. Install the Arduino IDE, open `firmware/laserbuddy/laserbuddy.ino`.
2. Tools → Board → Arduino Uno, pick the port, Upload.
3. Serial Monitor at 115200 with "Newline". Type `L 1` (laser on), `P 60 90`, `P 120 90`, `C`.
   Each should reply `OK ...` and the servos should move.

## 5. Assembly — no bolts needed

Every joint here is a press-fit: the servo openings grip the servo body by friction, and each
has a wide lead-in bevel at the opening so the servo self-centers as you push it in straight
(instead of going in tilted). Nothing needs a wrench or a driver. `docs/assembly_preview.stl`
shows the finished shape — open it in your slicer's preview (no need to print it) to check
your build against it, since it can't be printed as one solid piece: the pan and tilt joints
have to move, and a single rigid print couldn't turn.

1. With the firmware running and servos plugged in, send `C` so both servos sit at 90°.
   From here on, don't turn the servo shafts by hand.
2. **Base:** line the servo up square with the opening (not tilted to one side), shaft up,
   and push it straight down until it stops, wire out the side notch. It should sit flush,
   not crooked — if it's tilted or won't seat flush, check you're using the plate size that
   matched your fit test (see Section 2), and push straight down rather than corner-first.
   Add a small dot of hot glue at the top edge if you want it permanent; it isn't required.
3. **Pan arm:** press the servo's cross horn into the recess under the round platform (a drop
   of superglue keeps it from spinning in place, or use its tiny included screw if you'd
   rather). Push the platform onto the pan servo shaft with the wall facing your work area —
   press straight on, not at an angle — so it seats flush on the horn.
   (Do this before adding the tilt servo, or the wall blocks your fingers.)
4. **Tilt servo:** line it up with the wall opening, shaft facing out, and slide it straight
   in from behind until it stops flush. Same idea as the base: push it in level, not tilted.
5. **Laser arm:** press a two-arm horn into its recess (superglue, or its included screw).
   Push the laser into the tube, lens facing away from the horn recess — it should grip by
   friction; add a dot of hot glue or use the small side screw if it feels loose. Press the
   arm onto the tilt shaft so the laser aims forward and about 45° down.
6. Run the wires down neatly and tape them so they don't snag when it turns.

The 4 corner holes in the base are separate from all this — they're only there if you want
to screw the whole finished unit down to a shelf or board. Skip them if you don't need that.

## 6. Camera and placement

1. Put the 1/4"-20 nut into the hexagon pocket on top of the printed webcam adapter.
2. Screw the adapter onto the arm's ball head. Hook the C270's clip over the adapter and
   add a rubber band or a strip of double-sided foam tape so it can't slide off when tilted.
3. Clamp the arm to the desk and aim the webcam **straight down** from about 60 cm up,
   so it sees the whole white poster board.
4. Raise the pointer 25–40 cm (a shelf, box, or stack of books) at the back edge of the
   work area, aimed forward over it. Don't put parts directly under the pointer.
5. Even lighting helps: a desk lamp from the side is better than a bright window behind.

## 7. Software

```
pip install -r app/requirements.txt
```

The Claude API powers part naming, build plans, and understanding loose speech. API
accounts are for adults, so a parent or teacher creates the key:

```
Windows (PowerShell):  $env:ANTHROPIC_API_KEY="sk-ant-..."
Mac/Linux:             export ANTHROPIC_API_KEY="sk-ant-..."
```

Run it (Windows port names look like COM5, Mac like /dev/cu.usbserial-XXXX):

```
python app/laserbuddy.py --port COM5 --camera 1
python app/laserbuddy.py --sim --image desk.jpg     # test without hardware
```

## 8. Calibrate

1. In the camera window, steer the dot to the middle of the board with I / J / K / L.
2. Dim the lights a little, press **C**. It sweeps a 6 × 6 grid and fits a pixel-to-angle map.
   Under about 1° average error is good.
3. Click anywhere in the camera window; the laser should land there. Recalibrate whenever
   the camera or pointer moves.

## 9. Voice

**Hearing you** is free and offline: `faster-whisper` turns speech into text on your laptop.
**Understanding** uses Claude to turn loose phrases ("which one's the sensor?") into app
commands, with a keyword fallback if there's no key. **Talking** uses ElevenLabs.

ElevenLabs setup (the account must belong to an adult, age 18+):
1. The adult signs up at elevenlabs.io and creates an API key.
2. Clone a voice with the consent of the person whose voice it is (yours or a family
   member's who agrees): Voices → Add voice → Instant voice clone, and upload about a
   minute of clean speech.
3. Copy the voice ID and set both values:
   ```
   export ELEVENLABS_API_KEY="..."
   export ELEVENLABS_VOICE_ID="..."
   ```
4. Test speaker and mic: `python app/voice.py --test`
5. Optional: `python app/voice.py --cache` pre-makes common lines so they play instantly.

Run with `--voice`, press **V** in the camera window, then talk. Try: "scan the desk",
"where's the servo?", "I want to build a night light", "next", "go back".
Every spoken line is cached in `app/voice_cache/`, so repeats cost no credits.
Without ElevenLabs keys it uses the computer's built-in voice.

## 10. Demo script (for your video)

1. "Hi LaserBuddy." Show the pile of parts on the board.
2. Press V: "Scan the desk." Parts get boxed and named on screen.
3. Press V: "I want to build a night light." The laser points at the Arduino and the voice
   reads step 1.
4. Do each step, saying "next" to move on. Finish with the LED turning on in the dark.
5. Mention what you built yourself and what uses AI (see below).

## 11. Troubleshooting

| Problem | Fix |
|---|---|
| Servos jitter or the Arduino resets | Check the shared ground; make sure servos use the 5 V supply, not the Arduino. |
| Laser never turns on | Transistor legs backwards (E B C with flat face toward you); laser + on 3.3V. |
| Calibration misses dots | Dim the lights, start with the dot mid-board, keep the camera fixed. |
| Laser lands a bit off | Recalibrate; tall parts get hit on their top, which is normal. |
| Wrong part names | `label 3 servo` in the terminal fixes it. |
| Voice hears nothing | Run `python app/voice.py --test`; check the laptop's microphone permission. |

## 12. Five-week plan (deadline: Monday, October 26, 2026, 12:00 PM ET)

| Week | Dates | Goal |
|---|---|---|
| 1 | Sep 21–27 | Order parts. Print fit test + plate. Try the simulator. |
| 2 | Sep 28–Oct 4 | Wire it, upload firmware, assemble, laser moves from Serial Monitor. |
| 3 | Oct 5–11 | Camera mounted, calibration under 1°, click-to-point works. Scanning works. |
| 4 | Oct 12–18 | Voice in and out, cloned voice, one full build guide working end to end. |
| 5 | Oct 19–25 | Test with a friend, record and edit the video, write the submission. Submit by Oct 23. |

## AI disclosure

The rules require disclosing AI use. Be specific: which code you wrote or changed, which
parts were generated with AI help (for example, the starter CAD, firmware, and app from
Claude), and which features call AI while running (Claude for part names, plans, and
understanding speech; ElevenLabs for the voice; Whisper for speech-to-text).
