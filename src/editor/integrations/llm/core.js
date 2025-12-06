/**
 * src/ui/editor/integrations/llm/core.js
 * Main LLM Integration Logic - Fixed Version
 */

import { LLM_PROVIDERS } from './config/providers.js';
import { SYSTEM_PROMPTS, USER_PROMPTS, TOOLS_REFERENCE_MD } from './config/prompts.js';

export const LLMCoreMixin = {
    // User-editable copies of prompts
    editablePrompts: {
        refine: USER_PROMPTS.refine,
        fill: USER_PROMPTS.fill,
        audit: USER_PROMPTS.audit
    },

    // ==================== HELPERS ====================

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

    // ==================== BUILD MESSAGES ====================

    buildMessagesForMode(mode, data) {
        const systemPrompt = SYSTEM_PROMPTS[mode];
        let userPrompt = this.editablePrompts[mode];
        
        // COMMON INJECTIONS
        userPrompt = userPrompt.replace('{{NOTES}}', this.engine.config.notes || "No notes yet.");
        
        if (data.layout) {
            userPrompt = userPrompt.replace('{{LAYOUT_JSON}}', JSON.stringify(data.layout, null, 2));
        } else if (data.boxes) {
            userPrompt = userPrompt.replace('{{LAYOUT_JSON}}', JSON.stringify(data.boxes, null, 2));
        }

        if (mode === 'fill') {
            userPrompt = userPrompt
                .replace('{{EXAMPLE_JSON}}', data.exampleJson || '{}')
                .replace('{{TOOLS_MD}}', data.toolsMd || 'No tools reference available.')
                .replace('{{FULL_CONFIG}}', data.fullConfig ? JSON.stringify(data.fullConfig, null, 2) : '')
                .replace('{{PAGE_NUM}}', data.pageNum || '');
        }
        
        if (data.config) {
            userPrompt = userPrompt.replace('{{CONFIG_JSON}}', JSON.stringify(data.config, null, 2));
        }
        
        return [
            { role: 'system', content: systemPrompt }, 
            { role: 'user', content: userPrompt }
        ];
    },

    addImageToMessages(messages, imageDataUrl, provider) {
        if (!imageDataUrl) return messages;
        const lastUserMsg = messages[messages.length - 1];
        
        if (provider === 'google') {
            const base64Data = imageDataUrl.split(',')[1];
            const mimeType = imageDataUrl.split(';')[0].split(':')[1];
            lastUserMsg.parts = [
                { text: lastUserMsg.content }, 
                { inline_data: { mime_type: mimeType, data: base64Data } }
            ];
        } else if (provider === 'anthropic') {
            const base64Data = imageDataUrl.split(',')[1];
            const mimeType = imageDataUrl.split(';')[0].split(':')[1];
            lastUserMsg.content = [
                { type: 'image', source: { type: 'base64', media_type: mimeType, data: base64Data } }, 
                { type: 'text', text: lastUserMsg.content }
            ];
        } else {
            // OpenRouter, OpenAI standard format
            lastUserMsg.content = [
                { type: 'image_url', image_url: { url: imageDataUrl } }, 
                { type: 'text', text: lastUserMsg.content }
            ];
        }
        return messages;
    },

    // ==================== CALL API ====================

    async callLlmApi(messages) {
        const { provider, baseUrl, apiKey, model } = this.llmConfig;
        const providerConfig = LLM_PROVIDERS[provider];
        
        if (!providerConfig || !providerConfig.formatRequest) {
            throw new Error(`Unknown or unsupported provider: ${provider}`);
        }

        const request = providerConfig.formatRequest(model, messages, apiKey, baseUrl);
        console.log(`📡 Calling ${provider} API:`, request.url, `Model: ${model}`);
        
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

    // ==================== PARSE RESPONSE ====================

    extractJsonFromResponse(text) {
        if (!text) return null;
        let jsonStr = text.trim();
        
        // Try to find JSON in code blocks first
        const jsonBlockMatch = jsonStr.match(/```json\s*([\s\S]*?)\s*```/) || 
                               jsonStr.match(/```\s*([\s\S]*?)\s*```/);
        if (jsonBlockMatch) {
            jsonStr = jsonBlockMatch[1];
        }
        
        const firstBrace = jsonStr.indexOf('{');
        const firstBracket = jsonStr.indexOf('[');
        
        if (firstBrace === -1 && firstBracket === -1) {
            throw new Error('No JSON found in response');
        }
        
        const startIdx = (firstBrace === -1) ? firstBracket : 
                         (firstBracket === -1 ? firstBrace : Math.min(firstBrace, firstBracket));
        const isArray = firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace);
        const openChar = isArray ? '[' : '{';
        const closeChar = isArray ? ']' : '}';
        
        let depth = 0, endIdx = -1;
        for (let i = startIdx; i < jsonStr.length; i++) {
            if (jsonStr[i] === openChar) depth++;
            if (jsonStr[i] === closeChar) depth--;
            if (depth === 0) { endIdx = i + 1; break; }
        }
        
        if (endIdx === -1) throw new Error('Incomplete JSON in response');
        return JSON.parse(jsonStr.substring(startIdx, endIdx));
    },

    // ==================== MAIN ACTION RUNNER ====================

    async runLlmAction(mode) {
        // Sync editable prompts
        const promptArea = document.getElementById('llm-user-prompt');
        if (promptArea && this.currentPromptMode === mode) {
            this.editablePrompts[mode] = promptArea.value;
        }

        // Read current provider settings
        const providerSel = document.getElementById('llm-provider');
        if (providerSel) this.llmConfig.provider = providerSel.value;

        this.llmConfig.apiKey = document.getElementById('llm-key')?.value || '';
        this.llmConfig.baseUrl = document.getElementById('llm-base-url')?.value || '';
        
        // Handle model selection
        const modelSel = document.getElementById('llm-model-select');
        const customModel = document.getElementById('llm-model-custom');
        
        if (modelSel?.value === '__custom__' && customModel?.value) {
            this.llmConfig.model = customModel.value;
        } else if (modelSel?.value && modelSel.value !== '__custom__') {
            this.llmConfig.model = modelSel.value;
        }

        // Validation
        if (this.llmConfig.provider !== 'manual' && !this.llmConfig.apiKey) {
            alert("Please enter API Key");
            return;
        }

        const page = this.getCurrentPage();
        if (mode !== 'audit' && !page) {
            alert("No active page selected");
            return;
        }

        // Store original button state
        const btn = document.activeElement;
        const originalText = btn?.innerHTML || '';
        if (btn?.tagName === 'BUTTON') { 
            btn.disabled = true; 
            btn.innerHTML = '⏳ Processing...'; 
        }

        try {
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
                const exampleJson = await this.loadStaticFile('/config/test_config.json');
                
                dataForPrompt.layout = page.layout;
                dataForPrompt.toolsMd = TOOLS_REFERENCE_MD;
                dataForPrompt.exampleJson = exampleJson;
                dataForPrompt.fullConfig = this.getCleanConfig();
                
                const pageIndex = this.engine.config.pages.indexOf(page);
                dataForPrompt.pageNum = pageIndex !== -1 ? pageIndex + 1 : "?";
                imageToSend = page.image;
            } 
            else if (mode === 'audit') {
                dataForPrompt.config = this.getCleanConfig();
            }

            let messages = this.buildMessagesForMode(mode, dataForPrompt);

            if (imageToSend) {
                messages = this.addImageToMessages(messages, imageToSend, this.llmConfig.provider);
            }

            // Manual mode handling
            if (this.llmConfig.provider === 'manual') {
                this.showManualMode(mode, messages, imageToSend);
                if (btn?.tagName === 'BUTTON') { 
                    btn.disabled = false; 
                    btn.innerHTML = originalText; 
                }
                return;
            }

            const responseText = await this.callLlmApi(messages);
            this.processLlmResponse(responseText, mode);

        } catch (e) {
            alert(`LLM Error: ${e.message}`);
            console.error('LLM Error:', e);
        } finally {
            if (btn?.tagName === 'BUTTON' && this.llmConfig.provider !== 'manual') { 
                btn.disabled = false; 
                btn.innerHTML = originalText; 
            }
        }
    },

    // ==================== RESPONSE PROCESSING ====================

    processLlmResponse(text, mode) {
        try {
            const resultObj = this.extractJsonFromResponse(text);
            this.pendingLlmResult = { mode, data: resultObj };

            const modal = document.getElementById('llm-preview-modal');
            const textArea = document.getElementById('llm-result-json');
            const summaryEl = document.getElementById('llm-result-summary');
            
            let displayData = resultObj;
            let summary = '';
            
            if (mode === 'audit') {
                if (resultObj.changes) {
                    summary = `Found ${resultObj.changes.length} changes to apply`;
                }
                displayData = resultObj.fixed_config || resultObj;
            } else if (mode === 'refine') {
                const items = Array.isArray(resultObj) ? resultObj : (resultObj.layout || []);
                summary = `Refined: ${items.length} top-level elements`;
            } else if (mode === 'fill') {
                const items = Array.isArray(resultObj) ? resultObj : (resultObj.layout || resultObj);
                const count = Array.isArray(items) ? items.length : Object.keys(items).length;
                summary = `Extracted ${count} elements with full data`;
            }

            if (textArea) textArea.value = JSON.stringify(displayData, null, 2);
            if (summaryEl) {
                summaryEl.textContent = summary;
                summaryEl.style.display = summary ? 'block' : 'none';
            }
            if (modal) modal.style.display = 'flex';

        } catch (e) {
            alert(`Failed to parse JSON response: ${e.message}\n\nRaw response logged to console.`);
            console.error('Parse Error:', e);
            console.log('Raw response:', text);
        }
    },

    // ==================== SORT & RENAME ====================

    sortAndRenameLayout(layout) {
        if (!layout || layout.length === 0) return;

        // Sort by Y position first, then X (reading order)
        layout.sort((a, b) => {
            const aY = a.coords?.y || 0;
            const bY = b.coords?.y || 0;
            const yDiff = Math.abs(aY - bY);
            
            // If items are roughly on the same row (within 40px), sort by X
            if (yDiff < 40) {
                return (a.coords?.x || 0) - (b.coords?.x || 0);
            }
            return aY - bY;
        });

        // Rename with sequential IDs
        layout.forEach((item, index) => {
            if (item.type === 'item' || item.type === 'group') {
                item.id = `Card_${index + 1}`;
            }
        });
        
        return layout;
    }
};