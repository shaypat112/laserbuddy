"""
LaserBuddy - point a laser at the part you need next.

Run:
    python laserbuddy.py --port COM5          (Windows)
    python laserbuddy.py --port /dev/ttyUSB0  (Linux)  /dev/cu.usbserial-XXXX (Mac)
    python laserbuddy.py --sim                (no hardware: prints servo commands)
    python laserbuddy.py --sim --image desk.jpg   (test part detection on a photo)

Camera window keys:
    I/J/K/L  jog the laser (up/left/down/right)     O  laser on/off
    C        calibrate (aim the laser at the middle of your work area first)
    S        scan parts on the desk                  Q  quit
    V        talk (needs --voice): "scan", "where's the servo", "build a night light", "next"
    Mouse    click anywhere to point the laser there

Terminal commands (type in this terminal, press Enter):
    scan                         find and label the parts
    point <name or number>       e.g.  point servo   /  point 3
    label <number> <name>        fix a wrong label, e.g.  label 2 ultrasonic sensor
    build <what you're making>   e.g.  build a night light that turns on when it's dark
    next / back                  step through the build guide
    parts                        list detected parts
    quit
"""
import argparse, base64, json, os, queue, re, sys, threading, time
import cv2
import numpy as np

CALIB_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "calibration.json")
MODEL = os.environ.get("LASERBUDDY_MODEL", "claude-sonnet-5")

# ------------------------------------------------------------------ hardware
class Pointer:
    """Talks to the Arduino/ESP32 firmware over USB serial."""
    def __init__(self, port=None, sim=False):
        self.sim = sim or port is None
        self.pan, self.tilt, self.laser = 90.0, 90.0, False
        if not self.sim:
            import serial  # pip install pyserial
            self.ser = serial.Serial(port, 115200, timeout=3)
            time.sleep(2.0)                     # board resets when the port opens
            self.ser.reset_input_buffer()
        self.center()

    def _send(self, cmd):
        if self.sim:
            print(f"   [servo] {cmd}")
            time.sleep(0.05)
            return "OK"
        self.ser.write((cmd + "\n").encode())
        deadline = time.time() + 5
        while time.time() < deadline:
            reply = self.ser.readline().decode(errors="ignore").strip()
            if reply.startswith("OK") or reply.startswith("ERR"):
                return reply
        return "TIMEOUT"

    def move(self, pan, tilt, smooth=True):
        self.pan, self.tilt = float(np.clip(pan, 10, 170)), float(np.clip(tilt, 20, 160))
        return self._send(f"{'P' if smooth else 'J'} {self.pan:.1f} {self.tilt:.1f}")

    def set_laser(self, on):
        self.laser = bool(on)
        return self._send(f"L {1 if on else 0}")

    def center(self):
        self.pan, self.tilt, self.laser = 90.0, 90.0, False
        return self._send("C")


class Camera:
    def __init__(self, index=0, image=None):
        self.still = cv2.imread(image) if image else None
        if image and self.still is None:
            sys.exit(f"Could not read image {image}")
        self.cap = None
        if self.still is None:
            self.cap = cv2.VideoCapture(index)
            self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
            self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
            if not self.cap.isOpened():
                sys.exit("Could not open the webcam. Try --camera 1")

    def read(self, flush=0):
        if self.still is not None:
            return self.still.copy()
        for _ in range(flush):          # throw away stale buffered frames
            self.cap.grab()
        ok, frame = self.cap.read()
        if not ok:
            raise RuntimeError("Camera read failed")
        return frame

# ------------------------------------------------------------------ calibration
def poly_features(uv, size):
    """Cubic terms of normalized pixel coords -> handles lens + pan/tilt geometry bends."""
    w, h = size
    u = (uv[:, 0] - w / 2) / (w / 2)
    v = (uv[:, 1] - h / 2) / (h / 2)
    return np.stack([np.ones_like(u), u, v, u * u, u * v, v * v,
                     u ** 3, u * u * v, u * v * v, v ** 3], axis=1)


class Calibration:
    def __init__(self):
        self.coef = None           # (10, 2) maps pixel features -> (pan, tilt)
        self.size = None
        self.rms = None

    def fit(self, pixels, angles, size):
        pixels, angles = np.asarray(pixels, float), np.asarray(angles, float)
        X = poly_features(pixels, size)
        self.coef, *_ = np.linalg.lstsq(X, angles, rcond=None)
        self.size = size
        err = X @ self.coef - angles
        self.rms = float(np.sqrt((err ** 2).sum(axis=1).mean()))
        return self.rms

    def angles_for(self, u, v):
        if self.coef is None:
            return None
        pan, tilt = (poly_features(np.array([[u, v]], float), self.size) @ self.coef)[0]
        return float(pan), float(tilt)

    def save(self):
        with open(CALIB_FILE, "w") as f:
            json.dump({"coef": self.coef.tolist(), "size": list(self.size), "rms": self.rms}, f)

    def load(self):
        if os.path.exists(CALIB_FILE):
            d = json.load(open(CALIB_FILE))
            self.coef, self.size, self.rms = np.array(d["coef"]), tuple(d["size"]), d["rms"]
            return True
        return False


def find_laser_dot(frame_off, frame_on, min_strength=25):
    """Compare laser-off vs laser-on frames; the dot is the spot that changed the most
    (weighted toward red). Returns (x, y) in pixels or None."""
    diff = cv2.absdiff(frame_on, frame_off).astype(np.float32)
    red_gain = np.clip(frame_on[:, :, 2].astype(np.float32) - frame_off[:, :, 2], 0, 255)
    score = diff.sum(axis=2) / 3 + red_gain
    score = cv2.GaussianBlur(score, (5, 5), 0)
    _, peak, _, loc = cv2.minMaxLoc(score)
    noise = float(np.percentile(score, 99.5))     # camera noise / flicker level
    if peak < max(min_strength, 3 * noise + 10):
        return None
    mask = (score > peak * 0.5).astype(np.uint8)  # centroid of the bright blob
    n, labels, stats, cents = cv2.connectedComponentsWithStats(mask)
    lab = labels[loc[1], loc[0]]
    return (float(cents[lab][0]), float(cents[lab][1])) if lab > 0 else (float(loc[0]), float(loc[1]))


def run_calibration(ptr, cam, show, span_pan=30, span_tilt=18, grid=6):
    """Sweep a grid of angles around the current aim, find the dot each time, fit a model."""
    cp, ct = ptr.pan, ptr.tilt
    pixels, angles = [], []
    pans = np.linspace(cp - span_pan, cp + span_pan, grid)
    tilts = np.linspace(ct - span_tilt, ct + span_tilt, grid)
    print(f"Calibrating: {grid*grid} points around pan {cp:.0f}, tilt {ct:.0f} ...")
    for i, t in enumerate(tilts):
        row = pans if i % 2 == 0 else pans[::-1]        # snake path = shorter moves
        for p in row:
            ptr.set_laser(False)
            ptr.move(p, t, smooth=False)
            off = cam.read(flush=4)
            ptr.set_laser(True)
            time.sleep(0.08)
            on = cam.read(flush=4)
            dot = find_laser_dot(off, on)
            vis = on.copy()
            if dot:
                pixels.append(dot); angles.append((ptr.pan, ptr.tilt))
                cv2.circle(vis, (int(dot[0]), int(dot[1])), 14, (0, 255, 0), 2)
            for q in pixels:
                cv2.circle(vis, (int(q[0]), int(q[1])), 4, (0, 255, 255), -1)
            show(vis, f"Calibrating... {len(pixels)} dots found")
    ptr.set_laser(False)
    if len(pixels) < 12:
        print(f"Only found {len(pixels)} dots. Dim the room lights, aim at the middle of the "
              "work area, or use a smaller span, then press C again.")
        return None
    h, w = on.shape[:2]
    cal = Calibration()
    rms = cal.fit(pixels, angles, (w, h))
    cal.save()
    print(f"Calibration done with {len(pixels)} points. Average error {rms:.2f} degrees "
          f"({'great' if rms < 0.6 else 'ok' if rms < 1.5 else 'rough - try again'}). Saved.")
    return cal

# ------------------------------------------------------------------ part detection
def detect_parts(frame, min_area_frac=0.0003, max_area_frac=0.25):
    """Find separate objects on a plain mat (white paper OR a dark/colored mat both work).
    The background color is estimated from the image border; anything that differs is a part."""
    h, w = frame.shape[:2]
    lab = cv2.cvtColor(cv2.GaussianBlur(frame, (5, 5), 0), cv2.COLOR_BGR2LAB).astype(np.float32)
    border = np.concatenate([lab[:8].reshape(-1, 3), lab[-8:].reshape(-1, 3),
                             lab[:, :8].reshape(-1, 3), lab[:, -8:].reshape(-1, 3)])
    bg = np.median(border, axis=0)
    dist = np.sqrt(((lab - bg) ** 2).sum(axis=2))
    spread = np.percentile(np.sqrt(((border - bg) ** 2).sum(axis=1)), 95)
    mask = (dist > max(18.0, 2.5 * spread)).astype(np.uint8) * 255
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, k, iterations=2)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3)))
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    parts = []
    for c in contours:
        area = cv2.contourArea(c)
        if not (min_area_frac * w * h < area < max_area_frac * w * h):
            continue
        x, y, bw, bh = cv2.boundingRect(c)
        if x <= 2 or y <= 2 or x + bw >= w - 2 or y + bh >= h - 2:
            continue                      # touching the edge = probably not a part
        m = cv2.moments(c)
        if m["m00"] == 0:
            continue
        cx, cy = m["m10"] / m["m00"], m["m01"] / m["m00"]
        parts.append({"box": [x, y, bw, bh], "center": [cx, cy], "name": "?"})
    parts.sort(key=lambda p: (round(p["center"][1] / (h / 4)), p["center"][0]))  # reading order
    for i, p in enumerate(parts, 1):
        p["id"] = i
    return parts


def draw_parts(frame, parts, highlight=None):
    out = frame.copy()
    for p in parts:
        x, y, bw, bh = p["box"]
        col = (0, 0, 255) if p["id"] == highlight else (255, 140, 0)
        cv2.rectangle(out, (x, y), (x + bw, y + bh), col, 2)
        label = f'{p["id"]}' + (f': {p["name"]}' if p["name"] != "?" else "")
        cv2.putText(out, label, (x, max(18, y - 6)), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 0), 4)
        cv2.putText(out, label, (x, max(18, y - 6)), cv2.FONT_HERSHEY_SIMPLEX, 0.6, col, 2)
    return out

# ------------------------------------------------------------------ AI (Claude)
def ai_client():
    if not os.environ.get("ANTHROPIC_API_KEY"):
        return None
    try:
        import anthropic
        return anthropic.Anthropic()
    except ImportError:
        print("Run: pip install anthropic   (AI features off until then)")
        return None


def ask_json(client, content, max_tokens=1500):
    msg = client.messages.create(model=MODEL, max_tokens=max_tokens,
                                 messages=[{"role": "user", "content": content}])
    text = "".join(b.text for b in msg.content if getattr(b, "type", "") == "text")
    text = re.sub(r"```(json)?", "", text).strip()
    start, end = text.find("{"), text.rfind("}")
    return json.loads(text[start:end + 1])


def ai_label_parts(client, frame, parts):
    annotated = draw_parts(frame, parts)
    ok, jpg = cv2.imencode(".jpg", annotated, [cv2.IMWRITE_JPEG_QUALITY, 85])
    img_b64 = base64.b64encode(jpg.tobytes()).decode()
    prompt = (
        "This is a top-down photo of electronics parts on a desk. Each object has a numbered "
        f"box (1 to {len(parts)}). Identify each numbered object as a specific hobby-electronics "
        "part (e.g. 'Arduino Uno', 'SG90 servo', 'HC-SR04 ultrasonic sensor', 'red LED', "
        "'220 ohm resistor', 'breadboard', 'jumper wires', 'photoresistor'). If unsure, give "
        "your best guess and lower confidence. Respond with ONLY JSON: "
        '{"parts":[{"id":1,"name":"...","confidence":0.0}]}')
    data = ask_json(client, [
        {"type": "image", "source": {"type": "base64", "media_type": "image/jpeg", "data": img_b64}},
        {"type": "text", "text": prompt}])
    names = {int(d["id"]): (d["name"], d.get("confidence", 0)) for d in data.get("parts", [])}
    for p in parts:
        if p["id"] in names:
            p["name"], p["conf"] = names[p["id"]]
    return parts


def ai_build_plan(client, parts, goal):
    inventory = "\n".join(f'{p["id"]}: {p["name"]}' for p in parts)
    prompt = (
        f"A beginner wants to build: {goal}\n\nParts on their desk (id: name):\n{inventory}\n\n"
        "Write a short step-by-step assembly guide using ONLY these parts where possible. "
        "Each step handles one part or one connection. Give exact pin names (e.g. 'Arduino pin 9', "
        "'5V', 'GND'). If a needed part is missing, include a step with part_id null that says what "
        "to get. The last step should be uploading code. Respond with ONLY JSON: "
        '{"steps":[{"part_id":1,"instruction":"..."}],"code":"full Arduino sketch"}')
    return ask_json(client, [{"type": "text", "text": prompt}], max_tokens=4000)

# ------------------------------------------------------------------ app
class App:
    def __init__(self, args):
        self.ptr = Pointer(args.port, sim=args.sim)
        self.cam = Camera(args.camera, args.image)
        self.cal = Calibration()
        if self.cal.load():
            print(f"Loaded calibration (avg error {self.cal.rms:.2f} deg).")
        else:
            print("No calibration yet: aim with I/J/K/L at the middle of your work area, then press C.")
        self.parts, self.highlight = [], None
        self.plan, self.step = None, 0
        self.client = ai_client()
        if not self.client:
            print("AI off (no ANTHROPIC_API_KEY). You can still scan and use 'label <n> <name>'.")
        from voice import Speaker, VoiceControl
        self.speaker = Speaker() if args.voice else None
        self.say = self.speaker.say if self.speaker else (lambda t: None)
        self.voice = VoiceControl(self) if args.voice else None
        if self.voice:
            print("Voice on: press V in the camera window, then talk.")
        self.cmds = queue.Queue()
        self.status = "Ready"
        self.running = True
        self.win = "LaserBuddy"
        cv2.namedWindow(self.win)
        cv2.setMouseCallback(self.win, self.on_click)
        self.last_frame = self.cam.read()

    # --- display
    def show(self, frame, status=None):
        if status:
            self.status = status
        vis = draw_parts(frame, self.parts, self.highlight) if self.parts else frame.copy()
        bar = f"{self.status}   | pan {self.ptr.pan:.0f} tilt {self.ptr.tilt:.0f} " \
              f"laser {'ON' if self.ptr.laser else 'off'}"
        cv2.rectangle(vis, (0, vis.shape[0] - 30), (vis.shape[1], vis.shape[0]), (30, 30, 30), -1)
        cv2.putText(vis, bar, (10, vis.shape[0] - 9), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 1)
        cv2.imshow(self.win, vis)
        cv2.waitKey(1)

    # --- pointing
    def point_at_pixel(self, u, v, label=""):
        ang = self.cal.angles_for(u, v)
        if ang is None:
            if self.ptr.sim:   # rough guess so the flow can be tested without hardware
                h, w = self.last_frame.shape[:2]
                ang = (90 - (u - w / 2) / w * 40, 90 + (v - h / 2) / h * 30)
            else:
                print("Calibrate first (press C in the camera window).")
                return
        self.ptr.move(*ang)
        self.ptr.set_laser(True)
        self.status = f"Pointing at {label or f'({u:.0f},{v:.0f})'}"

    def point_at_part(self, part):
        self.highlight = part["id"]
        self.point_at_pixel(*part["center"], label=f'{part["id"]}: {part["name"]}')

    def find_part(self, query):
        query = query.strip().lower()
        if query.isdigit():
            return next((p for p in self.parts if p["id"] == int(query)), None)
        hits = [p for p in self.parts if query in p["name"].lower()]
        if not hits:   # loose word match
            words = set(query.split())
            hits = [p for p in self.parts if words & set(p["name"].lower().split())]
        return hits[0] if hits else None

    def on_click(self, event, x, y, flags, param):
        if event == cv2.EVENT_LBUTTONDOWN:
            self.cmds.put(("click", x, y))

    # --- commands
    def scan(self):
        self.ptr.set_laser(False)
        time.sleep(0.2)
        frame = self.cam.read(flush=5)
        self.parts = detect_parts(frame)
        self.highlight = None
        print(f"Found {len(self.parts)} objects.")
        if self.client and self.parts:
            self.show(frame, "Asking AI what the parts are...")
            try:
                ai_label_parts(self.client, frame, self.parts)
            except Exception as e:
                print("AI labeling failed:", e)
        self.list_parts()
        print("Wrong label? Fix it with:  label <number> <name>")

    def list_parts(self):
        for p in self.parts:
            conf = f'  ({p["conf"]:.0%} sure)' if "conf" in p else ""
            print(f'  {p["id"]:>2}: {p["name"]}{conf}')

    def show_step(self):
        steps = self.plan["steps"]
        s = steps[self.step]
        print(f"\nStep {self.step + 1}/{len(steps)}: {s['instruction']}")
        self.say(s["instruction"])
        part = self.find_part(str(s.get("part_id"))) if s.get("part_id") else None
        if part:
            self.point_at_part(part)
        else:
            self.ptr.set_laser(False); self.highlight = None
        print("   (type 'next' or 'back')")

    def handle(self, cmd):
        if isinstance(cmd, tuple) and cmd[0] == "click":
            self.highlight = None
            self.point_at_pixel(cmd[1], cmd[2])
            return
        verb, _, rest = cmd.strip().partition(" ")
        verb = verb.lower()
        if verb in ("quit", "exit", "q"):
            self.running = False
        elif verb == "scan":
            self.scan()
        elif verb == "parts":
            self.list_parts()
        elif verb == "point":
            part = self.find_part(rest)
            if part:
                self.point_at_part(part)
            else:
                print(f"No part matching '{rest}'. Type 'parts' to see the list.")
        elif verb == "label":
            num, _, name = rest.partition(" ")
            part = self.find_part(num)
            if part and name:
                part["name"] = name.strip(); part.pop("conf", None)
                print(f"Part {part['id']} is now '{part['name']}'.")
        elif verb == "build":
            if not self.parts:
                self.scan()
            if not self.client:
                print("The build guide needs the AI (set ANTHROPIC_API_KEY).")
                return
            print("Planning your build...")
            try:
                self.plan = ai_build_plan(self.client, self.parts, rest)
            except Exception as e:
                print("Planning failed:", e); return
            with open("build_code.ino.txt", "w") as f:
                f.write(self.plan.get("code", ""))
            print("Code saved to build_code.ino.txt (review it before uploading!)")
            self.step = 0
            self.show_step()
        elif verb in ("next", "back") and self.plan:
            n = len(self.plan["steps"])
            self.step = min(n - 1, self.step + 1) if verb == "next" else max(0, self.step - 1)
            self.show_step()
        elif verb == "off":
            self.ptr.set_laser(False)
        elif verb:
            # anything else: treat as a part name
            part = self.find_part(cmd)
            if part:
                self.point_at_part(part)
            else:
                print("Commands: scan, parts, point <x>, label <n> <name>, build <project>, next, back, quit")

    def terminal_thread(self):
        while self.running:
            try:
                line = input("> ")
            except EOFError:
                break
            self.cmds.put(line)

    def run(self):
        threading.Thread(target=self.terminal_thread, daemon=True).start()
        jog = 2.0
        while self.running:
            self.last_frame = self.cam.read()
            self.show(self.last_frame)
            key = cv2.waitKey(15) & 0xFF
            if key != 255:
                k = chr(key).lower()
                moves = {"i": (0, -jog), "k": (0, jog), "j": (jog, 0), "l": (-jog, 0)}
                if k in moves:
                    dp, dt = moves[k]
                    self.ptr.move(self.ptr.pan + dp, self.ptr.tilt + dt, smooth=False)
                    self.ptr.set_laser(True)
                elif k == "o":
                    self.ptr.set_laser(not self.ptr.laser)
                elif k == "c":
                    if self.ptr.sim:
                        print("Calibration needs the real pointer and camera.")
                    else:
                        cal = run_calibration(self.ptr, self.cam, self.show)
                        if cal:
                            self.cal = cal
                elif k == "s":
                    self.cmds.put("scan")
                elif k == "v":
                    if self.voice:
                        self.voice.trigger()
                    else:
                        print("Start with --voice to talk to LaserBuddy.")
                elif k == "q":
                    self.running = False
            while not self.cmds.empty():
                self.handle(self.cmds.get())
        self.ptr.set_laser(False)
        self.ptr.center()
        cv2.destroyAllWindows()


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="LaserBuddy desk companion")
    ap.add_argument("--port", help="serial port of the Arduino/ESP32")
    ap.add_argument("--camera", type=int, default=0, help="webcam index (try 1 if 0 is your laptop cam)")
    ap.add_argument("--image", help="use a still photo instead of the webcam (for testing)")
    ap.add_argument("--sim", action="store_true", help="no pointer hardware; just print commands")
    ap.add_argument("--voice", action="store_true", help="talk to it and hear replies (see voice.py)")
    args = ap.parse_args()
    if not args.port and not args.sim:
        sys.exit("Give --port COMx (or /dev/tty...) or use --sim")
    App(args).run()
    os._exit(0)   # the terminal-input thread may still be waiting; exit cleanly
