import type { ColorRepresentation, Mesh, Object3D, PerspectiveCamera, Scene } from "three";
import type { WebGLRenderer } from "three";
import type { WebGPURenderer } from "three/webgpu";
import type GUI from "three/examples/jsm/libs/lil-gui.module.min.js";
import type Stats from "three/examples/jsm/libs/stats.module.js";

/**
 * Unified fluid material settings.
 * Parameter names are normalized so the demo layer never has to know
 * whether the backend calls it `pressure` or `pressureDecay`.
 */
export interface FluidSettings {
    splatForce: number;
    splatThickness: number;
    vorticityInfluence: number;
    swirlIntensity: number;
    pressureDecay: number;
    velocityDissipation: number;
    densityDissipation: number;
    displacementScale: number;
    pressureIterations: number;
}

/**
 * The minimal contract that both FluidV3Material (WebGL) and
 * FluidMaterialGPU (WebGPU) must satisfy so the demo scene
 * can treat them interchangeably.
 */
export interface IFluidMaterial {
    // --- normalized tunables ---
    splatForce: number;
    splatThickness: number;
    vorticityInfluence: number;
    swirlIntensity: number;
    pressureDecay: number;
    velocityDissipation: number;
    densityDissipation: number;
    displacementScale: number;
    pressureIterations: number;

    follow?: Object3D;

    track(object: Object3D, ratio?: number, color?: ColorRepresentation): void;
    untrack(object: Object3D): void;
    update(delta: number, mesh: Mesh): void;
    addDebugPanelFolder(gui: GUI, name?: string): void;
    setSettings(s: FluidSettings): void;
}

/**
 * Everything the shared animation loop needs to keep the demo running.
 */
export interface DemoContext {
    scene: Scene;
    camera: PerspectiveCamera;
    renderer: WebGLRenderer | WebGPURenderer;
    fluidMat: IFluidMaterial;
    fluidMesh: Mesh;
    ball: Mesh;
    ball2: Mesh;
    stats: Stats;
}

/**
 * Options accepted by `createDemoScene`.
 * Anything not provided falls back to a sensible default.
 */
export interface DemoSceneOptions {
    /** Plane subdivision – WebGL uses 200, GPU uses 211 */
    planeSegments?: number;
    /** Directional-light position */
    lightPosition?: [number, number, number];
    /** Track ratios for ball 1 and ball 2 */
    trackRatios?: [number, number];
    /** Initial FluidSettings to push into the material after creation */
    settings?: Partial<FluidSettings>;
    /** Extra per-material tweaks (e.g. transmission, roughness) */
    materialSetup?: (mat: IFluidMaterial) => void;
    /** Optional sky / environment setup (WebGL only currently) */
    environmentSetup?: (scene: Scene, renderer: WebGLRenderer) => void;
}
