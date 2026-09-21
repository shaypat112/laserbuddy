import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import assemblyUrl from '../cad/assembly_preview.stl?url'
import baseUrl from '../cad/base.stl?url'
import panUrl from '../cad/pan.stl?url'
import laserUrl from '../cad/laser.stl?url'
import camUrl from '../cad/cam.stl?url'

const clamp = (n, a = 0, b = 1) => Math.max(a, Math.min(b, n))
const mix = (a, b, t) => a + (b - a) * t
const ease = (t) => 1 - Math.pow(1 - clamp(t), 3)

export default function LaserScene({ progressRef, reducedMotion }) {
  const mountRef = useRef(null)

  useEffect(() => {
    const mount = mountRef.current
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100)
    camera.position.set(4.8, -5.8, 3.8)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    mount.appendChild(renderer.domElement)

    scene.add(new THREE.HemisphereLight(0xffffff, 0x252018, 2.5))
    const key = new THREE.DirectionalLight(0xffffff, 5)
    key.position.set(-4, -3, 8)
    key.castShadow = true
    scene.add(key)
    const rim = new THREE.DirectionalLight(0xff2b20, 7)
    rim.position.set(6, 2, 1)
    scene.add(rim)

    const group = new THREE.Group()
    scene.add(group)
    const loader = new STLLoader()
    const cream = new THREE.MeshStandardMaterial({ color: 0xe8e4d8, roughness: 0.52, metalness: 0.08 })
    const dark = new THREE.MeshStandardMaterial({ color: 0x1d1d1a, roughness: 0.62, metalness: 0.12 })
    const acid = new THREE.MeshStandardMaterial({ color: 0xd7ff36, roughness: 0.5, metalness: 0.03 })
    const red = new THREE.MeshBasicMaterial({ color: 0xff2b20, transparent: true, opacity: 0.85 })
    const mats = [cream, dark, acid, dark]
    let whole = null
    const pieces = []

    const meshFrom = (geometry, material) => {
      geometry.computeVertexNormals()
      geometry.computeBoundingBox()
      geometry.center()
      const mesh = new THREE.Mesh(geometry, material)
      mesh.castShadow = true
      mesh.receiveShadow = true
      return mesh
    }

    loader.load(assemblyUrl, (geometry) => {
      whole = meshFrom(geometry, cream)
      const box = geometry.boundingBox
      const size = new THREE.Vector3(); box.getSize(size)
      whole.userData.baseScale = 4.8 / Math.max(size.x, size.y, size.z)
      whole.scale.setScalar(whole.userData.baseScale)
      whole.rotation.set(Math.PI / 2, 0, 0.15)
      group.add(whole)
    })

    const targets = [
      new THREE.Vector3(-1.7, 0.5, -0.6),
      new THREE.Vector3(-0.55, 0.0, 0.25),
      new THREE.Vector3(0.8, 0.55, 0.85),
      new THREE.Vector3(2.1, 0.1, -0.35),
    ]
    ;[baseUrl, panUrl, laserUrl, camUrl].forEach((url, index) => {
      loader.load(url, (geometry) => {
        const mesh = meshFrom(geometry, mats[index])
        const box = geometry.boundingBox
        const size = new THREE.Vector3(); box.getSize(size)
        mesh.scale.setScalar(1.25 / Math.max(size.x, size.y, size.z))
        mesh.position.copy(targets[index])
        mesh.rotation.set(Math.PI / 2, 0, index * 0.22 - 0.24)
        mesh.visible = false
        pieces[index] = mesh
        group.add(mesh)
      })
    })

    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.035, 4, 10, 1, true), red)
    beam.rotation.x = Math.PI / 2
    beam.position.set(0.65, -1.65, 0.45)
    scene.add(beam)

    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.075, 20, 20), red)
    dot.position.set(0.65, -3.55, 0.45)
    scene.add(dot)

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(16, 16),
      new THREE.ShadowMaterial({ color: 0x000000, opacity: 0.24 })
    )
    floor.rotation.x = -Math.PI / 2
    floor.position.z = -1.7
    floor.receiveShadow = true
    scene.add(floor)

    const resize = () => {
      const w = mount.clientWidth
      const h = mount.clientHeight
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
    const observer = new ResizeObserver(resize)
    observer.observe(mount)
    resize()

    const clock = new THREE.Clock()
    let frame
    const render = () => {
      frame = requestAnimationFrame(render)
      const time = clock.getElapsedTime()
      const p = progressRef.current || 0
      const explode = ease((p - 0.35) / 0.16)
      const reassemble = ease((p - 0.63) / 0.12)
      const showParts = explode > 0.02 && reassemble < 0.98
      if (whole) {
        whole.visible = !showParts
        whole.rotation.z = 0.15 + p * 2.8 + (reducedMotion ? 0 : Math.sin(time * 0.45) * 0.06)
        whole.rotation.x = Math.PI / 2 + mix(0, -0.3, ease((p - 0.68) / 0.2))
        const s = mix(1, 0.78, ease((p - 0.12) / 0.18))
        whole.scale.setScalar(whole.userData.baseScale * s)
      }
      pieces.forEach((part, index) => {
        if (!part) return
        part.visible = showParts
        part.rotation.z = index * 0.25 + (reducedMotion ? 0 : time * (0.08 + index * 0.02))
        part.position.y = targets[index].y + Math.sin(time * 0.8 + index) * (reducedMotion ? 0 : 0.08)
      })
      const finalStage = ease((p - 0.72) / 0.16)
      beam.visible = dot.visible = p < 0.35 || p > 0.7
      beam.position.x = 0.65 + Math.sin(time * 0.7) * 0.6 * (1 - finalStage)
      dot.position.x = beam.position.x
      beam.material.opacity = 0.35 + Math.sin(time * 3) * 0.12
      group.position.x = mix(0.35, -0.9, ease((p - 0.08) / 0.18)) + mix(0, 0.9, ease((p - 0.72) / 0.18))
      group.position.z = mix(0.15, 0.45, finalStage)
      camera.position.x = mix(4.8, 5.8, p)
      camera.position.y = mix(-5.8, -4.2, p)
      camera.lookAt(group.position.x * 0.35, 0, 0)
      renderer.render(scene, camera)
    }
    render()

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      renderer.dispose()
      mount.removeChild(renderer.domElement)
    }
  }, [progressRef, reducedMotion])

  return <div className="laser-scene" ref={mountRef} aria-hidden="true" />
}
