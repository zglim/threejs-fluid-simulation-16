
import './index.css'
import * as THREE from 'three/webgpu';
import { OrbitControls } from "three/examples/jsm/Addons.js";
import Stats from "three/examples/jsm/libs/stats.module.js";
import GUI from "three/examples/jsm/libs/lil-gui.module.min.js";
import "./index.css";
import { FluidMaterialGPU } from './FluidMaterialGPU';

// ---- Check WebGPU support ----
if (!navigator.gpu) {
  const msg = document.createElement('div');
  msg.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);color:white;font-size:20px;text-align:center;padding:40px;background:rgba(0,0,0,0.8);border-radius:10px;z-index:9999;';
  msg.innerHTML = 'WebGPU is not supported in your browser.<br>Please use Chrome 113+ or Edge 113+.<br><br><a href="https://github.com/bandinopla/threejs-fluid-simulation" style="color:#646cff">Try the WebGL version instead</a>';
  document.body.appendChild(msg);
  throw new Error('WebGPU not supported');
}

const stats = new Stats();
const clock = new THREE.Clock();

document.body.appendChild(stats.dom);

const panel = new GUI({ width: 310 });

const renderer = new THREE.WebGPURenderer({ antialias: true });
document.body.appendChild(renderer.domElement);
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

renderer.init().then(() => {

  renderer.setAnimationLoop(animate);

  // Setup camera and scene
  const camera = new THREE.PerspectiveCamera(
    45,
    innerWidth / innerHeight,
    0.1,
    100
  );
  camera.position.set(1, 1, 2);
  camera.lookAt(0, 0, 0);

  const scene = new THREE.Scene();

  const color = 0xffffff;
  const intensity = 3;
  const light = new THREE.DirectionalLight(color, intensity);
  light.position.set(-.5, 1, -4);
  light.castShadow = true;
  scene.add(light);

  scene.add(new THREE.AmbientLight(0xffffff, 0.3));

  const controls = new OrbitControls(camera, renderer.domElement);

  let time = 0;

  //---------------------------------------- DEMO SCENE SETUP
  const size = 1024 / 2;
  const sizey = size;
  const objectCount = 2;

  const planeGeo = new THREE.PlaneGeometry(3, 3, 211, 211);
  planeGeo.rotateX(-Math.PI / 2);

  const fluidMat = new FluidMaterialGPU(renderer, size, sizey, objectCount);
  const fluidMesh = new THREE.Mesh(planeGeo, fluidMat);
  scene.add(fluidMesh);

  scene.background = new THREE.Color(0x333333);

  const ball = new THREE.Mesh(new THREE.SphereGeometry(.03, 10, 10), new THREE.MeshPhysicalMaterial({ color: 0xff0000 }));
  scene.add(ball);
  ball.position.y = .02;

  const ball2 = new THREE.Mesh(new THREE.SphereGeometry(.06, 10, 10), new THREE.MeshPhysicalMaterial({ color: 0x00ff00 }));
  scene.add(ball2);
  ball2.position.y = .02;
  ball2.position.x = .3;

  const spot = new THREE.PointLight();
  spot.castShadow = true;
  spot.intensity = 0.1; spot.position.set(0, .2, 0);
  ball.add(spot);

  fluidMat.track(ball, 1, new THREE.Color(0xff0000));
  fluidMat.track(ball2, 2, new THREE.Color(0x00ff00));

  //------------------- DEBUG PANEL
  fluidMat.addDebugPanelFolder(panel);
  fluidMat.setSettings({
    "splatForce": -0.32,
    "splatThickness": 0.624375,
    "vorticityInfluence": 0.7902,
    "swirlIntensity": 27.027,
    "pressureDecay": 0.312,
    "velocityDissipation": 0.283,
    "densityDissipation": 0.68,
    "bumpDisplacmentScale": 0.0316,
    "pressureIterations": 39
  });

  //---------------------------------------------------------

  function animate() {
    const delta = clock.getDelta();

    time += delta;

    ball.position.x = Math.cos(time) * .3;
    ball.position.z = Math.sin(time) * .3;

    ball2.position.x = .2 + Math.sin(time) * .2;
    ball2.position.z = Math.cos(time) * .2;

    stats.begin();
    fluidMat.update(delta, fluidMesh);
    stats.end();

    renderer.render(scene, camera);
  }

  // ---- Resize handler ----
  function onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }
  window.addEventListener('resize', onResize);

  // ---- Cleanup on page unload / HMR ----
  function dispose() {
    window.removeEventListener('resize', onResize);
    renderer.setAnimationLoop(null);
    controls.dispose();
    panel.destroy();
    if (stats.dom.parentNode) stats.dom.parentNode.removeChild(stats.dom);
    renderer.dispose();
    if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
    planeGeo.dispose();
  }

  window.addEventListener('beforeunload', dispose);

  // Vite HMR cleanup
  if (import.meta.hot) {
    import.meta.hot.dispose(dispose);
  }

}).catch(err => {
  console.error('WebGPU initialization failed:', err);
  const msg = document.createElement('div');
  msg.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);color:white;font-size:20px;text-align:center;padding:40px;background:rgba(0,0,0,0.8);border-radius:10px;z-index:9999;';
  msg.innerHTML = 'WebGPU initialization failed.<br>Your browser may not fully support WebGPU.<br><br><a href="https://github.com/bandinopla/threejs-fluid-simulation" style="color:#646cff">Try the WebGL version instead</a>';
  document.body.appendChild(msg);
});
