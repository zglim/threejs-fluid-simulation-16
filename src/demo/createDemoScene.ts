import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/Addons.js";
import Stats from "three/examples/jsm/libs/stats.module.js";
import GUI from "three/examples/jsm/libs/lil-gui.module.min.js";
import type { DemoContext, DemoSceneOptions, IFluidMaterial } from "./types";

const DEFAULT_SETTINGS: DemoSceneOptions = {
    planeSegments: 200,
    lightPosition: [4, 1, 0],
    trackRatios: [1, 2],
};

/**
 * Builds the shared demo scene: camera, lights, plane, fluid mesh,
 * two tracking balls, spot-light, debug panel, and OrbitControls.
 *
 * The caller is responsible for creating the renderer and the material;
 * everything else is handled here so both WebGL and WebGPU demos share
 * identical scene content.
 */
export function createDemoScene(
    renderer: THREE.WebGLRenderer | import("three/webgpu").WebGPURenderer,
    fluidMat: IFluidMaterial,
    options: DemoSceneOptions = {},
): DemoContext {
    const opts = { ...DEFAULT_SETTINGS, ...options };

    // ── stats & GUI ──────────────────────────────────────────────
    const stats = new Stats();
    document.body.appendChild(stats.dom);

    const panel = new GUI({ width: 310 });

    // ── camera ───────────────────────────────────────────────────
    const camera = new THREE.PerspectiveCamera(
        45,
        innerWidth / innerHeight,
        0.1,
        100,
    );
    camera.position.set(1, 1, 2);
    camera.lookAt(0, 0, 0);

    // ── scene ────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x333333);

    // ── lights ───────────────────────────────────────────────────
    const dirLight = new THREE.DirectionalLight(0xffffff, 3);
    dirLight.position.set(...(opts.lightPosition!));
    dirLight.castShadow = true;
    scene.add(dirLight);
    scene.add(new THREE.AmbientLight(0xffffff, 0.3));

    // ── controls ─────────────────────────────────────────────────
    new OrbitControls(camera, renderer.domElement);

    // ── fluid plane ──────────────────────────────────────────────
    const seg = opts.planeSegments!;
    const planeGeo = new THREE.PlaneGeometry(3, 3, seg, seg);
    planeGeo.rotateX(-Math.PI / 2);

    const fluidMesh = new THREE.Mesh(planeGeo, fluidMat as unknown as THREE.Material);
    scene.add(fluidMesh);

    // ── optional extra material config (e.g. transmission, color) ─
    opts.materialSetup?.(fluidMat);

    // ── balls ────────────────────────────────────────────────────
    const ball = new THREE.Mesh(
        new THREE.SphereGeometry(0.03, 10, 10),
        new THREE.MeshPhysicalMaterial({ color: 0xff0000 }),
    );
    ball.position.y = 0.02;
    scene.add(ball);

    const ball2 = new THREE.Mesh(
        new THREE.SphereGeometry(0.06, 10, 10),
        new THREE.MeshPhysicalMaterial({ color: 0x00ff00 }),
    );
    ball2.position.y = 0.02;
    scene.add(ball2);

    // small point-light riding on ball 1
    const spot = new THREE.PointLight();
    spot.castShadow = true;
    spot.intensity = 0.1;
    spot.position.set(0, 0.2, 0);
    ball.add(spot);

    // ── tracking ─────────────────────────────────────────────────
    const [r1, r2] = opts.trackRatios!;
    fluidMat.track(ball, r1, 0xff0000);
    fluidMat.track(ball2, r2, 0x00ff00);

    // ── debug panel ──────────────────────────────────────────────
    fluidMat.addDebugPanelFolder(panel);

    if (opts.settings) {
        // Merge partial settings with defaults so setSettings always
        // receives a complete FluidSettings object.
        fluidMat.setSettings({
            splatForce: -178,
            splatThickness: 0.0199,
            vorticityInfluence: 1,
            swirlIntensity: 7.821,
            pressureDecay: 0.676,
            velocityDissipation: 0.283,
            densityDissipation: 0.761,
            displacementScale: 0.013,
            pressureIterations: 58,
            ...opts.settings,
        });
    }

    // ── environment (sky etc.) ───────────────────────────────────
    if (opts.environmentSetup && "getContext" in renderer) {
        opts.environmentSetup(scene, renderer as THREE.WebGLRenderer);
    }

    return { scene, camera, renderer, fluidMat, fluidMesh, ball, ball2, stats };
}

/**
 * Per-frame update: moves the two balls along circular paths,
 * advances the fluid simulation, and renders the scene.
 *
 * Returns the updated `time` accumulator so the caller can feed
 * it back on the next frame.
 */
export function tickDemo(ctx: DemoContext, time: number, delta: number): number {
    const t = time + delta;

    ctx.ball.position.x = Math.cos(t) * 0.3;
    ctx.ball.position.z = Math.sin(t) * 0.3;

    ctx.ball2.position.x = 0.2 + Math.sin(t) * 0.2;
    ctx.ball2.position.z = Math.cos(t) * 0.2;

    ctx.stats.begin();
    ctx.fluidMat.update(delta, ctx.fluidMesh);
    ctx.stats.end();

    ctx.renderer.render(ctx.scene, ctx.camera);

    return t;
}
