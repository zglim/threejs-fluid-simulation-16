/**
 * Unified preset format shared between WebGL and WebGPU pipelines.
 *
 * Field mapping:
 *   WebGL `pressure`         <-> preset `pressure`
 *   WebGPU `pressureDecay`   <-> preset `pressure`
 *   WebGL `displacementScale`<-> preset `displacementScale`
 *   WebGPU `bumpDisplacmentScale` <-> preset `displacementScale`
 */
export type MaterialMode = 'solid' | 'smoke';

export interface FluidPresetParams {
    splatForce: number;
    splatThickness: number;
    vorticityInfluence: number;
    swirlIntensity: number;
    pressure: number;
    velocityDissipation: number;
    densityDissipation: number;
    displacementScale: number;
    pressureIterations: number;
}

export interface FluidPreset {
    name: string;
    mode: MaterialMode;
    params: FluidPresetParams;
}

const STORAGE_KEY = 'fluid-demo-presets';

export class PresetManager {
    private presets: Map<string, FluidPreset> = new Map();
    private listeners: Array<() => void> = [];

    constructor() {
        this.loadFromStorage();
    }

    private loadFromStorage(): void {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return;
            const parsed = JSON.parse(raw) as FluidPreset[];
            if (Array.isArray(parsed)) {
                for (const p of parsed) {
                    if (p && typeof p.name === 'string' && p.params) {
                        this.presets.set(p.name, p);
                    }
                }
            }
        } catch {
            // Ignore corrupt data
        }
    }

    private saveToStorage(): void {
        try {
            const arr = Array.from(this.presets.values());
            localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
        } catch {
            // Storage full or unavailable
        }
    }

    private notify(): void {
        for (const fn of this.listeners) fn();
    }

    onChange(fn: () => void): void {
        this.listeners.push(fn);
    }

    getAll(): FluidPreset[] {
        return Array.from(this.presets.values());
    }

    get(name: string): FluidPreset | undefined {
        return this.presets.get(name);
    }

    save(preset: FluidPreset): void {
        this.presets.set(preset.name, { ...preset, params: { ...preset.params } });
        this.saveToStorage();
        this.notify();
    }

    delete(name: string): boolean {
        const removed = this.presets.delete(name);
        if (removed) {
            this.saveToStorage();
            this.notify();
        }
        return removed;
    }

    has(name: string): boolean {
        return this.presets.has(name);
    }
}
