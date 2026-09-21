import { useEffect, useRef, useState } from 'react'
import LaserScene from './LaserScene'

const chapters = [
  { id: 'mechanical', n: '01', label: 'Mechanical' },
  { id: 'vision', n: '02', label: 'Vision' },
  { id: 'intelligence', n: '03', label: 'Intelligence' },
  { id: 'build', n: '04', label: 'Build' },
]

function Arrow() { return <span aria-hidden="true">↘</span> }

export default function App() {
  const progressRef = useRef(0)
  const [active, setActive] = useState('hero')
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  useEffect(() => {
    const update = () => {
      const max = document.documentElement.scrollHeight - innerHeight
      progressRef.current = max ? scrollY / max : 0
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
        <a className="github" href="https://github.com/shaypat112/laserbuddy" target="_blank" rel="noreferrer">SOURCE <Arrow /></a>
      </header>

      <section className="hero panel" id="hero">
        <div className="kicker"><span>DESK-SCALE BUILD ASSISTANT</span><span>2026 / OPEN SOURCE</span></div>
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

      <section className="chapter vision" id="vision">
        <div className="chapter-copy right dark-card">
          <p className="section-tag">Vision · 02</p>
          <h2>Your desk,<br/><em>mapped.</em></h2>
          <p className="body-copy">An overhead webcam finds the parts in front of you. A 6×6 calibration sweep learns the path from camera pixels to servo angles, so a point on screen becomes a point in the real world.</p>
          <div className="calibration">
            <div className="camera-frame">
              <span className="corner c1"/><span className="corner c2"/><span className="corner c3"/><span className="corner c4"/>
              {Array.from({ length: 36 }).map((_, i) => <i key={i} className={i === 21 ? 'hit' : ''} />)}
              <b>CALIBRATION / 36 PT</b>
            </div>
          </div>
        </div>
      </section>

      <section className="chapter intelligence" id="intelligence">
        <div className="chapter-copy left">
          <p className="section-tag">Intelligence · 03</p>
          <h2>Say what<br/>you want<br/><em>to build.</em></h2>
          <p className="body-copy">Whisper listens locally. Claude identifies your parts and turns your idea into a step-by-step plan. LaserBuddy points. ElevenLabs speaks. You keep both hands on the work.</p>
          <div className="signal-flow" aria-label="LaserBuddy signal flow">
            <div><span>01</span><b>SEE</b><small>OpenCV + webcam</small></div>
            <div><span>02</span><b>THINK</b><small>Claude vision + plans</small></div>
            <div><span>03</span><b>POINT</b><small>Arduino + servos</small></div>
            <div><span>04</span><b>SPEAK</b><small>Whisper + voice</small></div>
          </div>
        </div>
      </section>

      <section className="chapter build" id="build">
        <div className="build-intro">
          <p className="section-tag">Build · 04</p>
          <h2>From spool to<br/><em>sidekick.</em></h2>
          <p>Print it. Wire it. Calibrate it. Start building.</p>
        </div>
        <div className="timeline">
          <article><span>01</span><h3>PRINT</h3><p>Four PLA parts. 0.2 mm layers. No supports.</p><b>CAD READY</b></article>
          <article><span>02</span><h3>WIRE</h3><p>UNO, two servos, one transistor, one tiny red laser.</p><b>115200 BAUD</b></article>
          <article><span>03</span><h3>CALIBRATE</h3><p>A 6×6 sweep fits the camera-to-angle map.</p><b>&lt; 1° TARGET</b></article>
          <article><span>04</span><h3>BUILD</h3><p>Ask for a project. Follow the dot. Make the thing.</p><b>HANDS FREE</b></article>
        </div>
        <a className="build-button" href="https://github.com/shaypat112/laserbuddy/blob/main/BUILD_GUIDE.md" target="_blank" rel="noreferrer">OPEN THE BUILD GUIDE <Arrow /></a>
      </section>

      <footer>
        <div><span className="brand-dot"/>LASERBUDDY</div>
        <p>SEE IT. HEAR IT. BUILD IT.</p>
        <a href="#hero">BACK TO TOP ↑</a>
      </footer>
    </main>
  )
}
