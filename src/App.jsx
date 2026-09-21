import { useEffect, useRef, useState } from 'react'
import LaserScene from './LaserScene'
import ActionScene from './ActionScene'
import WiringScene from './WiringScene'
import CadScene from './CadScene'
import wiringDiagram from '../docs/wiring.svg'

const chapters = [
  { id: 'mechanical', n: '01', label: 'Mechanical' },
  { id: 'cad', n: '02', label: 'CAD' },
  { id: 'wiring', n: '03', label: 'Wiring' },
  { id: 'demo', n: '04', label: 'In Action' },
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
          <p className="eyebrow">It sees the parts. It hears the plan.</p>
          <h1>LASER<br/><span>BUDDY</span></h1>
          <p className="lede">A physical AI companion that points to the exact part you need—and talks you through what comes next.</p>
        </div>
        <div className="scroll-cue"><span>SCROLL TO DISASSEMBLE</span><i /></div>
        <div className="hero-index">LB—01</div>
      </section>

      <section className="chapter mechanical" id="mechanical">
        <div className="chapter-copy left">
          <p className="section-tag">Mechanical · 01</p>
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
            <p className="section-tag">CAD · 02</p>
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
          <p className="section-tag">Wiring · 03</p>
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
            <p className="section-tag">In action · 04</p>
            <h2>It points.<br/><em>You build.</em></h2>
          </div>
          <div className="target-readout">
            <span>PART LOCKED</span><b>220 Ω RESISTOR</b><small>CONFIDENCE 98.4%</small>
          </div>
        </div>
      </section>
    </main>
  )
}
