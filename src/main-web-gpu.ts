
import './index.css';
import * as THREE from 'three/webgpu';
import Stats from "three/examples/jsm/libs/stats.module.js";
import GUI from "three/examples/jsm/libs/lil-gui.module.min.js";
import { FluidMaterialGPU } from './FluidMaterialGPU';
import { createDemoScene } from './demo/createDemoScene';

const stats = new Stats();
const clock = new THREE.Clock();

document.body.appendChild(stats.dom);

const panel = new GUI({ width: 310 });

const renderer = new THREE.WebGPURenderer({ antialias: true });
document.body.appendChild(renderer.domElement);
renderer.setSize(innerWidth, innerHeight);

renderer.init().then(() => {

    const { camera, scene, ball, ball2, updateBalls } = createDemoScene(renderer.domElement);

    renderer.setAnimationLoop(animate);

    let time = 0;

    //---------------------------------------- DEMO SCENE SETUP
    const size = 1024 / 2; //Remember 4 textures will be created with this size...
    const sizey = size;
    const objectCount = 2;

    const planeGeo = new THREE.PlaneGeometry(3, 3, 211, 211);
    planeGeo.rotateX(-Math.PI / 2);

    const fluidMat = new FluidMaterialGPU(renderer, size, sizey, objectCount);
    const fluidMesh = new THREE.Mesh(planeGeo, fluidMat);
    scene.add(fluidMesh);

    fluidMat.track(ball, 10, new THREE.Color(0xff0000)); //<---- THIS IS WHAT MAKES THE LIQUID REACT TO OBJECTS
    fluidMat.track(ball2, 20, new THREE.Color(0x00ff00)); //<---- THIS IS WHAT MAKES THE LIQUID REACT TO OBJECTS

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

        updateBalls(time);

        stats.begin();
        fluidMat.update(delta, fluidMesh);
        stats.end();

        // Render main scene
        renderer.render(scene, camera);
    }
});
