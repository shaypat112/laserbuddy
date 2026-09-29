import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import assemblyUrl from '../cad/assembly_preview.stl?url'
import baseUrl from '../cad/base.stl?url'
import panUrl from '../cad/pan.stl?url'
import laserUrl from '../cad/laser.stl?url'
import camUrl from '../cad/cam.stl?url'

const clamp=n=>Math.max(0,Math.min(1,n))
const smooth=n=>{const t=clamp(n);return t*t*(3-2*t)}

export default function CadScene({progressRef,reducedMotion}){
  const mountRef=useRef(null)
  useEffect(()=>{
    const mount=mountRef.current,scene=new THREE.Scene();scene.background=new THREE.Color(0x080808)
    const camera=new THREE.PerspectiveCamera(34,1,.1,50);camera.position.set(6,-7,5)
    const mobile=matchMedia('(max-width: 800px)').matches
    const renderer=new THREE.WebGLRenderer({antialias:!mobile,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,mobile?1:1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.shadowMap.enabled=!mobile;mount.appendChild(renderer.domElement)
    scene.add(new THREE.HemisphereLight(0xffffff,0x101010,2.8));const key=new THREE.DirectionalLight(0xffffff,6);key.position.set(-5,-4,9);scene.add(key);const rim=new THREE.DirectionalLight(0x888888,5);rim.position.set(6,3,2);scene.add(rim)
    const loader=new STLLoader(),root=new THREE.Group();scene.add(root)
    const wholeMat=new THREE.MeshStandardMaterial({color:0xe9e9e5,roughness:.36,metalness:.25,transparent:true})
    const partMats=[0xdcdcd8,0x777777,0xbcbcbc,0x303030].map(color=>new THREE.MeshStandardMaterial({color,roughness:.42,metalness:.28,transparent:true,opacity:0}))
    let whole;const parts=[];const targets=[[-2.5,.6,-.5],[-.8,-.2,.65],[1.05,.55,.8],[2.75,-.1,-.55]]
    const make=(g,m)=>{g.computeVertexNormals();g.computeBoundingBox();g.center();const mesh=new THREE.Mesh(g,m);mesh.castShadow=true;return mesh}
    loader.load(assemblyUrl,g=>{whole=make(g,wholeMat);const s=new THREE.Vector3();g.boundingBox.getSize(s);whole.userData.scale=5.2/Math.max(s.x,s.y,s.z);whole.scale.setScalar(whole.userData.scale);whole.rotation.set(Math.PI/2,0,.2);root.add(whole)})
    ;[baseUrl,panUrl,laserUrl,camUrl].forEach((url,i)=>loader.load(url,g=>{const m=make(g,partMats[i]),s=new THREE.Vector3();g.boundingBox.getSize(s);m.userData.scale=1.55/Math.max(s.x,s.y,s.z);m.scale.setScalar(m.userData.scale);m.rotation.set(Math.PI/2,0,i*.18);parts[i]=m;root.add(m)}))
    const grid=new THREE.GridHelper(18,36,0x333333,0x151515);grid.rotation.x=Math.PI/2;grid.position.z=-2.2;scene.add(grid)
    const resize=()=>{const w=mount.clientWidth,h=mount.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()};const observer=new ResizeObserver(resize);observer.observe(mount);resize()
    const start=performance.now();let frame
    const render=()=>{frame=requestAnimationFrame(render);const time=(performance.now()-start)/1000,p=reducedMotion?.72:smooth(progressRef.current||0),explode=smooth((p-.28)/.45);if(whole){whole.material.opacity=1-explode;whole.visible=explode<.99;whole.rotation.z=.2+p*1.25+Math.sin(time*.3)*.04}parts.forEach((part,i)=>{if(!part)return;part.material.opacity=explode;part.position.set(targets[i][0]*explode,targets[i][1]*explode,targets[i][2]*explode);part.rotation.z=i*.18+time*(.035+i*.008)});camera.position.x=6-p*1.2;camera.position.y=-7+p*1.4;camera.lookAt(0,0,0);renderer.render(scene,camera)}
    render();return()=>{cancelAnimationFrame(frame);observer.disconnect();renderer.dispose();mount.removeChild(renderer.domElement)}
  },[progressRef,reducedMotion])
  return <div className="cad-canvas" ref={mountRef} aria-hidden="true"/>
}
