import GUI from "three/examples/jsm/libs/lil-gui.module.min.js";
import type { FluidPreset, FluidPresetParams, MaterialMode } from './PresetManager';
import { PresetManager } from './PresetManager';
import { BUILTIN_PRESETS } from './builtin-presets';
import { showToast, copyToClipboard } from './clipboard';

/**
 * Interface that both FluidV3Material and FluidMaterialGPU must implement
 * for the preset UI to work.
 */
export interface FluidMaterialLike {
    getUnifiedParams(): FluidPresetParams;
    applyUnifiedParams(params: FluidPresetParams): void;
    getMode(): MaterialMode;
    applyMode(mode: MaterialMode): void;
}

export interface PresetUIOptions {
    /** Called after a preset or mode is applied, so the GUI controllers can update. */
    onApply?: () => void;
}

export class PresetUI {
    private manager: PresetManager;
    private folder: any; // lil-gui folder
    private material: FluidMaterialLike;

    // Reactive state
    private state = {
        presetName: '',
        selectedPreset: '',
    };

    private controllers: any[] = [];

    constructor(
        private gui: GUI,
        material: FluidMaterialLike,
        manager?: PresetManager,
        private options?: PresetUIOptions,
    ) {
        this.manager = manager ?? new PresetManager();
        this.material = material;
        this.folder = gui.addFolder('🎛 Presets');
        this.buildUI();

        this.manager.onChange(() => this.rebuildPresetList());
    }

    private destroy(): void {
        for (const c of this.controllers) {
            c.destroy();
        }
        this.controllers = [];
    }

    private rebuildPresetList(): void {
        this.destroy();
        this.buildUI();
    }

    private buildUI(): void {
        const folder = this.folder;
        const allPresets = [...BUILTIN_PRESETS, ...this.manager.getAll()];

        // ---- Built-in modes ----
        const modesFolder = folder.addFolder('Quick Modes');
        const modesObj: Record<string, () => void> = {};
        for (const bp of BUILTIN_PRESETS) {
            const key = bp.name;
            modesObj[key] = () => {
                this.material.applyMode(bp.mode);
                this.material.applyUnifiedParams(bp.params);
                this.options?.onApply?.();
                showToast(`Applied: ${bp.name}`);
            };
        }
        for (const key of Object.keys(modesObj)) {
            modesFolder.add(modesObj, key).name(key);
        }

        // ---- Saved presets list ----
        const savedPresets = this.manager.getAll();
        const presetNames = savedPresets.map(p => p.name);
        this.state.selectedPreset = presetNames[0] ?? '';

        if (presetNames.length > 0) {
            const selCtrl = folder.add(this.state, 'selectedPreset', presetNames).name('Select Preset');
            this.controllers.push(selCtrl);

            const loadObj = {
                Load: () => {
                    const p = this.manager.get(this.state.selectedPreset);
                    if (p) {
                        this.material.applyMode(p.mode);
                        this.material.applyUnifiedParams(p.params);
                        this.options?.onApply?.();
                        showToast(`Loaded: ${p.name}`);
                    }
                },
                Delete: () => {
                    if (this.state.selectedPreset) {
                        this.manager.delete(this.state.selectedPreset);
                        showToast(`Deleted: ${this.state.selectedPreset}`);
                    }
                },
            };
            this.controllers.push(folder.add(loadObj, 'Load').name('⬇ Load'));
            this.controllers.push(folder.add(loadObj, 'Delete').name('🗑 Delete'));
        }

        // ---- Save new preset ----
        folder.add(this.state, 'presetName').name('New Name');
        const saveObj = {
            Save: () => {
                const name = this.state.presetName.trim();
                if (!name) {
                    showToast('Please enter a preset name', 'error');
                    return;
                }
                const preset: FluidPreset = {
                    name,
                    mode: this.material.getMode(),
                    params: this.material.getUnifiedParams(),
                };
                this.manager.save(preset);
                this.state.presetName = '';
                showToast(`Saved: ${name}`);
            },
        };
        folder.add(saveObj, 'Save').name('💾 Save Current');

        // ---- Copy config ----
        const copyObj = {
            CopyConfig: async () => {
                const params = this.material.getUnifiedParams();
                const mode = this.material.getMode();
                const config = { mode, params };
                const text = JSON.stringify(config, null, 2);
                const ok = await copyToClipboard(text);
                if (ok) {
                    showToast('✅ Config copied to clipboard');
                } else {
                    showToast('❌ Copy failed: clipboard not available', 'error');
                }
            },
        };
        folder.add(copyObj, 'CopyConfig').name('📋 Copy Config');
    }
}
