"""
Voice for LaserBuddy: listen (speech-to-text), understand (turn speech into an app
command), and talk (text-to-speech in your cloned ElevenLabs voice).

    Listen:     press V in the camera window, talk, then pause. Recording stops after
                about 1 second of silence (or 8 seconds max).
    Understand: the words become one of the app's normal commands (scan, point servo,
                build ..., next, back ...). With a Claude API key it understands loose
                phrasing ("which one's the sensor?"); without one it uses keywords.
    Talk:       ElevenLabs if ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID are set,
                otherwise the computer's built-in voice. Every sentence is cached in
                voice_cache/, so repeated lines play instantly and cost no credits.

Setup (see BUILD_GUIDE.md):
    pip install sounddevice faster-whisper requests pyttsx3
"""
import hashlib, json, os, queue, re, threading, time
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
CACHE_DIR = os.path.join(HERE, "voice_cache")
RATE = 16000

# ------------------------------------------------------------------ talking
class Speaker:
    """Speaks sentences one at a time on a background thread so the app never freezes."""
    def __init__(self):
        self.key = os.environ.get("ELEVENLABS_API_KEY")
        self.voice_id = os.environ.get("ELEVENLABS_VOICE_ID")
        self.model = os.environ.get("ELEVENLABS_MODEL", "eleven_flash_v2_5")
        self.q = queue.Queue()
        self.busy = threading.Event()
        self.engine = None
        mode = "ElevenLabs" if (self.key and self.voice_id) else "built-in voice"
        print(f"Voice output: {mode}")
        threading.Thread(target=self._run, daemon=True).start()

    def say(self, text):
        if text:
            self.q.put(text)

    def _run(self):
        while True:
            text = self.q.get()
            self.busy.set()
            try:
                if self.key and self.voice_id:
                    self._play_pcm(self._eleven(text))
                else:
                    self._builtin(text)
            except Exception as e:
                print("Speech failed:", e)
                try:
                    self._builtin(text)
                except Exception:
                    pass
            self.busy.clear()

    def _cache_path(self, text):
        h = hashlib.sha1(f"{self.voice_id}|{self.model}|{text}".encode()).hexdigest()[:16]
        return os.path.join(CACHE_DIR, h + ".pcm")

    def _eleven(self, text):
        path = self._cache_path(text)
        if os.path.exists(path):
            return open(path, "rb").read()
        import requests
        r = requests.post(
            f"https://api.elevenlabs.io/v1/text-to-speech/{self.voice_id}",
            params={"output_format": "pcm_16000"},
            headers={"xi-api-key": self.key, "Content-Type": "application/json"},
            json={"text": text, "model_id": self.model}, timeout=30)
        r.raise_for_status()
        os.makedirs(CACHE_DIR, exist_ok=True)
        with open(path, "wb") as f:
            f.write(r.content)
        return r.content

    def _play_pcm(self, pcm):
        import sounddevice as sd
        audio = np.frombuffer(pcm, dtype=np.int16)
        sd.play(audio, RATE)
        sd.wait()

    def _builtin(self, text):
        if self.engine is None:
            import pyttsx3
            self.engine = pyttsx3.init()
        self.engine.say(text)
        self.engine.runAndWait()

    def pregenerate(self, lines):
        """Make and cache common lines ahead of time (run once: python voice.py --cache)."""
        for t in lines:
            if not os.path.exists(self._cache_path(t)):
                print("  caching:", t)
                self._eleven(t)

# ------------------------------------------------------------------ listening
class Listener:
    def __init__(self, model_size="base.en"):
        from faster_whisper import WhisperModel      # runs offline on your laptop, free
        print(f"Loading speech recognition ({model_size}) ... first run downloads ~150 MB")
        self.model = WhisperModel(model_size, device="cpu", compute_type="int8")

    def record(self, max_s=8.0, silence_s=1.0, start_timeout=4.0):
        """Record from the mic until the speaker pauses."""
        import sounddevice as sd
        block = int(RATE * 0.05)
        chunks, started, quiet, t0 = [], False, 0.0, time.time()
        noise = None
        with sd.InputStream(samplerate=RATE, channels=1, dtype="float32", blocksize=block) as stream:
            while True:
                data, _ = stream.read(block)
                level = float(np.sqrt((data ** 2).mean()))
                if noise is None:
                    noise = level
                loud = level > max(0.01, noise * 3)
                if loud:
                    started, quiet = True, 0.0
                elif started:
                    quiet += 0.05
                if started:
                    chunks.append(data.copy())
                elapsed = time.time() - t0
                if (started and quiet >= silence_s) or elapsed > max_s or (not started and elapsed > start_timeout):
                    break
        return np.concatenate(chunks)[:, 0] if chunks else None

    def transcribe(self, audio):
        if audio is None or len(audio) < RATE * 0.3:
            return ""
        segments, _ = self.model.transcribe(audio, language="en", beam_size=1, vad_filter=True)
        return " ".join(s.text for s in segments).strip()

# ------------------------------------------------------------------ understanding
COMMANDS_HELP = (
    "scan | point <part name or number> | build <project description> | next | back | "
    "label <number> <name> | off | none")

def keyword_intent(text, part_names):
    """No-AI fallback: map common phrases to app commands."""
    t = text.lower().strip(" .!?")
    if not t:
        return None, None
    if re.search(r"\b(next|done|finished|got it|okay next)\b", t):
        return "next", None
    if re.search(r"\b(back|previous|go back|repeat)\b", t):
        return "back", None
    if re.search(r"\b(scan|look at|what('s| is) on)\b.*\b(desk|table|parts)\b|^scan", t):
        return "scan", "Scanning your parts."
    m = re.search(r"\b(?:build|make|i want to (?:build|make))\s+(.*)", t)
    if m:
        return f"build {m.group(1)}", "Let's build it."
    if re.search(r"\b(turn off|laser off|stop)\b", t):
        return "off", "Laser off."
    for name in sorted(part_names, key=len, reverse=True):     # "where's the servo"
        words = [w for w in re.split(r"[\s()]+", name.lower()) if len(w) > 2]
        if any(w in t for w in words):
            return f"point {name}", f"Here's the {name}."
    return None, "Sorry, I didn't catch that. Try: scan, where is the servo, next, or back."


def ai_intent(client, model, text, parts, step_text):
    inventory = ", ".join(f'{p["id"]}: {p["name"]}' for p in parts) or "nothing scanned yet"
    prompt = (
        "You are the voice of LaserBuddy, a desk robot that points a laser at electronics parts "
        "and guides a student through a build. Convert what the student said into ONE app command.\n"
        f"Commands: {COMMANDS_HELP}\n"
        f"Parts on the desk: {inventory}\n"
        f"Current build step: {step_text or 'none'}\n"
        f'Student said: "{text}"\n'
        'Reply with ONLY JSON: {"command": "...", "say": "short friendly spoken reply, max 20 words"}. '
        'Use "none" when they are just asking a question, and answer it in "say".')
    msg = client.messages.create(model=model, max_tokens=300,
                                 messages=[{"role": "user", "content": prompt}])
    raw = "".join(b.text for b in msg.content if getattr(b, "type", "") == "text")
    raw = raw[raw.find("{"): raw.rfind("}") + 1]
    d = json.loads(raw)
    cmd = (d.get("command") or "").strip()
    return (None if cmd in ("", "none") else cmd), d.get("say")

# ------------------------------------------------------------------ glue
class VoiceControl:
    """Press V -> listen -> command goes into the app's normal command queue."""
    def __init__(self, app):
        self.app = app
        self.listener = None
        self.listening = threading.Event()

    def trigger(self):
        if self.listening.is_set():
            return
        threading.Thread(target=self._listen_once, daemon=True).start()

    def _listen_once(self):
        self.listening.set()
        try:
            if self.listener is None:
                self.listener = Listener()
            while self.app.speaker.busy.is_set():      # don't record our own voice
                time.sleep(0.05)
            self.app.status = "Listening..."
            text = self.listener.transcribe(self.listener.record())
            if not text:
                self.app.status = "Didn't hear anything"
                return
            print(f'\n[you said] "{text}"')
            parts = self.app.parts
            step = self.app.plan["steps"][self.app.step]["instruction"] if self.app.plan else ""
            cmd, reply = None, None
            if self.app.client:
                try:
                    from laserbuddy import MODEL
                    cmd, reply = ai_intent(self.app.client, MODEL, text, parts, step)
                except Exception as e:
                    print("AI intent failed, using keywords:", e)
            if cmd is None and reply is None:
                cmd, reply = keyword_intent(text, [p["name"] for p in parts])
            if reply:
                self.app.speaker.say(reply)
            if cmd:
                print(f"[command] {cmd}")
                self.app.cmds.put(cmd)
        except Exception as e:
            print("Voice error:", e)
        finally:
            self.listening.clear()


COMMON_LINES = ["Scanning your parts.", "Let's build it.", "Laser off.",
                "Sorry, I didn't catch that. Try: scan, where is the servo, next, or back.",
                "Calibration done.", "Hi! Show me your parts and tell me what you want to build."]

if __name__ == "__main__":
    import sys
    if "--cache" in sys.argv:
        Speaker().pregenerate(COMMON_LINES)
    elif "--test" in sys.argv:
        sp = Speaker(); sp.say("Hi! This is LaserBuddy."); time.sleep(0.5)
        while sp.busy.is_set() or not sp.q.empty():
            time.sleep(0.1)
        print("Now say something...")
        L = Listener(); print("Heard:", L.transcribe(L.record()))
    else:
        print("python voice.py --test    check speaker + microphone\n"
              "python voice.py --cache   pre-make common lines in your ElevenLabs voice")
