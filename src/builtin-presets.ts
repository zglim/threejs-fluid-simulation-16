import type { FluidPreset, MaterialMode, FluidPresetParams } from './PresetManager';

/**
 * Built-in "Liquid" mode: solid material, physically-based fluid parameters.
 */
export const LIQUID_PRESET: FluidPreset = {
    name: '🌊 Liquid',
    mode: 'solid' as MaterialMode,
    params: {
        splatForce: -178,
        splatThickness: 0.0199,
        vorticityInfluence: 1,
        swirlIntensity: 7.821,
        pressure: 0.676,
        velocityDissipation: 0.283,
        densityDissipation: 0.761,
        displacementScale: 0.013,
        pressureIterations: 58,
    },
};

/**
 * Built-in "Smoke" mode: transparent material, wispy parameters.
 */
export const SMOKE_PRESET: FluidPreset = {
    name: '💨 Smoke',
    mode: 'smoke' as MaterialMode,
    params: {
        splatForce: -0.32,
        splatThickness: 0.624,
        vorticityInfluence: 0.79,
        swirlIntensity: 27.027,
        pressure: 0.312,
        velocityDissipation: 0.283,
        densityDissipation: 0.68,
        displacementScale: 0.0316,
        pressureIterations: 39,
    },
};

export const BUILTIN_PRESETS: FluidPreset[] = [LIQUID_PRESET, SMOKE_PRESET];
