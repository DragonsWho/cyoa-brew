/**
 * src/config/llm-config.js
 * LLM Configuration: OpenRouter Fix
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
        defaultModel: 'gemini-3-pro-preview', // Бесплатная и быстрая для тестов
        // Список запасных моделей, если API не ответит
        fallbackModels: [
            'gemini-3-pro-preview',
            'google/gemini-2.0-pro-exp-02-05:free',
            'openai/gpt-4o',
            'anthropic/claude-3.5-sonnet',
            'deepseek/deepseek-r1:free'
        ],
        supportsVision: true,
        supportsModelFetch: true,
        hint: '💡 OpenRouter requires an API key (even for free models) to access the full list.',
        
        // Формат запроса к чату
        formatRequest: (model, messages, apiKey, baseUrl) => ({
            url: `${baseUrl || 'https://openrouter.ai/api/v1'}/chat/completions`,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': window.location.origin, // ОБЯЗАТЕЛЬНО для OpenRouter
                'X-Title': 'CYOA Editor'               // ОБЯЗАТЕЛЬНО для OpenRouter
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
        defaultModel: 'gemini-2.0-flash',
        fallbackModels: ['gemini-2.0-flash', 'gemini-1.5-pro'],
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

/**
 * Fetch available models from provider API with Timeout and Logs
 */
export async function fetchAvailableModels(provider, apiKey) {
    console.log(`%c[LLM Config] Requesting models for: ${provider}`, 'color: cyan; font-weight: bold');
    
    const providerConfig = LLM_PROVIDERS[provider];
    
    // 1. Быстрый возврат, если провайдер не поддерживает загрузку или это Manual
    if (!providerConfig || provider === 'manual' || !providerConfig.supportsModelFetch) {
        return { models: providerConfig?.fallbackModels || [] };
    }

    // 2. Создаем контроллер для таймаута (8 секунд)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
        console.warn(`[LLM Config] ⏰ Timeout reached for ${provider}`);
        controller.abort();
    }, 8000);

    try {
        let models = [];
        
        // --- OPENROUTER ---
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
            
            // OpenRouter возвращает { data: [{id: "...", ...}, ...] }
            if (data && data.data && Array.isArray(data.data)) {
                models = data.data.map(m => m.id);
                
                // Безопасная сортировка
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
        
        // --- GOOGLE GEMINI ---
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

        // --- OPENAI ---
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
        console.log(`%c[LLM Config] Fetched ${models.length} models for ${provider}`, 'color: green');
        
        // Если список пуст, вернем фаллбеки
        if (models.length === 0) throw new Error('Empty list received');
        
        return { models };

    } catch (error) {
        clearTimeout(timeoutId);
        
        console.error(`[LLM Config] Fetch failed for ${provider}:`, error.message);
        
        if (error.name === 'AbortError') {
            console.log(`%c[LLM Config] Switching to fallback models due to timeout.`, 'color: orange');
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

// ==================== SYSTEM PROMPTS ====================
export const SYSTEM_PROMPTS = {
    refine: `You are an expert CYOA layout engine. Your task is to refine bounding boxes, merge/split them based on visual evidence, and organize them into logical groups with calculated coordinates. Return only valid JSON.`,
    fill: `You are an expert at parsing CYOA images and extracting structured game data. You strictly follow JSON schemas and game logic rules.`,
    audit: `You are a CYOA game logic auditor. Validate configurations and fix logical errors.`
};

// ==================== USER PROMPT TEMPLATES ====================
export const USER_PROMPTS = {
    refine: `Context: We have developed a script that turns static CYOA images into interactive ones. To do this, we need to accurately identify the bounding boxes of interactive elements (cards, options) and grouping zones (headers, sections).

**TASK:**
1. Analyze the provided image and the initial JSON layout (which may be messy or auto-detected).
2. "Snap" boxes to a logical grid if they look like they belong in a row/column.
3. Merge split text boxes into their parent Item card if needed.
4. Rename IDs to be descriptive (e.g., 'item_fireball', 'group_magic') based on visual text.
5. Return the cleaned JSON layout.

**LAYOUT JSON (Coordinates):**
\`\`\`json
{{LAYOUT_JSON}}
\`\`\``,

    fill: `**INPUTS:**
1. Image: Visual reference of the CYOA page.
2. Tools Reference: Rules on how to structure the JSON.
3. Example Config: A working example of the output format.

**TASK:**
Extract all interactive elements from the image into the JSON format.
- Create 'groups' for sections with headers.
- Create 'items' for selectable choices.
- Extract 'title', 'description', 'cost', 'requirements', and 'effects'.
- Use the coordinate system from the Layout JSON provided below.

**TOOLS REFERENCE:**
{{TOOLS_MD}}

**EXAMPLE JSON:**
\`\`\`json
{{EXAMPLE_JSON}}
\`\`\`

**LAYOUT JSON (Use these coords):**
\`\`\`json
{{LAYOUT_JSON}}
\`\`\`
`,

    audit: `Audit this CYOA game configuration for logical errors, missing references, or broken formulas.
    
**FULL CONFIG:**
\`\`\`json
{{CONFIG_JSON}}
\`\`\`
`
};

// ==================== HELPER FUNCTIONS ====================

export function buildMessages(mode, data) {
    const systemPrompt = SYSTEM_PROMPTS[mode];
    let userPrompt = USER_PROMPTS[mode];
    
    if (data.layout) userPrompt = userPrompt.replace('{{LAYOUT_JSON}}', JSON.stringify(data.layout, null, 2));
    else if (data.boxes) userPrompt = userPrompt.replace('{{LAYOUT_JSON}}', JSON.stringify(data.boxes, null, 2));

    if (mode === 'fill') {
        userPrompt = userPrompt.replace('{{EXAMPLE_JSON}}', data.exampleJson || '{}')
                           .replace('{{TOOLS_MD}}', data.toolsMd || 'No tools reference available.')
                           .replace('{{FULL_CONFIG}}', data.fullConfig ? JSON.stringify(data.fullConfig, null, 2) : '')
                           .replace('{{PAGE_NUM}}', data.pageNum || '');
    }
    
    if (data.config) userPrompt = userPrompt.replace('{{CONFIG_JSON}}', JSON.stringify(data.config, null, 2));
    
    return [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }];
}

export function addImageToMessages(messages, imageDataUrl, provider) {
    if (!imageDataUrl) return messages;
    const lastUserMsg = messages[messages.length - 1];
    
    if (provider === 'google') {
        const base64Data = imageDataUrl.split(',')[1];
        const mimeType = imageDataUrl.split(';')[0].split(':')[1];
        lastUserMsg.parts = [{ text: lastUserMsg.content }, { inline_data: { mime_type: mimeType, data: base64Data } }];
    } else if (provider === 'anthropic') {
        const base64Data = imageDataUrl.split(',')[1];
        const mimeType = imageDataUrl.split(';')[0].split(':')[1];
        lastUserMsg.content = [{ type: 'image', source: { type: 'base64', media_type: mimeType, data: base64Data } }, { type: 'text', text: lastUserMsg.content }];
    } else {
        lastUserMsg.content = [{ type: 'image_url', image_url: { url: imageDataUrl } }, { type: 'text', text: lastUserMsg.content }];
    }
    return messages;
}

export function extractJsonFromResponse(text) {
    if (!text) return null;
    let jsonStr = text.trim();
    const jsonBlockMatch = jsonStr.match(/```json\s*([\s\S]*?)\s*```/) || jsonStr.match(/```\s*([\s\S]*?)\s*```/);
    if (jsonBlockMatch) jsonStr = jsonBlockMatch[1];
    
    const firstBrace = jsonStr.indexOf('{');
    const firstBracket = jsonStr.indexOf('[');
    if (firstBrace === -1 && firstBracket === -1) throw new Error('No JSON found in response');
    
    const startIdx = (firstBrace === -1) ? firstBracket : (firstBracket === -1 ? firstBrace : Math.min(firstBrace, firstBracket));
    const isArray = firstBracket < firstBrace && firstBracket !== -1;
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
}