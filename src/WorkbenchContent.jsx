import { useState } from 'react'

const source = 'https://github.com/Panchangam30/laser-buddy-cam'

const features = [
  ['01 / SCAN', 'Start with your parts', 'Capture your bench to identify visible parts with confidence and receive a proposed plan with placements, ordered steps, requirements, and warnings. Review uncertain values before building. Requires camera permission, the local Node API, an OpenAI key, and connectivity.'],
  ['02 / BUILD', 'Follow the wiring', 'Inspect the target breadboard, parts, jumpers, and external devices in 3D. Step highlighting and exploded views clarify orientation. Explore 32 visual starter-kit entries: add, move, rotate, remove, and connect visual jumpers. Model availability does not guarantee recognition or verified wiring.'],
  ['03 / COMPARE', 'Check your board', 'The local Python/OpenCV service maps visible placements to the supported board grid; AI labels identity separately. Plan and My board compare modeled electrical nodes, including equivalent holes. Review missing parts, misplaced connections, and possible rail, LED, or crowded-node issues.'],
  ['04 / ASK', 'A guide beside you', 'Configured voice assistance can explain steps, inspect a fresh frame, rescan, check progress, and help find the next connection. Text input is also supported. Live voice needs microphone permission, the local API, a selected provider key, and connectivity; optional narration uses configured xAI speech.'],
  ['05 / POINT', 'Reach the next hole', 'An optional serial-connected, calibrated pan/tilt laser head can target a named hole or the next guidance target. Manual nudge, angle, power, and center controls are available. A phone remote offers start/stop and aiming for a reachable local workbench, with the main tab open for camera actions.'],
  ['06 / KEEP', 'Review your progress', 'Plans and step progress persist in the browser’s IndexedDB library. Export JSON or use a compatible share link to give someone an independent editable copy. A local timeline keeps up to 300 recent structured board snapshots for scrubbing and playback; exported history can support instructor review.'],
]

const questions = [
  ['Is this a circuit simulator?', 'The workbench has 3D wiring guidance and an animated behavior preview with component animation, moving wire signals, speed, pause, and inclusion controls. It has no electrical solver, Arduino emulator, or sketch execution. Jumper attachments in the editor are visual connections, not proof of pin-level correctness. Upload supplied code with the Arduino IDE and perform the lesson’s manual observable test.'],
  ['What can the camera verify?', 'Geometry and modeled connectivity support placement guidance, not measurements of voltage, current, resistance, firmware output, or spring-contact continuity. Bare leads, resistor terminals, and off-board wiring may need manual confirmation. Same-color touching parts can merge; red rail wires can split during stripe removal; board edges receive lower confidence. Review polarity, power requirements, and actual wiring before powering hardware. These checks are not a safety certification.'],
  ['Which boards and circuit goals are supported?', 'The current locator uses the supplied 830-point solderless breadboard profile: rows A–J, 63 columns, and 2.54 mm pitch. Registered perfboard and PCB locators are unavailable. Choose an authored tutorial, scan parts for a proposed plan, or use the limited deterministic named-goal catalog, which includes a button-controlled servo sweep. Unsupported named goals are refused. Structural validation of a generated plan does not guarantee circuit safety or success.'],
  ['How does calibrated aiming work?', 'Camera-based calibration maps servo angles to board positions and reports RMS error in millimeters. Half the 2.54 mm board pitch is 1.27 mm, a tolerance reference rather than promised accuracy. Tracking must run during browser-driven calibration. Moving the camera or head requires recalibration; the workbench does not automatically detect that movement. Keep the beam away from eyes.'],
  ['What leaves my computer?', 'Projects persist locally, without an account or remote project database. Camera frames are processed by local services, but images or crops can be sent to OpenAI for planning and identification. Voice uses the configured provider. Local storage is not a promise of offline processing or a provider retention policy. This website loads fonts from Google Fonts; see your chosen providers’ policies for their processing and retention terms.'],
  ['What do exports, links, and replay contain?', 'Exports include the plan, required parts, code artifacts, progress, and recorded snapshots when present. Snapshots hold structured board measurements, possible wiring issues, and the plan and step at that moment—not camera images or audio. Imports create separate local copies. Recipients can read shared text, code, and snapshots. Freeform editor additions are held in React state and are not all saved or exported. There is no cloud sync, automatic cross-device backup, or live shared document.'],
  ['Where can I open a shared project?', 'Use a compatible workbench that handles project fragments. This introduction site does not import projects or open their shared fragments. Links use the running app’s origin; localhost and private-LAN addresses are not automatically reachable by others. JSON is the fallback for large projects or browsers without compression support: file imports are limited to 10 MB and links to 32,000 characters. Replay travels with JSON; voice and laser guidance use the live board even while a historical snapshot is displayed.'],
  ['Does the phone provide a second camera?', 'No. It queues camera actions for the main computer’s open workbench tab. The phone must reach the running local service over the network, and laser actions need connected hardware. Opening this public site cannot control a disconnected local rig.'],
  ['What else is included in the source project?', 'Separate terminal tools include identify.py for webcam identification and explanations, an optional speech helper, standalone camera/debug mode, synthetic detector tests, and a simulated laser head. A separate pixel-following laser utility calibrates against a surface and depends on the target remaining near that depth. These are development or terminal tools, not browser features or universal 3D tracking.'],
]

const tour = [
  { label: 'Scan', title: 'Parts become a plan.', copy: 'Identify visible parts. Review a proposed build.', need: 'Camera · local API · OpenAI', detail: 'Review uncertain identities and wiring before building.', readout: ['RESISTOR', 'Value needs review'], mode: 'scan' },
  { label: 'Build', title: 'One connection at a time.', copy: 'Rotate the wiring. Explore 32 starter-kit models.', need: 'Browser · WebGL', detail: 'Animated behavior preview; no electrical solver or code execution.', readout: ['STEP 02', 'Place the LED'], mode: 'build' },
  { label: 'Compare', title: 'Plan meets real board.', copy: 'See what’s placed, missing, or needs another look.', need: 'Camera · local vision · AI labels', detail: 'Visible placements and modeled nodes; confirm hidden leads manually.', readout: ['MY BOARD', 'Review this connection'], mode: 'compare' },
  { label: 'Ask', title: 'Ask. Look again. Learn.', copy: 'Talk through a step or ask the assistant to inspect progress.', need: 'Microphone · local API · provider key', detail: 'Optional configured voice and narration; text input also supported.', readout: ['TEACHING ASSISTANT', 'Let’s check the next step'], mode: 'voice' },
  { label: 'Point', title: 'The next hole, in sight.', copy: 'Optional laser guidance, with a phone remote beside you.', need: 'Connected rig · calibration · reachable local app', detail: 'Setup-dependent targeting. Recalibrate after movement; keep away from eyes.', readout: ['TARGET', 'E20 · calibration required'], mode: 'point' },
  { label: 'Keep', title: 'Your build has a story.', copy: 'Save progress. Replay changes. Share an independent copy.', need: 'Compatible local workbench', detail: 'Up to 300 structured snapshots. JSON or links; no video or cloud sync.', readout: ['BUILD TIMELINE', 'Snapshot 08 / 12'], mode: 'replay' },
]

const lessons = {
  LEDs: ['First LED blink', 'Double-flash beacon', 'Heartbeat light'],
  Buttons: ['Press-to-light LED', 'Toggle LED switch', 'Release-to-light LED'],
  Analog: ['Read a potentiometer', 'Knob voltage meter', 'Knob LED dimmer'],
  Servos: ['Button-controlled servo sweep', 'Automatic servo sweep', 'Knob-controlled servo'],
  Sound: ['First piezo beep', 'Button doorbell', 'Hold-to-buzz'],
}

function BoardMockup({ mode }) {
  return <div className={`bench-art art-${mode}`} aria-hidden="true">
    <div className="bench-grid" />
    <div className="art-board">
      <div className="art-rail rail-top" />
      <div className="art-holes">{Array.from({ length: 140 }, (_, i) => <i key={i} />)}</div>
      <div className="art-channel" />
      <div className="art-rail rail-bottom" />
      <div className="art-resistor"><i /><i /><i /></div>
      <div className="art-led"><i /></div>
      <svg className="art-wires" viewBox="0 0 400 240"><path d="M80 160 C40 25 270 20 275 126"/><path d="M160 150 C190 210 350 205 325 80"/></svg>
      {(mode === 'scan' || mode === 'compare') && <><div className="part-box"><span>{mode === 'scan' ? 'PART FOUND' : 'CHECK LEADS'}</span></div><div className="scan-line" /></>}
      {mode === 'point' && <div className="art-target"><i /><span>E20</span></div>}
    </div>
    <div className="art-uno"><span>UNO</span><i /><b>USB</b><div /></div>
    {mode === 'build' && <div className="floating-tools"><span>＋</span><span>↻</span><span>↗</span><small>VISUAL EDITOR</small></div>}
    {mode === 'voice' && <div className="voice-float"><span>TALK TO THE TA</span><div className="voice-bars">{Array.from({length:23},(_,i)=><i key={i} style={{'--bar':`${14 + ((i * 17) % 42)}px`, '--delay':`${i * .06}s`}} />)}</div><p>“What should I connect next?”</p><small>Configured voice assistance</small></div>}
    {mode === 'point' && <div className="phone-float"><div className="phone-notch"/><small>BENCH REMOTE</small><b>Target E20</b><div className="aim-pad"><span>↑</span><span>← ＋ →</span><span>↓</span></div><span className="phone-status">LOCAL WORKBENCH</span></div>}
    {mode === 'replay' && <div className="replay-float"><span>BUILD HISTORY</span><div className="replay-ticks">{Array.from({length:12},(_,i)=><i key={i} className={i===7?'selected':''}/>)}</div><div><small>01 — START</small><b>08 / 12</b><small>RETURN TO LIVE ↗</small></div></div>}
  </div>
}

function LessonArt({ category, index }) {
  return <div className={`lesson-art lesson-${category.toLowerCase()}`} aria-hidden="true">
    <div className="lesson-disc" />
    {category === 'LEDs' ? <div className="lesson-led"><i/><b/><span/></div> :
      category === 'Buttons' ? <div className="lesson-button"><i/><b/></div> :
      category === 'Analog' ? <div className="lesson-knob"><i style={{transform:`rotate(${index * 55 - 35}deg)`}}/></div> :
      category === 'Servos' ? <div className="lesson-servo"><i style={{transform:`rotate(${index * 40 - 25}deg)`}}/><b/></div> :
      <div className="lesson-piezo"><i/><span>♪</span></div>}
    <span className="lesson-art-label">{['EXPLORE', 'CONNECT', 'TEST'][index]} / 0{index+1}</span>
  </div>
}

export default function WorkbenchContent() {
  const [slide, setSlide] = useState(0)
  const [category, setCategory] = useState('LEDs')
  const current = tour[slide]
  const move = direction => setSlide(value => (value + direction + tour.length) % tour.length)

  return <div className="workbench-content visual-content">
    <div className="visual-heading" id="workbench-tour">
      <div><p className="section-tag">Inside the local workbench</p><h3>Less guesswork.<br/><em>More building.</em></h3></div>
      <span className="local-badge"><i/>LOCAL APP FEATURES · ILLUSTRATED</span>
    </div>
    <div className="product-tour" role="region" aria-roledescription="carousel" aria-label="Local workbench feature tour">
      <div className="tour-tabs" aria-label="Choose a feature">
        {tour.map((item,index)=><button key={item.mode} type="button" aria-pressed={slide===index} onClick={()=>setSlide(index)}><span>0{index+1}</span>{item.label}</button>)}
      </div>
      <div className="tour-display">
        <div className="tour-screen" role="img" aria-label={`Illustration: ${current.title} No live camera or hardware controls.`}>
          <div className="tour-screen-bar"><b>LASERBUDDY</b><span>WORKBENCH PREVIEW</span><i>ILLUSTRATION</i></div>
          <BoardMockup mode={current.mode} />
          <div className="tour-readout"><span>{current.readout[0]}</span><b>{current.readout[1]}</b></div>
          <div className="screen-corner">{current.mode==='compare'?'PLAN ↔ MY BOARD':'830-POINT WORKSPACE'}</div>
        </div>
        <div className="tour-caption" aria-live="polite" aria-atomic="true">
          <span className="tour-number">0{slide+1} / 06</span><h4>{current.title}</h4><p>{current.copy}</p>
          <div className="requirement-chip">{current.need}</div>
          <small>{current.detail}</small>
          <div className="tour-controls"><button type="button" onClick={()=>move(-1)} aria-label="Previous feature">←</button><div className="tour-dots">{tour.map((item,index)=><i key={item.mode} className={index===slide?'selected':''}/>)}</div><button type="button" onClick={()=>move(1)} aria-label="Next feature">→</button></div>
        </div>
      </div>
    </div>

    <div className="visual-heading" id="learning"><div><p className="section-tag">Start small. Build confidence.</p><h3>Your first<br/><em>“It works.”</em></h3></div><div className="lesson-count"><strong>50</strong><span>AUTHORED LESSONS<br/>5 CATEGORIES · 10 EACH</span></div></div>
    <div className="lesson-filter" aria-label="Preview tutorial categories">{Object.keys(lessons).map(name=><button type="button" key={name} aria-pressed={name===category} onClick={()=>setCategory(name)}>{name}</button>)}</div>
    <div className="lesson-gallery" aria-live="polite">
      {lessons[category].map((title,index)=><article className="lesson-card" key={title}><LessonArt category={category} index={index}/><div className="lesson-card-copy"><span>{category} / BEGINNER</span><h4>{title}</h4><div className="lesson-tags"><span>3D wiring</span><span>Arduino code</span><span>Manual test</span></div></div></article>)}
    </div>
    <div className="learning-mini-grid">
      <article><div className="symptom-preview" aria-hidden="true"><span>⌕ &nbsp; Find a symptom</span><div><b>Power & USB</b><i>↗</i></div><div><b>Breadboards & wiring</b><i>↗</i></div><div><b>Code & logic</b><i>↗</i></div></div><div><strong>216</strong><h4>Symptoms, sorted.</h4><p>12 help categories. Shared checks and official Arduino resources.</p></div></article>
      <article><div className="challenge-preview" aria-hidden="true"><div className="challenge-led"><i/></div><span>WHAT’S WRONG?</span><b>A &nbsp; LED polarity</b><small>HINT 01 → 02 → 03</small></div><div><strong>8</strong><h4>Spot the fault.</h4><p>3D diagnosis challenges, hints, and feedback. Plus 11 beginner guides.</p></div></article>
    </div>
    <p className="visual-footnote">Lesson and Hub previews show the local app’s content. Open the local workbench to build. {category==='Servos'?'Servo lessons need a separate regulated 5 V supply and common ground.':category==='Sound'?'Sound lessons use a small passive piezo.':'Authored lessons need no provider key once the app is available.'}</p>

    <div className="visual-heading" id="getting-started"><div><p className="section-tag">Bring it to your bench</p><h3>Start with the basics.<br/><em>Add the extras.</em></h3></div><a className="source-button" href={source} target="_blank" rel="noreferrer">View source & setup ↗</a></div>
    <div className="bench-requirements">
      <article><span>01 / THE BUILD</span><div className="equipment-icon">▦</div><h4>Board + parts</h4><p>Arduino, USB data cable, 830-point breadboard, jumpers, and lesson parts.</p></article>
      <article><span>02 / THE VIEW</span><div className="equipment-icon">◎</div><h4>Camera + local app</h4><p>WebGL for 3D. Webcam and local services for tracking; configured AI for labels and scans.</p></article>
      <article><span>03 / OPTIONAL</span><div className="equipment-icon">⌖</div><h4>Voice + pointer</h4><p>Provider access for voice. Connected, calibrated hardware for laser targeting.</p></article>
    </div>
    <details className="install-drawer"><summary><span>Local installation</span><span>VIEW COMMANDS ＋</span></summary><div className="install-content"><p>Clone the source project. Run from its root; configure only the providers you need.</p><pre><code>{`python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
cp .env.example .env
# Edit root .env for your chosen features.
cd web
npm install
npm run dev`}</code></pre><p>Open <code>http://localhost:5173</code>. Node API: :8787 · Python vision: :8788. Keep keys server-side in the root <code>.env</code>; never use <code>VITE_</code> for a secret.</p></div></details>

    <details className="technical-drawer" id="workbench-faq"><summary><span>Good to know</span><span>LIMITS, PRIVACY & SHARING ＋</span></summary><div className="faq-block"><p className="visual-footnote">Visible-placement guidance needs manual wiring checks. AI requests may go to configured providers. This site is a product introduction.</p>{questions.map(([question,answer])=><details key={question}><summary>{question}</summary><p>{answer}</p></details>)}<details><summary>Full feature requirements</summary>{features.map(([tag,title,copy])=><div className="feature-detail" key={tag}><b>{title}</b><p>{copy}</p></div>)}</details></div></details>
  </div>
}
