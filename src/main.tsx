/**
 * Unified entry point with runtime renderer switching.
 *
 * On first load (no saved choice), shows an overlay to pick WebGL or WebGPU.
 * On subsequent loads, auto-starts with the saved choice.
 * A persistent button in the top-left allows switching renderers at any time.
 */

import './index.css';

type RendererType = 'webgl' | 'webgpu';

const STORAGE_KEY_RENDERER = 'fluid-demo-renderer';

function getRendererFromURL(): RendererType | null {
    const params = new URLSearchParams(window.location.search);
    const r = params.get('renderer');
    if (r === 'webgl' || r === 'webgpu') return r;
    return null;
}

function getSavedRenderer(): RendererType | null {
    try {
        const r = localStorage.getItem(STORAGE_KEY_RENDERER);
        if (r === 'webgl' || r === 'webgpu') return r;
    } catch { /* ignore */ }
    return null;
}

function saveRendererChoice(r: RendererType): void {
    try {
        localStorage.setItem(STORAGE_KEY_RENDERER, r);
    } catch { /* ignore */ }
}

function addSwitcherButton(current: RendererType): void {
    const btn = document.createElement('button');
    const other = current === 'webgl' ? 'webgpu' : 'webgl';
    btn.textContent = `Switch to ${other.toUpperCase()}`;
    btn.style.cssText = `
        position: fixed;
        top: 10px;
        left: 10px;
        z-index: 9999;
        padding: 6px 14px;
        font-size: 12px;
        font-family: system-ui, sans-serif;
        background: rgba(30,30,30,0.85);
        color: #fff;
        border: 1px solid #555;
        border-radius: 4px;
        cursor: pointer;
    `;
    btn.addEventListener('click', () => {
        saveRendererChoice(other);
        // Reload with new renderer param
        const url = new URL(window.location.href);
        url.searchParams.set('renderer', other);
        window.location.href = url.toString();
    });
    document.body.appendChild(btn);
}

async function launch(type: RendererType): Promise<void> {
    addSwitcherButton(type);

    if (type === 'webgl') {
        await import('./main-webgl');
    } else {
        await import('./main-web-gpu');
    }
}

function showOverlay(onPick: (type: RendererType) => void): void {
    const overlay = document.createElement('div');
    overlay.id = 'renderer-overlay';
    overlay.innerHTML = `
        <div style="
            position: fixed; inset: 0; z-index: 99999;
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            background: rgba(20,20,20,0.95); color: #fff; font-family: system-ui, sans-serif;
        ">
            <h2 style="margin-bottom: 8px; font-weight: 600;">Fluid Simulation Demo</h2>
            <p style="margin-bottom: 24px; opacity: 0.7; font-size: 14px;">Choose a renderer pipeline:</p>
            <div style="display: flex; gap: 20px;">
                <button id="pick-webgl" style="
                    padding: 16px 32px; font-size: 18px; cursor: pointer;
                    background: #2563eb; color: #fff; border: none; border-radius: 8px;
                    font-weight: 600; transition: background 0.2s;
                ">WebGL</button>
                <button id="pick-webgpu" style="
                    padding: 16px 32px; font-size: 18px; cursor: pointer;
                    background: #7c3aed; color: #fff; border: none; border-radius: 8px;
                    font-weight: 600; transition: background 0.2s;
                ">WebGPU</button>
            </div>
            <p style="margin-top: 16px; font-size: 12px; opacity: 0.5;">
                Your choice is saved. You can switch anytime via the button in the top-left corner.
            </p>
        </div>
    `;
    document.body.appendChild(overlay);

    // Hover effects
    const webglBtn = overlay.querySelector('#pick-webgl') as HTMLButtonElement;
    const webgpuBtn = overlay.querySelector('#pick-webgpu') as HTMLButtonElement;
    webglBtn.addEventListener('mouseenter', () => webglBtn.style.background = '#1d4ed8');
    webglBtn.addEventListener('mouseleave', () => webglBtn.style.background = '#2563eb');
    webgpuBtn.addEventListener('mouseenter', () => webgpuBtn.style.background = '#6d28d9');
    webgpuBtn.addEventListener('mouseleave', () => webgpuBtn.style.background = '#7c3aed');

    webglBtn.addEventListener('click', () => {
        overlay.remove();
        onPick('webgl');
    });
    webgpuBtn.addEventListener('click', () => {
        overlay.remove();
        onPick('webgpu');
    });
}

// ---- Main ----
const urlRenderer = getRendererFromURL();
const savedRenderer = getSavedRenderer();

const choice = urlRenderer ?? savedRenderer;

if (choice) {
    // Direct launch with saved/URL choice
    saveRendererChoice(choice);
    launch(choice);
} else {
    // Show overlay for first-time selection
    showOverlay((type) => {
        saveRendererChoice(type);
        // Also update URL so it's bookmarkable
        const url = new URL(window.location.href);
        url.searchParams.set('renderer', type);
        window.history.replaceState({}, '', url.toString());
        launch(type);
    });
}
