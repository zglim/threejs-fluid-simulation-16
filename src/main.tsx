/**
 * Launcher / Renderer Switcher
 *
 * Reads `?renderer=webgl|webgpu` from the URL and dynamically imports
 * the corresponding demo entry. If no param is set, shows a selection screen.
 */
import { getRendererFromURL } from "./presets";

function showLauncher() {
  document.body.innerHTML = "";

  const overlay = document.createElement("div");
  overlay.id = "fluid-launcher";
  overlay.style.cssText = `
    position: fixed; inset: 0; z-index: 10000;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    background: #1a1a2e; color: #eee; font-family: sans-serif;
  `;

  overlay.innerHTML = `
    <h1 style="margin:0 0 12px; font-size:2em;">ThreeJS Fluid Simulation</h1>
    <p style="margin:0 0 32px; opacity:0.7;">Choose a renderer to start the demo</p>
    <div style="display:flex; gap:24px;">
      <button id="btn-webgl" style="
        padding:16px 32px; font-size:1.1em; border-radius:8px; border:2px solid #646cff;
        background:#2a2a4a; color:#fff; cursor:pointer; transition: all 0.2s;
      ">WebGL</button>
      <button id="btn-webgpu" style="
        padding:16px 32px; font-size:1.1em; border-radius:8px; border:2px solid #00d2ff;
        background:#2a2a4a; color:#fff; cursor:pointer; transition: all 0.2s;
      ">WebGPU</button>
    </div>
    <p style="margin-top:24px; opacity:0.5; font-size:0.85em;">
      You can switch between renderers at any time from the GUI panel.
    </p>
  `;

  document.body.appendChild(overlay);

  const btnWebgl = document.getElementById("btn-webgl")!;
  const btnWebgpu = document.getElementById("btn-webgpu")!;

  function load(renderer: "webgl" | "webgpu") {
    overlay.remove();
    // Set URL param then load
    const url = new URL(window.location.href);
    url.searchParams.set("renderer", renderer);
    window.history.replaceState({}, "", url.toString());
    importModule(renderer);
  }

  btnWebgl.addEventListener("click", () => load("webgl"));
  btnWebgpu.addEventListener("click", () => load("webgpu"));
}

function importModule(renderer: "webgl" | "webgpu") {
  if (renderer === "webgl") {
    import("./main-webgl");
  } else {
    import("./main-web-gpu");
  }
}

// -- Entry point --
const renderer = getRendererFromURL();
if (renderer) {
  importModule(renderer);
} else {
  showLauncher();
}
