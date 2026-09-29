import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import assemblyUrl from '../cad/assembly_preview.stl?url'

const clamp = (n) => Math.max(0, Math.min(1, n))
const smooth = (n) => { const t = clamp(n); return t * t * (3 - 2 * t) }

export default function ActionScene({ progressRef, reducedMotion }) {
  const mountRef = useRef(null)

  useEffect(() => {
    const mount = mountRef.current
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x050505)
    scene.fog = new THREE.Fog(0x050505, 10, 22)

    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 50)
    const mobile = matchMedia('(max-width: 800px)').matches
    const renderer = new THREE.WebGLRenderer({ antialias: !mobile, powerPreference: 'high-performance' })
    renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1 : 1.5))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFShadowMap
    mount.appendChild(renderer.domElement)

    scene.add(new THREE.HemisphereLight(0xffffff, 0x111111, 2.1))
    const key = new THREE.DirectionalLight(0xffffff, 5)
    key.position.set(-4, 8, 5)
    key.castShadow = true
    key.shadow.mapSize.set(2048, 2048)
    scene.add(key)
    const screenGlow = new THREE.PointLight(0xdde7ef, 16, 8)
    screenGlow.position.set(0, 2.2, -3.5)
    scene.add(screenGlow)

    const matte = new THREE.MeshStandardMaterial({ color: 0x161616, roughness: 0.82 })
    const charcoal = new THREE.MeshStandardMaterial({ color: 0x2d2d2d, roughness: 0.68 })
    const white = new THREE.MeshStandardMaterial({ color: 0xe7e7e4, roughness: 0.5 })
    const silver = new THREE.MeshStandardMaterial({ color: 0x8c8c89, roughness: 0.3, metalness: 0.65 })
    const displayCanvas = document.createElement('canvas')
    displayCanvas.width = 1024; displayCanvas.height = 512
    const displayCtx = displayCanvas.getContext('2d')
    const displayTexture = new THREE.CanvasTexture(displayCanvas)
    displayTexture.colorSpace = THREE.SRGBColorSpace
    const screen = new THREE.MeshBasicMaterial({ map: displayTexture })
    const laserMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.72 })

    const box = (size, position, material, radius = 0) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material)
      mesh.position.set(...position)
      mesh.castShadow = true; mesh.receiveShadow = true
      scene.add(mesh)
      return mesh
    }

    box([13, .35, 9], [0, -.22, 0], matte)
    box([12, .035, 7.3], [0, -.02, -.25], white)
    box([5.4, 2.8, .32], [0, 2.1, -3.72], charcoal)
    box([4.92, 2.35, .08], [0, 2.1, -3.52], screen)
    box([.42, 1.1, .42], [0, .62, -3.65], silver)
    box([2.2, .12, 1.05], [0, .1, -3.25], charcoal)
    box([2.3, .12, .72], [2.65, .08, -2.92], charcoal)
    const mouse = new THREE.Mesh(new THREE.SphereGeometry(.34, 22, 18), charcoal)
    mouse.scale.set(.72, .42, 1); mouse.position.set(4.18, .17, -2.8); scene.add(mouse)

    const rig = new THREE.Group()
    const rigBase = new THREE.Mesh(new THREE.CylinderGeometry(.48, .58, .22, 20), charcoal); rigBase.position.set(-5.1, .15, -2.6); rig.add(rigBase)
    const boom = (length, pos, angle) => { const m=new THREE.Mesh(new THREE.CylinderGeometry(.11,.11,length,14),charcoal);m.position.set(...pos);m.rotation.z=angle;rig.add(m);return m }
    boom(3.3,[-4.35,1.5,-2.6],-.48); boom(3.4,[-2.6,2.85,-2.6],-1.05)
    const webcam = new THREE.Mesh(new THREE.BoxGeometry(1.05,.48,.55), charcoal);webcam.position.set(-1.22,3.05,-2.6);rig.add(webcam)
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(.16,.16,.12,20),silver);lens.rotation.x=Math.PI/2;lens.position.set(-1.22,2.98,-2.28);rig.add(lens)
    scene.add(rig)

    const cableCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(-5.1,.2,-2.6),new THREE.Vector3(-4,1.8,-2.75),new THREE.Vector3(-2.2,3.1,-2.7),new THREE.Vector3(-1.2,3,-2.65)])
    scene.add(new THREE.Mesh(new THREE.TubeGeometry(cableCurve,60,.035,8,false),matte))

    const breadboard = box([2.35, .16, 1.25], [.25, .13, -.65], white)
    for (let x = -8; x <= 8; x++) for (let z = -3; z <= 3; z++) {
      const hole = new THREE.Mesh(new THREE.CylinderGeometry(.018, .018, .025, 6), matte)
      hole.position.set(.25 + x * .12, .225, -.65 + z * .13)
      scene.add(hole)
    }
    const uno = box([1.55, .18, 1.05], [-2.05, .13, -.55], charcoal)
    ;[-.55, -.32, -.09, .14, .37, .6].forEach((x) => box([.08, .14, .18], [-2.05 + x, .28, -.92], silver))
    box([.42, .18, .5], [-2.35, .29, -.45], silver)
    box([.48, .22, .42], [-1.72, .31, -.62], matte)

    const target = new THREE.Vector3(1.38, .22, -.35)
    for (let i = 0; i < 12; i++) {
      const geo = i % 3 === 0 ? new THREE.BoxGeometry(.3, .12, .16) : new THREE.CylinderGeometry(.07, .07, .42, 10)
      const part = new THREE.Mesh(geo, i % 2 ? silver : charcoal)
      part.position.set(-3.2 + (i % 6) * 1.25, .16, 1.05 + Math.floor(i / 6) * .8)
      if (i % 3 !== 0) part.rotation.z = Math.PI / 2
      part.castShadow = true
      scene.add(part)
    }
    const resistor = new THREE.Mesh(new THREE.CylinderGeometry(.075, .075, .48, 12), white)
    resistor.rotation.z = Math.PI / 2
    resistor.position.copy(target)
    scene.add(resistor)

    const buddy = new THREE.Group()
    new STLLoader().load(assemblyUrl, (geometry) => {
      geometry.computeVertexNormals(); geometry.computeBoundingBox(); geometry.center()
      const size = new THREE.Vector3(); geometry.boundingBox.getSize(size)
      const mesh = new THREE.Mesh(geometry, white)
      mesh.scale.setScalar(2.1 / Math.max(size.x, size.y, size.z))
      mesh.rotation.set(-Math.PI / 2, 0, -0.28)
      mesh.castShadow = true
      buddy.add(mesh)
    })
    buddy.position.set(-3.15, .92, -2.25)
    scene.add(buddy)

    const beamStart = new THREE.Vector3(-2.42, 1.36, -1.78)
    const beamVector = target.clone().sub(beamStart)
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(.012, .018, beamVector.length(), 8), laserMat)
    beam.position.copy(beamStart).add(target).multiplyScalar(.5)
    beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), beamVector.clone().normalize())
    scene.add(beam)
    const dot = new THREE.Mesh(new THREE.SphereGeometry(.085, 16, 16), laserMat)
    dot.position.copy(target); scene.add(dot)

    const student = new THREE.Group()
    const head = new THREE.Mesh(new THREE.SphereGeometry(.58, 24, 20), charcoal)
    head.scale.z = .85; head.position.set(0, 1.48, 3.35); student.add(head)
    const torso = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.25, .9), matte)
    torso.position.set(0, .55, 3.85); student.add(torso)
    const makeArm = (x, angle) => {
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(.16, 2.15, 6, 12), charcoal)
      arm.position.set(x, .57, 2.12); arm.rotation.x = Math.PI / 2; arm.rotation.z = angle
      student.add(arm)
      const hand = new THREE.Mesh(new THREE.SphereGeometry(.22, 18, 14), silver)
      hand.position.set(x + (x < 0 ? -.32 : .32), .28, 1.12); hand.scale.set(1, .45, 1.35); student.add(hand)
    }
    makeArm(-.75, -.17); makeArm(.75, .17)
    scene.add(student)

    const grid = new THREE.GridHelper(18, 36, 0x444444, 0x1b1b1b)
    grid.position.y = .005; scene.add(grid)

    const overhead = new THREE.Vector3(0, 10.2, 2.2)
    const firstPerson = new THREE.Vector3(0, 2.12, 3.02)
    const monitorView = new THREE.Vector3(0, 2.1, 2.05)
    const overheadLook = new THREE.Vector3(0, 0, -.3)
    const firstLook = new THREE.Vector3(.05, .18, -.75)
    const monitorLook = new THREE.Vector3(0, 2.1, -3.58)
    const currentLook = new THREE.Vector3()
    const names = ['SHIVANG PATEL', 'SRIMAN PANCHANGAM', 'ABHINAV RAMIREDDY', 'ADVAIT CHANDRAKAR']

    const resize = () => {
      const w = mount.clientWidth, h = mount.clientHeight
      renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix()
    }
    const observer = new ResizeObserver(resize); observer.observe(mount); resize()
    const startedAt = performance.now()
    let frame
    const render = () => {
      frame = requestAnimationFrame(render)
      const raw = reducedMotion ? 1 : clamp(progressRef.current || 0)
      const deskPhase = smooth(raw / .58)
      const monitorPhase = smooth((raw - .58) / .42)
      camera.position.lerpVectors(overhead, firstPerson, deskPhase)
      camera.position.lerp(monitorView, monitorPhase)
      currentLook.lerpVectors(overheadLook, firstLook, deskPhase)
      currentLook.lerp(monitorLook, monitorPhase)
      camera.lookAt(currentLook)
      student.visible = raw < .48
      buddy.rotation.y = Math.sin((performance.now() - startedAt) / 1800) * .035
      laserMat.opacity = .55 + Math.sin((performance.now() - startedAt) / 170) * .15

      const seconds = (performance.now() - startedAt) / 1000
      displayCtx.fillStyle = '#050505'; displayCtx.fillRect(0, 0, 1024, 512)
      displayCtx.textAlign = 'center'
      displayCtx.fillStyle = '#777'; displayCtx.font = '500 20px monospace'; displayCtx.letterSpacing = '5px'
      displayCtx.fillText('LASERBUDDY / BUILT BY', 512, 52)
      displayCtx.strokeStyle = '#555'; displayCtx.beginPath(); displayCtx.moveTo(74, 76); displayCtx.lineTo(950, 76); displayCtx.stroke()
      displayCtx.font = '900 42px Arial, sans-serif'; displayCtx.fillStyle = '#f4f4f1'
      const loopHeight = names.length * 82
      const offset = (seconds * 38) % loopHeight
      for (let repeat = -1; repeat < 3; repeat++) names.forEach((name, index) => {
        const y = 142 + index * 82 + repeat * loopHeight - offset
        displayCtx.fillText(name, 512, y)
      })
      displayCtx.fillStyle = '#888'; displayCtx.font = '500 14px monospace'
      displayCtx.fillText('DESIGNED / PRINTED / WIRED / CALIBRATED', 512, 478)
      displayTexture.needsUpdate = true
      renderer.render(scene, camera)
    }
    render()
    return () => { cancelAnimationFrame(frame); observer.disconnect(); renderer.dispose(); mount.removeChild(renderer.domElement) }
  }, [progressRef, reducedMotion])

  return <div className="action-canvas" ref={mountRef} aria-hidden="true" />
}
