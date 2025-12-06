/**
 * src/editor/integrations/llm/audit-chat.js
 * Interactive Audit Chat Logic with Caching, Debug & Token Tracking
 */

import { AUDIT_CHAT_SYSTEM_PROMPT } from './config/prompts.js';

export const AuditChatMixin = {
    auditHistory: [],
    auditConfigHash: null,
    auditTokensUsed: { prompt: 0, completion: 0, total: 0 },
    auditLastRequest: null,

    // ==================== UI CREATION ====================
    
    createAuditChatUI() {
        if (document.getElementById('audit-chat-window')) return;

        const chatHTML = `
            <div id="audit-chat-window" class="audit-chat-window">
                <div class="audit-header" id="audit-drag-handle">
                    <span class="audit-title">🕵️ Logic Auditor</span>
                    <div class="audit-header-controls">
                        <span id="audit-token-counter" class="audit-token-counter" title="Tokens used">0 tk</span>
                        <button class="audit-ctrl-btn" onclick="CYOA.editor.toggleAuditDebug()" title="Debug Log">🐛</button>
                        <button class="audit-ctrl-btn" onclick="CYOA.editor.toggleAuditMinimize()" title="Minimize">─</button>
                        <button class="audit-ctrl-btn close" onclick="CYOA.editor.closeAuditChat()" title="Close">✕</button>
                    </div>
                </div>
                <div id="audit-debug-panel" class="audit-debug-panel" style="display:none;">
                    <div class="debug-header">
                        <span>📋 Last Request/Response</span>
                        <button onclick="CYOA.editor.copyAuditDebugLog()" class="debug-copy-btn">Copy</button>
                    </div>
                    <textarea id="audit-debug-log" readonly></textarea>
                </div>
                <div id="audit-body" class="audit-body">
                    <div id="audit-messages" class="audit-messages"></div>
                    <div class="audit-input-area">
                        <textarea id="audit-input" 
                            placeholder="Ask to check balance, fix broken links, update cards..."
                            rows="2"
                            onkeydown="if(event.key==='Enter' && !event.shiftKey){event.preventDefault(); CYOA.editor.sendAuditMessage();}"></textarea>
                        <button id="audit-send-btn" onclick="CYOA.editor.sendAuditMessage()" title="Send">
                            <span class="send-icon">➤</span>
                            <span class="loading-icon" style="display:none;">⏳</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', chatHTML);
        this.initAuditDraggable();
    },

    // ==================== DEBUG PANEL ====================
    
    toggleAuditDebug() {
        const panel = document.getElementById('audit-debug-panel');
        if (panel) {
            panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        }
    },

    updateAuditDebugLog(requestData, responseData) {
        this.auditLastRequest = {
            timestamp: new Date().toISOString(),
            request: requestData,
            response: responseData
        };
        
        const log = document.getElementById('audit-debug-log');
        if (log) {
            log.value = JSON.stringify(this.auditLastRequest, null, 2);
        }
    },

    copyAuditDebugLog() {
        const log = document.getElementById('audit-debug-log');
        if (!log?.value) {
            alert('No debug data yet');
            return;
        }
        
        navigator.clipboard.writeText(log.value).then(() => {
            const btn = document.querySelector('.debug-copy-btn');
            if (btn) {
                const orig = btn.textContent;
                btn.textContent = '✓ Copied!';
                setTimeout(() => btn.textContent = orig, 1500);
            }
        }).catch(() => {
            log.select();
            document.execCommand('copy');
        });
    },

    // ==================== TOKEN TRACKING ====================
    
    updateTokenCounter(usage) {
        if (!usage) return;
        
        this.auditTokensUsed.prompt += usage.prompt_tokens || 0;
        this.auditTokensUsed.completion += usage.completion_tokens || 0;
        this.auditTokensUsed.total += usage.total_tokens || 0;
        
        const counter = document.getElementById('audit-token-counter');
        if (counter) {
            const total = this.auditTokensUsed.total;
            let display = total >= 1000 ? `${(total / 1000).toFixed(1)}k` : total;
            counter.textContent = `${display} tk`;
            counter.title = `Prompt: ${this.auditTokensUsed.prompt} | Completion: ${this.auditTokensUsed.completion} | Total: ${this.auditTokensUsed.total}`;
        }
    },

    resetTokenCounter() {
        this.auditTokensUsed = { prompt: 0, completion: 0, total: 0 };
        const counter = document.getElementById('audit-token-counter');
        if (counter) {
            counter.textContent = '0 tk';
            counter.title = 'Tokens used';
        }
    },

    // ==================== DRAGGABLE FUNCTIONALITY ====================
    
    initAuditDraggable() {
        const win = document.getElementById('audit-chat-window');
        const handle = document.getElementById('audit-drag-handle');
        if (!win || !handle) return;

        let isDragging = false;
        let offsetX = 0, offsetY = 0;

        const onMouseDown = (e) => {
            if (e.target.closest('.audit-ctrl-btn') || e.target.closest('.audit-token-counter')) return;
            
            isDragging = true;
            const rect = win.getBoundingClientRect();
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;
            
            win.classList.add('dragging');
            document.body.style.userSelect = 'none';
            e.preventDefault();
        };

        const onMouseMove = (e) => {
            if (!isDragging) return;
            
            let newLeft = e.clientX - offsetX;
            let newTop = e.clientY - offsetY;
            
            const maxLeft = window.innerWidth - win.offsetWidth;
            const maxTop = window.innerHeight - 50;
            
            newLeft = Math.max(0, Math.min(newLeft, maxLeft));
            newTop = Math.max(0, Math.min(newTop, maxTop));
            
            win.style.left = newLeft + 'px';
            win.style.top = newTop + 'px';
            win.style.right = 'auto';
            win.style.bottom = 'auto';
        };

        const onMouseUp = () => {
            if (isDragging) {
                isDragging = false;
                win.classList.remove('dragging');
                document.body.style.userSelect = '';
            }
        };

        handle.addEventListener('mousedown', onMouseDown);
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);

        win._cleanupDrag = () => {
            handle.removeEventListener('mousedown', onMouseDown);
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
    },

    // ==================== WINDOW CONTROLS ====================
    
    toggleAuditMinimize() {
        const win = document.getElementById('audit-chat-window');
        if (win) {
            win.classList.toggle('minimized');
            if (!win.classList.contains('minimized')) {
                const msgs = document.getElementById('audit-messages');
                if (msgs) msgs.scrollTop = msgs.scrollHeight;
            }
        }
    },

    closeAuditChat() {
        const win = document.getElementById('audit-chat-window');
        if (win) {
            win.style.display = 'none';
            if (win._cleanupDrag) win._cleanupDrag();
        }
        this.auditHistory = [];
        this.auditConfigHash = null;
        this.auditLastRequest = null;
    },

    // ==================== START AUDIT SESSION ====================
    
    async startAuditChat() {
        this.createAuditChatUI();
        
        const win = document.getElementById('audit-chat-window');
        win.style.display = 'flex';
        win.classList.remove('minimized');
        
        // Reset position
        win.style.right = '360px';
        win.style.bottom = '20px';
        win.style.left = 'auto';
        win.style.top = 'auto';
        
        const msgContainer = document.getElementById('audit-messages');
        msgContainer.innerHTML = '';
        
        // Reset state
        this.auditHistory = [];
        this.resetTokenCounter();
        document.getElementById('audit-debug-log').value = '';

        // ⚠️ IMPORTANT: Sync config from UI before API call
        this.syncLlmConfigFromUI();

        // Check for manual mode AFTER sync
        if (this.llmConfig.provider === 'manual') {
            const cleanConfig = this.getCleanConfig();
            this.showAuditManualMode(JSON.stringify(cleanConfig, null, 2));
            return;
        }

        // Validate API key
        if (!this.llmConfig.apiKey) {
            this.appendAuditMessage('error', '❌ No API key configured. Please enter your API key in Settings → AI Assistant.');
            return;
        }

        // Get clean config
        const cleanConfig = this.getCleanConfig();
        const configStr = JSON.stringify(cleanConfig, null, 2);
        this.auditConfigHash = this.simpleHash(configStr);

        // Build initial context
        this.auditHistory = [
            {
                role: 'system',
                content: AUDIT_CHAT_SYSTEM_PROMPT
            },
            {
                role: 'user',
                content: this.buildConfigContextMessage(configStr)
            }
        ];

        // Show loading
        this.appendAuditMessage('system', '📊 Analyzing game configuration...');
        this.setAuditLoading(true);

        try {
            const analysisPrompt = `Perform a quick scan and report:
1. Any broken references (requirements/incompatibilities pointing to non-existent IDs)
2. Missing reciprocal incompatibilities (A incompatible with B, but B not with A)
3. Undefined currencies used in costs
4. Any obvious logical issues

Be concise. If everything looks good, say so.`;

            this.auditHistory.push({ role: 'user', content: analysisPrompt });
            
            const { text: responseText, usage } = await this.callLlmApiWithUsage(this.auditHistory);
            
            this.updateTokenCounter(usage);
            msgContainer.innerHTML = '';
            
            let result = this.parseAuditResponse(responseText);
            this.auditHistory.push({ role: 'assistant', content: responseText });
            this.renderAuditResponse(result);

        } catch (e) {
            msgContainer.innerHTML = '';
            this.appendAuditMessage('error', `Failed to start audit: ${e.message}`);
            console.error('Audit start error:', e);
        } finally {
            this.setAuditLoading(false);
        }
    },

    // ==================== SYNC CONFIG FROM UI ====================
    
    syncLlmConfigFromUI() {
        const providerSel = document.getElementById('llm-provider');
        const keyInput = document.getElementById('llm-key');
        const baseUrlInput = document.getElementById('llm-base-url');
        const modelSel = document.getElementById('llm-model-select');
        const customModel = document.getElementById('llm-model-custom');

        if (providerSel) this.llmConfig.provider = providerSel.value;
        if (keyInput) this.llmConfig.apiKey = keyInput.value.trim();
        if (baseUrlInput) this.llmConfig.baseUrl = baseUrlInput.value.trim();
        
        if (modelSel?.value === '__custom__' && customModel?.value) {
            this.llmConfig.model = customModel.value.trim();
        } else if (modelSel?.value && modelSel.value !== '__custom__') {
            this.llmConfig.model = modelSel.value;
        }

        console.log('🔑 Synced LLM config:', {
            provider: this.llmConfig.provider,
            model: this.llmConfig.model,
            hasKey: !!this.llmConfig.apiKey,
            keyLength: this.llmConfig.apiKey?.length || 0
        });
    },

    // ==================== API CALL WITH USAGE TRACKING ====================
    
    async callLlmApiWithUsage(messages) {
        const { provider, baseUrl, apiKey, model } = this.llmConfig;
        
        // Import provider config
        const { LLM_PROVIDERS } = await import('./config/providers.js');
        const providerConfig = LLM_PROVIDERS[provider];
        
        if (!providerConfig || !providerConfig.formatRequest) {
            throw new Error(`Unknown or unsupported provider: ${provider}`);
        }

        const request = providerConfig.formatRequest(model, messages, apiKey, baseUrl);
        
        // Store request for debug
        const debugRequest = {
            url: request.url,
            model: model,
            messagesCount: messages.length,
            // Don't log full messages, just structure
            messagesSummary: messages.map(m => ({
                role: m.role,
                contentLength: typeof m.content === 'string' ? m.content.length : JSON.stringify(m.content).length
            }))
        };

        console.log(`📡 Calling ${provider} API:`, request.url, `Model: ${model}`);
        
        const response = await fetch(request.url, {
            method: 'POST',
            headers: request.headers,
            body: JSON.stringify(request.body)
        });

        const data = await response.json();

        // Update debug log
        this.updateAuditDebugLog(debugRequest, {
            status: response.status,
            usage: data.usage || null,
            // Truncate response for debug
            responsePreview: data.choices?.[0]?.message?.content?.substring(0, 500) || 
                            data.candidates?.[0]?.content?.parts?.[0]?.text?.substring(0, 500) ||
                            'No content'
        });

        if (!response.ok) {
            const errorMsg = data.error?.message || data.error?.type || JSON.stringify(data);
            throw new Error(`API Error (${response.status}): ${errorMsg}`);
        }

        return {
            text: providerConfig.parseResponse(data),
            usage: data.usage || null
        };
    },

    buildConfigContextMessage(configStr) {
        return `I'm loading a CYOA game configuration for audit. Here's the complete game data:

        \`\`\`json
        ${configStr}
        \`\`\`

        I'll ask you to find and fix issues. When suggesting fixes, use the action format specified in your instructions.`;
    },

    // ==================== MANUAL MODE ====================
    
    showAuditManualMode(configStr) {
        const msgContainer = document.getElementById('audit-messages');
        
        const systemPrompt = AUDIT_CHAT_SYSTEM_PROMPT;
        const fullPrompt = `=== SYSTEM INSTRUCTIONS ===
        ${systemPrompt}

        === GAME CONFIGURATION ===
        \`\`\`json
        ${configStr}
        \`\`\`

        === YOUR TASK ===
        Analyze this configuration. Find broken references, missing reciprocal incompatibilities, undefined currencies, and other logical issues.

        Respond with JSON in this format:
            {
            "message": "Summary of what you found",
            "actions": [
                {"type": "update_item", "id": "item_id", "changes": {"field": "value"}},
                {"type": "create_point", "data": {"id": "currency_id", "name": "Currency", "start": 0}}
            ]
        }`;

        msgContainer.innerHTML = `
            <div class="audit-msg system">📋 Manual Mode</div>
            <div class="audit-msg ai">
                <p><strong>Copy this prompt</strong> and paste into your LLM:</p>
                <div class="manual-prompt-box">
                    <textarea id="audit-manual-prompt" readonly>${this.escapeHtml(fullPrompt)}</textarea>
                    <button class="copy-prompt-btn" onclick="CYOA.editor.copyAuditPrompt()">
                        📋 Copy Prompt
                    </button>
                </div>
                <div class="manual-response-box">
                    <p><strong>Paste the response here:</strong></p>
                    <textarea id="audit-manual-response" placeholder='{"message": "...", "actions": [...]}'></textarea>
                    <button class="apply-response-btn" onclick="CYOA.editor.applyManualAuditResponse()">
                        ✅ Apply Response
                    </button>
                </div>
            </div>
        `;
    },

    copyAuditPrompt() {
        const el = document.getElementById('audit-manual-prompt');
        if (!el) return;
        
        el.select();
        el.setSelectionRange(0, 99999);
        
        navigator.clipboard.writeText(el.value).then(() => {
            const btn = el.parentElement.querySelector('.copy-prompt-btn');
            if (btn) {
                const orig = btn.innerHTML;
                btn.innerHTML = '✓ Copied!';
                btn.classList.add('copied');
                setTimeout(() => {
                    btn.innerHTML = orig;
                    btn.classList.remove('copied');
                }, 2000);
            }
        }).catch(() => {
            document.execCommand('copy');
        });
    },

    applyManualAuditResponse() {
        const textarea = document.getElementById('audit-manual-response');
        if (!textarea?.value.trim()) {
            alert('Please paste the LLM response first');
            return;
        }

        try {
            const result = this.parseAuditResponse(textarea.value);
            this.auditHistory.push({ role: 'assistant', content: textarea.value });
            this.renderAuditResponse(result);
            textarea.value = '';
        } catch (e) {
            alert('Failed to parse response: ' + e.message);
        }
    },

    // ==================== SEND MESSAGE ====================
    
    async sendAuditMessage() {
        const input = document.getElementById('audit-input');
        const text = input.value.trim();
        if (!text) return;

        input.value = '';
        this.appendAuditMessage('user', text);
        this.auditHistory.push({ role: 'user', content: text });

        // Manual mode
        if (this.llmConfig.provider === 'manual') {
            this.appendAuditMessage('system', 
                '📋 Add this message to your conversation and paste the new response above.');
            return;
        }

        // Re-sync config (in case user changed settings)
        this.syncLlmConfigFromUI();

        if (!this.llmConfig.apiKey) {
            this.appendAuditMessage('error', '❌ No API key. Please configure in Settings.');
            return;
        }

        this.setAuditLoading(true);
        const loadingMsgId = this.appendAuditMessage('ai thinking', '💭 Thinking...');

        try {
            const { text: responseText, usage } = await this.callLlmApiWithUsage(this.auditHistory);
            
            this.updateTokenCounter(usage);
            document.getElementById(loadingMsgId)?.remove();
            
            const result = this.parseAuditResponse(responseText);
            this.auditHistory.push({ role: 'assistant', content: responseText });
            this.renderAuditResponse(result);

        } catch (e) {
            document.getElementById(loadingMsgId)?.remove();
            this.appendAuditMessage('error', `Error: ${e.message}`);
        } finally {
            this.setAuditLoading(false);
        }
    },

    // ==================== RESPONSE PARSING ====================
    
    parseAuditResponse(text) {
        try {
            return this.extractJsonFromResponse(text);
        } catch (e) {
            return { 
                message: text.replace(/```json[\s\S]*?```/g, '').trim() || text,
                actions: [] 
            };
        }
    },

    // ==================== UI RENDERING ====================
    
    appendAuditMessage(type, text) {
        const container = document.getElementById('audit-messages');
        if (!container) return null;
        
        const id = `audit-msg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        const div = document.createElement('div');
        div.id = id;
        div.className = `audit-msg ${type}`;
        div.innerHTML = this.formatMessageText(text);
        
        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
        
        return id;
    },

    renderAuditResponse(result) {
        const container = document.getElementById('audit-messages');
        if (!container) return;

        if (result.message) {
            this.appendAuditMessage('ai', result.message);
        }

        if (result.actions && result.actions.length > 0) {
            this.renderActionsBlock(result.actions, container);
        }

        container.scrollTop = container.scrollHeight;
    },

    renderActionsBlock(actions, container) {
        const wrapper = document.createElement('div');
        wrapper.className = 'audit-msg ai';
        
        const actionsJson = encodeURIComponent(JSON.stringify(actions));
        
        wrapper.innerHTML = `
            <div class="audit-actions-block">
                <div class="actions-header">
                    🔧 <strong>Suggested Fixes</strong> (${actions.length})
                </div>
                <ul class="actions-list">
                    ${actions.map((a, i) => `
                        <li class="action-item" data-index="${i}">
                            <span class="action-icon">${this.getActionIcon(a.type)}</span>
                            <span class="action-desc">${this.escapeHtml(this.formatActionDescription(a))}</span>
                        </li>
                    `).join('')}
                </ul>
                <button class="apply-fixes-btn" data-actions="${actionsJson}">
                    ✅ Apply All Fixes
                </button>
            </div>
        `;

        wrapper.querySelector('.apply-fixes-btn').addEventListener('click', (e) => {
            this.applyAuditActions(e.target);
        });

        container.appendChild(wrapper);
    },

    getActionIcon(type) {
        const icons = {
            'update_item': '📝',
            'update_group': '📁',
            'create_point': '💰',
            'delete': '🗑️',
            'global_update': '🌐'
        };
        return icons[type] || '🔧';
    },

    formatActionDescription(action) {
        switch (action.type) {
            case 'update_item': {
                const changes = Object.keys(action.changes || {});
                return `Update "${action.id}": ${changes.join(', ')}`;
            }
            case 'update_group':
                return `Update group "${action.id}"`;
            case 'create_point':
                return `Create currency: ${action.data?.name || action.data?.id}`;
            case 'delete':
                return `Delete ${action.targetType}: "${action.id}"`;
            default:
                return `${action.type}: ${action.id || ''}`;
        }
    },

    formatMessageText(text) {
        if (typeof text !== 'string') return String(text);
        
        let formatted = this.escapeHtml(text);
        formatted = formatted.replace(/\n/g, '<br>');
        formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');
        
        return formatted;
    },

    setAuditLoading(isLoading) {
        const sendBtn = document.getElementById('audit-send-btn');
        const input = document.getElementById('audit-input');
        
        if (sendBtn) {
            sendBtn.disabled = isLoading;
            sendBtn.querySelector('.send-icon').style.display = isLoading ? 'none' : 'inline';
            sendBtn.querySelector('.loading-icon').style.display = isLoading ? 'inline' : 'none';
        }
        if (input) {
            input.disabled = isLoading;
        }
    },

    // ==================== APPLY ACTIONS ====================
    
    applyAuditActions(btn) {
        const actionsStr = btn.dataset.actions;
        if (!actionsStr) return;
        
        const actions = JSON.parse(decodeURIComponent(actionsStr));
        
        this.history.push('audit_batch_fix');
        
        let success = 0;
        let failed = 0;
        const errors = [];

        for (const action of actions) {
            try {
                const result = this.applySingleAction(action);
                if (result) success++;
                else failed++;
            } catch (e) {
                failed++;
                errors.push(`${action.type} ${action.id || ''}: ${e.message}`);
            }
        }

        this.engine.buildMaps();
        this.engine.state.resetCurrencies();
        this.engine.recalculate();
        this.renderer.renderAll();
        this.renderPagesList();
        
        if (this.selectedItem) {
            this.updateChoiceInputs();
        }

        btn.disabled = true;
        btn.classList.add('applied');
        
        if (failed === 0) {
            btn.innerHTML = `✓ Applied ${success} fixes`;
        } else {
            btn.innerHTML = `⚠️ ${success} applied, ${failed} failed`;
            btn.classList.add('has-errors');
            console.warn('Audit action errors:', errors);
        }
    },

    applySingleAction(action) {
        switch (action.type) {
            case 'update_item': {
                const item = this.engine.findItem(action.id);
                if (!item) throw new Error(`Item not found: ${action.id}`);
                Object.assign(item, action.changes);
                return true;
            }
            
            case 'update_group': {
                const group = this.engine.findGroup(action.id);
                if (!group) throw new Error(`Group not found: ${action.id}`);
                Object.assign(group, action.changes);
                return true;
            }
            
            case 'create_point': {
                if (!this.engine.config.points) this.engine.config.points = [];
                const exists = this.engine.config.points.some(p => p.id === action.data.id);
                if (exists) return false;
                this.engine.config.points.push(action.data);
                return true;
            }
            
            case 'delete': {
                if (action.targetType === 'item') {
                    const parent = this.findItemParent(action.id);
                    if (!parent) throw new Error(`Item not found: ${action.id}`);
                    parent.array.splice(parent.index, 1);
                } else if (action.targetType === 'group') {
                    const parent = this.findGroupParent(action.id);
                    if (!parent) throw new Error(`Group not found: ${action.id}`);
                    parent.array.splice(parent.index, 1);
                }
                return true;
            }
            
            default:
                console.warn('Unknown action type:', action.type);
                return false;
        }
    },

    // ==================== UTILITIES ====================
    
    escapeHtml(text) {
        if (typeof text !== 'string') return String(text);
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString(36);
    }
};