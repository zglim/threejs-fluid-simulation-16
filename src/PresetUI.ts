/**
 * PresetUI – adds preset management controls to the lil-gui debug panel.
 * Works with both WebGL and WebGPU fluid materials.
 */
import GUI from "three/examples/jsm/libs/lil-gui.module.min.js";
import {
  PresetManager,
  RendererType,
  FluidMode,
  copyToClipboard,
  buildConfigString,
  setRendererInURL,
  type Preset,
  type CommonParams,
  type WebGLParams,
  type WebGPUParams,
} from "./presets";

// ---------- Toast ----------

let toastContainer: HTMLElement | null = null;

function ensureToastContainer() {
  if (toastContainer) return toastContainer;
  toastContainer = document.createElement("div");
  toastContainer.id = "fluid-toast-container";
  toastContainer.style.cssText = `
    position: fixed; bottom: 60px; left: 50%; transform: translateX(-50%);
    z-index: 9999; display: flex; flex-direction: column; align-items: center; gap: 8px;
    pointer-events: none;
  `;
  document.body.appendChild(toastContainer);
  return toastContainer;
}

export function showToast(message: string, type: "success" | "error" | "info" = "info", duration = 2500) {
  const container = ensureToastContainer();
  const el = document.createElement("div");
  el.textContent = message;
  const bg = type === "success" ? "#2d8a4e" : type === "error" ? "#c0392b" : "#2c3e50";
  el.style.cssText = `
    background: ${bg}; color: #fff; padding: 10px 20px; border-radius: 6px;
    font-size: 14px; font-family: sans-serif; box-shadow: 0 2px 8px rgba(0,0,0,0.4);
    opacity: 0; transition: opacity 0.3s;
  `;
  container.appendChild(el);
  requestAnimationFrame(() => { el.style.opacity = "1"; });
  setTimeout(() => {
    el.style.opacity = "0";
    setTimeout(() => el.remove(), 300);
  }, duration);
}

// ---------- Interfaces for material adapters ----------

export interface FluidMaterialAdapter {
  rendererType: RendererType;

  /** Read current params from the material */
  getCurrentParams(): Record<string, number>;

  /** Apply a flat settings object to the material */
  applySettings(flat: Record<string, number>): void;

  /** Apply a mode (liquid/smoke) – updates material visual state */
  applyMode(mode: FluidMode): void;
}

// ---------- Build Preset Folder ----------

export function addPresetPanel(
  gui: GUI,
  adapter: FluidMaterialAdapter
) {
  const manager = new PresetManager();
  const folder = gui.addFolder("Presets");

  // State for dropdown
  const state = {
    selectedPreset: "",
    newPresetName: "",
    selectedMode: "liquid" as FluidMode,
  };

  // -- Preset list dropdown --
  const presetNames = () => manager.getAll().map((p) => p.name);
  let presetController: any = null;

  function refreshDropdown() {
    if (presetController) {
      folder.remove(presetController);
    }
    const names = presetNames();
    presetController = folder.add(state, "selectedPreset", names.length > 0 ? names : ["(none)"]);
    presetController.name("Select Preset");
    // Move to top
    const el = presetController.domElement.parentElement;
    if (el && folder.domElement.firstChild) {
      folder.domElement.insertBefore(el, folder.domElement.firstChild);
    }
  }

  refreshDropdown();

  // -- Load button --
  folder.add({
    load: () => {
      if (!state.selectedPreset || state.selectedPreset === "(none)") {
        showToast("No preset selected", "error");
        return;
      }
      const preset = manager.get(state.selectedPreset);
      if (!preset) {
        showToast("Preset not found", "error");
        return;
      }
      const flat =
        adapter.rendererType === "webgl"
          ? PresetManager.toFlatForWebGL(preset)
          : PresetManager.toFlatForWebGPU(preset);
      adapter.applySettings(flat);
      if (preset.mode) {
        adapter.applyMode(preset.mode);
      }
      showToast(`Loaded: ${preset.name}`, "success");
    },
  }, "load").name("Load Preset");

  // -- Save button --
  folder.add(state, "newPresetName").name("New Name");
  folder.add({
    save: () => {
      const name = state.newPresetName.trim();
      if (!name) {
        showToast("Enter a preset name first", "error");
        return;
      }
      const params = adapter.getCurrentParams();
      const preset = PresetManager.fromFlatSettings(name, params, adapter.rendererType);
      manager.savePreset(name, preset.common, preset.webgl, preset.webgpu);
      state.selectedPreset = name;
      refreshDropdown();
      showToast(`Saved: ${name}`, "success");
    },
  }, "save").name("Save Preset");

  // -- Delete button --
  folder.add({
    delete: () => {
      if (!state.selectedPreset || state.selectedPreset === "(none)") {
        showToast("No preset selected", "error");
        return;
      }
      if (manager.delete(state.selectedPreset)) {
        showToast(`Deleted: ${state.selectedPreset}`, "info");
        state.selectedPreset = "";
        refreshDropdown();
      }
    },
  }, "delete").name("Delete Preset");

  // -- Mode presets --
  const modeFolder = folder.addFolder("Quick Modes");
  modeFolder.add(state, "selectedMode", ["liquid", "smoke"]).name("Mode");
  modeFolder.add({
    apply: () => {
      const modePreset = PresetManager.getModePreset(state.selectedMode);
      const flat =
        adapter.rendererType === "webgl"
          ? PresetManager.toFlatForWebGL(modePreset)
          : PresetManager.toFlatForWebGPU(modePreset);
      adapter.applySettings(flat);
      adapter.applyMode(state.selectedMode);
      showToast(`Applied mode: ${state.selectedMode}`, "success");
    },
  }, "apply").name("Apply Mode");

  // -- Copy config --
  folder.add({
    copyConfig: async () => {
      const params = adapter.getCurrentParams();
      const preset = PresetManager.fromFlatSettings("current", params, adapter.rendererType);
      const text = buildConfigString(preset, adapter.rendererType);
      const result = await copyToClipboard(text);
      if (result.ok) {
        showToast("Config copied to clipboard!", "success");
      } else {
        showToast(`Copy failed: ${result.message}`, "error");
      }
    },
  }, "copyConfig").name("Copy Config");

  // -- Switch renderer --
  const otherRenderer = adapter.rendererType === "webgl" ? "webgpu" : "webgl";
  folder.add({
    switchRenderer: () => {
      setRendererInURL(otherRenderer as RendererType);
    },
  }, "switchRenderer").name(`Switch to ${otherRenderer.toUpperCase()}`);

  return folder;
}
