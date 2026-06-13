/**
 * Basic validation tests for preset management, mode switching, and entry points.
 * Run with: node test/presets.test.mjs
 *
 * Compiles presets.ts to a temp JS file first, then runs tests against it.
 */
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const tmpDir = path.join(__dirname, ".tmp");

// Compile presets.ts to JS
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
const outFile = path.join(tmpDir, "presets.mjs");
execSync(`npx esbuild ${path.join(projectRoot, "src/presets.ts")} --bundle --format=esm --outfile=${outFile} --platform=node`, {
  cwd: projectRoot,
  stdio: "pipe",
});

// Mock localStorage
const store = {};
globalThis.localStorage = {
  getItem(key) { return store[key] ?? null; },
  setItem(key, val) { store[key] = String(val); },
  removeItem(key) { delete store[key]; },
  clear() { Object.keys(store).forEach(k => delete store[k]); },
};

// Mock window/navigator
Object.defineProperty(globalThis, "window", {
  value: { location: { href: "http://localhost:5173/?renderer=webgl", search: "?renderer=webgl" } },
  writable: true,
  configurable: true,
});
Object.defineProperty(globalThis, "navigator", {
  value: { clipboard: null },
  writable: true,
  configurable: true,
});

// Import the compiled module
const {
  PresetManager,
  MODE_PRESETS,
  copyToClipboard,
  buildConfigString,
  getRendererFromURL,
} = await import(outFile);

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ ${message}`);
    failed++;
  }
}

// ---- Test: Save and retrieve preset ----
console.log("\n=== Test: Save and retrieve preset ===");
{
  const mgr = new PresetManager();
  const common = { splatForce: -0.3, splatThickness: 0.5, vorticityInfluence: 0.8, swirlIntensity: 20, velocityDissipation: 0.3, densityDissipation: 0.7, pressureIterations: 40 };
  const webgl = { pressure: 0.5, displacementScale: 0.01 };
  const webgpu = { pressureDecay: 0.3, bumpDisplacmentScale: 0.03 };

  mgr.savePreset("test1", common, webgl, webgpu);
  const retrieved = mgr.get("test1");
  assert(retrieved !== undefined, "Preset can be retrieved after save");
  assert(retrieved.name === "test1", "Preset name matches");
  assert(retrieved.common.splatForce === -0.3, "Common params preserved");
  assert(retrieved.webgl.pressure === 0.5, "WebGL params preserved");
  assert(retrieved.webgpu.pressureDecay === 0.3, "WebGPU params preserved");
}

// ---- Test: Persistence across instances ----
console.log("\n=== Test: Persistence across instances ===");
{
  localStorage.clear();
  const mgr1 = new PresetManager();
  const common = { splatForce: -0.1, splatThickness: 0.2, vorticityInfluence: 0.3, swirlIntensity: 4, velocityDissipation: 0.5, densityDissipation: 0.6, pressureIterations: 7 };
  mgr1.savePreset("persist-test", common, { pressure: 0.1, displacementScale: 0.01 }, { pressureDecay: 0.2, bumpDisplacmentScale: 0.02 });

  const mgr2 = new PresetManager();
  const retrieved = mgr2.get("persist-test");
  assert(retrieved !== undefined, "Preset persists across PresetManager instances (localStorage)");
  assert(retrieved.common.swirlIntensity === 4, "Nested param preserved after reload");
}

// ---- Test: Delete preset ----
console.log("\n=== Test: Delete preset ===");
{
  localStorage.clear();
  const mgr = new PresetManager();
  mgr.savePreset("to-delete", { splatForce: 0, splatThickness: 0, vorticityInfluence: 0, swirlIntensity: 0, velocityDissipation: 0, densityDissipation: 0, pressureIterations: 0 }, { pressure: 0, displacementScale: 0 }, { pressureDecay: 0, bumpDisplacmentScale: 0 });
  assert(mgr.has("to-delete"), "Preset exists before delete");
  mgr.delete("to-delete");
  assert(!mgr.has("to-delete"), "Preset removed after delete");
}

// ---- Test: List all presets ----
console.log("\n=== Test: List all presets ===");
{
  localStorage.clear();
  const mgr = new PresetManager();
  mgr.savePreset("a", { splatForce: 0, splatThickness: 0, vorticityInfluence: 0, swirlIntensity: 0, velocityDissipation: 0, densityDissipation: 0, pressureIterations: 0 }, { pressure: 0, displacementScale: 0 }, { pressureDecay: 0, bumpDisplacmentScale: 0 });
  mgr.savePreset("b", { splatForce: 0, splatThickness: 0, vorticityInfluence: 0, swirlIntensity: 0, velocityDissipation: 0, densityDissipation: 0, pressureIterations: 0 }, { pressure: 0, displacementScale: 0 }, { pressureDecay: 0, bumpDisplacmentScale: 0 });
  const all = mgr.getAll();
  assert(all.length === 2, "getAll returns correct count");
  assert(all[0].name === "a" && all[1].name === "b", "getAll returns sorted by creation time");
}

// ---- Test: Mode presets ----
console.log("\n=== Test: Mode presets ===");
{
  const liquidPreset = PresetManager.getModePreset("liquid");
  assert(liquidPreset.mode === "liquid", "Liquid mode preset has correct mode");
  assert(typeof liquidPreset.common.splatForce === "number", "Liquid mode has splatForce");

  const smokePreset = PresetManager.getModePreset("smoke");
  assert(smokePreset.mode === "smoke", "Smoke mode preset has correct mode");
  assert(smokePreset.common.densityDissipation > liquidPreset.common.densityDissipation, "Smoke has higher density dissipation than liquid");
  assert(smokePreset.common.swirlIntensity > liquidPreset.common.swirlIntensity, "Smoke has higher swirl intensity than liquid");
}

// ---- Test: Flat settings conversion (WebGL) ----
console.log("\n=== Test: Flat settings conversion (WebGL) ===");
{
  const flat = {
    splatForce: -0.5, splatThickness: 0.1, vorticityInfluence: 0.9, swirlIntensity: 30,
    velocityDissipation: 0.4, densityDissipation: 0.8, pressureIterations: 50,
    pressure: 0.6, displacementScale: 0.02,
  };
  const preset = PresetManager.fromFlatSettings("from-flat", flat, "webgl");
  assert(preset.webgl.pressure === 0.6, "WebGL pressure extracted from flat");
  assert(preset.common.splatForce === -0.5, "Common splatForce extracted from flat");

  const backToWebGL = PresetManager.toFlatForWebGL(preset);
  assert(backToWebGL.pressure === 0.6, "Round-trip: WebGL pressure preserved");
  assert(backToWebGL.splatForce === -0.5, "Round-trip: splatForce preserved");
}

// ---- Test: Flat settings conversion (WebGPU) ----
console.log("\n=== Test: Flat settings conversion (WebGPU) ===");
{
  const flat = {
    splatForce: -0.2, splatThickness: 0.3, vorticityInfluence: 0.7, swirlIntensity: 15,
    velocityDissipation: 0.35, densityDissipation: 0.65, pressureIterations: 45,
    pressureDecay: 0.4, bumpDisplacmentScale: 0.05,
  };
  const preset = PresetManager.fromFlatSettings("from-flat-gpu", flat, "webgpu");
  assert(preset.webgpu.pressureDecay === 0.4, "WebGPU pressureDecay extracted from flat");
  assert(preset.webgpu.bumpDisplacmentScale === 0.05, "WebGPU bumpDisplacmentScale extracted from flat");

  const toWebGPU = PresetManager.toFlatForWebGPU(preset);
  assert(toWebGPU.pressureDecay === 0.4, "Round-trip: WebGPU pressureDecay preserved");
  assert(toWebGPU.splatForce === -0.2, "Round-trip: common splatForce in WebGPU flat");
}

// ---- Test: Cross-renderer compatibility ----
console.log("\n=== Test: Cross-renderer compatibility ===");
{
  const flat = {
    splatForce: -0.5, splatThickness: 0.1, vorticityInfluence: 0.9, swirlIntensity: 30,
    velocityDissipation: 0.4, densityDissipation: 0.8, pressureIterations: 50,
    pressure: 0.6, displacementScale: 0.02,
  };
  const preset = PresetManager.fromFlatSettings("cross", flat, "webgl");

  // Apply to WebGPU (uses default WebGPU params for renderer-specific ones)
  const gpuFlat = PresetManager.toFlatForWebGPU(preset);
  assert(gpuFlat.splatForce === -0.5, "Cross-renderer: common params transfer to WebGPU");
  assert(typeof gpuFlat.pressureDecay === "number", "Cross-renderer: WebGPU gets default pressureDecay");
  assert(typeof gpuFlat.bumpDisplacmentScale === "number", "Cross-renderer: WebGPU gets default bumpDisplacmentScale");
}

// ---- Test: Copy config string ----
console.log("\n=== Test: Copy config string ===");
{
  const preset = PresetManager.getModePreset("liquid");
  const configStr = buildConfigString(preset, "webgl");
  const parsed = JSON.parse(configStr);
  assert(parsed.renderer === "webgl", "Config string includes renderer");
  assert(parsed.mode === "liquid", "Config string includes mode");
  assert(typeof parsed.common === "object", "Config string includes common params");
  assert(typeof parsed.webgl === "object", "Config string includes webgl params");
  assert(typeof parsed.webgpu === "object", "Config string includes webgpu params");
}

// ---- Test: Clipboard fallback ----
console.log("\n=== Test: Clipboard fallback ===");
{
  const result = await copyToClipboard("test");
  assert(!result.ok, "Copy fails gracefully when clipboard unavailable");
  assert(result.message.includes("not available"), "Error message is descriptive");
}

// ---- Test: URL renderer detection ----
console.log("\n=== Test: URL renderer detection ===");
{
  Object.defineProperty(globalThis, "window", {
    value: { location: { href: "http://localhost:5173/?renderer=webgl", search: "?renderer=webgl" } },
    writable: true, configurable: true,
  });
  assert(getRendererFromURL() === "webgl", "Detects webgl from URL");

  Object.defineProperty(globalThis, "window", {
    value: { location: { href: "http://localhost:5173/?renderer=webgpu", search: "?renderer=webgpu" } },
    writable: true, configurable: true,
  });
  assert(getRendererFromURL() === "webgpu", "Detects webgpu from URL");

  Object.defineProperty(globalThis, "window", {
    value: { location: { href: "http://localhost:5173/", search: "" } },
    writable: true, configurable: true,
  });
  assert(getRendererFromURL() === null, "Returns null when no renderer param");

  Object.defineProperty(globalThis, "window", {
    value: { location: { href: "http://localhost:5173/?renderer=invalid", search: "?renderer=invalid" } },
    writable: true, configurable: true,
  });
  assert(getRendererFromURL() === null, "Returns null for invalid renderer param");
}

// ---- Test: Entry points exist and integrate presets ----
console.log("\n=== Test: Entry points and integration ===");
{
  assert(fs.existsSync(path.join(projectRoot, "src/main.tsx")), "main.tsx exists");
  assert(fs.existsSync(path.join(projectRoot, "src/main-webgl.ts")), "main-webgl.ts exists");
  assert(fs.existsSync(path.join(projectRoot, "src/main-web-gpu.ts")), "main-web-gpu.ts exists");
  assert(fs.existsSync(path.join(projectRoot, "src/presets.ts")), "presets.ts exists");
  assert(fs.existsSync(path.join(projectRoot, "src/PresetUI.ts")), "PresetUI.ts exists");

  // Check main.tsx has launcher logic
  const mainContent = fs.readFileSync(path.join(projectRoot, "src/main.tsx"), "utf-8");
  assert(mainContent.includes("showLauncher"), "main.tsx has launcher function");
  assert(mainContent.includes("importModule"), "main.tsx has dynamic import");
  assert(mainContent.includes("getRendererFromURL"), "main.tsx reads renderer from URL");

  // Check WebGL entry integrates presets
  const webglContent = fs.readFileSync(path.join(projectRoot, "src/main-webgl.ts"), "utf-8");
  assert(webglContent.includes("addPresetPanel"), "WebGL entry integrates preset panel");
  assert(webglContent.includes("webglAdapter"), "WebGL entry has FluidMaterialAdapter");
  assert(webglContent.includes('rendererType: "webgl"'), "WebGL adapter declares rendererType");

  // Check WebGPU entry integrates presets
  const webgpuContent = fs.readFileSync(path.join(projectRoot, "src/main-web-gpu.ts"), "utf-8");
  assert(webgpuContent.includes("addPresetPanel"), "WebGPU entry integrates preset panel");
  assert(webgpuContent.includes("webgpuAdapter"), "WebGPU entry has FluidMaterialAdapter");
  assert(webgpuContent.includes('rendererType: "webgpu"'), "WebGPU adapter declares rendererType");

  // Check animation loop still intact
  assert(webglContent.includes("function animate()"), "WebGL animate loop still exists");
  assert(webglContent.includes("ball.position"), "WebGL ball animation still exists");
  assert(webglContent.includes("ball2.position"), "WebGL ball2 animation still exists");
  assert(webgpuContent.includes("function animate()"), "WebGPU animate loop still exists");
  assert(webgpuContent.includes("ball.position"), "WebGPU ball animation still exists");
  assert(webgpuContent.includes("ball2.position"), "WebGPU ball2 animation still exists");
}

// ---- Test: Overwrite existing preset ----
console.log("\n=== Test: Overwrite existing preset ===");
{
  localStorage.clear();
  const mgr = new PresetManager();
  mgr.savePreset("ow", { splatForce: -0.1, splatThickness: 0, vorticityInfluence: 0, swirlIntensity: 0, velocityDissipation: 0, densityDissipation: 0, pressureIterations: 0 }, { pressure: 0, displacementScale: 0 }, { pressureDecay: 0, bumpDisplacmentScale: 0 });
  const first = mgr.get("ow");
  mgr.savePreset("ow", { splatForce: -0.9, splatThickness: 0, vorticityInfluence: 0, swirlIntensity: 0, velocityDissipation: 0, densityDissipation: 0, pressureIterations: 0 }, { pressure: 0, displacementScale: 0 }, { pressureDecay: 0, bumpDisplacmentScale: 0 });
  const second = mgr.get("ow");
  assert(second.common.splatForce === -0.9, "Overwrite updates params");
  assert(second.createdAt === first.createdAt, "Overwrite preserves original createdAt");
}

// ---- Test: Corrupted localStorage ----
console.log("\n=== Test: Corrupted localStorage ===");
{
  localStorage.clear();
  localStorage.setItem("fluid-demo-presets", "NOT VALID JSON {{{");
  const mgr = new PresetManager();
  assert(mgr.getAll().length === 0, "Handles corrupted localStorage gracefully");
}

// ---- Summary ----
console.log(`\n${"=".repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log(`${"=".repeat(40)}\n`);

// Cleanup
fs.rmSync(tmpDir, { recursive: true, force: true });

if (failed > 0) process.exit(1);
