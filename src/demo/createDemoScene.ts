import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/Addons.js';
import type { DemoScene } from './types';

/**
 * Creates the shared demo scene used by both WebGL and WebGPU entry points.
 * Sets up camera, scene, lights, orbit controls, two tracking balls, and a point light.
 */
export function createDemoScene(rendererDomElement: HTMLCanvasElement): DemoScene {
    // Camera
    const camera = new THREE.PerspectiveCamera(
        45,
        innerWidth / innerHeight,
        0.1,
        100
    );
    camera.position.set(1, 1, 2);
    camera.lookAt(0, 0, 0);

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x333333);

    // Directional light
    const light = new THREE.DirectionalLight(0xffffff, 3);
    light.position.set(4, 1, 0);
    light.castShadow = true;
    scene.add(light);

    // Ambient light
    scene.add(new THREE.AmbientLight(0xffffff, 0.3));

    // Orbit controls
    new OrbitControls(camera, rendererDomElement);

    // Ball 1 – small red
    const ball = new THREE.Mesh(
        new THREE.SphereGeometry(0.03, 10, 10),
        new THREE.MeshPhysicalMaterial({ color: 0xff0000 })
    );
    ball.position.y = 0.02;
    scene.add(ball);

    // Ball 2 – larger green
    const ball2 = new THREE.Mesh(
        new THREE.SphereGeometry(0.06, 10, 10),
        new THREE.MeshPhysicalMaterial({ color: 0x00ff00 })
    );
    ball2.position.y = 0.02;
    scene.add(ball2);

    // Point light attached to ball1
    const spot = new THREE.PointLight();
    spot.castShadow = true;
    spot.intensity = 0.1;
    spot.position.set(0, 0.2, 0);
    ball.add(spot);

    // Ball motion update – call each frame with accumulated time
    function updateBalls(time: number) {
        ball.position.x = Math.cos(time) * 0.3;
        ball.position.z = Math.sin(time) * 0.3;

        ball2.position.x = 0.2 + Math.sin(time) * 0.2;
        ball2.position.z = Math.cos(time) * 0.2;
    }

    return { camera, scene, ball, ball2, updateBalls };
}
