/**
 * src/ui/editor/integrations.js
 * Editor Integrations Mixin
 * Handles LLM (AI) and SAM (Auto-Detect) integrations logic.
 * 
 * NOTE: Setup of UI listeners for LLM is handled in ui.js to prevent Mixin override conflicts.
 */

import { Client } from "@gradio/client";
import { 
    LLM_PROVIDERS, 
    SYSTEM_PROMPTS, 
    USER_PROMPTS,
    buildMessages, 
    addImageToMessages, 
    extractJsonFromResponse 
} from '../../config/llm-config.js';

export const EditorIntegrationsMixin = {
    
    // Mutable copies of prompts that user can edit in UI
    editablePrompts: {
        refine: USER_PROMPTS.refine,
        fill: USER_PROMPTS.fill,
        audit: USER_PROMPTS.audit
    },

    // ==================== HELPER: SORT & RENAME ====================

    sortAndRenameLayout(layout) {
        if (!layout || layout.length === 0) return;

        layout.sort((a, b) => {
            const yDiff = Math.abs(a.coords.y - b.coords.y);
            if (yDiff < 40) {
                return a.coords.x - b.coords.x;
            }
            return a.coords.y - b.coords.y;
        });

        layout.forEach((item, index) => {
            if (item.type === 'item' || item.type === 'group') {
                item.id = `Card_${index + 1}`;
            }
        });
        
        return layout;
    },

    // ==================== HELPER: GET CLEAN CONFIG ====================
    
    getCleanConfig() {
        const configStr = JSON.stringify(this.engine.config);
        const cleanConfig = JSON.parse(configStr);
        
        if (cleanConfig.pages) {
            cleanConfig.pages.forEach(p => {
                if (p.image) p.image = "<IMAGE_PLACEHOLDER>";
            });
        }
        
        return cleanConfig;
    },

    // ==================== HELPER: LOAD STATIC FILE ====================

    async loadStaticFile(path) {
        try {
            const res = await fetch(path);
            if (!res.ok) throw new Error(`Status ${res.status}`);
            return await res.text();
        } catch (e) {
            console.warn(`Failed to load ${path}:`, e);
            return null;
        }
    },

    // ==================== MAIN ACTION RUNNER ====================

    async runLlmAction(mode) {
        const promptArea = document.getElementById('llm-user-prompt');
        if (promptArea && this.currentPromptMode === mode) {
            this.editablePrompts[mode] = promptArea.value;
        }

        this.llmConfig.apiKey = document.getElementById('llm-key')?.value;
        this.llmConfig.baseUrl = document.getElementById('llm-base-url')?.value;
        
        const modelSel = document.getElementById('llm-model-select');
        const customModel = document.getElementById('llm-model-custom');
        if (modelSel?.value === '__custom__' && customModel?.value) {
            this.llmConfig.model = customModel.value;
        } else if (modelSel) {
            this.llmConfig.model = modelSel.value;
        }

        if (this.llmConfig.provider !== 'manual' && !this.llmConfig.apiKey) {
            alert("Please enter API Key");
            return;
        }

        const page = this.getCurrentPage();
        if (mode !== 'audit' && !page) {
            alert("No active page selected");
            return;
        }

        // --- BUTTON STATE ---
        const btn = document.activeElement;
        const originalText = btn ? btn.innerHTML : '';
        if (btn) { 
            btn.disabled = true; 
            btn.innerHTML = '⏳ Processing...'; 
        }

        try {
            // 1. Prepare Data
            let dataForPrompt = {};
            let imageToSend = null;

            if (mode === 'refine') {
                this.sortAndRenameLayout(page.layout);
                this.renderer.renderLayout();

                dataForPrompt.layout = page.layout.map(item => ({
                    type: item.type,
                    id: item.id,
                    coords: item.coords,
                    cost: []
                }));
                imageToSend = page.image;
            } 
            else if (mode === 'fill') {
                const [toolsMd, exampleJson] = await Promise.all([
                    this.loadStaticFile('/docs/llm-tools-reference.md'),
                    this.loadStaticFile('/config/test_config.json')
                ]);

                dataForPrompt.layout = page.layout;
                dataForPrompt.toolsMd = toolsMd;
                dataForPrompt.exampleJson = exampleJson;
                dataForPrompt.fullConfig = this.getCleanConfig();
                
                const pageIndex = this.engine.config.pages.indexOf(page);
                dataForPrompt.pageNum = pageIndex !== -1 ? pageIndex + 1 : "?";

                imageToSend = page.image;
            } 
            else if (mode === 'audit') {
                dataForPrompt.config = this.engine.config;
            }

            // 2. Build messages
            let messages = this.buildMessagesForMode(mode, dataForPrompt);

            // 3. Add image if needed
            if (imageToSend) {
                messages = addImageToMessages(messages, imageToSend, this.llmConfig.provider);
            }

            // --- MANUAL MODE ---
            if (this.llmConfig.provider === 'manual') {
                this.showManualMode(mode, messages, imageToSend);
                return;
            }

            // --- API MODE ---
            const responseText = await this.callLlmApi(messages);
            this.processLlmResponse(responseText, mode);

        } catch (e) {
            alert(`LLM Error: ${e.message}`);
            console.error('LLM Error:', e);
        } finally {
            if (btn && this.llmConfig.provider !== 'manual') { 
                btn.disabled = false; 
                btn.innerHTML = originalText; 
            }
        }
    },

    buildMessagesForMode(mode, data) {
        return buildMessages(mode, data);
    },

    async callLlmApi(messages) {
        const { provider, baseUrl, apiKey, model } = this.llmConfig;
        const providerConfig = LLM_PROVIDERS[provider];
        
        if (!providerConfig || !providerConfig.formatRequest) {
            throw new Error(`Unknown provider: ${provider}`);
        }

        const request = providerConfig.formatRequest(model, messages, apiKey, baseUrl);
        console.log(`📡 Calling ${provider} API:`, request.url);
        
        const response = await fetch(request.url, {
            method: 'POST',
            headers: request.headers,
            body: JSON.stringify(request.body)
        });

        const data = await response.json();

        if (!response.ok) {
            const errorMsg = data.error?.message || data.error?.type || JSON.stringify(data);
            throw new Error(`API Error (${response.status}): ${errorMsg}`);
        }

        return providerConfig.parseResponse(data);
    },

    // ==================== MANUAL MODE ====================

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
        if (!text) {
            alert('Please paste the LLM response first');
            return;
        }
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
    },

    // ==================== RESPONSE HANDLING ====================

    processLlmResponse(text, mode) {
        try {
            const resultObj = extractJsonFromResponse(text);
            this.pendingLlmResult = { mode, data: resultObj };

            const modal = document.getElementById('llm-preview-modal');
            const textArea = document.getElementById('llm-result-json');
            const summaryEl = document.getElementById('llm-result-summary');
            
            let displayData = resultObj;
            let summary = '';
            
            if (mode === 'audit') {
                if (resultObj.changes && Array.isArray(resultObj.changes)) {
                    summary = `Found ${resultObj.changes.length} changes`;
                }
                displayData = resultObj.fixed_config || resultObj;
            } else if (mode === 'refine') {
                const items = Array.isArray(resultObj) ? resultObj : (resultObj.layout || []);
                let groupsCount = 0;
                let itemsCount = 0;
                const countRecursive = (arr) => {
                    for (const el of arr) {
                        if (el.type === 'group') {
                            groupsCount++;
                            if (el.items) countRecursive(el.items);
                        } else {
                            itemsCount++;
                        }
                    }
                };
                countRecursive(items);
                summary = `Refined: ${groupsCount} Groups, ${itemsCount} Cards detected`;
            } else if (mode === 'fill') {
                const layout = resultObj.layout || (Array.isArray(resultObj) ? resultObj : []);
                let count = 0;
                const countR = (arr) => arr.forEach(i => { count++; if(i.items) countR(i.items); });
                countR(layout);
                summary = `Extracted data for ${count} elements (groups + items)`;
            }

            if (textArea) textArea.value = JSON.stringify(displayData, null, 2);
            if (summaryEl) {
                summaryEl.textContent = summary;
                summaryEl.style.display = summary ? 'block' : 'none';
            }
            if (modal) modal.style.display = 'flex';

        } catch (e) {
            alert(`Failed to parse JSON response: ${e.message}\n\nCheck console for raw output.`);
            console.error('Parse Error:', e);
            console.log('Raw LLM Output:', text);
        }
    },

    applyLlmChanges() {
        if (!this.pendingLlmResult) return;
        const { mode, data } = this.pendingLlmResult;

        try {
            if (mode === 'refine') this.applyRefineResult(data);
            else if (mode === 'fill') this.applyFillResult(data);
            else if (mode === 'audit') this.applyAuditResult(data);

            this.engine.buildMaps();
            this.engine.reset();
            this.engine.recalculate();
            this.renderer.renderAll();
            this.renderPagesList();
            this.deselectChoice();
            
            document.getElementById('llm-preview-modal').style.display = 'none';
            this.pendingLlmResult = null;
            
            alert("✅ Changes applied successfully!");

        } catch (e) {
            alert(`Error applying changes: ${e.message}`);
            console.error('Apply Error:', e);
        }
    },

    applyRefineResult(data) {
        const page = this.getCurrentPage();
        const newLayout = Array.isArray(data) ? data : (data.layout || []);
        if (newLayout.length === 0) {
            console.warn("LLM returned empty layout");
            return;
        }
        page.layout = newLayout;
    },

    applyFillResult(data) {
        const page = this.getCurrentPage();
        const newLayout = data.layout || (Array.isArray(data) ? data : []);
        if (!newLayout.length) throw new Error("No layout data in response");
        
        page.layout = newLayout.map(item => ({
            type: item.type || 'item',
            ...item
        }));
        
        if (data.inferred_currencies && Array.isArray(data.inferred_currencies)) {
            const existingIds = new Set((this.engine.config.points || []).map(p => p.id));
            for (const currency of data.inferred_currencies) {
                if (!existingIds.has(currency.id)) {
                    this.engine.config.points = this.engine.config.points || [];
                    this.engine.config.points.push(currency);
                }
            }
        }
    },

    applyAuditResult(data) {
        const newConfig = data.fixed_config || data;
        if (newConfig.pages && Array.isArray(newConfig.pages)) {
            newConfig.pages.forEach((p, i) => {
                const originalPage = this.engine.config.pages?.[i];
                if (originalPage?.image) {
                    if (!p.image || p.image === "<IMAGE_PLACEHOLDER>" || !p.image.includes('.')) {
                        p.image = originalPage.image;
                    }
                }
            });
        }
        this.engine.config = newConfig;
    },

    // ==================== SAM (AUTO-DETECT) LOGIC ====================

    setupSamListeners() {
        const runBtn = document.getElementById('btn-run-sam');
        if (runBtn) {
            runBtn.addEventListener('click', () => this.runSamDetection());
        }
    },

    async runSamDetection() {
        const tokenInput = document.getElementById('sam-token');
        const promptInput = document.getElementById('sam-prompt');
        const shaveInput = document.getElementById('sam-shave');
        const confInput = document.getElementById('sam-confidence');
        const debugIdxInput = document.getElementById('sam-debug-index');
        const statusEl = document.getElementById('sam-status');
        const galleryEl = document.getElementById('sam-debug-gallery');

        const page = this.getCurrentPage();
        if (!page || !page.image) { 
            alert("Please add a page with an image first!"); 
            return; 
        }
        if (!tokenInput.value) { 
            alert("Please enter your Hugging Face Token!"); 
            return; 
        }

        const btn = document.getElementById('btn-run-sam');
        btn.disabled = true;
        btn.style.opacity = 0.5;
        galleryEl.innerHTML = '';
        
        let debugIdx = -1;
        if (debugIdxInput.value) {
            debugIdx = parseInt(debugIdxInput.value) - 1;
        }

        this.autoDetector.statusCallback = (msg) => { statusEl.textContent = msg; };
        this.autoDetector.debugCallback = (title, dataUrl) => {
            const wrapper = document.createElement('div');
            wrapper.style.marginBottom = "15px";
            const label = document.createElement('div');
            label.textContent = title;
            label.style.color = "#4CAF50";
            label.style.fontSize = "0.75rem";
            const img = document.createElement('img');
            img.src = dataUrl;
            img.style.maxWidth = "100%";
            img.style.border = "1px solid #444";
            wrapper.appendChild(label);
            wrapper.appendChild(img);
            galleryEl.appendChild(wrapper);
        };

        try {
            const response = await fetch(page.image);
            const blob = await response.blob();
            const file = new File([blob], "page.png", { type: blob.type });

            const detectedItems = await this.autoDetector.processImage(
                file,
                promptInput.value,
                parseFloat(shaveInput.value),
                tokenInput.value,
                debugIdx,
                parseFloat(confInput.value)
            );

            if (detectedItems.length > 0) {
                for (const item of detectedItems) {
                    item.type = 'item';
                    page.layout.push(item);
                }
                this.sortAndRenameLayout(page.layout);
                this.engine.buildMaps();
                this.engine.recalculate();
                this.renderer.renderLayout();
                statusEl.textContent = `✅ Done! Added ${detectedItems.length} items.`;
                this.renderPagesList();
            } else {
                statusEl.textContent = "⚠️ No items found.";
            }
        } catch (e) {
            statusEl.textContent = `❌ Error: ${e.message}`;
            console.error('SAM Error:', e);
        }
        btn.disabled = false;
        btn.style.opacity = 1;
    }
};