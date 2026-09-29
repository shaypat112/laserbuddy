import { useEffect, useRef } from 'react'
import * as THREE from 'three'

export default function WiringScene() {
  const mountRef = useRef(null)
  useEffect(() => {
    const mount = mountRef.current
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x090909)
    const camera = new THREE.PerspectiveCamera(36, 1, .1, 40)
    camera.position.set(7, 6.4, 8)
    camera.lookAt(0, 0, 0)
    const mobile = matchMedia('(max-width: 800px)').matches
    const renderer = new THREE.WebGLRenderer({ antialias:!mobile, powerPreference:'high-performance' })
    renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1 : 1.5)); renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap
    mount.appendChild(renderer.domElement)
    scene.add(new THREE.HemisphereLight(0xffffff, 0x0b0b0b, 2.3))
    const light = new THREE.DirectionalLight(0xffffff, 5); light.position.set(-5, 8, 4); light.castShadow = true; scene.add(light)

    const black = new THREE.MeshStandardMaterial({ color:0x171717, roughness:.72 })
    const gray = new THREE.MeshStandardMaterial({ color:0x696969, roughness:.42, metalness:.45 })
    const white = new THREE.MeshStandardMaterial({ color:0xe6e6e2, roughness:.5 })
    const glow = new THREE.MeshBasicMaterial({ color:0xffffff })
    const root = new THREE.Group(); root.rotation.y = -.18; scene.add(root)
    const addBox = (size, pos, mat, parent=root) => { const m=new THREE.Mesh(new THREE.BoxGeometry(...size),mat);m.position.set(...pos);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m }
    addBox([4.3,.25,3.1],[-1.6,0,0],black)
    addBox([2.1,.18,1.35],[-1.65,.28,0],gray)
    addBox([.65,.36,.62],[-2.55,.45,-.25],black)
    addBox([.52,.25,.44],[-.95,.42,.15],white)
    for(let i=0;i<12;i++) addBox([.11,.28,.18],[-3.45+i*.33,.38,-1.18],i%3===0?white:gray)
    for(let i=0;i<10;i++) addBox([.11,.28,.18],[-3.15+i*.37,.38,1.18],gray)
    addBox([1.45,.8,1.25],[2.3,.55,-1.35],white)
    addBox([1.45,.8,1.25],[2.3,.55,1.35],gray)
    addBox([1.2,.52,.72],[3.25,.35,0],black)
    const laser = new THREE.Mesh(new THREE.CylinderGeometry(.22,.22,1.6,18),gray);laser.rotation.z=Math.PI/2;laser.position.set(4.25,.55,0);root.add(laser)

    const paths = [
      [new THREE.Vector3(-.25,.48,-1.1),new THREE.Vector3(.55,1,-1.1),new THREE.Vector3(1.5,1,-1.35)],
      [new THREE.Vector3(-.1,.48,1.1),new THREE.Vector3(.7,1,1.1),new THREE.Vector3(1.5,1,1.35)],
      [new THREE.Vector3(-.45,.5,.65),new THREE.Vector3(.6,1.3,.3),new THREE.Vector3(2.55,.85,0)],
      [new THREE.Vector3(-2.9,.5,-.75),new THREE.Vector3(-1.2,1.15,-2),new THREE.Vector3(2.2,.9,-1.55)],
      [new THREE.Vector3(-2.65,.5,.75),new THREE.Vector3(-.8,1.15,2),new THREE.Vector3(2.2,.9,1.55)],
    ]
    const curves=[]; const pulses=[]
    paths.forEach((points,index)=>{
      const curve=new THREE.CatmullRomCurve3(points);curves.push(curve)
      const tube=new THREE.Mesh(new THREE.TubeGeometry(curve,48,.035,8,false),index<2?white:gray);root.add(tube)
      const pulse=new THREE.Mesh(new THREE.SphereGeometry(.1,14,14),glow);root.add(pulse);pulses.push(pulse)
    })
    const floor=new THREE.Mesh(new THREE.PlaneGeometry(18,12),new THREE.ShadowMaterial({opacity:.32}));floor.rotation.x=-Math.PI/2;floor.position.y=-.15;floor.receiveShadow=true;scene.add(floor)
    const grid=new THREE.GridHelper(18,36,0x3d3d3d,0x171717);grid.position.y=-.13;scene.add(grid)
    const resize=()=>{const w=mount.clientWidth,h=mount.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()}
    const observer=new ResizeObserver(resize);observer.observe(mount);resize()
    const start=performance.now();let frame
    const render=()=>{frame=requestAnimationFrame(render);const t=(performance.now()-start)/1000;root.rotation.y=-.18+Math.sin(t*.22)*.08;pulses.forEach((pulse,i)=>pulse.position.copy(curves[i].getPoint((t*.22+i*.17)%1)));renderer.render(scene,camera)}
    render();return()=>{cancelAnimationFrame(frame);observer.disconnect();renderer.dispose();mount.removeChild(renderer.domElement)}
  },[])
  return <div className="wiring-canvas" ref={mountRef} aria-hidden="true" />
}
