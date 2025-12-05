/**
 * src/ui/editor/integrations/llm/ui-listeners.js
 * LLM Panel UI Listeners
 */

import { LLM_PROVIDERS, fetchAvailableModels, saveLlmSettings, loadLlmSettings, getStoredApiKey } from './config/providers.js';
import { USER_PROMPTS } from './config/prompts.js';

export const LLMListenersMixin = {
    setupLlmListeners() {
        const providerSelect = document.getElementById('llm-provider');
        const keyInput = document.getElementById('llm-key');
        const modelSelect = document.getElementById('llm-model-select');
        const modelCustom = document.getElementById('llm-model-custom');
        const baseUrlInput = document.getElementById('llm-base-url');
        const refreshBtn = document.getElementById('llm-refresh-models');
        const hintEl = document.getElementById('llm-provider-hint');
        const statusEl = document.getElementById('llm-model-status');
        const manualUI = document.getElementById('llm-manual-ui');
        const apiFields = document.getElementById('llm-api-fields');
        const promptSelector = document.getElementById('llm-prompt-selector');
        const promptArea = document.getElementById('llm-user-prompt');
        const resetBtn = document.getElementById('llm-reset-prompts');

        const savedSettings = loadLlmSettings();
        if(providerSelect) providerSelect.value = savedSettings.provider;
        if(keyInput) keyInput.value = savedSettings.apiKey;
        if(baseUrlInput) baseUrlInput.value = savedSettings.baseUrl;

        this._modelCache = {};

        const updateProviderUI = async (provider) => {
            const config = LLM_PROVIDERS[provider];
            if (provider === 'manual') { 
                manualUI.style.display = 'block'; 
                apiFields.style.display = 'none'; 
            } else { 
                manualUI.style.display = 'none'; 
                apiFields.style.display = 'block'; 
            }
            if (config?.hint) { 
                hintEl.textContent = config.hint; 
                hintEl.style.display = 'block'; 
            } else { 
                hintEl.style.display = 'none'; 
            }
            const storedKey = getStoredApiKey(provider);
            if(keyInput) keyInput.value = storedKey;
            await this.refreshModelsList(provider, storedKey);
            if (savedSettings.model && provider === savedSettings.provider) {
                if ([...modelSelect.options].some(o => o.value === savedSettings.model)) modelSelect.value = savedSettings.model;
                else modelCustom.value = savedSettings.model;
            }
        };

        this.refreshModelsList = async (provider, apiKey) => {
            const config = LLM_PROVIDERS[provider];
            modelSelect.innerHTML = '<option value="">Loading...</option>';
            if (!config || provider === 'manual') { 
                modelSelect.innerHTML = '<option value="">Manual Mode</option>'; 
                return; 
            }
            statusEl.textContent = '⏳ Fetching models...';
            const cacheKey = `${provider}-${apiKey ? 'auth' : 'noauth'}`;
            if (this._modelCache[cacheKey]) {
                this.populateModelSelect(this._modelCache[cacheKey].models, config.defaultModel);
                statusEl.textContent = `✓ Cached`;
                return;
            }
            try {
                const result = await fetchAvailableModels(provider, apiKey);
                this.populateModelSelect(result.models || config.fallbackModels || [], config.defaultModel);
                statusEl.textContent = result.error ? `⚠️ Defaults` : `✓ Ready`;
                if(!result.error) this._modelCache[cacheKey] = { models: result.models };
            } catch (err) { 
                this.populateModelSelect(config.fallbackModels || [], config.defaultModel); 
            }
        };

        this.populateModelSelect = (models, defaultModel) => {
            modelSelect.innerHTML = '';
            if (!models || !models.length) { 
                modelSelect.innerHTML = '<option>No models</option>'; 
                return; 
            }
            models.forEach(m => {
                const opt = document.createElement('option');
                opt.value = m;
                opt.textContent = m + (m === defaultModel ? ' ⭐' : '');
                modelSelect.appendChild(opt);
            });
            const cust = document.createElement('option'); 
            cust.value='__custom__'; 
            cust.textContent='Custom...'; 
            modelSelect.appendChild(cust);
            if(models.includes(defaultModel)) modelSelect.value = defaultModel;
        };

        // Prompt Selector
        this.currentPromptMode = 'refine';
        if(promptArea) promptArea.value = this.editablePrompts.refine;
        
        if(promptSelector) {
            promptSelector.addEventListener('change', (e) => {
                const mode = e.target.value;
                this.currentPromptMode = mode;
                if(promptArea) promptArea.value = this.editablePrompts[mode];
            });
        }

        if(resetBtn) {
            resetBtn.addEventListener('click', () => {
                const mode = this.currentPromptMode || 'refine';
                this.editablePrompts[mode] = USER_PROMPTS[mode];
                if(promptArea) promptArea.value = USER_PROMPTS[mode];
            });
        }

        if(providerSelect) providerSelect.addEventListener('change', (e) => { 
            saveLlmSettings({ provider: e.target.value }); 
            updateProviderUI(e.target.value); 
        });
        if(keyInput) keyInput.addEventListener('input', (e) => saveLlmSettings({ provider: providerSelect.value, apiKey: e.target.value }));
        if(refreshBtn) refreshBtn.addEventListener('click', () => this.refreshModelsList(providerSelect.value, keyInput.value));
        
        updateProviderUI(savedSettings.provider);
    }
};