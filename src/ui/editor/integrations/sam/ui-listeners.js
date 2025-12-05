/**
 * src/ui/editor/integrations/sam/ui-listeners.js
 * SAM UI Setup
 */

export const SAMListenersMixin = {
    setupSamListeners() {
        const runBtn = document.getElementById('btn-run-sam');
        if (runBtn) {
            runBtn.addEventListener('click', () => this.runSamDetection());
        }
        
        const keyInput = document.getElementById('roboflow-api-key');
        if (keyInput) {
            const storedKey = localStorage.getItem('roboflow_api_key');
            if (storedKey) keyInput.value = storedKey;
            keyInput.addEventListener('input', (e) => localStorage.setItem('roboflow_api_key', e.target.value));
        }
    }
};