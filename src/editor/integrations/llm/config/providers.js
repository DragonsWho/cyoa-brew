/**
 * src/ui/editor/integrations/llm/config/providers.js
 * LLM Provider Configurations and Model Fetching
 * Extracted from llm-config.js
 */

// ==================== STORAGE KEYS ====================
const STORAGE_KEYS = {
    provider: 'cyoa-llm-provider',
    model: 'cyoa-llm-model',
    apiKey: (provider) => `cyoa-llm-key-${provider}`,
    baseUrl: (provider) => `cyoa-llm-baseurl-${provider}`
};

// ==================== PROVIDER CONFIGURATIONS ====================

export const LLM_PROVIDERS = {
    openrouter: {
        name: 'OpenRouter',
        baseUrl: 'https://openrouter.ai/api/v1',
        defaultModel: 'google/gemini-2.0-flash-exp:free',
        fallbackModels: [
            'google/gemini-2.0-flash-exp:free',
            'google/gemini-2.0-pro-exp-02-05:free',
            'openai/gpt-4o',
            'anthropic/claude-3.5-sonnet',
            'deepseek/deepseek-r1:free'
        ],
        supportsVision: true,
        supportsModelFetch: true,
        hint: '💡 OpenRouter requires an API key (even for free models) to access the full list.',
        
        formatRequest: (model, messages, apiKey, baseUrl) => ({
            url: `${baseUrl || 'https://openrouter.ai/api/v1'}/chat/completions`,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': window.location.origin,
                'X-Title': 'CYOA Editor'
            },
            body: {
                model: model,
                messages: messages.map(m => ({
                    role: m.role,
                    content: m.content
                })),
                temperature: 0.1
            }
        }),
        parseResponse: (data) => data.choices?.[0]?.message?.content || ''
    },

    google: {
        name: 'Google Gemini',
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models/',
        defaultModel: 'gemini-2.0-flash-exp',
        fallbackModels: ['gemini-2.0-flash-exp', 'gemini-1.5-pro'],
        supportsVision: true,
        supportsModelFetch: true,
        formatRequest: (model, messages, apiKey) => ({
            url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
            headers: { 'Content-Type': 'application/json' },
            body: {
                contents: messages.map(m => ({
                    role: m.role === 'assistant' ? 'model' : 'user',
                    parts: m.parts || [{ text: m.content }]
                }))
            }
        }),
        parseResponse: (data) => data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    },

    openai: {
        name: 'OpenAI',
        baseUrl: 'https://api.openai.com/v1',
        defaultModel: 'gpt-4o',
        fallbackModels: ['gpt-4o', 'gpt-4o-mini', 'o1'],
        supportsVision: true,
        supportsModelFetch: true,
        formatRequest: (model, messages, apiKey, baseUrl) => ({
            url: `${baseUrl || 'https://api.openai.com/v1'}/chat/completions`,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: {
                model: model,
                messages: messages.map(m => ({ role: m.role, content: m.content })),
                temperature: 0.1
            }
        }),
        parseResponse: (data) => data.choices?.[0]?.message?.content || ''
    },

    anthropic: {
        name: 'Anthropic Claude',
        baseUrl: 'https://api.anthropic.com/v1',
        defaultModel: 'claude-3-5-sonnet-20241022',
        fallbackModels: ['claude-3-5-sonnet-20241022'],
        supportsVision: true,
        supportsModelFetch: false,
        formatRequest: (model, messages, apiKey, baseUrl) => ({
            url: `${baseUrl || 'https://api.anthropic.com/v1'}/messages`,
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: {
                model: model,
                max_tokens: 4096,
                messages: messages.filter(m => m.role !== 'system')
            }
        }),
        parseResponse: (data) => data.content?.[0]?.text || ''
    },

    manual: {
        name: 'Manual (Copy/Paste)',
        baseUrl: '',
        defaultModel: '',
        fallbackModels: [],
        supportsVision: true,
        supportsModelFetch: false
    }
};

// ==================== MODEL FETCHING ====================

export async function fetchAvailableModels(provider, apiKey) {
    console.log(`%c[LLM] Requesting models for: ${provider}`, 'color: cyan; font-weight: bold');
    
    const providerConfig = LLM_PROVIDERS[provider];
    
    if (!providerConfig || provider === 'manual' || !providerConfig.supportsModelFetch) {
        return { models: providerConfig?.fallbackModels || [] };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
        console.warn(`[LLM] ⏰ Timeout reached for ${provider}`);
        controller.abort();
    }, 8000);

    try {
        let models = [];
        
        if (provider === 'openrouter') {
            const headers = { 
                'Content-Type': 'application/json',
                'HTTP-Referer': window.location.origin || 'http://localhost', 
                'X-Title': 'CYOA Editor'
            };
            if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
            
            const response = await fetch('https://openrouter.ai/api/v1/models', { 
                headers,
                signal: controller.signal 
            });

            if (!response.ok) throw new Error(`Status ${response.status}`);
            const data = await response.json();
            
            if (data && data.data && Array.isArray(data.data)) {
                models = data.data.map(m => m.id);
                
                models.sort((a, b) => {
                    const getScore = (id) => {
                        if (typeof id !== 'string') return 0;
                        if (id.includes('gemini-2.0-flash')) return 100;
                        if (id.includes('gemini-2.0-pro')) return 95;
                        if (id.includes('gpt-4o')) return 90;
                        if (id.includes('claude-3.5')) return 85;
                        if (id.includes('free')) return 50;
                        return 0;
                    };
                    return getScore(b) - getScore(a);
                });
            }
        }
        else if (provider === 'google') {
            if (!apiKey) throw new Error('No API Key');
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
                { signal: controller.signal }
            );
            if (!response.ok) throw new Error(`Status ${response.status}`);
            const data = await response.json();
            if (data.models) {
                models = data.models
                    .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
                    .map(m => m.name.replace('models/', ''));
            }
        }
        else if (provider === 'openai') {
            if (!apiKey) throw new Error('No API Key');
            const response = await fetch('https://api.openai.com/v1/models', {
                headers: { 'Authorization': `Bearer ${apiKey}` },
                signal: controller.signal
            });
            if (!response.ok) throw new Error(`Status ${response.status}`);
            const data = await response.json();
            if (data.data) models = data.data.map(m => m.id);
        }

        clearTimeout(timeoutId);
        console.log(`%c[LLM] Fetched ${models.length} models for ${provider}`, 'color: green');
        
        if (models.length === 0) throw new Error('Empty list received');
        
        return { models };

    } catch (error) {
        clearTimeout(timeoutId);
        
        console.error(`[LLM] Fetch failed for ${provider}:`, error.message);
        
        if (error.name === 'AbortError') {
            console.log(`%c[LLM] Switching to fallback models due to timeout.`, 'color: orange');
        }

        return { 
            models: providerConfig.fallbackModels || [], 
            error: error.name === 'AbortError' ? 'Timeout' : error.message 
        };
    }
}

// ==================== STORAGE HELPERS ====================

export function saveLlmSettings(settings) {
    try {
        if (settings.provider) localStorage.setItem(STORAGE_KEYS.provider, settings.provider);
        if (settings.model) localStorage.setItem(STORAGE_KEYS.model, settings.model);
        if (settings.apiKey !== undefined && settings.provider) {
            const key = STORAGE_KEYS.apiKey(settings.provider);
            settings.apiKey ? localStorage.setItem(key, settings.apiKey) : localStorage.removeItem(key);
        }
        if (settings.baseUrl !== undefined && settings.provider) {
            const key = STORAGE_KEYS.baseUrl(settings.provider);
            settings.baseUrl ? localStorage.setItem(key, settings.baseUrl) : localStorage.removeItem(key);
        }
    } catch (e) { console.warn('Failed to save LLM settings:', e); }
}

export function loadLlmSettings() {
    try {
        const provider = localStorage.getItem(STORAGE_KEYS.provider) || 'openrouter';
        const model = localStorage.getItem(STORAGE_KEYS.model) || LLM_PROVIDERS[provider]?.defaultModel || '';
        const apiKey = localStorage.getItem(STORAGE_KEYS.apiKey(provider)) || '';
        const baseUrl = localStorage.getItem(STORAGE_KEYS.baseUrl(provider)) || '';
        return { provider, model, apiKey, baseUrl };
    } catch (e) {
        return { provider: 'openrouter', model: '', apiKey: '', baseUrl: '' };
    }
}

export function getStoredApiKey(provider) {
    try { return localStorage.getItem(STORAGE_KEYS.apiKey(provider)) || ''; } catch (e) { return ''; }
}