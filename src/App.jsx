import { useEffect, useRef, useState } from 'react'
import LaserScene from './LaserScene'
import ActionScene from './ActionScene'
import WiringScene from './WiringScene'
import CadScene from './CadScene'
import WorkbenchContent from './WorkbenchContent'
import wiringDiagram from '../docs/wiring.svg'

const chapters = [
  { id: 'vision', n: '01', label: 'Vision' },
  { id: 'software', n: '02', label: 'Software' },
  { id: 'mechanical', n: '03', label: 'Hardware' },
  { id: 'cad', n: '04', label: 'CAD' },
  { id: 'wiring', n: '05', label: 'Wiring' },
  { id: 'demo', n: '06', label: 'In Action' },
]

export default function App() {
  const progressRef = useRef(0)
  const cadProgressRef = useRef(0)
  const demoProgressRef = useRef(0)
  const cadRef = useRef(null)
  const demoRef = useRef(null)
  const [active, setActive] = useState('hero')
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  useEffect(() => {
    const update = () => {
      const max = document.documentElement.scrollHeight - innerHeight
      progressRef.current = max ? scrollY / max : 0
      if (cadRef.current) {
        const rect = cadRef.current.getBoundingClientRect()
        const travel = Math.max(1, rect.height - innerHeight)
        cadProgressRef.current = Math.max(0, Math.min(1, -rect.top / travel))
      }
      if (demoRef.current) {
        const rect = demoRef.current.getBoundingClientRect()
        const travel = Math.max(1, rect.height - innerHeight)
        const sceneProgress = Math.max(0, Math.min(1, -rect.top / travel))
        demoProgressRef.current = sceneProgress
        demoRef.current.style.setProperty('--scene-p', sceneProgress)
        demoRef.current.style.setProperty('--demo-ui-opacity', Math.max(0, 1 - Math.max(0, sceneProgress - .46) / .2))
      }
      const points = ['hero', ...chapters.map((c) => c.id)]
      let current = points[0]
      points.forEach((id) => {
        const el = document.getElementById(id)
        if (el && el.getBoundingClientRect().top < innerHeight * 0.55) current = id
      })
      setActive(current)
    }
    update()
    addEventListener('scroll', update, { passive: true })
    return () => removeEventListener('scroll', update)
  }, [])

  return (
    <main id="main">
      <a className="skip-link" href="#software">Skip to product information</a>
      <div className="scene-wrap"><LaserScene progressRef={progressRef} reducedMotion={reducedMotion} /></div>
      <header className="topbar">
        <a className="brand" href="#hero"><span className="brand-dot" />LASERBUDDY</a>
        <nav aria-label="Project chapters">
          {chapters.map((item) => <a className={active === item.id ? 'active' : ''} key={item.id} href={`#${item.id}`}>{item.label}</a>)}
        </nav>
      </header>

      <section className="hero panel" id="hero">
        <div className="kicker"><span>DESK-SCALE BUILD ASSISTANT</span><span>2026 / LASERBUDDY</span></div>
        <div className="hero-copy">
          <p className="eyebrow">Build your circuit with a guide beside you.</p>
          <h1>LASER<br/><span>BUDDY</span></h1>
          <p className="lede">Laser Buddy Cam turns a view of your bench into a proposed assembly plan, shows the wiring in 3D, and helps you compare it with your real breadboard. Add configured voice guidance and an optional calibrated laser head for the next connection.</p>
          <p className="site-note">This site introduces the local workbench through 3D illustrations. Camera tracking, AI assistance, projects, and hardware controls run in the complete local app.</p>
          <div className="content-links"><a href="#getting-started">Install locally ↓</a><a href="#software">Explore the workbench ↓</a></div>
        </div>
        <div className="scroll-cue"><span>SCROLL TO DISASSEMBLE</span><i /></div>
        <div className="hero-index">LB—01</div>
      </section>

      <section className="vision-section" id="vision">
        <div className="vision-intro">
          <p className="section-tag">Computer vision · 01</p>
          <h2>It measures.<br/><em>Then it thinks.</em></h2>
          <p>OpenCV finds the supported 830-point breadboard, straightens the camera view, and maps visible objects onto its known hole grid. AI labels component identity separately. Hidden terminals can still require inference and manual confirmation.</p>
        </div>
        <div className="pipeline" aria-label="Image processing pipeline">
          <article><span>01 / REGISTER</span><b>Find the board</b><p>Board pose establishes a camera-to-board map for the supported profile.</p></article>
          <article><span>02 / RECTIFY</span><b>Straighten the view</b><p>Perspective is removed before components and endpoints are measured.</p></article>
          <article><span>03 / MAP</span><b>Resolve the holes</b><p>Visible footprints and wire endpoints map to holes; modeled nodes guide comparison.</p></article>
          <article><span>04 / TRACK</span><b>Keep stable IDs</b><p>Parts persist across frames, reducing flicker and repeated identification.</p></article>
        </div>
        <div className="truth-strip">
          <div><span>MEASURED</span><strong>visible geometry · position · size · angle</strong></div>
          <div><span>INFERRED / MODELED</span><strong>identity · hidden leads · connectivity · possible issues</strong></div>
        </div>
      </section>

      <section className="software-section" id="software">
        <div className="software-copy">
          <p className="section-tag">Local workbench · 02</p>
          <h2>Your bench,<br/><em>in view.</em></h2>
          <p>In the local workbench, inspect the observed board beside the intended 3D build and follow ordered wiring steps. Configured assistance can explain a step, inspect progress, locate a part, or target a hole with connected hardware.</p>
          <ul>
            <li><b>Plan vs reality</b><span>Placed, misplaced, missing, not-yet-reached, unverified, or extra</span></li>
            <li><b>Modeled connectivity</b><span>A20 and E20 share a terminal node; no voltage or continuity measurement</span></li>
            <li><b>Calibrated aiming</b><span>Optional hardware; last calibration RMS error reported in millimeters</span></li>
          </ul>
        </div>
        <div className="macbook" role="img" aria-label="Illustrative local workbench screen, not a live camera or hardware session">
          <div className="laptop-lid">
            <div className="camera-dot" />
            <div className="app-window">
              <div className="app-top"><b>LASERBUDDY</b><span>LOCAL WORKBENCH</span><i>ILLUSTRATION</i></div>
              <div className="app-body">
                <aside><small>PROJECT</small><strong>LED blink</strong><div className="mock-steps"><b>01</b><span>Place resistor</span><b>02</b><span>Seat LED</span><b>03</b><span>Connect ground</span></div><span className="mock-control">Ask LaserBuddy</span></aside>
                <div className="board-view">
                  <div className="scan-grid" />
                  <div className="breadboard">
                    {Array.from({ length: 54 }, (_, i) => <i key={i} />)}
                    <div className="sim-resistor"><span /></div>
                    <div className="laser-target"><span>E20</span></div>
                  </div>
                  <div className="detection-card"><span>EXAMPLE PART</span><b>Resistor</b><small>Illustrative placement</small></div>
                </div>
                <aside className="guidance"><small>NEXT STEP</small><strong>Place the resistor</strong><p>Review the lead placement against the plan.</p><div><span>OPTIONAL LASER</span><b>Calibration required</b></div><span className="mock-control">Point at E20</span></aside>
              </div>
            </div>
          </div>
          <div className="laptop-base"><i /></div>
          <p className="illustration-note">Illustration of the local app. Controls on this screen are part of the illustration.</p>
        </div>
        <WorkbenchContent />
      </section>

      <section className="chapter mechanical" id="mechanical">
        <div className="chapter-copy left">
          <p className="section-tag">Hardware · 03</p>
          <h2>Two axes.<br/>One optional<br/><em>pointer.</em></h2>
          <p className="body-copy">A serial-connected Arduino head uses two servos and a switched laser to point at a requested breadboard hole. Connect the rig, run board tracking, and calibrate the camera-to-servo map before targeting.</p>
          <div className="spec-grid">
            <div><strong>2</strong><span>SERVO AXES</span></div>
            <div><strong>USB</strong><span>SERIAL CONNECTION</span></div>
            <div><strong>RMS</strong><span>CALIBRATION ERROR</span></div>
            <div><strong>15 s</strong><span>NO-COMMAND BEAM TIMEOUT</span></div>
          </div>
          <p className="body-copy">Accuracy depends on setup. Recalibrate after moving the head or camera; movement is not automatically detected. Keep the beam away from eyes. The timeout is not an eye-safety certification.</p>
        </div>
      </section>

      <section className="cad-section" id="cad" ref={cadRef}>
        <div className="cad-sticky">
          <CadScene progressRef={cadProgressRef} reducedMotion={reducedMotion} />
          <div className="cad-heading">
            <p className="section-tag">CAD · 04</p>
            <h2>Designed to<br/><em>fit first.</em></h2>
            <p>The actual printable geometry transitions from the finished assembly into its four production parts as you scroll.</p>
          </div>
          <div className="cad-dimensions">
            <span>22.2—23.0 MM <small>SERVO LENGTH</small></span>
            <span>11.8—12.2 MM <small>SERVO WIDTH</small></span>
            <span>Ø 6.3 MM <small>LASER BORE</small></span>
          </div>
          <div className="part-ledger" aria-label="CAD part list">
            <div><span>LB–BASE</span><b>01</b><small>Servo shell + mounting feet</small></div>
            <div><span>LB–PAN</span><b>02</b><small>Rotary deck + tilt tower</small></div>
            <div><span>LB–LASER</span><b>03</b><small>6.3 mm pointer carrier</small></div>
            <div><span>LB–CAM</span><b>04</b><small>¼–20 webcam adapter</small></div>
          </div>
        </div>
      </section>

      <section className="wiring-section" id="wiring">
        <div className="wiring-heading">
          <p className="section-tag">Wiring · 05</p>
          <h2>Seven wires.<br/><em>One shared ground.</em></h2>
        </div>
        <div className="wiring-3d"><WiringScene /></div>
        <div className="wiring-panel">
          <div className="wiring-copy">
            <span>OPTIONAL HEAD / REPOSITORY WIRING</span>
            <h3>Signal in.<br/>Motion out.</h3>
            <p>Pan signal goes to D9. Tilt signal goes to D10. D7 switches the 650 nm laser through a PN2222 transistor and 1 kΩ resistor. Servos take external 5 V power; the Arduino and supply share ground.</p>
            <div className="pin-row"><b>D9</b><span>PAN</span><b>D10</b><span>TILT</span><b>D7</b><span>LASER</span></div>
          </div>
          <figure><img src={wiringDiagram} alt="LaserBuddy Arduino, servo, and laser wiring diagram" /></figure>
        </div>
      </section>

      <section className="demo-scene" id="demo" ref={demoRef}>
        <div className="demo-sticky">
          <ActionScene progressRef={demoProgressRef} reducedMotion={reducedMotion} />
          <div className="demo-vignette" />
          <div className="demo-hud top"><span>3D PRODUCT ILLUSTRATION</span><span>OVERHEAD → USER POV → DISPLAY</span></div>
          <div className="demo-title">
            <p className="section-tag">In action · 06</p>
            <h2>It points.<br/><em>You build.</em></h2>
          </div>
          <div className="target-readout">
            <span>ILLUSTRATIVE TARGET</span><b>RESISTOR</b><small>NO LIVE CAMERA OR HARDWARE</small>
          </div>
          <p className="demo-caption">The complete local workbench combines camera mapping, configured assistance, and optional hardware. This animated scene illustrates that workflow.</p>
        </div>
      </section>
      <footer>
        <a className="footer-brand" href="#hero"><span className="brand-dot" />LASERBUDDY</a>
        <p>Measured guidance for real hardware.</p>
        <a href="https://github.com/Panchangam30/laser-buddy-cam" target="_blank" rel="noreferrer">VIEW SOURCE ↗</a>
        <div className="makers"><span>CAMERA → BOARD MAP → GUIDANCE → LASER</span><strong>OPEN SOURCE</strong></div>
      </footer>
    </main>
  )
}
