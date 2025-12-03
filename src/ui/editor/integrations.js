/**
 * Editor Integrations Mixin
 * Handles LLM (AI) and SAM (Auto-Detect) integrations
 */

import { Client } from "@gradio/client";

export const EditorIntegrationsMixin = {
    
    // Default User Prompts for different modes
    prompts: {
        refine: `Align these items into neat rows and columns based on their coordinates. 
Snap them to a grid. 
Do not change IDs or Titles, only x/y/w/h.
Ensure items do not overlap visually.`,
        
        fill: `Analyze the image. Identify all game cards/options. 
For each card, extract: 
- Title
- Description
- Cost (points) - infer negative values for spending
- Tags (keywords like 'magic', 'fire', 'item')
Infer "effects" or "requirements" if the text explicitly mentions them.`,
        
        audit: `Analyze the game logic. Check for:
1. Requirements referencing IDs that do not exist in the config.
2. Costs that add points instead of subtracting (positive value error).
3. Logical loops or broken formulas.
4. Typos in currency names.`
    },

    // ==================== SETUP LISTENERS ====================

    setupLlmListeners() {
        const providerSel = document.getElementById('llm-provider');
        const manualUi = document.getElementById('llm-manual-ui');
        const apiFields = document.getElementById('llm-api-fields');
        const promptSel = document.getElementById('llm-prompt-selector');
        const promptArea = document.getElementById('llm-user-prompt');

        // 1. Provider Change Logic (Google / OpenAI / Manual)
        if (providerSel) {
            providerSel.addEventListener('change', (e) => {
                const val = e.target.value;
                this.llmConfig.provider = val;
                
                // Show/Hide fields
                if (val === 'manual') {
                    if (manualUi) manualUi.style.display = 'block';
                    if (apiFields) apiFields.style.display = 'none';
                } else {
                    if (manualUi) manualUi.style.display = 'none';
                    if (apiFields) apiFields.style.display = 'block';
                }

                // Set Defaults for API
                const urlInput = document.getElementById('llm-base-url');
                const modelInput = document.getElementById('llm-model');
                
                if (val === 'google') {
                    if (urlInput) urlInput.value = 'https://generativelanguage.googleapis.com/v1beta/models/';
                    if (modelInput) modelInput.value = 'gemini-2.0-flash';
                } else if (val === 'openai') {
                    if (urlInput) urlInput.value = 'https://api.openai.com/v1';
                    if (modelInput) modelInput.value = 'gpt-4o';
                }
            });
        }

        // 2. Prompt Selector Logic (Refine / Fill / Audit)
        if (promptSel && promptArea) {
            // Initialize with Refine prompt
            promptArea.value = this.prompts.refine;
            this.currentPromptMode = 'refine';

            promptSel.addEventListener('change', (e) => {
                // Save changes to memory before switching
                if (this.currentPromptMode) {
                    this.prompts[this.currentPromptMode] = promptArea.value;
                }
                
                // Switch mode
                this.currentPromptMode = e.target.value;
                
                // Load new prompt
                promptArea.value = this.prompts[this.currentPromptMode];
            });

            // Save on typing
            promptArea.addEventListener('input', (e) => {
                this.prompts[this.currentPromptMode] = e.target.value;
            });
        }
    },

    // ==================== MAIN ACTION RUNNER ====================

    async runLlmAction(mode) {
        // Ensure we save the latest edit to the prompt before running
        const promptArea = document.getElementById('llm-user-prompt');
        if (promptArea && this.currentPromptMode === mode) {
            this.prompts[mode] = promptArea.value;
        }

        this.llmConfig.apiKey = document.getElementById('llm-key')?.value;
        this.llmConfig.model = document.getElementById('llm-model')?.value;
        this.llmConfig.baseUrl = document.getElementById('llm-base-url')?.value;

        // Validation for API mode
        if (this.llmConfig.provider !== 'manual' && !this.llmConfig.apiKey) {
            alert("Please enter API Key");
            return;
        }

        const page = this.getCurrentPage();
        if (mode !== 'audit' && !page) {
            alert("No active page selected");
            return;
        }

        // 1. Prepare Data & Context
        let userInstruction = this.prompts[mode];
        let technicalContext = "";
        let contextData = null;
        let imageToSend = null;

        if (mode === 'refine') {
            technicalContext = `
TECHNICAL RULE: Return ONLY a valid JSON array of objects.
Input format matches Output format.
Update 'coords' (x,y,w,h) to align items.
Do NOT remove items. Do NOT change IDs.`;
            // Send only current page layout
            contextData = page.layout; 
        } 
        else if (mode === 'fill') {
            technicalContext = `
TECHNICAL RULE: Return a valid JSON object: { "layout": [ ...items... ] }.
Structure each item as: { "id": "unique_id", "type": "item", "title": "...", "coords": {x,y,w,h}, "cost": [...], "tags": [...] }.
Use the provided Global Config JSON to understand currency IDs.
The image is the source of truth.`;
            // Send global config for context + Page Image
            contextData = this.engine.config;
            imageToSend = page.image;
        } 
        else if (mode === 'audit') {
            technicalContext = `
TECHNICAL RULE: Return a JSON object: { "fixed_config": { ... }, "comments": "string report" }.
Preserve all "image" paths exactly as is. 
Fix syntax errors in 'formula' fields.
Fix broken IDs.`;
            // Send entire config
            contextData = this.engine.config;
        }

        const fullPrompt = `${userInstruction}\n\n${technicalContext}`;

        // 2. Execution Flow

        // --- MANUAL MODE ---
        if (this.llmConfig.provider === 'manual') {
            const manualOut = document.getElementById('llm-manual-out');
            const manualUi = document.getElementById('llm-manual-ui');
            
            // Construct a human-friendly copy-paste block
            let pasteText = `=== SYSTEM INSTRUCTION ===\n${fullPrompt}\n\n=== DATA CONTEXT (JSON) ===\n${JSON.stringify(contextData, null, 2)}`;
            
            if (imageToSend) {
                pasteText = `[ATTENTION: This task requires an image. Please DRAG & DROP the page image into your LLM chat manually]\n\n` + pasteText;
                alert("Manual Mode for Image: Please copy the text below, paste it into your LLM, and manually upload the page image to the chat.");
            }

            manualOut.value = pasteText;
            if (manualUi) manualUi.style.display = 'block';
            
            // Store pending mode to know how to apply response later
            this.pendingLlmMode = mode;
            return;
        }

        // --- API MODE ---
        const btn = document.activeElement;
        const originalText = btn ? btn.innerHTML : '';
        if(btn) { btn.disabled = true; btn.innerHTML = '⏳ Processing...'; }

        try {
            const responseText = await this.callLlmApi(fullPrompt, contextData, imageToSend);
            this.processLlmResponse(responseText, mode);
        } catch (e) {
            alert(`LLM Error: ${e.message}`);
            console.error(e);
        } finally {
            if(btn) { btn.disabled = false; btn.innerHTML = originalText; }
        }
    },

    // ==================== API CALLER ====================

    async callLlmApi(prompt, jsonData, imageUrl = null) {
        const { provider, baseUrl, apiKey, model } = this.llmConfig;
        
        // Append JSON to prompt if sending via API
        const finalPrompt = `${prompt}\n\nDATA:\n${JSON.stringify(jsonData)}`;

        let url, body, headers;

        // --- GOOGLE GEMINI ---
        if (provider === 'google') {
            url = `${baseUrl}${model}:generateContent?key=${apiKey}`;
            headers = { 'Content-Type': 'application/json' };
            
            const parts = [{ text: finalPrompt }];
            
            if (imageUrl && imageUrl.startsWith('data:image')) {
                const base64Data = imageUrl.split(',')[1];
                const mimeType = imageUrl.split(';')[0].split(':')[1];
                parts.push({
                    inline_data: {
                        mime_type: mimeType,
                        data: base64Data
                    }
                });
            }

            body = JSON.stringify({ contents: [{ parts }] });
        } 
        // --- OPENAI GPT-4o ---
        else {
            url = `${baseUrl.replace(/\/+$/, '')}/chat/completions`;
            headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            };

            const content = [{ type: "text", text: finalPrompt }];
            
            if (imageUrl) {
                content.push({
                    type: "image_url",
                    image_url: { url: imageUrl }
                });
            }

            body = JSON.stringify({
                model: model,
                messages: [{ role: "user", content }],
                temperature: 0.1
            });
        }

        const response = await fetch(url, { method: 'POST', headers, body });
        const data = await response.json();

        if (!response.ok) throw new Error(data.error?.message || JSON.stringify(data));

        if (provider === 'google') return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        return data.choices?.[0]?.message?.content || '';
    },

    // ==================== RESPONSE HANDLING ====================

    processLlmResponse(text, mode) {
        // Strip markdown code blocks
        let jsonStr = text;
        if (text.includes('```json')) {
            jsonStr = text.split('```json')[1].split('```')[0];
        } else if (text.includes('```')) {
            jsonStr = text.split('```')[1].split('```')[0];
        }

        try {
            const resultObj = JSON.parse(jsonStr);
            this.pendingLlmResult = { mode, data: resultObj };

            // Show Preview Modal
            const modal = document.getElementById('llm-preview-modal');
            const textArea = document.getElementById('llm-result-json');
            
            if (mode === 'audit' && resultObj.comments) {
                // If audit, show comments and just the fixed config
                textArea.value = JSON.stringify(resultObj.fixed_config || resultObj, null, 2);
                alert(`🤖 Auditor Report:\n\n${resultObj.comments}`);
            } else {
                textArea.value = JSON.stringify(resultObj, null, 2);
            }

            if (modal) modal.style.display = 'flex';

        } catch (e) {
            alert(`Failed to parse JSON response: ${e.message}\nCheck console for raw output.`);
            console.log("Raw Output:", text);
        }
    },

    applyLlmChanges() {
        if (!this.pendingLlmResult) return;
        const { mode, data } = this.pendingLlmResult;

        try {
            // 1. REFINE: Update only current page layout
            if (mode === 'refine') {
                const page = this.getCurrentPage();
                const newLayout = Array.isArray(data) ? data : data.layout;
                if (!newLayout) throw new Error("Invalid response format: Expected array or {layout:[]}");
                page.layout = newLayout;
            } 
            // 2. FILL: Update current page layout (add items)
            else if (mode === 'fill') {
                const page = this.getCurrentPage();
                const newLayout = Array.isArray(data) ? data : data.layout;
                if (!newLayout) throw new Error("Invalid response format: Expected array or {layout:[]}");
                
                // Replace layout completely (assuming fill is mostly empty before)
                // If you want to append, you could do: page.layout = [...page.layout, ...newLayout];
                page.layout = newLayout;
            } 
            // 3. AUDIT: Replace entire config
            else if (mode === 'audit') {
                const newConfig = data.fixed_config || data;
                
                // SAFETY: Ensure images are not lost if LLM returned placeholders
                if (newConfig.pages && Array.isArray(newConfig.pages)) {
                    newConfig.pages.forEach((p, i) => {
                        if (this.engine.config.pages[i] && this.engine.config.pages[i].image) {
                            // Restore image from current config if missing or placeholder
                            if (!p.image || p.image === "<IMAGE_PLACEHOLDER>") {
                                p.image = this.engine.config.pages[i].image;
                            }
                        }
                    });
                }
                this.engine.config = newConfig;
            }

            // Rebuild Engine & UI
            this.engine.buildMaps();
            this.engine.reset(); // Reset selection state as IDs might have changed
            this.engine.recalculate();
            this.renderer.renderAll();
            
            // UI Updates
            this.renderPagesList();
            this.deselectChoice();
            
            document.getElementById('llm-preview-modal').style.display = 'none';
            alert("✅ Changes applied successfully!");

        } catch (e) {
            alert(`Error applying changes: ${e.message}`);
        }
    },

    // ==================== MANUAL MODE UTILS ====================

    applyManualResponse() {
        const text = document.getElementById('llm-manual-in').value;
        // Use pending mode if set (from runLlmAction), otherwise try to guess or default to current prompt mode
        const mode = this.pendingLlmMode || this.currentPromptMode || 'refine';
        this.processLlmResponse(text, mode);
    },

    copyManualPrompt() {
        const el = document.getElementById('llm-manual-out');
        el.select();
        document.execCommand('copy');
    },

    // ==================== SAM (AUTO-DETECT) LOGIC ====================
    // Keeps the existing functionality for Auto-Detect button

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
        const debugIdxInput = document.getElementById('sam-debug-index');
        const statusEl = document.getElementById('sam-status');
        const galleryEl = document.getElementById('sam-debug-gallery');

        const page = this.getCurrentPage();
        if (!page || !page.image) { alert("Please add a page with an image first!"); return; }
        if (!tokenInput.value) { alert("Please enter your Hugging Face Token!"); return; }

        const btn = document.getElementById('btn-run-sam');
        btn.disabled = true;
        btn.style.opacity = 0.5;
        galleryEl.innerHTML = '';
        
        let debugIdx = -1;
        if (debugIdxInput.value) debugIdx = parseInt(debugIdxInput.value) - 1; 

        this.autoDetector.statusCallback = (msg) => { statusEl.textContent = msg; };
        this.autoDetector.debugCallback = (title, dataUrl) => {
            const wrapper = document.createElement('div');
            wrapper.style.marginBottom = "15px";
            const label = document.createElement('div');
            label.textContent = title;
            label.style.color = "#4CAF50";
            label.style.fontSize = "0.75rem";
            label.style.marginBottom = "5px";
            const img = document.createElement('img');
            img.src = dataUrl;
            img.style.maxWidth = "100%";
            img.style.border = "1px solid #444";
            img.style.cursor = "pointer";
            img.onclick = () => {
                const w = window.open("");
                w.document.write(`<img src="${dataUrl}" style="border:1px solid red;">`);
            };
            wrapper.appendChild(label);
            wrapper.appendChild(img);
            galleryEl.appendChild(wrapper);
        };

        const response = await fetch(page.image);
        const blob = await response.blob();
        const file = new File([blob], "page.png", { type: blob.type });

        const detectedItems = await this.autoDetector.processImage(
            file,
            promptInput.value,
            parseFloat(shaveInput.value),
            tokenInput.value,
            debugIdx
        );

        if (detectedItems.length > 0) {
            for (const item of detectedItems) {
                item.type = 'item';
                page.layout.push(item);
            }
            // Sort by coords for better readability
            this.sortLayoutByCoords(page.layout);
            
            this.engine.buildMaps();
            this.engine.recalculate();
            this.renderer.renderLayout();
            
            statusEl.textContent = `Done! Added ${detectedItems.length} items.`;
            this.renderPagesList();
            this.switchTab('choice');
        } else {
            statusEl.textContent = "No items found.";
        }

        btn.disabled = false;
        btn.style.opacity = 1;
    }
};