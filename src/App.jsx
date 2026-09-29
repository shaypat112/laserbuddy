import { useEffect, useRef, useState } from 'react'
import LaserScene from './LaserScene'
import ActionScene from './ActionScene'
import WiringScene from './WiringScene'
import CadScene from './CadScene'
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
    <main>
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
          <p className="eyebrow">A camera-aware lab TA for your breadboard.</p>
          <h1>LASER<br/><span>BUDDY</span></h1>
          <p className="lede">LaserBuddy maps what you actually built, checks it against the plan, talks you through the fix, and puts a laser dot on the exact hole you need next.</p>
        </div>
        <div className="scroll-cue"><span>SCROLL TO DISASSEMBLE</span><i /></div>
        <div className="hero-index">LB—01</div>
      </section>

      <section className="vision-section" id="vision">
        <div className="vision-intro">
          <p className="section-tag">Computer vision · 01</p>
          <h2>It measures.<br/><em>Then it thinks.</em></h2>
          <p>Coordinates never come from a guess. OpenCV finds the board, straightens the camera view, and resolves every detected component against the breadboard’s physical grid. AI identifies the part—not its position.</p>
        </div>
        <div className="pipeline" aria-label="Image processing pipeline">
          <article><span>01 / REGISTER</span><b>Find the board</b><p>Anchor detection solves a camera-to-board homography in millimetres.</p></article>
          <article><span>02 / RECTIFY</span><b>Straighten the view</b><p>Perspective is removed before components and endpoints are measured.</p></article>
          <article><span>03 / MAP</span><b>Resolve the holes</b><p>Blobs snap to named board locations and electrical nodes—not loose pixels.</p></article>
          <article><span>04 / TRACK</span><b>Keep stable IDs</b><p>Parts persist across frames, reducing flicker and repeated identification.</p></article>
        </div>
        <div className="truth-strip">
          <div><span>MEASURED</span><strong>position · size · angle · nodes · faults</strong></div>
          <div><span>INFERRED</span><strong>part identity · printed value · confidence</strong></div>
        </div>
      </section>

      <section className="software-section" id="software">
        <div className="software-copy">
          <p className="section-tag">Live workspace · 02</p>
          <h2>Your bench,<br/><em>understood.</em></h2>
          <p>Track the board, inspect the detector’s view, rotate the 3D assembly, and move through a verified build plan. The assistant can check progress, describe the board, find a part, or point the laser at a named location.</p>
          <ul>
            <li><b>Plan vs reality</b><span>Placed, misplaced, missing, or extra</span></li>
            <li><b>Electrical awareness</b><span>A20 and E20 correctly count as the same node</span></li>
            <li><b>Calibrated aiming</b><span>RMS error reported in millimetres and hole pitch</span></li>
          </ul>
        </div>
        <div className="macbook" aria-label="Simulation of the LaserBuddy software running on a laptop">
          <div className="laptop-lid">
            <div className="camera-dot" />
            <div className="app-window">
              <div className="app-top"><b>LASERBUDDY</b><span>BOARD ONLINE</span><i>● LIVE</i></div>
              <div className="app-body">
                <aside><small>PROJECT</small><strong>LED blink</strong><nav><b>01</b><span>Place resistor</span><b>02</b><span>Seat LED</span><b>03</b><span>Connect ground</span></nav><button>Ask LaserBuddy</button></aside>
                <div className="board-view">
                  <div className="scan-grid" />
                  <div className="breadboard">
                    {Array.from({ length: 54 }, (_, i) => <i key={i} />)}
                    <div className="sim-resistor"><span /></div>
                    <div className="laser-target"><span>E20</span></div>
                  </div>
                  <div className="detection-card"><span>PART 04</span><b>220 Ω resistor</b><small>E20 → E25 · 98.4%</small></div>
                </div>
                <aside className="guidance"><small>NEXT STEP</small><strong>Place the resistor</strong><p>Move one lead to the electrical node at column 20.</p><div><span>LASER</span><b>0.74 mm RMS</b></div><button>Point at E20</button></aside>
              </div>
            </div>
          </div>
          <div className="laptop-base"><i /></div>
        </div>
      </section>

      <section className="chapter mechanical" id="mechanical">
        <div className="chapter-copy left">
          <p className="section-tag">Hardware · 03</p>
          <h2>Two axes.<br/>One precise<br/><em>pointer.</em></h2>
          <p className="body-copy">A compact pan/tilt head turns two SG92R micro servos into a physical cursor for your workbench. Every printed part is press-fit—no bolts, no tools, no drama.</p>
          <div className="spec-grid">
            <div><strong>160°</strong><span>PAN RANGE</span></div>
            <div><strong>140°</strong><span>TILT RANGE</span></div>
            <div><strong>4</strong><span>PRINTED PARTS</span></div>
            <div><strong>0</strong><span>BOLTS REQUIRED</span></div>
          </div>
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
            <span>ELECTRICAL / VERIFIED PINOUT</span>
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
          <div className="demo-hud top"><span>LIVE WORKSPACE</span><span>CAM 01 / OVERHEAD → USER POV → DISPLAY</span></div>
          <div className="demo-title">
            <p className="section-tag">In action · 06</p>
            <h2>It points.<br/><em>You build.</em></h2>
          </div>
          <div className="target-readout">
            <span>PART LOCKED</span><b>220 Ω RESISTOR</b><small>CONFIDENCE 98.4%</small>
          </div>
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
