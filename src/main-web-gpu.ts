
import './index.css'
import * as THREE from 'three/webgpu';
import { OrbitControls } from "three/examples/jsm/Addons.js";
import Stats from "three/examples/jsm/libs/stats.module.js";
import GUI from "three/examples/jsm/libs/lil-gui.module.min.js";
import "./index.css";
import { FluidMaterialGPU } from './FluidMaterialGPU';

const stats = new Stats();
const clock = new THREE.Clock();

document.body.appendChild(stats.dom);

const panel = new GUI({ width: 310 });

const renderer = new THREE.WebGPURenderer({ antialias: true });
document.body.appendChild(renderer.domElement);
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// Shared scene objects (declared here so dispose() can reach them)
let camera: THREE.PerspectiveCamera;
let scene: THREE.Scene;
let controls: OrbitControls;
let fluidMat: FluidMaterialGPU;
let fluidMesh: THREE.Mesh;
let ball: THREE.Mesh;
let ball2: THREE.Mesh;
let animationRunning = false;
let disposed = false;

renderer.init().then(() => {

    if (disposed) return; // page was torn down before init finished

    renderer.setAnimationLoop(animate)
    animationRunning = true;

    // Setup camera and scene
    camera = new THREE.PerspectiveCamera(
        45,
        innerWidth / innerHeight,
        0.1,
        100
    );
    camera.position.set(1, 1, 2);
    camera.lookAt(0, 0, 0);

    scene = new THREE.Scene();

    const color = 0xffffff;
    const intensity = 3;
    const light = new THREE.DirectionalLight(color, intensity);
    light.position.set(-.5, 1, -4);
    light.castShadow = true;
    scene.add(light);

    scene.add(new THREE.AmbientLight(0xffffff, 0.3));

    controls = new OrbitControls(camera, renderer.domElement)

    let time = 0;

    //---------------------------------------- DEMO SCENE SETUP
    const size = 1024 / 2;
    const sizey = size;
    const objectCount = 2;

    const planeGeo = new THREE.PlaneGeometry(3, 3, 200, 200);
    planeGeo.rotateX(-Math.PI / 2);

    fluidMat = new FluidMaterialGPU(renderer, size, sizey, objectCount);
    fluidMesh = new THREE.Mesh(planeGeo, fluidMat);
    scene.add(fluidMesh)

    scene.background = new THREE.Color(0x333333)

    ball = new THREE.Mesh(new THREE.SphereGeometry(.03, 10, 10), new THREE.MeshPhysicalMaterial({ color: 0xff0000 }));
    scene.add(ball);
    ball.position.y = .02;


    ball2 = new THREE.Mesh(new THREE.SphereGeometry(.06, 10, 10), new THREE.MeshPhysicalMaterial({ color: 0x00ff00 }));
    scene.add(ball2);
    ball2.position.y = .02;
    ball2.position.x = 1;

    const spot = new THREE.PointLight();
    spot.castShadow = true;
    spot.intensity = 0.1; spot.position.set(0, .2, 0)
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
    })

    //---------------------------------------------------------

    // Resize handler
    window.addEventListener('resize', onResize);

    function animate() {
        if (disposed) return;

        const delta = clock.getDelta();

        time += delta;

        ball.position.x = Math.cos(time) * .3;
        ball.position.z = Math.sin(time) * .3;


        ball2.position.x = .2 + Math.sin(time) * .2;
        ball2.position.z = Math.cos(time) * .2;

        stats.begin();
        fluidMat.update(delta, fluidMesh);
        stats.end()

        // Render main scene
        renderer.render(scene, camera);
    }

}).catch((err) => {
    console.error("WebGPU initialization failed:", err);
    showWebGPUError();
});

//---------------------------
function onResize() {
    if (!camera || !renderer) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
}

function showWebGPUError() {
    // Remove canvas if it was added
    renderer.domElement.remove();
    stats.dom.remove();

    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position:fixed; inset:0; display:flex; align-items:center; justify-content:center;
        background:#222; color:#fff; font-family:sans-serif; z-index:9999; padding:2rem;
    `;
    overlay.innerHTML = `
        <div style="max-width:520px; text-align:center;">
            <h2 style="margin-top:0;">WebGPU is not available</h2>
            <p>Your browser does not support WebGPU, or it failed to initialize.</p>
            <p style="color:#aaa; font-size:0.9em;">Try the latest version of Chrome, Edge, or Firefox Nightly.</p>
            <a href="/?webgl" id="fallback-link" style="display:inline-block; margin-top:1rem; padding:0.6em 1.4em;
               background:#4a90d9; color:#fff; text-decoration:none; border-radius:6px;">
                Switch to WebGL version
            </a>
        </div>
    `;
    document.body.appendChild(overlay);
}

// HMR / page cleanup
function dispose() {
    disposed = true;
    window.removeEventListener('resize', onResize);
    if (animationRunning) {
        renderer.setAnimationLoop(null);
        animationRunning = false;
    }
    controls?.dispose();
    panel.destroy();
    stats.dom.remove();
    fluidMat?.dispose();
    renderer.dispose();
    renderer.domElement.remove();
}

if (import.meta.hot) {
    import.meta.hot.dispose(dispose);
}
