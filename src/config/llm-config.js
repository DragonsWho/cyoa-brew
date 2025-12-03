/**
 * src/config/llm-config.js
 * LLM Configuration: Providers, Models, and Prompts for each mode
 */

// ==================== PROVIDER CONFIGURATIONS ====================

export const LLM_PROVIDERS = {
    google: {
        name: 'Google Gemini',
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models/',
        defaultModel: 'gemini-2.0-flash',
        models: [
            'gemini-2.0-flash',
            'gemini-2.0-pro-exp-02-05',
            'gemini-1.5-pro',
            'gemini-1.5-flash'
        ],
        supportsVision: true,
        formatRequest: (model, messages, apiKey) => ({
            url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
            headers: { 'Content-Type': 'application/json' },
            body: {
                contents: messages.map(m => ({
                    role: m.role === 'assistant' ? 'model' : 'user',
                    parts: m.parts || [{ text: m.content }]
                })),
                generationConfig: {
                    temperature: 0.1,
                    topP: 0.95
                }
            }
        }),
        parseResponse: (data) => data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    },

    openai: {
        name: 'OpenAI',
        baseUrl: 'https://api.openai.com/v1',
        defaultModel: 'gpt-4o',
        models: [
            'gpt-4o',
            'gpt-4o-mini',
            'gpt-4-turbo',
            'o1',
            'o3-mini'
        ],
        supportsVision: true,
        formatRequest: (model, messages, apiKey, baseUrl) => ({
            url: `${baseUrl || 'https://api.openai.com/v1'}/chat/completions`,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
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

    anthropic: {
        name: 'Anthropic Claude',
        baseUrl: 'https://api.anthropic.com/v1',
        defaultModel: 'claude-3-5-sonnet-20241022',
        models: [
            'claude-3-7-sonnet-20250219',
            'claude-3-5-sonnet-20241022',
            'claude-3-5-haiku-20241022',
            'claude-3-opus-20240229'
        ],
        supportsVision: true,
        formatRequest: (model, messages, apiKey, baseUrl) => {
            const systemMsg = messages.find(m => m.role === 'system');
            const otherMsgs = messages.filter(m => m.role !== 'system');
            
            return {
                url: `${baseUrl || 'https://api.anthropic.com/v1'}/messages`,
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01'
                },
                body: {
                    model: model,
                    max_tokens: 8192,
                    system: systemMsg?.content || '',
                    messages: otherMsgs.map(m => ({
                        role: m.role,
                        content: m.content
                    }))
                }
            };
        },
        parseResponse: (data) => {
            if (data.content && Array.isArray(data.content)) {
                return data.content.map(c => c.text || '').join('');
            }
            return data.content?.[0]?.text || '';
        }
    },

    openrouter: {
        name: 'OpenRouter',
        baseUrl: 'https://openrouter.ai/api/v1',
        defaultModel: 'anthropic/claude-3.5-sonnet',
        models: [
            'anthropic/claude-3.5-sonnet',
            'openai/gpt-4o',
            'google/gemini-2.0-flash-001',
            'deepseek/deepseek-chat-v3'
        ],
        supportsVision: true,
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

    manual: {
        name: 'Manual (Copy/Paste)',
        baseUrl: '',
        defaultModel: '',
        models: [],
        supportsVision: true
    }
};


// ==================== SYSTEM PROMPTS ====================

export const SYSTEM_PROMPTS = {
    refine: `You are an expert CYOA layout engine. Your task is to refine bounding boxes, merge/split them based on visual evidence, and organize them into logical groups with calculated coordinates. Return only valid JSON.`,

    fill: `You are an expert at parsing CYOA images and extracting structured game data. You strictly follow JSON schemas and game logic rules.`,

    audit: `You are a CYOA game logic auditor. Validate configurations and fix logical errors.`
};


// ==================== USER PROMPT TEMPLATES ====================

export const USER_PROMPTS = {
    refine: `Привет, мы сделали скрипт что превращает статичные CYOA в интерактивные отрисовывая кнопки поверх изображения. 

Я уже предварительно распознала и выделила границы будующих кнопок и карточек с помощью SAM, системы компьютерного зрения.

Текущая задача:

Вы получаете изображение с наложенными зелёными пронумерованными прямоугольниками (блоками обнаружения сгенерированных SAM) и JSON-массив этих блоков с координатами этих блоков. ID будут совпадать.

Ваша задача:
1. **Скорректировать границы** — Переместить/изменить размер блоков, чтобы они точно соответствовали краям карты, видимым на изображении, если они не совпадают. Важно, выровнять близкие карточке по высоте и ширине, что бы они выглядели одинакого.
2. **Объединить блоки** — Если несколько блоков закрывают части одной карты, объединить их в один, это ошибка распознания.
3. **Разделить блоки** — Если один блок содержит несколько отдельных карт, разделить их на отдельные записи. Одна карточка - один сегмент.
4. Классифицировать карточки - обозначить заголовки разделов, которые не должны быть нажимаемыми как **group_header** - в них потом все равно вставим текст, что бы читатель мог его перевести на родной язык гуглтранслейтом. Обозначить сами карточки как **Card**. 
5. **Объединить группы** - группа это логическая область-контейнер, обычно все карточки в одном разделе. Их нужно объединить в группу внутри json, потому что у группы могут быть свои отдельные правила. Среди представленных координат группы не будет, ее размеры нужно будет вычислить, что бы внутрь попали все карточки этой группы.

## Правила групповой компоновки:
Для каждого отдельного раздела с вариантами, найденными на изображении:
1. Определите группу элементов, принадлежащих ему.
2. Создайте запись \`group\`.
3. Задайте координаты \`group\`, чтобы охватить эти элементы с отступами в 10 px с каждой стороны:
- x: (самый левый элемент x) - 10
- y: (самый верхний элемент y) - 10
- w: (общая ширина слева направо) + 20
- h: (общая высота сверху вниз) + 20

## Формат вывода
Возвращать ТОЛЬКО допустимый массив JSON с объектами layout ("layout": [...]).

Для разделённых блоков: используйте идентификаторы типа 5, 5.1, 5.2 (десятичная система счисления).

НЕ добавляйте текст перед или после массива JSON.

## Образец формата (layout)
[
  {
    "type": "item",
    "id": "Card_1",
    "title": "Title card",
    "coords": { "x": 727, "y": 49, "w": 200, "h": 100 },
    "cost": []
  },
  {
    "type": "group",
    "id": "group_1",
    "title": "Demo Group",
    "coords": { "x": 372, "y": 201, "w": 920, "h": 120 },
    "items": [
      {
        "type": "item",
        "id": "Card_2",
        "title": "Card 2",
        "coords": { "x": 382, "y": 211, "w": 200, "h": 100 },
        "cost": []
      }
    ]
  }
]

Current detected boxes:
\`\`\`json
{{LAYOUT_JSON}}
\`\`\``,

    fill: `**INPUTS:**
1.  **Image:** An image file of the CYOA page. Так же здесь отмечены зелеными рамочками с нумерацией распознанные карточки. Нумерация (белые цифры с черной окантовкой над верхним левым углом  зеленой рамочки) совпадает с нумерацией в json. Желтыми рамочками обозначенны Группы. 
2.  **Layout JSON:** A list of detected bounding boxes with coordinates (\`x\`, \`y\`, \`w\`, \`h\`) карточек и групп. 
 
 Твоя задача - распознать текст на картинке и заполнить Json файл. Текст карточек, их Id, названия. А самое важное - правила. Ниже будет приложен полный список доступных инструментов с описаниями и примерами использования. Используй их. Именно в том формате что там показан. Так же будет приложен демонстрационный образец готовой игры где корректно используются эти правила для описания карточек и групп. 


 
Example Output Item:

\`\`\`json
{{EXAMPLE_JSON}}
\`\`\`

### **PROCESS INSTRUCTIONS**

1.  **Analyze the Image:** Read the Intro text to find Starting Points. Read headers to define Groups.
2.  **Extract Logic:** Read every card text carefully. Look for keywords: "Free if", "Requires", "Incompatible", "Discount", "Gain".
3.  **Извлеки и укажи цены**
4.  **Учитывай правила на предыдущих страницах** - используй те же системы очков и правила что и не предыдущей странице. Это одна игра и она должна быть последовательна и связна. 
5.  **Generate JSON:** Output **ONLY** the valid JSON. Create proper IDs that don't conflict with existing ones.


### Правила!

{{TOOLS_MD}}



### Ниже идет Json с игрой. Включая предыдущие, заполненные страницы. Твоя текущая задача - заполнить layout текущей страницы номер {{PAGE_NUM}} и прислать только его. 


\`\`\`json
{{FULL_CONFIG}}
\`\`\`


### ответ должен быть вот такого формата

\`\`\`json
[
  {
    "type": "group",
    "id": "section_basic",
    "title": "📘 SECTION 1: Basic Selection",
    "description": "Simple items with costs. Click to select, click again to deselect.",
    "coords": {
      "x": 38,
      "y": 22,
      "w": 1241,
      "h": 183
    },
    "items": [
      {
        "type": "item",
        "id": "basic_sword",
        "title": "Iron Sword",
        "description": "A basic weapon.\\nCosts 10 points.",
        "coords": {
          "x": 52,
          "y": 80,
          "w": 288,
          "h": 108
        },
        "cost": [
          {
            "currency": "points",
            "value": -10
          }
        ],
        "tags": [
          "combat"
        ]
      }
    ]
  }
]
\`\`\`

**LAYOUT JSON (Coordinates):**
\`\`\`json
{{LAYOUT_JSON}}
\`\`\`
`,

    audit: `Audit this CYOA game configuration for errors and inconsistencies.

\`\`\`json
{{CONFIG_JSON}}
\`\`\`

Check all references, fix any broken links, ensure symmetry in incompatibilities.
Return the fixed config with a list of all changes made.`
};


// ==================== HELPER FUNCTIONS ====================

/**
 * Build messages array for LLM API call
 */
export function buildMessages(mode, data) {
    const systemPrompt = SYSTEM_PROMPTS[mode];
    let userPrompt = USER_PROMPTS[mode];
    
    // Replace common placeholders
    if (data.layout) {
        userPrompt = userPrompt.replace('{{LAYOUT_JSON}}', JSON.stringify(data.layout, null, 2));
    }
    else if (data.boxes) {
        userPrompt = userPrompt.replace('{{LAYOUT_JSON}}', JSON.stringify(data.boxes, null, 2));
    }

    // Replace FILL specific placeholders
    if (mode === 'fill') {
        if (data.exampleJson) {
            userPrompt = userPrompt.replace('{{EXAMPLE_JSON}}', data.exampleJson);
        } else {
             userPrompt = userPrompt.replace('{{EXAMPLE_JSON}}', '{}');
        }

        if (data.toolsMd) {
            userPrompt = userPrompt.replace('{{TOOLS_MD}}', data.toolsMd);
        } else {
            userPrompt = userPrompt.replace('{{TOOLS_MD}}', 'No tools reference available.');
        }

        if (data.fullConfig) {
            userPrompt = userPrompt.replace('{{FULL_CONFIG}}', JSON.stringify(data.fullConfig, null, 2));
        }

        if (data.pageNum) {
            userPrompt = userPrompt.replace('{{PAGE_NUM}}', data.pageNum);
        }
    }
    
    // Replace AUDIT specific
    if (data.config) {
        userPrompt = userPrompt.replace('{{CONFIG_JSON}}', JSON.stringify(data.config, null, 2));
    }
    
    const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
    ];
    
    return messages;
}

/**
 * Add image to messages (provider-specific formatting)
 */
export function addImageToMessages(messages, imageDataUrl, provider) {
    if (!imageDataUrl) return messages;
    
    const lastUserMsg = messages[messages.length - 1];
    
    if (provider === 'google') {
        const base64Data = imageDataUrl.split(',')[1];
        const mimeType = imageDataUrl.split(';')[0].split(':')[1];
        
        lastUserMsg.parts = [
            { text: lastUserMsg.content },
            {
                inline_data: {
                    mime_type: mimeType,
                    data: base64Data
                }
            }
        ];
    } else if (provider === 'anthropic') {
        const base64Data = imageDataUrl.split(',')[1];
        const mimeType = imageDataUrl.split(';')[0].split(':')[1];
        
        lastUserMsg.content = [
            {
                type: 'image',
                source: {
                    type: 'base64',
                    media_type: mimeType,
                    data: base64Data
                }
            },
            {
                type: 'text',
                text: lastUserMsg.content
            }
        ];
    } else {
        lastUserMsg.content = [
            {
                type: 'image_url',
                image_url: { url: imageDataUrl }
            },
            {
                type: 'text',
                text: lastUserMsg.content
            }
        ];
    }
    
    return messages;
}

/**
 * Extract JSON from LLM response (handles markdown code blocks)
 */
export function extractJsonFromResponse(text) {
    let jsonStr = text.trim();
    
    const jsonBlockMatch = jsonStr.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonBlockMatch) {
        jsonStr = jsonBlockMatch[1];
    } else {
        const codeBlockMatch = jsonStr.match(/```\s*([\s\S]*?)\s*```/);
        if (codeBlockMatch) {
            jsonStr = codeBlockMatch[1];
        }
    }
    
    const firstBrace = jsonStr.indexOf('{');
    const firstBracket = jsonStr.indexOf('[');
    
    let startIdx = -1;
    let isArray = false;
    
    if (firstBrace === -1 && firstBracket === -1) {
        throw new Error('No JSON found in response');
    } else if (firstBrace === -1) {
        startIdx = firstBracket;
        isArray = true;
    } else if (firstBracket === -1) {
        startIdx = firstBrace;
    } else {
        startIdx = Math.min(firstBrace, firstBracket);
        isArray = firstBracket < firstBrace;
    }
    
    const openChar = isArray ? '[' : '{';
    const closeChar = isArray ? ']' : '}';
    let depth = 0;
    let endIdx = -1;
    
    for (let i = startIdx; i < jsonStr.length; i++) {
        if (jsonStr[i] === openChar) depth++;
        if (jsonStr[i] === closeChar) depth--;
        if (depth === 0) {
            endIdx = i + 1;
            break;
        }
    }
    
    if (endIdx === -1) {
        throw new Error('Incomplete JSON in response');
    }
    
    jsonStr = jsonStr.substring(startIdx, endIdx);
    
    return JSON.parse(jsonStr);
}