import type * as THREE from 'three';

export interface DemoScene {
    camera: THREE.PerspectiveCamera;
    scene: THREE.Scene;
    ball: THREE.Mesh;
    ball2: THREE.Mesh;
    /** Updates ball positions based on elapsed time. Call each frame with accumulated time. */
    updateBalls: (time: number) => void;
}
