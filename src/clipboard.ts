/**
 * Cross-environment clipboard helper with user-facing feedback.
 */

let toastEl: HTMLDivElement | null = null;

export function showToast(message: string, type: 'success' | 'error' = 'success'): void {
    if (typeof document === 'undefined') return;
    if (!toastEl) {
        toastEl = document.createElement('div');
        toastEl.style.cssText = `
            position: fixed;
            bottom: 60px;
            left: 50%;
            transform: translateX(-50%);
            padding: 10px 20px;
            border-radius: 6px;
            font-family: system-ui, sans-serif;
            font-size: 14px;
            z-index: 10000;
            opacity: 0;
            transition: opacity 0.3s;
            pointer-events: none;
        `;
        document.body.appendChild(toastEl);
    }
    toastEl.textContent = message;
    toastEl.style.background = type === 'success' ? '#2ecc71' : '#e74c3c';
    toastEl.style.color = '#fff';
    toastEl.style.opacity = '1';

    clearTimeout((toastEl as any)._hideTimer);
    (toastEl as any)._hideTimer = setTimeout(() => {
        if (toastEl) toastEl.style.opacity = '0';
    }, 2000);
}

export async function copyToClipboard(text: string): Promise<boolean> {
    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text);
            return true;
        }
    } catch {
        // clipboard API threw — fall through
    }

    // Fallback: hidden textarea + execCommand
    try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(textarea);
        return ok;
    } catch {
        return false;
    }
}
