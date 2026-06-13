
import './index.css';
import * as THREE from "three";
import Stats from "three/examples/jsm/libs/stats.module.js";
import GUI from "three/examples/jsm/libs/lil-gui.module.min.js";
import { FluidV3Material } from './FluidV3Material';
import { Sky } from 'three/addons/objects/Sky.js';
import { createDemoScene } from './demo/createDemoScene';

const stats = new Stats();
document.body.appendChild(stats.dom);

const panel = new GUI({ width: 310 });

const renderer = new THREE.WebGLRenderer({ antialias: true });
document.body.appendChild(renderer.domElement);
renderer.setSize(innerWidth, innerHeight);

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.5;

const { camera, scene, ball, ball2, updateBalls } = createDemoScene(renderer.domElement);

setupSky();

let time = 0;

//---------------------------------------- DEMO SCENE SETUP
const size = 1024 / 2; //Remember 4 textures will be created with this size...
const sizey = size;
const objectCount = 2;

const planeGeo = new THREE.PlaneGeometry(3, 3, 200, 200);
planeGeo.rotateX(-Math.PI / 2);

const fluidMat = new FluidV3Material(renderer, size, sizey, objectCount);
const fluidMesh = new THREE.Mesh(planeGeo, fluidMat);
scene.add(fluidMesh);

fluidMat.transmission = .8;
fluidMat.roughness = 1;
fluidMat.color = new THREE.Color(0xfefefe);
fluidMat.metalness = 0;

fluidMat.splatForce = -42;
fluidMat.splatThickness = 0.00796;

fluidMat.track(ball, 1, 0xff0000); //<---- THIS IS WHAT MAKES THE LIQUID REACT TO OBJECTS
fluidMat.track(ball2, 2, 0x00ff00); //<---- THIS IS WHAT MAKES THE LIQUID REACT TO OBJECTS

//------------------- DEBUG PANEL
fluidMat.addDebugPanelFolder(panel);
fluidMat.setSettings({
    "splatForce": -178,
    "splatThickness": 0.0199,
    "vorticityInfluence": 1,
    "swirlIntensity": 7.821,
    "pressure": 0.676,
    "velocityDissipation": 0.283,
    "densityDissipation": 0.761,
    "displacementScale": 0.013,
    "pressureIterations": 58
});

//---------------------------------------------------------

const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    time += delta;

    updateBalls(time);

    stats.begin();
    fluidMat.update(delta, fluidMesh);
    stats.end();

    // Render main scene
    renderer.render(scene, camera);
}
animate();

//---------------------------
function setupSky() {
    const sun = new THREE.Vector3();
    const sky = new Sky();
    sky.scale.setScalar(10000);
    scene.add(sky);
    const skyUniforms = sky.material.uniforms;

    skyUniforms['turbidity'].value = 10;
    skyUniforms['rayleigh'].value = 2;
    skyUniforms['mieCoefficient'].value = 0.005;
    skyUniforms['mieDirectionalG'].value = 0.8;

    const parameters = {
        elevation: 2,
        azimuth: 180
    };

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    let renderTarget: THREE.WebGLRenderTarget;

    function updateSun() {
        const phi = THREE.MathUtils.degToRad(90 - parameters.elevation);
        const theta = THREE.MathUtils.degToRad(parameters.azimuth);

        sun.setFromSphericalCoords(1, phi, theta);

        sky.material.uniforms['sunPosition'].value.copy(sun);

        if (renderTarget !== undefined) renderTarget.dispose();

        scene.add(sky);
        renderTarget = pmremGenerator.fromScene(scene);
        scene.add(sky);

        scene.environment = renderTarget.texture;
    }

    updateSun();
}
