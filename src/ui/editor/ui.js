/**
 * src/ui/editor/ui.js
 * Editor UI Mixin - Manages the editor user interface and sidebar logic
 */
import { ProjectStorage } from '../../utils/storage.js';
// FIXED IMPORT PATH:
import { 
    LLM_PROVIDERS, 
    fetchAvailableModels, 
    saveLlmSettings, 
    loadLlmSettings,
    getStoredApiKey,
    USER_PROMPTS 
} from './config/llm-config.js'; 

export const EditorUIMixin = {
    // ==================== CREATE UI ====================
    createEditorUI() {
        if (document.getElementById('editor-sidebar')) return;
        
        // Split Guide
        if (!document.getElementById('editor-split-guide')) {
            const guide = document.createElement('div');
            guide.id = 'editor-split-guide';
            guide.style.cssText = `position: fixed; background: rgba(0, 255, 255, 0.8); border: 1px solid white; box-shadow: 0 0 5px cyan; pointer-events: none; z-index: 10000; display: none;`;
            document.body.appendChild(guide);
        }

        const sidebar = document.createElement('div');
        sidebar.id = 'editor-sidebar';
        sidebar.className = 'editor-sidebar';
        
        const providerOptions = Object.entries(LLM_PROVIDERS)
            .map(([key, config]) => `<option value="${key}">${config.name}</option>`)
            .join('');

        sidebar.innerHTML = `
            <!-- Hidden File Inputs -->
            <input type="file" id="load-config-input" accept=".json" style="display:none;">
            <input type="file" id="add-page-image-input" accept="image/*" style="display:none;">

            <div class="editor-tabs">
                <button class="tab-btn" data-tab="choice" onclick="CYOA.editor.switchTab('choice')">Choice</button>
                <button class="tab-btn" data-tab="group" onclick="CYOA.editor.switchTab('group')">Group</button>
                <button class="tab-btn" data-tab="settings" onclick="CYOA.editor.switchTab('settings')">Settings</button>
                <button class="close-tab-btn" onclick="CYOA.controls.toggleEditMode()">✕</button>
            </div>
            
            <div class="sidebar-scroll-content">
                <div id="tab-content-choice" class="tab-content" style="display:none;">
                    <div id="multi-props" style="display:none;">
                        <div class="info-text" style="text-align:center; padding:10px; margin-bottom:5px;">
                            <strong id="multi-count">0 items</strong> selected
                        </div>
                        <div class="editor-section">
                            <div class="accordion-header" onclick="CYOA.editor.toggleAccordion(this)">📐 Alignment</div>
                            <div class="accordion-content">
                                <div class="row-buttons">
                                    <button class="action-btn" style="background:#444;" onclick="CYOA.editor.alignSelectedItems('top')">⬆️ Top</button>
                                    <button class="action-btn" style="background:#444;" onclick="CYOA.editor.alignSelectedItems('bottom')">⬇️ Bottom</button>
                                </div>
                                <div class="row-buttons">
                                    <button class="action-btn" style="background:#444;" onclick="CYOA.editor.alignSelectedItems('left')">⬅️ Left</button>
                                    <button class="action-btn" style="background:#444;" onclick="CYOA.editor.alignSelectedItems('right')">➡️ Right</button>
                                </div>
                            </div>
                        </div>
                        <div class="editor-section">
                             <div class="accordion-header" onclick="CYOA.editor.toggleAccordion(this)">◻️ Sizing</div>
                            <div class="accordion-content">
                                <button class="full-width-btn" onclick="CYOA.editor.matchSizeSelectedItems('width')">Match Width</button>
                                <button class="full-width-btn" onclick="CYOA.editor.matchSizeSelectedItems('height')">Match Height</button>
                                <button class="full-width-btn" onclick="CYOA.editor.matchSizeSelectedItems('both')">Match Both</button>
                            </div>
                        </div>
                        <div class="editor-section" style="margin-top: 10px; border-top: 1px solid #222;">
                            <button class="action-btn btn-delete" onclick="CYOA.editor.deleteSelectedItems()">🗑️ Delete All Selected</button>
                        </div>
                    </div>

                    <div id="choice-empty-state" class="info-text">
                        <p>Select an item to edit.</p>
                        <p style="font-size:0.8rem; color:#666;">Shift+Click to multi-select.<br>WASD to move.</p>
                    </div>

                    <div id="choice-props" style="display:none;">
                        <div class="editor-section">
                            <div class="row-2">
                                <div class="input-group">
                                    <input type="text" id="edit-id">
                                    <span class="input-label">ID</span>
                                </div>
                                <div class="input-group">
                                    <input type="text" id="edit-parent-group" readonly style="color:#888; cursor:default;">
                                    <span class="input-label">GRP</span>
                                </div>
                            </div>
                            <div class="input-group">
                                <input type="number" id="edit-max_quantity" min="1" placeholder="1">
                                <span class="input-label">Max Qty</span>
                            </div>
                            <div class="input-group">
                                <input type="text" id="edit-title">
                                <span class="input-label">Title</span>
                            </div>
                            <div class="input-group">
                                <input type="text" id="edit-tags" placeholder="magic, fire">
                                <span class="input-label">Tags</span>
                            </div>
                            <div class="input-group">
                                <textarea id="edit-description" rows="5"></textarea>
                                <span class="input-label">Desc</span>
                            </div>
                        </div>
                        <div class="editor-section">
                            <div class="accordion-header" onclick="CYOA.editor.toggleAccordion(this)">Position & Size</div>
                            <div class="accordion-content">
                                <div class="row-4">
                                    <div class="input-group" title="X"><input type="number" id="edit-x"></div>
                                    <div class="input-group" title="Y"><input type="number" id="edit-y"></div>
                                    <div class="input-group" title="Width"><input type="number" id="edit-w"></div>
                                    <div class="input-group" title="Height"><input type="number" id="edit-h"></div>
                                </div>
                            </div>
                        </div>
                        <div id="rule-builder-container"></div>
                        <div class="editor-section">
                            <div class="accordion-header collapsed" onclick="CYOA.editor.toggleAccordion(this)">🔧 Raw JSON</div>
                            <div class="accordion-content collapsed">
                                <textarea id="edit-raw-json" class="code-editor"></textarea>
                            </div>
                        </div>
                        <div class="editor-section" style="margin-top: 10px; border-top: 1px solid #222;">
                            <button class="action-btn btn-delete" onclick="CYOA.editor.deleteSelectedItem()">🗑️ Delete</button>
                        </div>
                    </div>
                    <div class="editor-section editor-actions-fixed">
                        <button class="action-btn btn-add full-width-btn" onclick="CYOA.editor.addNewItem()">➕ Add New Item</button>
                    </div>
                </div>

                <div id="tab-content-group" class="tab-content" style="display:none;">
                    <div id="group-empty-state" class="info-text">
                        <p>Select a group (Info Box) to edit.</p>
                    </div>
                    <div id="group-props" style="display:none;">
                         <div class="editor-section">
                            <div class="input-group"><input type="text" id="group-id"><span class="input-label">Group ID</span></div>
                            <div class="input-group"><input type="text" id="group-title"><span class="input-label">Title</span></div>
                            <div class="input-group"><textarea id="group-description" rows="7"></textarea><span class="input-label">Description</span></div>
                        </div>
                        <div class="editor-section">
                            <div class="accordion-header" onclick="CYOA.editor.toggleAccordion(this)">Position & Size</div>
                            <div class="accordion-content">
                                <div class="row-4">
                                    <div class="input-group" title="X"><input type="number" id="group-x"></div>
                                    <div class="input-group" title="Y"><input type="number" id="group-y"></div>
                                    <div class="input-group" title="Width"><input type="number" id="group-w"></div>
                                    <div class="input-group" title="Height"><input type="number" id="group-h"></div>
                                </div>
                            </div>
                        </div>
                         <div class="editor-section">
                             <div class="accordion-header" onclick="CYOA.editor.toggleAccordion(this)">📜 Group Rules (JSON)</div>
                             <div class="accordion-content">
                                 <textarea id="group-rules-json" class="code-editor" style="height:150px;"></textarea>
                             </div>
                         </div>
                        <div class="editor-section" style="margin-top: 10px; border-top: 1px solid #222;">
                            <button class="action-btn btn-delete" onclick="CYOA.editor.deleteSelectedGroup()">🗑️ Delete Group</button>
                        </div>
                    </div>
                    <div class="editor-section editor-actions-fixed">
                        <button class="action-btn btn-add full-width-btn" onclick="CYOA.editor.addNewGroup()">➕ Add New Group</button>
                    </div>
                </div>

                <div id="tab-content-settings" class="tab-content" style="display:none;">
                    <div class="editor-section">
                        <div class="accordion-header" onclick="CYOA.editor.toggleAccordion(this)">📄 Pages</div>
                        <div class="accordion-content">
                            <div id="pages-list" style="margin-bottom:10px; max-height:200px; overflow-y:auto;"></div>
                            <button class="full-width-btn" style="background:#2e7d32;" onclick="document.getElementById('add-page-image-input').click()">➕ Add New Page</button>
                        </div>
                    </div>
                    <div class="editor-section">
                        <div class="accordion-header" onclick="CYOA.editor.toggleAccordion(this)">💾 File Operations</div>
                        <div class="accordion-content">
                            <button class="full-width-btn" style="background:#4b6cb7; margin-bottom:10px;" onclick="document.getElementById('load-config-input').click()">📂 Load Project</button>
                            <div class="row-buttons">
                                <button class="action-btn primary-btn" onclick="CYOA.editor.exportConfig()">💾 Save JSON</button>
                                <button class="action-btn" style="background:#444;" onclick="CYOA.editor.exportZip()">📦 Save Zip</button>
                            </div>
                        </div>
                    </div>

                    <!-- AI Assistant Block -->
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
                                <div class="input-group" style="margin-bottom:8px;">
                                    <input type="password" id="llm-key" placeholder="sk-...">
                                    <span class="input-label">API Key</span>
                                </div>
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
                                <button onclick="CYOA.editor.runLlmAction('audit')" class="action-btn" style="background:linear-gradient(135deg, #1b5e20, #2e7d32); text-align:left; font-size:0.8rem; padding:10px 12px; border:1px solid #4caf50;">
                                    <span style="float:right; font-size:1.1rem;">🛡️</span><strong>Audit Config</strong>
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

                    <!-- SAM Auto-Detect Block -->
                    <div class="editor-section">
                        <div class="accordion-header collapsed" onclick="CYOA.editor.toggleAccordion(this)">🤖 Auto-Detect (SAM)</div>
                        <div class="accordion-content collapsed">
                            <div class="input-group"><input type="password" id="roboflow-api-key" placeholder="Key..."><span class="input-label">API Key</span></div>
                            <div style="display:flex; gap:5px; margin-top:10px;">
                                <div class="input-group"><input type="text" id="roboflow-workspace" value="1-wnpqj"><span class="input-label">Workspace</span></div>
                                <div class="input-group"><input type="text" id="roboflow-workflow" value="sam3-with-prompts"><span class="input-label">Workflow</span></div>
                            </div>
                            <div class="input-group" style="margin-top:10px;"><input type="text" id="sam-prompt" value="game card"><span class="input-label">Prompt</span></div>
                            <div style="margin-top:10px;">
                                <div style="display:flex; justify-content:space-between; font-size:0.8rem; color:#888;"><span>Shave</span><span id="shave-val">2.0%</span></div>
                                <input type="range" id="sam-shave" min="0.005" max="0.05" step="0.005" value="0.02" style="width:100%;" oninput="document.getElementById('shave-val').textContent = (this.value*100).toFixed(1)+'%'">
                            </div>
                            <button id="btn-run-sam" class="full-width-btn primary-btn" style="margin-top:15px;">🚀 Run Inference</button>
                            <div id="sam-status" style="margin-top:10px; font-size:0.75rem; color:#ffd700; min-height:1.2em;"></div>
                             <div class="editor-section" style="margin-top:15px; border:1px solid #333; padding:0;">
                                <div class="accordion-header collapsed" onclick="CYOA.editor.toggleAccordion(this)" style="padding:5px 10px; font-size:0.8rem;">🐞 Debug Gallery</div>
                                <div class="accordion-content collapsed" id="sam-debug-gallery" style="background:#000; padding:10px;"></div>
                            </div>
                        </div>
                    </div>

                    <div class="editor-section">
                        <div class="accordion-header collapsed" onclick="CYOA.editor.toggleAccordion(this)">💰 Point Systems</div>
                        <div class="accordion-content collapsed">
                            <div id="points-list-container" style="margin-bottom:10px;"></div>
                            <button class="full-width-btn" style="background:#2e7d32;" onclick="CYOA.editor.addNewPointSystem()">➕ Add Currency</button>
                        </div>
                    </div>

                </div>
            </div>
            
            <div id="llm-preview-modal" class="modal-overlay" style="display:none;">
                <div class="modal-content" style="max-width:700px;">
                    <h3 style="margin:0 0 5px 0;">🔍 Review AI Changes</h3>
                    <div id="llm-result-summary" style="font-size:0.8rem; color:#4CAF50; margin-bottom:10px; padding:6px 10px; background:#1a2f1a; border-radius:4px; display:none;"></div>
                    <textarea id="llm-result-json" class="code-editor" style="height:400px; font-size:11px;"></textarea>
                    <div class="row-buttons" style="margin-top:12px;">
                        <button class="action-btn" onclick="document.getElementById('llm-preview-modal').style.display='none'" style="background:#444;">Cancel</button>
                        <button class="action-btn primary-btn" onclick="CYOA.editor.applyLlmChanges()">✅ Apply Changes</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(sidebar);
        this.ruleBuilder.renderUI(document.getElementById('rule-builder-container'));
        
        // Setup listeners
        this.setupChoiceListeners();
        this.setupGroupListeners();
        this.setupJsonListeners();
        this.setupLabelAutoHiding();
        this.setupSamListeners();
        this.setupLlmListeners(); 
        this.setupLoadListener();
        this.setupAddPageListener();
        
        // Context menu is now setup via mixin in core.js -> menus.js
        if (this.setupContextMenu) {
             this.setupContextMenu(); 
        }
        
        this.renderPagesList();
    },

    // ==================== LISTENER SETUPS ====================
    setupChoiceListeners() {
        const update = (key, val, isNum) => {
            if (!this.selectedItem) return;
            if (isNum) val = parseInt(val) || 0;
            if (['x','y','w','h'].includes(key)) { 
                if (!this.selectedItem.coords) this.selectedItem.coords = {}; 
                this.selectedItem.coords[key] = val; 
            } else if (key === 'tags') { 
                this.selectedItem.tags = val.split(',').map(t => t.trim()).filter(t => t); 
            } else { 
                this.selectedItem[key] = val; 
            }
            if (key === 'max_quantity') {
                if (val <= 1) delete this.selectedItem.max_quantity;
                this.renderer.renderLayout();
                setTimeout(() => { 
                    this.refreshSelectionVisuals();
                }, 0);
            } else { 
                this.renderer.renderLayout(); 
                this.refreshSelectionVisuals();
            }
            this.updateCodePreview();
        };
        const inputs = ['edit-id', 'edit-title', 'edit-description', 'edit-tags', 'edit-x', 'edit-y', 'edit-w', 'edit-h', 'edit-max_quantity'];
        inputs.forEach(id => {
            const el = document.getElementById(id); 
            if (!el) return;
            const key = id.split('-').pop(); 
            const realKey = (id === 'edit-description') ? 'description' : key; 
            const isNum = ['x','y','w','h', 'max_quantity'].includes(key); 
            el.addEventListener('input', (e) => update(realKey, e.target.value, isNum));
        });
    },

    setupGroupListeners() {
        const update = (key, val, isNum) => {
            if (!this.selectedGroup) return;
            if (isNum) val = parseInt(val) || 0;
            if (['x','y','w','h'].includes(key)) { 
                if (!this.selectedGroup.coords) this.selectedGroup.coords = {}; 
                this.selectedGroup.coords[key] = val; 
            } else { 
                this.selectedGroup[key] = val; 
            }
            this.renderer.renderLayout();
            const el = document.getElementById(`group-${this.selectedGroup.id}`);
            if(el) {
                el.classList.add('editor-selected');
                el.setAttribute('data-editor-title', this.selectedGroup.title || this.selectedGroup.id);
            }
            this.updateCodePreview();
        };
        const inputs = ['group-id', 'group-title', 'group-description', 'group-x', 'group-y', 'group-w', 'group-h'];
        inputs.forEach(id => {
            const el = document.getElementById(id); 
            if (!el) return;
            const key = id.split('-').pop(); 
            const realKey = (id === 'group-description') ? 'description' : key; 
            const isNum = ['x','y','w','h'].includes(key);
            el.addEventListener('input', (e) => update(realKey, e.target.value, isNum));
        });
    },

    setupJsonListeners() {
        const choiceJson = document.getElementById('edit-raw-json');
        if (choiceJson) {
            choiceJson.addEventListener('change', (e) => {
                try { 
                    const data = JSON.parse(e.target.value); 
                    if (this.selectedItem) { 
                        Object.assign(this.selectedItem, data); 
                        this.engine.buildMaps();
                        this.renderer.renderLayout(); 
                        this.updateChoiceInputs(); 
                        this.ruleBuilder.loadItem(this.selectedItem, this.selectedGroup); 
                        this.refreshSelectionVisuals();
                    } 
                } catch(err) { console.error("JSON Error", err); }
            });
        }
        const rulesJson = document.getElementById('group-rules-json');
        if (rulesJson) {
            rulesJson.addEventListener('change', (e) => {
                try { 
                    const data = JSON.parse(e.target.value); 
                    if (this.selectedGroup) { 
                        this.selectedGroup.rules = data; 
                        this.renderer.renderLayout(); 
                        this.engine.recalculate(); 
                        const el = document.getElementById(`group-${this.selectedGroup.id}`);
                        if(el) this.selectGroup(this.selectedGroup);
                    } 
                } catch(err) { console.error("Rules JSON Error", err); }
            });
        }
    },

    setupAddPageListener() {
        const input = document.getElementById('add-page-image-input');
        if (!input) return;

        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (evt) => {
                const dataUrl = evt.target.result;
                if (!this.engine.config.pages) this.engine.config.pages = [];
                
                const newPageIndex = this.engine.config.pages.length;
                const newPage = {
                    id: `page_${newPageIndex}`,
                    image: dataUrl,
                    layout: []
                };
                
                this.engine.config.pages.push(newPage);
                this.activePageIndex = newPageIndex;
                
                if (!this.engine.config.points || this.engine.config.points.length === 0) {
                    this.engine.config.points = [{ id: "points", name: "Points", start: 0 }];
                }
                
                this.engine.buildMaps();
                this.engine.state.resetCurrencies();
                this.renderer.renderAll().then(() => {
                    this.renderPagesList();
                });
            };
            reader.readAsDataURL(file);
            input.value = ''; 
        });
    },

    setupLoadListener() {
        const input = document.getElementById('load-config-input');
        if (!input) return;

        input.addEventListener('change', async (e) => {
            if (e.target.files.length === 0) return;
            const file = e.target.files[0];

            try {
                if (!this.engine.isTestConfig) {
                    if (!confirm("Are you sure? Loading a new project will discard current changes.")) {
                        input.value = '';
                        return;
                    }
                }
                const { config, warning } = await ProjectStorage.load(file);
                if (warning) alert(warning);
                this.engine.loadConfig(config);
                
                this.deselectChoice();
                this.selectedGroup = null;
                this.activePageIndex = 0;
                this.renderPagesList();
            } catch (err) {
                alert(`Error loading project: ${err.message}`);
            } finally {
                input.value = '';
            }
        });
    },

    getLlmConfig() {
        const provider = document.getElementById('llm-provider').value;
        const apiKey = document.getElementById('llm-key').value;
        const modelSelect = document.getElementById('llm-model-select');
        const modelCustom = document.getElementById('llm-model-custom');
        const baseUrl = document.getElementById('llm-base-url')?.value;
        const model = (modelSelect.value === '__custom__' ? modelCustom.value : modelSelect.value) || '';
        
        return { provider, apiKey, model, baseUrl, config: LLM_PROVIDERS[provider] };
    },

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

        const savedSettings = loadLlmSettings();
        if(providerSelect) providerSelect.value = savedSettings.provider;
        if(keyInput) keyInput.value = savedSettings.apiKey;
        if(baseUrlInput) baseUrlInput.value = savedSettings.baseUrl;

        this._modelCache = {};

        const updateProviderUI = async (provider) => {
            const config = LLM_PROVIDERS[provider];
            if (provider === 'manual') { manualUI.style.display = 'block'; apiFields.style.display = 'none'; } 
            else { manualUI.style.display = 'none'; apiFields.style.display = 'block'; }
            if (config?.hint) { hintEl.textContent = config.hint; hintEl.style.display = 'block'; } 
            else { hintEl.style.display = 'none'; }
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
            if (!config || provider === 'manual') { modelSelect.innerHTML = '<option value="">Manual Mode</option>'; return; }
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
            } catch (err) { this.populateModelSelect(config.fallbackModels || [], config.defaultModel); }
        };

        this.populateModelSelect = (models, defaultModel) => {
            modelSelect.innerHTML = '';
            if (!models || !models.length) { modelSelect.innerHTML = '<option>No models</option>'; return; }
            models.forEach(m => {
                const opt = document.createElement('option');
                opt.value = m;
                opt.textContent = m + (m === defaultModel ? ' ⭐' : '');
                modelSelect.appendChild(opt);
            });
            const cust = document.createElement('option'); cust.value='__custom__'; cust.textContent='Custom...'; modelSelect.appendChild(cust);
            if(models.includes(defaultModel)) modelSelect.value = defaultModel;
        };

        if(providerSelect) providerSelect.addEventListener('change', (e) => { saveLlmSettings({ provider: e.target.value }); updateProviderUI(e.target.value); });
        if(keyInput) keyInput.addEventListener('input', (e) => saveLlmSettings({ provider: providerSelect.value, apiKey: e.target.value }));
        if(refreshBtn) refreshBtn.addEventListener('click', () => this.refreshModelsList(providerSelect.value, keyInput.value));
        
        updateProviderUI(savedSettings.provider);
    },

    // UI state management
    switchTab(tabName) {
        this.activeTab = tabName;
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tabName));
        document.querySelectorAll('.tab-content').forEach(content => content.style.display = 'none');
        document.getElementById(`tab-content-${tabName}`).style.display = 'block';
        document.body.classList.remove('edit-mode-choice', 'edit-mode-group');
        
        if (tabName === 'choice') {
            document.body.classList.add('edit-mode-choice');
            this.updateChoiceInputs();
        } else if (tabName === 'group') {
            document.body.classList.add('edit-mode-group');
            if (this.selectedItem) {
                const group = this.engine.findGroupForItem(this.selectedItem.id);
                if (group) this.selectGroup(group);
            }
            if (this.selectedGroup) {
                document.getElementById('group-empty-state').style.display = 'none';
                document.getElementById('group-props').style.display = 'block';
            }
        } else if (tabName === 'settings') {
            this.renderPagesList();
            this.renderPointsList();
        }
    },

    toggleAccordion(header) {
        header.classList.toggle('collapsed');
        const content = header.nextElementSibling;
        content.classList.toggle('collapsed');
    },

    renderPagesList() {
        const container = document.getElementById('pages-list');
        if (!container) return;
        const pages = this.engine.config.pages || [];
        if (pages.length === 0) { container.innerHTML = `<div style="color:#888; padding:10px;">No pages yet.</div>`; return; }
        
        container.innerHTML = pages.map((page, idx) => {
            const counts = this.countPageElements(page);
            const isActive = idx === this.activePageIndex;
            return `
                <div class="page-list-item ${isActive ? 'active' : ''}" 
                     onclick="CYOA.editor.selectPage(${idx})"
                     style="display:flex; justify-content:space-between; padding:8px; margin-bottom:4px; background:${isActive ? '#2e7d32' : '#2a2a2a'}; border-radius:4px; cursor:pointer;">
                    <div>
                        <span style="font-weight:bold;">Page ${idx + 1}</span>
                        <div style="font-size:0.7rem; color:#aaa;">${counts.groups} groups, ${counts.items} items</div>
                    </div>
                    <button onclick="event.stopPropagation(); CYOA.editor.deletePage(${idx})" style="background:#d32f2f; border:none; color:white; border-radius:3px; padding:0 6px;">✕</button>
                </div>
            `;
        }).join('');
    },
    
    renderPointsList() {
        const container = document.getElementById('points-list-container');
        if (!container) return;
        const points = this.engine.config.points || [];
        container.innerHTML = points.map((p, idx) => `
            <div style="background:#222; padding:5px; margin-bottom:5px; border-radius:3px; display:flex; gap:5px;">
                <input style="width:80px; background:#333; border:none; color:#fff;" value="${p.id}" onchange="CYOA.editor.updatePointSystem(${idx}, 'id', this.value)">
                <input style="flex:1; background:#333; border:none; color:#fff;" value="${p.name}" onchange="CYOA.editor.updatePointSystem(${idx}, 'name', this.value)">
                <input style="width:50px; background:#333; border:none; color:#fff;" type="number" value="${p.start}" onchange="CYOA.editor.updatePointSystem(${idx}, 'start', this.value)">
                <button style="background:#b71c1c; border:none; color:white;" onclick="CYOA.editor.deletePointSystem(${idx})">🗑️</button>
            </div>
        `).join('');
    },

    selectPage(index) {
        this.activePageIndex = index;
        this.renderPagesList();
        this.deselectChoice();
        this.selectedGroup = null;
        if (this.activeTab === 'group') {
            document.getElementById('group-props').style.display = 'none';
            document.getElementById('group-empty-state').style.display = 'block';
        }
    },

    selectChoice(item, element) {
        this.selectedItem = item;
        this.selectedItems = [item];
        this.refreshSelectionVisuals();
        document.getElementById('choice-empty-state').style.display = 'none';
        document.getElementById('choice-props').style.display = 'block';
        document.getElementById('multi-props').style.display = 'none';
        this.updateChoiceInputs();
        this.ruleBuilder.loadItem(item, this.engine.findGroupForItem(item.id));
    },

    deselectChoice() {
        this.selectedItem = null;
        this.selectedItems = [];
        document.querySelectorAll('.item-zone.editor-selected').forEach(el => el.classList.remove('editor-selected'));
        document.getElementById('choice-props').style.display = 'none';
        document.getElementById('multi-props').style.display = 'none';
        document.getElementById('choice-empty-state').style.display = 'block';
    },

    selectGroup(group) {
        this.selectedGroup = group;
        document.querySelectorAll('.info-zone.editor-selected').forEach(el => el.classList.remove('editor-selected'));
        const el = document.getElementById(`group-${group.id}`);
        if(el) {
            el.classList.add('editor-selected');
            el.setAttribute('data-editor-title', group.title || group.id);
        }
        document.getElementById('group-empty-state').style.display = 'none';
        document.getElementById('group-props').style.display = 'block';
        this.updateGroupInputs();
    },

    updateChoiceInputs() {
        if (this.selectedItems.length > 1) {
            document.getElementById('choice-props').style.display = 'none';
            document.getElementById('choice-empty-state').style.display = 'none';
            document.getElementById('multi-props').style.display = 'block';
            document.getElementById('multi-count').textContent = `${this.selectedItems.length} items`;
            return;
        }
        document.getElementById('multi-props').style.display = 'none';
        if (!this.selectedItem) return;
        
        const item = this.selectedItem;
        const group = this.engine.findGroupForItem(item.id);
        document.getElementById('edit-id').value = item.id || '';
        document.getElementById('edit-parent-group').value = group ? group.id : '(none)';
        document.getElementById('edit-max_quantity').value = item.max_quantity || 1;
        document.getElementById('edit-title').value = item.title || '';
        document.getElementById('edit-description').value = item.description || '';
        document.getElementById('edit-tags').value = (item.tags || []).join(', ');
        ['x','y','w','h'].forEach(k => { document.getElementById(`edit-${k}`).value = Math.round(item.coords?.[k] || 0); });
        
        const el = document.getElementById(`btn-${item.id}`);
        if(el) el.setAttribute('data-editor-title', item.title || item.id);
        this.updateCodePreview();
    },

    updateGroupInputs() {
        if (!this.selectedGroup) return;
        const g = this.selectedGroup;
        document.getElementById('group-id').value = g.id || '';
        document.getElementById('group-title').value = g.title || '';
        document.getElementById('group-description').value = g.description || '';
        ['x','y','w','h'].forEach(k => { document.getElementById(`group-${k}`).value = Math.round(g.coords?.[k] || 0); });
        const el = document.getElementById(`group-${g.id}`);
        if(el) el.setAttribute('data-editor-title', g.title || g.id);
        this.updateCodePreview();
    },

    updateCodePreview() {
        if (this.selectedItem && this.selectedItems.length <= 1) {
            const el = document.getElementById('edit-raw-json');
            if (el && document.activeElement !== el) el.value = JSON.stringify(this.selectedItem, null, 2);
        }
        if (this.selectedGroup) {
            const rulesEl = document.getElementById('group-rules-json');
            if (rulesEl && document.activeElement !== rulesEl) rulesEl.value = JSON.stringify(this.selectedGroup.rules || {}, null, 2);
        }
    },

    setupLabelAutoHiding() {
        const checkCollision = (input) => {
            const label = input.nextElementSibling;
            if (!label || !label.classList.contains('input-label')) return;
            if (input.value.length > 0) label.classList.add('label-hidden');
            else label.classList.remove('label-hidden');
        };
        const attach = () => {
             const inputs = document.querySelectorAll('#editor-sidebar input[type="text"], #editor-sidebar input[type="number"], #editor-sidebar input[type="password"], #editor-sidebar textarea:not(.code-editor)');
             inputs.forEach(input => {
                input.removeEventListener('input', input._labelHandler);
                input._labelHandler = () => checkCollision(input);
                input.addEventListener('input', input._labelHandler);
                checkCollision(input);
             });
        };
        this.triggerLabelCheck = attach;
        setTimeout(attach, 500); 
    }
};