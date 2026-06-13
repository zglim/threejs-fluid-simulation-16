/**
 * Unified preset management for WebGL and WebGPU fluid simulations.
 * Handles save/load/delete of presets via localStorage, mode presets,
 * and cross-renderer compatibility.
 */

// ---------- Types ----------

export type RendererType = "webgl" | "webgpu";

/** Common params shared by both renderers */
export interface CommonParams {
  splatForce: number;
  splatThickness: number;
  vorticityInfluence: number;
  swirlIntensity: number;
  velocityDissipation: number;
  densityDissipation: number;
  pressureIterations: number;
}

/** Params specific to WebGL renderer */
export interface WebGLParams {
  pressure: number;
  displacementScale: number;
}

/** Params specific to WebGPU renderer */
export interface WebGPUParams {
  pressureDecay: number;
  bumpDisplacmentScale: number;
}

export type FluidMode = "liquid" | "smoke";

export interface Preset {
  name: string;
  common: CommonParams;
  webgl: WebGLParams;
  webgpu: WebGPUParams;
  mode?: FluidMode;
  createdAt: number;
}

/** Full config used by copy/paste */
export interface FullConfig extends Preset {
  renderer: RendererType;
}

// ---------- Storage key ----------
const STORAGE_KEY = "fluid-demo-presets";

// ---------- Default / Mode presets ----------

const DEFAULT_COMMON: CommonParams = {
  splatForce: -0.32,
  splatThickness: 0.5,
  vorticityInfluence: 0.8,
  swirlIntensity: 20,
  velocityDissipation: 0.283,
  densityDissipation: 0.68,
  pressureIterations: 39,
};

const DEFAULT_WEBGL: WebGLParams = { pressure: 0.5, displacementScale: 0.013 };
const DEFAULT_WEBGPU: WebGPUParams = { pressureDecay: 0.312, bumpDisplacmentScale: 0.03 };

export const MODE_PRESETS: Record<FluidMode, Omit<Preset, "name" | "createdAt">> = {
  liquid: {
    common: {
      splatForce: -0.35,
      splatThickness: 0.02,
      vorticityInfluence: 0.8,
      swirlIntensity: 10,
      velocityDissipation: 0.2,
      densityDissipation: 0.5,
      pressureIterations: 50,
    },
    webgl: { pressure: 0.6, displacementScale: 0.015 },
    webgpu: { pressureDecay: 0.35, bumpDisplacmentScale: 0.04 },
    mode: "liquid",
  },
  smoke: {
    common: {
      splatForce: -0.15,
      splatThickness: 0.8,
      vorticityInfluence: 1.0,
      swirlIntensity: 50,
      velocityDissipation: 0.5,
      densityDissipation: 0.9,
      pressureIterations: 30,
    },
    webgl: { pressure: 0.8, displacementScale: 0.005 },
    webgpu: { pressureDecay: 0.6, bumpDisplacmentScale: 0.01 },
    mode: "smoke",
  },
};

// ---------- Preset Manager ----------

export class PresetManager {
  private presets: Map<string, Preset> = new Map();

  constructor() {
    this.load();
  }

  // -- Persistence --

  private load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const arr: Preset[] = JSON.parse(raw);
        if (Array.isArray(arr)) {
          this.presets.clear();
          for (const p of arr) {
            if (p && p.name) this.presets.set(p.name, p);
          }
        }
      }
    } catch {
      // Corrupted data – start fresh
      this.presets.clear();
    }
  }

  private save() {
    const arr = Array.from(this.presets.values());
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  }

  // -- CRUD --

  getAll(): Preset[] {
    return Array.from(this.presets.values()).sort((a, b) => a.createdAt - b.createdAt);
  }

  get(name: string): Preset | undefined {
    return this.presets.get(name);
  }

  /**
   * Save a new preset or overwrite an existing one.
   */
  savePreset(
    name: string,
    common: CommonParams,
    webgl: WebGLParams,
    webgpu: WebGPUParams,
    mode?: FluidMode
  ): Preset {
    const preset: Preset = {
      name,
      common,
      webgl,
      webgpu,
      mode,
      createdAt: this.presets.has(name) ? this.presets.get(name)!.createdAt : Date.now(),
    };
    this.presets.set(name, preset);
    this.save();
    return preset;
  }

  delete(name: string): boolean {
    const deleted = this.presets.delete(name);
    if (deleted) this.save();
    return deleted;
  }

  has(name: string): boolean {
    return this.presets.has(name);
  }

  // -- Apply helpers --

  /**
   * Extract params for a given renderer type from a preset.
   * Returns an object with all keys the target renderer understands.
   */
  static extractForRenderer(preset: Preset, renderer: RendererType): CommonParams & WebGLParams & WebGPUParams {
    return {
      ...preset.common,
      ...preset.webgl,
      ...preset.webgpu,
    };
  }

  /**
   * Build a preset from a flat settings object (what each renderer's setSettings uses).
   * Maps renderer-specific keys into the unified format.
   */
  static fromFlatSettings(
    name: string,
    flat: Record<string, number>,
    sourceRenderer: RendererType,
    mode?: FluidMode
  ): Preset {
    const common: CommonParams = {
      splatForce: flat.splatForce ?? DEFAULT_COMMON.splatForce,
      splatThickness: flat.splatThickness ?? DEFAULT_COMMON.splatThickness,
      vorticityInfluence: flat.vorticityInfluence ?? DEFAULT_COMMON.vorticityInfluence,
      swirlIntensity: flat.swirlIntensity ?? DEFAULT_COMMON.swirlIntensity,
      velocityDissipation: flat.velocityDissipation ?? DEFAULT_COMMON.velocityDissipation,
      densityDissipation: flat.densityDissipation ?? DEFAULT_COMMON.densityDissipation,
      pressureIterations: flat.pressureIterations ?? DEFAULT_COMMON.pressureIterations,
    };

    const webgl: WebGLParams = {
      pressure: sourceRenderer === "webgl" ? (flat.pressure ?? DEFAULT_WEBGL.pressure) : DEFAULT_WEBGL.pressure,
      displacementScale: sourceRenderer === "webgl" ? (flat.displacementScale ?? DEFAULT_WEBGL.displacementScale) : DEFAULT_WEBGL.displacementScale,
    };

    const webgpu: WebGPUParams = {
      pressureDecay: sourceRenderer === "webgpu" ? (flat.pressureDecay ?? DEFAULT_WEBGPU.pressureDecay) : DEFAULT_WEBGPU.pressureDecay,
      bumpDisplacmentScale: sourceRenderer === "webgpu" ? (flat.bumpDisplacmentScale ?? DEFAULT_WEBGPU.bumpDisplacmentScale) : DEFAULT_WEBGPU.bumpDisplacmentScale,
    };

    return { name, common, webgl, webgpu, mode, createdAt: Date.now() };
  }

  /**
   * Convert preset into a flat settings object suitable for a renderer's setSettings method.
   */
  static toFlatForWebGL(preset: Preset): Record<string, number> {
    return { ...preset.common, ...preset.webgl };
  }

  static toFlatForWebGPU(preset: Preset): Record<string, number> {
    return { ...preset.common, ...preset.webgpu };
  }

  // -- Mode presets --

  static getModePreset(mode: FluidMode): Preset {
    const tpl = MODE_PRESETS[mode];
    return {
      name: `__mode_${mode}`,
      ...tpl,
      createdAt: 0,
    };
  }
}

// ---------- Clipboard helpers ----------

export async function copyToClipboard(text: string): Promise<{ ok: boolean; message: string }> {
  try {
    if (!navigator.clipboard || !navigator.clipboard.writeText) {
      return { ok: false, message: "Clipboard API not available in this browser/context." };
    }
    await navigator.clipboard.writeText(text);
    return { ok: true, message: "Copied!" };
  } catch (err: any) {
    return { ok: false, message: err?.message || "Copy failed." };
  }
}

export function buildConfigString(preset: Preset, renderer: RendererType): string {
  const config: FullConfig = { ...preset, renderer };
  return JSON.stringify(config, null, 2);
}

// ---------- Renderer switching helpers ----------

export function getRendererFromURL(): RendererType | null {
  const params = new URLSearchParams(window.location.search);
  const r = params.get("renderer");
  if (r === "webgl" || r === "webgpu") return r;
  return null;
}

export function setRendererInURL(renderer: RendererType) {
  const url = new URL(window.location.href);
  url.searchParams.set("renderer", renderer);
  window.location.href = url.toString();
}
