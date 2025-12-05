/**
 * src/ui/editor/ui/llm-panel.js
 * LLM Panel HTML (Part of Settings Tab) - with password visibility toggle
 */

import { LLM_PROVIDERS } from '../integrations/llm/config/providers.js';

export function createLlmPanelHTML() {
    const providerOptions = Object.entries(LLM_PROVIDERS)
        .map(([key, config]) => `<option value="${key}">${config.name}</option>`)
        .join('');

    return `
        <div class="editor-section">
            <div class="accordion-header collapsed" onclick="CYOA.editor.toggleAccordion(this)">🧠 AI Assistant</div>
            <div class="accordion-content collapsed">
                
                <div style="background:#1a1a1a; padding:8px; border-radius:4px; margin-bottom:10px;">
                    <label style="font-size:0.7rem; color:#888; display:block; margin-bottom:4px;">Provider</label>
                    <select id="llm-provider" style="width:100%; padding:8px; background:#111; color:#fff; border:1px solid #333; border-radius:3px; font-size:0.85rem;">
                        ${providerOptions}
                    </select>
                    <div id="llm-provider-hint" style="font-size:0.7rem; color:#4CAF50; margin-top:6px; padding:4px 6px; background:#1a2f1a; border-radius:3px; display:none;"></div>
                </div>
                
                <div id="llm-api-fields" style="background:#1a1a1a; padding:8px; border-radius:4px; margin-bottom:10px;">
                    <div class="input-group-with-toggle" style="margin-bottom:8px;">
                        <div class="input-group" style="margin-bottom:0;">
                            <input type="password" id="llm-key" placeholder="sk-..." autocomplete="off">
                            <span class="input-label">API Key</span>
                        </div>
                        <button type="button" class="toggle-visibility-btn" onclick="CYOA.editor.toggleApiKeyVisibility()" title="Show/Hide API Key">
                            <span class="eye-icon">👁</span>
                        </button>
                    </div>
                    <div id="llm-key-status" style="font-size:0.65rem; color:#666; margin-bottom:8px; padding-left:4px;"></div>
                    
                    <div style="margin-bottom:8px;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                            <label style="font-size:0.7rem; color:#888;">Model</label>
                            <button id="llm-refresh-models" style="font-size:0.65rem; background:#333; border:none; color:#888; padding:2px 8px; border-radius:2px; cursor:pointer;">🔄 Refresh</button>
                        </div>
                        <select id="llm-model-select" style="width:100%; padding:6px; background:#222; color:#fff; border:1px solid #333; border-radius:3px; font-size:0.8rem;">
                            <option value="">Loading models...</option>
                        </select>
                        <div id="llm-model-status" style="font-size:0.65rem; color:#888; margin-top:4px;"></div>
                        <input type="text" id="llm-model-custom" placeholder="Or enter custom model name" style="margin-top:6px; width:100%; padding:6px; background:#222; color:#fff; border:1px solid #333; border-radius:3px; font-size:0.75rem;">
                    </div>
                    <div id="llm-custom-url-group" style="display:none;">
                        <div class="input-group">
                            <input type="text" id="llm-base-url" placeholder="https://api...">
                            <span class="input-label">Base URL</span>
                        </div>
                    </div>
                </div>

                <div style="margin-bottom:12px; border-top:1px solid #333; padding-top:10px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                        <label style="font-size:0.75rem; color:#aaa;">User Prompt Template:</label>
                        <select id="llm-prompt-selector" style="font-size:0.75rem; background:#333; color:#fff; border:none; border-radius:3px; padding:3px 6px;">
                            <option value="refine">Refine Layout</option>
                            <option value="fill">OCR & Fill</option>
                            <option value="audit">Audit Config</option>
                        </select>
                    </div>
                    <textarea id="llm-user-prompt" class="code-editor" style="height:100px; font-family:monospace; font-size:0.75rem; color:#ddd; background:#0a0a0a;"></textarea>
                    <div style="display:flex; justify-content:space-between; margin-top:4px;">
                        <span style="font-size:0.65rem; color:#555;">{{LAYOUT_JSON}}, {{CONFIG_JSON}}</span>
                        <button id="llm-reset-prompts" style="font-size:0.65rem; background:#333; border:none; color:#888; padding:2px 6px; border-radius:2px; cursor:pointer;">Reset</button>
                    </div>
                </div>

                <div style="display:flex; flex-direction:column; gap:6px; margin-bottom:10px;">
                    <button onclick="CYOA.editor.runLlmAction('refine')" class="action-btn" style="background:linear-gradient(135deg, #1e3a5f, #2d5a87); text-align:left; font-size:0.8rem; padding:10px 12px; border:1px solid #3d7ab8;">
                        <span style="float:right; font-size:1.1rem;">📐</span><strong>Refine Layout</strong>
                    </button>
                    <button onclick="CYOA.editor.runLlmAction('fill')" class="action-btn" style="background:linear-gradient(135deg, #5c2d6e, #8e24aa); text-align:left; font-size:0.8rem; padding:10px 12px; border:1px solid #b04cc8;">
                        <span style="float:right; font-size:1.1rem;">👁️</span><strong>OCR & Fill</strong>
                    </button>
                    <button onclick="CYOA.editor.startAuditChat()" class="action-btn" style="background:linear-gradient(135deg, #1b5e20, #2e7d32); text-align:left; font-size:0.8rem; padding:10px 12px; border:1px solid #4caf50;">
                        <span style="float:right; font-size:1.1rem;">🕵️</span><strong>Interactive Audit</strong>
                    </button>
                </div>

                <div id="llm-manual-ui" style="display:none; margin-top:12px; border:1px dashed #444; border-radius:4px; padding:10px; background:#0d0d0d;">
                    <div style="font-size:0.75rem; color:#ffd700; margin-bottom:8px;">📋 <strong>Manual Mode</strong></div>
                    <button id="btn-copy-debug-img" class="full-width-btn" style="background: #e65100; margin-bottom:8px; font-size:0.8rem;" onclick="CYOA.editor.copyDebugImageToClipboard()">📸 Copy Layout Image</button>
                    <textarea id="llm-manual-out" class="code-editor" style="height:80px; font-size:0.7rem;" readonly></textarea>
                    <button class="full-width-btn" onclick="CYOA.editor.copyManualPrompt()" style="margin:6px 0; font-size:0.8rem;">📋 Copy Prompt</button>
                    <div style="border-top:1px solid #333; margin:10px 0; padding-top:10px;">
                        <label style="font-size:0.7rem; color:#888;">Paste LLM Response:</label>
                        <textarea id="llm-manual-in" class="code-editor" style="height:80px; font-size:0.7rem; margin-top:4px;" placeholder='{"layout": [...]}'></textarea>
                        <button class="full-width-btn primary-btn" onclick="CYOA.editor.applyManualResponse()" style="margin-top:6px;">✅ Apply Response</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Export toggle function to be added to editor
export function toggleApiKeyVisibility() {
    const input = document.getElementById('llm-key');
    const btn = document.querySelector('.toggle-visibility-btn .eye-icon');
    
    if (!input) return;
    
    if (input.type === 'password') {
        input.type = 'text';
        if (btn) btn.textContent = '🙈';
    } else {
        input.type = 'password';
        if (btn) btn.textContent = '👁';
    }
}