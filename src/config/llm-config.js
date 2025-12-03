/**
 * src/config/llm-config.js
 * LLM Configuration: Providers, Models, and Prompts for each mode
 */

// ==================== PROVIDER CONFIGURATIONS ====================

export const LLM_PROVIDERS = {
    google: {
        name: 'Google Gemini',
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models/',
        defaultModel: 'gemini-2.5-flash',
        models: [
            'gemini-2.5-flash',
            'gemini-2.5-pro',
            'gemini-2.0-flash',
            'gemini-1.5-flash',
            'gemini-1.5-pro'
        ],
        supportsVision: true,
        // Google uses URL parameter for API key
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
            'gpt-4',
            'o1',
            'o1-mini',
            'o1-preview',
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
        defaultModel: 'claude-sonnet-4-20250514',
        models: [
            'claude-sonnet-4-20250514',
            'claude-opus-4-20250514',
            'claude-3-7-sonnet-20250219',
            'claude-3-5-sonnet-20241022',
            'claude-3-5-haiku-20241022',
            'claude-3-opus-20240229'
        ],
        supportsVision: true,
        formatRequest: (model, messages, apiKey, baseUrl) => {
            // Anthropic uses separate system message
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
        defaultModel: 'anthropic/claude-sonnet-4',
        models: [
            'anthropic/claude-sonnet-4',
            'anthropic/claude-3.5-sonnet',
            'openai/gpt-4o',
            'openai/gpt-4o-mini',
            'google/gemini-2.5-flash-preview',
            'google/gemini-2.0-flash-001',
            'meta-llama/llama-3.3-70b-instruct',
            'deepseek/deepseek-chat-v3-0324'
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

const TOOL_REFERENCE_SUMMARY = `
## JSON Schema Quick Reference

### Item Structure:
{
  "type": "item",
  "id": "unique_snake_case_id",
  "title": "Display Title",
  "description": "Card description text",
  "coords": { "x": 100, "y": 200, "w": 300, "h": 180 },
  "tags": ["tag1", "tag2"],
  "cost": [{ "currency": "points", "value": -10 }],
  "requirements": ["other_item_id"],
  "incompatible": ["conflicting_item_id"],
  "max_quantity": 1,
  "effects": []
}

### Group Structure:
{
  "type": "group",
  "id": "group_id",
  "title": "Group Title",
  "description": "Group description",
  "coords": { "x": 50, "y": 100, "w": 800, "h": 400 },
  "rules": {
    "max_choices": 3,
    "budget": { "currency": "points", "amount": 20, "name": "Free Budget" }
  },
  "items": [...]
}

### Cost Rules:
- Negative value = spending: { "currency": "points", "value": -10 }
- Positive value = gaining (drawbacks): { "currency": "points", "value": 5 }

### Requirements:
- Simple: ["required_item_id"]
- Negation: ["!forbidden_item_id"]  
- Formula: ["count.tag('magic') >= 2"]
- Complex: ["has('sword') || has('axe')"]

### Effects Types:
- modify_group_limit: { "type": "modify_group_limit", "group_id": "spells", "value": 2 }
- modify_cost: { "type": "modify_cost", "tag": "magic", "mode": "multiply", "value": 0.5 }
- force_selection: { "type": "force_selection", "target_id": "item_id" }

### ID Naming:
- Use snake_case, ASCII only
- Must be unique across entire config
- Prefix with category: magic_, perk_, drawback_
`;


export const SYSTEM_PROMPTS = {
    refine: `You are an expert at analyzing CYOA (Choose Your Own Adventure) images and refining detected bounding boxes.

## Your Task
You receive an image with green numbered rectangles overlaid (detection boxes) and a JSON array of those boxes with coordinates.

Your job is to:
1. **Adjust boundaries** - Move/resize boxes to precisely match actual card edges visible in the image
2. **Merge boxes** - If multiple boxes cover parts of a single card, merge them into one
3. **Split boxes** - If one box contains multiple distinct cards, split into separate entries
4. **Classify boxes** - Label each as: "item" | "group_header" | "decorative" | "ignore"

## Classification Guide:
- **item**: A selectable choice/card with title, description, possibly cost
- **group_header**: A section title or category header (not selectable, just organizational)
- **decorative**: Background art, borders, or visual elements (not interactive)
- **ignore**: Artifacts, partial detections, or elements outside the CYOA content

## Output Format
Return ONLY a valid JSON array. Each object must have:
{
  "id": <number>,           // Keep original ID from input
  "coords": { "x": <num>, "y": <num>, "w": <num>, "h": <num> },
  "classification": "item" | "group_header" | "decorative" | "ignore"
}

For merged boxes: Keep the lower ID, mark others as "ignore"
For split boxes: Use IDs like 5, 5.1, 5.2 (decimal notation)

Do NOT include any text before or after the JSON array.`,

    fill: `You are an expert at parsing CYOA (Choose Your Own Adventure) images and extracting structured game data.

## Your Task
You receive:
1. An image of a CYOA page with cards/options
2. A JSON with detected box coordinates (already refined)
3. The existing game config (for context: currencies, previous items, etc.)

Your job is to:
1. **OCR** - Read all text within each detected box
2. **Extract data** - Parse titles, descriptions, costs, requirements from the text
3. **Create structure** - Build proper Item and Group objects
4. **Infer rules** - Detect costs like "10 points", requirements like "Requires X", limits like "Choose 2"
5. **Link references** - Connect requirements to existing item IDs from previous pages

${TOOL_REFERENCE_SUMMARY}

## Text Parsing Patterns:
- "Costs X points" or "-X" or "X pts" → cost: [{ "currency": "points", "value": -X }]
- "+X points" or "Grants X" → cost: [{ "currency": "points", "value": X }]
- "Requires [Item Name]" → find that item's ID, add to requirements
- "Incompatible with [Item]" → add to incompatible array
- "Choose X" or "Pick up to X" → group rules: { "max_choices": X }
- "First X free" → group rules: { "budget": { "amount": X, ... } }

## Output Format
Return a JSON object:
{
  "layout": [
    // Groups and standalone items
    {
      "type": "group",
      "id": "inferred_group_id",
      "title": "Section Title from image",
      "coords": { ... },
      "rules": { ... },
      "items": [ ... ]
    },
    {
      "type": "item",
      "id": "inferred_item_id",
      ...
    }
  ],
  "inferred_currencies": [
    // Any new currencies you detected that aren't in the existing config
    { "id": "mana", "name": "Mana", "start": 0 }
  ],
  "parsing_notes": "Any ambiguities or assumptions made"
}

Be conservative with IDs - use descriptive snake_case based on the title.
If unsure about a cost, default to 0 and note it in parsing_notes.`,

    audit: `You are a CYOA game logic auditor. Your job is to validate and fix configuration errors.

## Your Task
You receive the complete game configuration JSON. Check for:

1. **Broken References**
   - Requirements pointing to non-existent item IDs
   - Incompatible arrays referencing non-existent items
   - Effects targeting non-existent groups or items
   
2. **Asymmetric Incompatibilities**
   - If A lists B as incompatible, B should list A too
   
3. **Currency Errors**
   - Costs referencing currencies not defined in points array
   - Potentially inverted signs (spending should be negative)
   
4. **ID Issues**
   - Duplicate IDs across different pages
   - Invalid characters in IDs (spaces, special chars)
   
5. **Logic Issues**
   - Requirements that can never be satisfied
   - Circular dependencies
   - Groups with max_choices but no items
   
6. **Balance Suggestions** (warnings only)
   - Items with unusually high/low costs
   - Orphaned currencies (defined but never used)

${TOOL_REFERENCE_SUMMARY}

## Output Format
{
  "fixed_config": { ... },  // The corrected full config
  "changes": [
    {
      "type": "fix" | "warning",
      "location": "pages[0].layout[1].items[2]",
      "issue": "Description of what was wrong",
      "action": "What was changed (or suggested for warnings)"
    }
  ],
  "summary": "Brief human-readable summary of all fixes"
}

Preserve ALL image paths exactly as they are.
Only make changes that fix actual errors. Don't restructure or rename things unnecessarily.`
};


// ==================== USER PROMPT TEMPLATES ====================

export const USER_PROMPTS = {
    refine: `Analyze the image and adjust the bounding boxes.

The green numbered rectangles are detection results. 
Review each one and:
- Tighten bounds to match actual card edges
- Merge overlapping detections of the same card
- Mark decorative elements appropriately

Current detected boxes:
\`\`\`json
{{BOXES_JSON}}
\`\`\`

Return the refined JSON array with classifications.`,

    fill: `Extract all game content from this CYOA page image.

Detected regions (box IDs and coordinates):
\`\`\`json
{{BOXES_JSON}}
\`\`\`

Existing game configuration for reference (currencies, previous items):
\`\`\`json
{{CONTEXT_JSON}}
\`\`\`

Read the text in each region, identify items and groups, extract all game mechanics (costs, requirements, effects).
Create proper IDs that don't conflict with existing ones.
Return the structured layout JSON.`,

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
    
    // Replace placeholders
    if (data.boxes) {
        userPrompt = userPrompt.replace('{{BOXES_JSON}}', JSON.stringify(data.boxes, null, 2));
    }
    if (data.context) {
        userPrompt = userPrompt.replace('{{CONTEXT_JSON}}', JSON.stringify(data.context, null, 2));
    }
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
        // Google Gemini uses parts array
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
        // Anthropic uses content array with image blocks
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
        // OpenAI / OpenRouter format
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
    
    // Try to find JSON in code blocks first
    const jsonBlockMatch = jsonStr.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonBlockMatch) {
        jsonStr = jsonBlockMatch[1];
    } else {
        // Try generic code block
        const codeBlockMatch = jsonStr.match(/```\s*([\s\S]*?)\s*```/);
        if (codeBlockMatch) {
            jsonStr = codeBlockMatch[1];
        }
    }
    
    // Try to find JSON object/array boundaries
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
    
    // Find matching closing bracket
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