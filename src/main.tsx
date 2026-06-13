// Entry point: routes to WebGL or WebGPU demo based on URL hash.
// #webgpu -> loads WebGPU demo
// anything else (default) -> loads WebGL demo

const hash = window.location.hash;

if (hash === '#webgpu') {
    import('./main-web-gpu');
} else {
    import('./main-webgl');
}
