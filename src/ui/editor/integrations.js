export const EditorIntegrationsMixin = {
    // ==================== LLM LOGIC ====================
    setupLlmListeners() {
        const providerSel = document.getElementById('llm-provider');
        const baseUrlGroup = document.getElementById('llm-base-url-group');
        const baseUrlInput = document.getElementById('llm-base-url');
        const manualUi = document.getElementById('llm-manual-ui');
        const apiFields = document.getElementById('llm-api-fields');
        const runBtn = document.getElementById('btn-run-llm');
        const promptArea = document.getElementById('llm-prompt');

        if (promptArea) promptArea.value = this.llmConfig.systemPrompt;

        if (providerSel) {
            providerSel.addEventListener('change', (e) => {
                const val = e.target.value;
                this.llmConfig.provider = val;
                
                if (val === 'google') {
                    baseUrlInput.value = 'https://generativelanguage.googleapis.com/v1beta/models/';
                    document.getElementById('llm-model').value = 'gemini-2.0-flash';
                    manualUi.style.display = 'none';
                    apiFields.style.display = 'block';
                    baseUrlGroup.style.display = 'block';
                    runBtn.textContent = '✨ Refine Coordinates';
                } else if (val === 'openai') {
                    baseUrlInput.value = 'https://api.openai.com/v1';
                    document.getElementById('llm-model').value = 'gpt-4o';
                    manualUi.style.display = 'none';
                    apiFields.style.display = 'block';
                    baseUrlGroup.style.display = 'block';
                    runBtn.textContent = '✨ Refine Coordinates';
                } else if (val === 'manual') {
                    manualUi.style.display = 'block';
                    apiFields.style.display = 'none';
                    runBtn.textContent = '📝 Generate Prompt';
                }
            });
        }

        if (runBtn) {
            runBtn.addEventListener('click', async () => {
                this.llmConfig.apiKey = document.getElementById('llm-key').value;
                this.llmConfig.model = document.getElementById('llm-model').value;
                this.llmConfig.baseUrl = document.getElementById('llm-base-url').value;
                this.llmConfig.systemPrompt = document.getElementById('llm-prompt').value;

                const cleanConfig = JSON.parse(JSON.stringify(this.engine.config));
                if (cleanConfig.pages) {
                    cleanConfig.pages.forEach(p => { p.image = "<IMAGE_PLACEHOLDER>"; });
                }

                const contextData = { pages: cleanConfig.pages, points: cleanConfig.points };
                const fullPrompt = `${this.llmConfig.systemPrompt}\n\n${JSON.stringify(contextData, null, 2)}`;

                if (this.llmConfig.provider === 'manual') {
                    document.getElementById('llm-manual-out').value = fullPrompt;
                    alert("Prompt generated below. Copy it to your LLM.");
                    return;
                }

                if (!this.llmConfig.apiKey) {
                    alert("Please enter an API Key!");
                    return;
                }

                runBtn.disabled = true;
                runBtn.textContent = '⏳ Processing...';

                try {
                    const result = await this.callLlmApi(fullPrompt);
                    this.processLlmResponse(result);
                } catch (e) {
                    alert(`LLM Error: ${e.message}`);
                    console.error(e);
                } finally {
                    runBtn.disabled = false;
                    runBtn.textContent = '✨ Refine Coordinates';
                }
            });
        }
    },

    async callLlmApi(prompt) {
        const { provider, baseUrl, apiKey, model } = this.llmConfig;
        let url, body, headers;

        if (provider === 'google') {
            url = `${baseUrl}${model}:generateContent?key=${apiKey}`;
            headers = { 'Content-Type': 'application/json' };
            body = JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] });
        } else {
            url = `${baseUrl.replace(/\/+$/, '')}/chat/completions`;
            headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            };
            if (url.includes('openrouter')) headers['HTTP-Referer'] = window.location.href;

            body = JSON.stringify({
                model: model,
                messages: [{ role: "user", content: prompt }],
                temperature: 0.1 
            });
        }

        const response = await fetch(url, { method: 'POST', headers, body });
        const data = await response.json();

        if (!response.ok) throw new Error(data.error?.message || JSON.stringify(data));

        if (provider === 'google') return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        return data.choices?.[0]?.message?.content || '';
    },

    processLlmResponse(text) {
        let jsonStr = text;
        if (text.includes('```json')) {
            jsonStr = text.split('```json')[1].split('```')[0];
        } else if (text.includes('```')) {
            jsonStr = text.split('```')[1].split('```')[0];
        }

        try {
            const jsonObj = JSON.parse(jsonStr);
            if (!jsonObj.pages) throw new Error("Missing 'pages' array in response");
            document.getElementById('llm-result-json').value = JSON.stringify(jsonObj, null, 2);
            document.getElementById('llm-preview-modal').style.display = 'flex';
        } catch (e) {
            alert(`Failed to parse JSON response: ${e.message}\nCheck console for raw output.`);
            console.log("Raw LLM Output:", text);
        }
    },

    applyLlmChanges() {
        try {
            const raw = document.getElementById('llm-result-json').value;
            const newConfig = JSON.parse(raw);
            const currentPages = this.engine.config.pages || [];
            if (newConfig.pages) {
                newConfig.pages.forEach((page, idx) => {
                    if (currentPages[idx]) page.image = currentPages[idx].image;
                });
            }
            if (!newConfig.meta) newConfig.meta = this.engine.config.meta;
            this.engine.config.pages = newConfig.pages;
            if (newConfig.points) this.engine.config.points = newConfig.points;

            this.engine.buildMaps();
            this.engine.reset();
            this.engine.recalculate();
            this.renderer.renderAll();
            
            this.deselectChoice();
            this.renderPagesList();
            document.getElementById('llm-preview-modal').style.display = 'none';
            alert("Changes applied successfully!");
        } catch (e) {
            alert(`Error applying changes: ${e.message}`);
        }
    },

    copyManualPrompt() {
        const el = document.getElementById('llm-manual-out');
        el.select();
        document.execCommand('copy');
    },

    // ==================== SAM (Auto-Detect) LOGIC ====================
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