/**
 * src/ui/editor/integrations/llm/ui-listeners.js
 * LLM Panel UI Listeners - Complete Version
 */

import { LLM_PROVIDERS, fetchAvailableModels, saveLlmSettings, loadLlmSettings, getStoredApiKey } from './config/providers.js';
import { USER_PROMPTS } from './config/prompts.js';

export const LLMListenersMixin = {
    
    // ==================== API KEY VISIBILITY TOGGLE ====================
    
    toggleApiKeyVisibility() {
        const input = document.getElementById('llm-key');
        const btn = document.querySelector('.toggle-visibility-btn .eye-icon');
        
        if (!input) return;
        
        if (input.type === 'password') {
            input.type = 'text';
            if (btn) btn.textContent = '🔒';
        } else {
            input.type = 'password';
            if (btn) btn.textContent = '👁';
        }
    },

    // ==================== KEY STATUS DISPLAY ====================
    
    updateKeyStatus() {
        const keyInput = document.getElementById('llm-key');
        const status = document.getElementById('llm-key-status');
        
        if (!keyInput || !status) return;
        
        const len = keyInput.value.trim().length;
        
        if (len === 0) {
            status.textContent = '';
            status.style.color = '#666';
        } else if (len < 10) {
            status.textContent = `⚠️ Key seems too short (${len} chars)`;
            status.style.color = '#ff9800';
        } else {
            status.textContent = `✓ Key loaded (${len} chars)`;
            status.style.color = '#4CAF50';
        }
    },

    // ==================== MAIN SETUP ====================
    
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

        // Load saved settings
        const savedSettings = loadLlmSettings();
        if (providerSelect) providerSelect.value = savedSettings.provider;
        if (keyInput) keyInput.value = savedSettings.apiKey;
        if (baseUrlInput) baseUrlInput.value = savedSettings.baseUrl;

        // Model cache
        this._modelCache = {};

        // ==================== PROVIDER UI UPDATE ====================
        
        const updateProviderUI = async (provider) => {
            const config = LLM_PROVIDERS[provider];
            
            // Toggle manual mode UI
            if (provider === 'manual') { 
                if (manualUI) manualUI.style.display = 'block'; 
                if (apiFields) apiFields.style.display = 'none'; 
            } else { 
                if (manualUI) manualUI.style.display = 'none'; 
                if (apiFields) apiFields.style.display = 'block'; 
            }
            
            // Provider hint
            if (config?.hint && hintEl) { 
                hintEl.textContent = config.hint; 
                hintEl.style.display = 'block'; 
            } else if (hintEl) { 
                hintEl.style.display = 'none'; 
            }
            
            // Load stored key for this provider
            const storedKey = getStoredApiKey(provider);
            if (keyInput) {
                keyInput.value = storedKey;
                // Reset to password type when switching providers
                keyInput.type = 'password';
                const eyeIcon = document.querySelector('.toggle-visibility-btn .eye-icon');
                if (eyeIcon) eyeIcon.textContent = '👁';
            }
            
            // Update key status
            this.updateKeyStatus();
            
            // Fetch models
            await this.refreshModelsList(provider, storedKey);
            
            // Restore saved model if same provider
            if (savedSettings.model && provider === savedSettings.provider && modelSelect) {
                if ([...modelSelect.options].some(o => o.value === savedSettings.model)) {
                    modelSelect.value = savedSettings.model;
                } else if (modelCustom) {
                    modelCustom.value = savedSettings.model;
                }
            }
        };

        // ==================== REFRESH MODELS LIST ====================
        
        this.refreshModelsList = async (provider, apiKey) => {
            const config = LLM_PROVIDERS[provider];
            
            if (!modelSelect) return;
            
            modelSelect.innerHTML = '<option value="">Loading...</option>';
            
            if (!config || provider === 'manual') { 
                modelSelect.innerHTML = '<option value="">Manual Mode</option>'; 
                return; 
            }
            
            if (statusEl) statusEl.textContent = '⏳ Fetching models...';
            
            // Check cache
            const cacheKey = `${provider}-${apiKey ? 'auth' : 'noauth'}`;
            if (this._modelCache[cacheKey]) {
                this.populateModelSelect(this._modelCache[cacheKey].models, config.defaultModel);
                if (statusEl) statusEl.textContent = `✓ Cached (${this._modelCache[cacheKey].models.length})`;
                return;
            }
            
            try {
                const result = await fetchAvailableModels(provider, apiKey);
                const models = result.models || config.fallbackModels || [];
                
                this.populateModelSelect(models, config.defaultModel);
                
                if (result.error) {
                    if (statusEl) statusEl.textContent = `⚠️ Using defaults (${result.error})`;
                } else {
                    if (statusEl) statusEl.textContent = `✓ ${models.length} models available`;
                    // Cache successful result
                    this._modelCache[cacheKey] = { models };
                }
            } catch (err) { 
                console.error('Model fetch error:', err);
                this.populateModelSelect(config.fallbackModels || [], config.defaultModel);
                if (statusEl) statusEl.textContent = '⚠️ Using fallback models';
            }
        };

        // ==================== POPULATE MODEL SELECT ====================
        
        this.populateModelSelect = (models, defaultModel) => {
            if (!modelSelect) return;
            
            modelSelect.innerHTML = '';
            
            if (!models || !models.length) { 
                modelSelect.innerHTML = '<option value="">No models available</option>'; 
                return; 
            }
            
            models.forEach(m => {
                const opt = document.createElement('option');
                opt.value = m;
                opt.textContent = m + (m === defaultModel ? ' ⭐' : '');
                modelSelect.appendChild(opt);
            });
            
            // Add custom option
            const customOpt = document.createElement('option'); 
            customOpt.value = '__custom__'; 
            customOpt.textContent = '— Custom model...'; 
            modelSelect.appendChild(customOpt);
            
            // Select default if available
            if (models.includes(defaultModel)) {
                modelSelect.value = defaultModel;
            }
        };

        // ==================== PROMPT MANAGEMENT ====================
        
        this.currentPromptMode = 'refine';
        if (promptArea) {
            promptArea.value = this.editablePrompts.refine;
        }
        
        if (promptSelector) {
            promptSelector.addEventListener('change', (e) => {
                const mode = e.target.value;
                this.currentPromptMode = mode;
                if (promptArea) {
                    promptArea.value = this.editablePrompts[mode];
                }
            });
        }

        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                const mode = this.currentPromptMode || 'refine';
                this.editablePrompts[mode] = USER_PROMPTS[mode];
                if (promptArea) {
                    promptArea.value = USER_PROMPTS[mode];
                }
            });
        }

        // ==================== EVENT LISTENERS ====================
        
        // Provider change
        if (providerSelect) {
            providerSelect.addEventListener('change', (e) => { 
                saveLlmSettings({ provider: e.target.value }); 
                updateProviderUI(e.target.value); 
            });
        }
        
        // API Key input
        if (keyInput) {
            keyInput.addEventListener('input', (e) => {
                saveLlmSettings({ 
                    provider: providerSelect?.value || 'openrouter', 
                    apiKey: e.target.value 
                });
                this.updateKeyStatus();
            });
            
            // Also update on paste
            keyInput.addEventListener('paste', () => {
                setTimeout(() => {
                    saveLlmSettings({ 
                        provider: providerSelect?.value || 'openrouter', 
                        apiKey: keyInput.value 
                    });
                    this.updateKeyStatus();
                }, 10);
            });
        }
        
        // Base URL input
        if (baseUrlInput) {
            baseUrlInput.addEventListener('input', (e) => {
                saveLlmSettings({ 
                    provider: providerSelect?.value || 'openrouter', 
                    baseUrl: e.target.value 
                });
            });
        }
        
        // Model selection
        if (modelSelect) {
            modelSelect.addEventListener('change', (e) => {
                saveLlmSettings({ model: e.target.value });
                
                // Show/hide custom input
                const customGroup = modelCustom?.parentElement;
                if (customGroup) {
                    // Always visible, but highlight when custom selected
                    if (e.target.value === '__custom__') {
                        modelCustom.focus();
                        modelCustom.style.borderColor = '#4CAF50';
                    } else {
                        modelCustom.style.borderColor = '#333';
                    }
                }
            });
        }
        
        // Custom model input
        if (modelCustom) {
            modelCustom.addEventListener('input', (e) => {
                if (e.target.value.trim()) {
                    saveLlmSettings({ model: e.target.value.trim() });
                }
            });
        }
        
        // Refresh button
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                // Clear cache for current provider
                const provider = providerSelect?.value || 'openrouter';
                const apiKey = keyInput?.value || '';
                const cacheKey = `${provider}-${apiKey ? 'auth' : 'noauth'}`;
                delete this._modelCache[cacheKey];
                
                this.refreshModelsList(provider, apiKey);
            });
        }

        // Prompt area - save on change
        if (promptArea) {
            promptArea.addEventListener('input', (e) => {
                const mode = this.currentPromptMode || 'refine';
                this.editablePrompts[mode] = e.target.value;
            });
        }

        // ==================== INITIAL SETUP ====================
        
        updateProviderUI(savedSettings.provider);
        
        // Delayed key status check (for autofill)
        setTimeout(() => {
            this.updateKeyStatus();
        }, 500);
    }
};