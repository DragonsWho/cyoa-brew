/**
 * src/ui/editor/integrations/llm/manual-mode.js
 * Manual Copy/Paste Mode for LLM
 */

export const ManualModeMixin = {
    showManualMode(mode, messages, imageToSend) {
        const manualOut = document.getElementById('llm-manual-out');
        const manualUi = document.getElementById('llm-manual-ui');
        let pasteText = `=== SYSTEM PROMPT ===\n${messages[0].content}\n\n`;
        pasteText += `=== USER MESSAGE ===\n`;
        const userContent = messages[1].content;
        if (Array.isArray(userContent)) {
            const textPart = userContent.find(p => p.type === 'text');
            pasteText += textPart?.text || JSON.stringify(userContent);
        } else {
            pasteText += userContent;
        }
        if (imageToSend) {
            pasteText = `⚠️ IMAGE REQUIRED: Upload the page image to your LLM.\n\n` + pasteText;
        }
        manualOut.value = pasteText;
        if (manualUi) manualUi.style.display = 'block';
        this.pendingLlmMode = mode;
        const btn = document.querySelector(`button[onclick*="runLlmAction('${mode}')"]`);
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = btn.getAttribute('data-original-text') || btn.textContent.replace('⏳ Processing...', 'Run ' + mode);
        }
    },

    applyManualResponse() {
        const text = document.getElementById('llm-manual-in')?.value;
        if (!text) return alert('Please paste the LLM response first');
        const mode = this.pendingLlmMode || this.currentPromptMode || 'refine';
        this.processLlmResponse(text, mode);
    },

    copyManualPrompt() {
        const el = document.getElementById('llm-manual-out');
        if (el) {
            el.select();
            document.execCommand('copy');
            const btn = document.querySelector('[onclick*="copyManualPrompt"]');
            if (btn) {
                const orig = btn.textContent;
                btn.textContent = '✓ Copied!';
                setTimeout(() => btn.textContent = orig, 1500);
            }
        }
    }
};