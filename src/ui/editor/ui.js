
export const EditorUIMixin = {
    // ==================== CREATE UI ====================
    createEditorUI() {
        if (document.getElementById('editor-sidebar')) return;
        
        const sidebar = document.createElement('div');
        sidebar.id = 'editor-sidebar';
        sidebar.className = 'editor-sidebar';
        
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.id = 'load-config-input';
        fileInput.accept = '.json';
        fileInput.style.display = 'none';
        sidebar.appendChild(fileInput);

        const pageImageInput = document.createElement('input');
        pageImageInput.type = 'file';
        pageImageInput.id = 'add-page-image-input';
        pageImageInput.accept = 'image/*';
        pageImageInput.style.display = 'none';
        sidebar.appendChild(pageImageInput);

        sidebar.innerHTML += `
            <div class="editor-tabs">
                <button class="tab-btn" data-tab="choice" onclick="CYOA.editor.switchTab('choice')">Choice</button>
                <button class="tab-btn" data-tab="group" onclick="CYOA.editor.switchTab('group')">Group</button>
                <button class="tab-btn" data-tab="settings" onclick="CYOA.editor.switchTab('settings')">Settings</button>
                <button class="close-tab-btn" onclick="CYOA.controls.toggleEditMode()">✕</button>
            </div>
            
            <div class="sidebar-scroll-content">
                <div id="tab-content-choice" class="tab-content" style="display:none;">
                    
                    <!-- Multi-Select Toolbar (Shown when > 1 items) -->
                    <div id="multi-props" style="display:none;">
                        <div class="info-text" style="text-align:center; padding:10px; margin-bottom:5px;">
                            <strong id="multi-count">0 items</strong> selected
                        </div>
                        <div style="text-align:center; font-size:0.75rem; color:#666; margin-bottom:15px; padding:0 10px;">
                            Hold <strong>Shift + Click</strong> to add/remove items individually.
                        </div>

                        <div class="editor-section">
                            <div class="accordion-header" onclick="CYOA.editor.toggleAccordion(this)">📐 Alignment</div>
                            <div class="accordion-content">
                                <div class="row-buttons">
                                    <button class="action-btn" style="background:#444;" onclick="CYOA.editor.alignSelectedItems('top')" title="Align all items to the Y position of the highest item in selection">⬆️ Top</button>
                                    <button class="action-btn" style="background:#444;" onclick="CYOA.editor.alignSelectedItems('bottom')" title="Align all items to the bottom edge of the lowest item in selection">⬇️ Bottom</button>
                                </div>
                                <div class="row-buttons">
                                    <button class="action-btn" style="background:#444;" onclick="CYOA.editor.alignSelectedItems('left')" title="Align all items to the X position of the leftmost item in selection">⬅️ Left</button>
                                    <button class="action-btn" style="background:#444;" onclick="CYOA.editor.alignSelectedItems('right')" title="Align all items to the right edge of the rightmost item in selection">➡️ Right</button>
                                </div>
                            </div>
                        </div>
                        <div class="editor-section">
                             <div class="accordion-header" onclick="CYOA.editor.toggleAccordion(this)">📏 Distribution</div>
                            <div class="accordion-content">
                                <button class="full-width-btn" onclick="CYOA.editor.distributeSelectedItems('vertical')" title="Space items evenly between the top-most and bottom-most item">↕️ Distribute Vertically</button>
                                <button class="full-width-btn" onclick="CYOA.editor.distributeSelectedItems('horizontal')" title="Space items evenly between the left-most and right-most item">↔️ Distribute Horizontally</button>
                            </div>
                        </div>
                        <div class="editor-section">
                             <div class="accordion-header" onclick="CYOA.editor.toggleAccordion(this)">◻️ Sizing</div>
                            <div class="accordion-content">
                                <button class="full-width-btn" onclick="CYOA.editor.matchSizeSelectedItems('width')" title="Set all items to the width of the last selected item (Primary)">Match Width</button>
                                <button class="full-width-btn" onclick="CYOA.editor.matchSizeSelectedItems('height')" title="Set all items to the height of the last selected item (Primary)">Match Height</button>
                                <button class="full-width-btn" onclick="CYOA.editor.matchSizeSelectedItems('both')" title="Set all items to the size of the last selected item (Primary)">Match Both</button>
                            </div>
                        </div>
                        <div class="editor-section" style="margin-top: 10px; border-top: 1px solid #222;">
                            <button class="action-btn btn-delete" onclick="CYOA.editor.deleteSelectedItems()">🗑️ Delete All Selected</button>
                        </div>
                    </div>

                    <!-- Single Item Props -->
                    <div id="choice-empty-state" class="info-text">
                        <p>Select an item to edit.</p>
                        <p style="font-size:0.8rem; color:#666;">Drag on empty space to multi-select.<br>Shift+Click to add/remove.</p>
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
                        <button class="action-btn btn-add full-width-btn" onclick="CYOA.editor.addNewItem()">➕ Add New Item (Center)</button>
                    </div>
                </div>

                <div id="tab-content-group" class="tab-content" style="display:none;">
                    <div id="group-empty-state" class="info-text">
                        <p>Select a group (Info Box) on the page to edit, or create a new one.</p>
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
                        <button class="action-btn btn-add full-width-btn" onclick="CYOA.editor.addNewGroup()">➕ Add New Group (Center)</button>
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
                            <button class="full-width-btn" style="background:#4b6cb7; margin-bottom:10px;" onclick="document.getElementById('load-config-input').click()">📂 Load Project (JSON)</button>
                            <div class="row-buttons">
                                <button class="action-btn primary-btn" onclick="CYOA.editor.exportConfig()">💾 Save JSON</button>
                                <button class="action-btn" style="background:#444;" onclick="CYOA.editor.exportZip()">📦 Save Zip</button>
                            </div>
                        </div>
                    </div>



        <div class="editor-section">
            <div class="accordion-header collapsed" onclick="CYOA.editor.toggleAccordion(this)">🧠 AI Assistant</div>
            <div class="accordion-content collapsed">
                
                <!-- 1. Global Connection Settings -->
                <div style="background:#222; padding:5px; border-radius:4px; margin-bottom:10px;">
                    <div class="input-group" style="margin-bottom:5px;">
                        <select id="llm-provider" style="width:100%; padding:6px; background:#111; color:#fff; border:1px solid #333; border-radius:3px;">
                            <option value="google">Google Gemini (API)</option>
                            <option value="openai">OpenAI (API)</option>
                            <option value="manual">Manual (Copy/Paste)</option>
                        </select>
                    </div>
                    
                    <div id="llm-api-fields">
                        <div class="input-group"><input type="password" id="llm-key" placeholder="API Key"><span class="input-label">Key</span></div>
                        <div class="input-group"><input type="text" id="llm-model" value="gemini-2.0-flash"><span class="input-label">Model</span></div>
                        <div class="input-group"><input type="text" id="llm-base-url" value="https://generativelanguage.googleapis.com/v1beta/models/"><span class="input-label">URL</span></div>
                    </div>
                </div>

                <!-- 2. Per-Mode Prompt Editor -->
                <div style="margin-bottom:10px; border-top:1px solid #333; padding-top:5px;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                        <label style="font-size:0.75rem; color:#888;">Instruction (User Prompt):</label>
                        <select id="llm-prompt-selector" style="font-size:0.75rem; background:#333; color:#fff; border:none; border-radius:3px;">
                            <option value="refine">For: Refine Layout</option>
                            <option value="fill">For: OCR & Fill</option>
                            <option value="audit">For: Global Audit</option>
                        </select>
                    </div>
                    <textarea id="llm-user-prompt" class="code-editor" style="height:80px; font-family:sans-serif; color:#ddd;"></textarea>
                    <div style="font-size:0.65rem; color:#666; text-align:right;">* Technical context (JSON structure) will be appended automatically.</div>
                </div>

                <!-- 3. Action Buttons -->
                <div style="display:flex; flex-direction:column; gap:6px;">
                    <button onclick="CYOA.editor.runLlmAction('refine')" class="action-btn" style="background: #4b6cb7; text-align:left; font-size:0.8rem; padding:8px;">
                        <span style="float:right;">📐</span> <strong>Run Refine Layout</strong>
                    </button>
                    <button onclick="CYOA.editor.runLlmAction('fill')" class="action-btn" style="background: #8e24aa; text-align:left; font-size:0.8rem; padding:8px;">
                        <span style="float:right;">👁️</span> <strong>Run OCR & Fill</strong>
                    </button>
                    <button onclick="CYOA.editor.runLlmAction('audit')" class="action-btn" style="background: #2e7d32; text-align:left; font-size:0.8rem; padding:8px;">
                        <span style="float:right;">🛡️</span> <strong>Run Audit</strong>
                    </button>
                </div>

                <!-- 4. Manual Mode Output Area (Hidden by default) -->
                <div id="llm-manual-ui" style="display:none; margin-top:15px; border-top:1px dashed #444; padding-top:10px;">
                    <div class="info-text" style="font-size:0.7rem; padding:5px; margin:0 0 5px 0;">
                        <strong>Manual Mode:</strong><br>
                        1. Copy the full request below.<br>
                        2. Paste into ChatGPT/Claude/Gemini.<br>
                        3. Paste their JSON response back here.
                    </div>
                    <textarea id="llm-manual-out" class="code-editor" style="height:100px;" readonly placeholder="Generated request will appear here..."></textarea>
                    <button class="full-width-btn" onclick="CYOA.editor.copyManualPrompt()" style="margin-bottom:10px;">📋 Copy Request</button>
                    
                    <textarea id="llm-manual-in" class="code-editor" style="height:80px;" placeholder="Paste JSON response here..."></textarea>
                    <button class="full-width-btn primary-btn" onclick="CYOA.editor.applyManualResponse()">✅ Apply Response</button>
                </div>

            </div>
        </div>





                    <div class="editor-section">
                        <div class="accordion-header collapsed" onclick="CYOA.editor.toggleAccordion(this)">🤖 Auto-Detect (SAM3)</div>
                        <div class="accordion-content collapsed">
                            <div class="input-group"><input type="password" id="sam-token" placeholder="hf_..."><span class="input-label">Hugging Face Token</span></div>
                            <div class="input-group" style="margin-top:10px;"><input type="text" id="sam-prompt" value="content block, game card, description panel"><span class="input-label">Search Prompt</span></div>
                            <div style="margin-top:10px;">
                                <div style="display:flex; justify-content:space-between; font-size:0.8rem; color:#888;"><span>Shave (Tightness)</span><span id="shave-val">2.0%</span></div>
                                <input type="range" id="sam-shave" min="0.005" max="0.05" step="0.005" value="0.02" style="width:100%;" oninput="document.getElementById('shave-val').textContent = (this.value*100).toFixed(1)+'%'">
                            </div>
                             <div class="input-group" style="margin-top:10px;"><input type="number" id="sam-debug-index" placeholder="None"><span class="input-label">Debug Item Index (Optional)</span></div>
                            <button id="btn-run-sam" class="full-width-btn primary-btn" style="margin-top:15px; background: linear-gradient(45deg, #4b6cb7, #182848);">🚀 Run Auto-Detect on Current Page</button>
                            <div id="sam-status" style="margin-top:10px; font-size:0.75rem; color:#ffd700; min-height:1.2em;"></div>
                             <div class="editor-section" style="margin-top:15px; border:1px solid #333; padding:0;">
                                <div class="accordion-header collapsed" onclick="CYOA.editor.toggleAccordion(this)" style="padding:5px 10px; font-size:0.8rem;">🐞 Debug Gallery</div>
                                <div class="accordion-content collapsed" id="sam-debug-gallery" style="background:#000; padding:10px;"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div id="llm-preview-modal" class="modal-overlay" style="display:none;">
                <div class="modal-content">
                    <h3>🔍 Review Changes</h3>
                    <div style="font-size:0.8rem; color:#aaa; margin-bottom:10px;">The AI suggests the following structure. Check coordinates and groups.</div>
                    <textarea id="llm-result-json" class="code-editor" style="height:400px; font-size:11px;"></textarea>
                    <div class="row-buttons" style="margin-top:10px;">
                        <button class="action-btn" onclick="document.getElementById('llm-preview-modal').style.display='none'" style="background:#444;">Cancel</button>
                        <button class="action-btn primary-btn" onclick="CYOA.editor.applyLlmChanges()">✅ Apply Changes</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(sidebar);
        this.ruleBuilder.renderUI(document.getElementById('rule-builder-container'));
        
        this.setupChoiceListeners();
        this.setupGroupListeners();
        this.setupJsonListeners();
        this.setupLabelAutoHiding();
        this.setupSamListeners();
        this.setupLlmListeners(); 
        this.setupLoadListener();
        this.setupAddPageListener();
        this.setupContextMenu(); 
        
        this.renderPagesList();
    },

    setupContextMenu() {
        const contextMenu = document.createElement('div');
        contextMenu.id = 'editor-context-menu';
        contextMenu.className = 'custom-context-menu';
        contextMenu.style.display = 'none';
        contextMenu.innerHTML = `
            <div class="menu-label" id="ctx-label">Actions</div>
            <div class="menu-divider"></div>
            <div class="menu-item ctx-common" onclick="CYOA.editor.handleContextAction('add-item')">➕ Add Item Here</div>
            <div class="menu-item ctx-common" onclick="CYOA.editor.handleContextAction('add-group')">📂 Add Group Here</div>
            <div class="menu-divider ctx-obj"></div>
            <div class="menu-item ctx-obj" onclick="CYOA.editor.handleContextAction('duplicate')">📄 Duplicate</div>
            <div class="menu-item ctx-obj" onclick="CYOA.editor.handleContextAction('copy')">📋 Copy</div>
            <div class="menu-item ctx-obj" style="color:#ff6b6b;" onclick="CYOA.editor.handleContextAction('delete')">🗑️ Delete</div>
            <div class="menu-divider ctx-paste"></div>
            <div class="menu-item ctx-paste" id="ctx-paste-btn" onclick="CYOA.editor.handleContextAction('paste')">📌 Paste</div>
            <div class="menu-divider"></div>
            <div class="menu-item" onclick="CYOA.editor.handleContextAction('auto-detect')">🚀 Auto-Detect (SAM)</div>
        `;
        document.body.appendChild(contextMenu);

        document.addEventListener('contextmenu', (e) => {
            if (!this.enabled) return;
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            if (!e.target.closest('.page-container')) return;

            e.preventDefault();
            
            let targetType = 'bg';
            let targetId = null;
            let targetName = 'Page';

            const itemEl = e.target.closest('.item-zone');
            const groupEl = e.target.closest('.info-zone');

            if (itemEl) {
                targetType = 'item';
                targetId = itemEl.dataset.itemId;
                targetName = 'Item';
                const item = this.engine.findItem(targetId);
                if(item) {
                    this.switchTab('choice');
                    this.selectChoice(item, itemEl);
                }
            } else if (groupEl) {
                targetType = 'group';
                targetId = groupEl.id.replace('group-', '');
                targetName = 'Group';
                const group = this.engine.findGroup(targetId);
                if(group) {
                    this.switchTab('group');
                    this.selectGroup(group);
                }
            }

            const pageContainer = e.target.closest('.page-container');
            const pageIndex = pageContainer ? parseInt(pageContainer.id.replace('page-', '')) || 0 : this.activePageIndex;
            this.activePageIndex = pageIndex;

            this.contextMenuContext = {
                x: e.clientX,
                y: e.clientY,
                pageIndex,
                targetType,
                targetId
            };

            document.getElementById('ctx-label').textContent = targetType === 'bg' ? 'Page Actions' : `${targetName} Actions`;
            document.querySelectorAll('.ctx-obj').forEach(el => el.style.display = (targetType !== 'bg') ? 'block' : 'none');
            
            const pasteBtn = document.getElementById('ctx-paste-btn');
            pasteBtn.style.display = this.clipboard ? 'block' : 'none';
            if (this.clipboard) {
                pasteBtn.textContent = `📌 Paste ${this.clipboard.type === 'item' ? 'Item' : 'Group'}`;
            }

            contextMenu.style.left = `${e.clientX}px`;
            contextMenu.style.top = `${e.clientY}px`;
            contextMenu.style.display = 'block';
        });

        document.addEventListener('click', (e) => {
            if (contextMenu.style.display === 'block') {
                contextMenu.style.display = 'none';
            }
        });
    },

    handleContextAction(action) {
        if (!this.contextMenuContext) return;
        const { targetType, targetId } = this.contextMenuContext;

        switch (action) {
            case 'add-item':
                this.switchTab('choice');
                this.addNewItem(this.contextMenuContext);
                break;
            case 'add-group':
                this.switchTab('group');
                this.addNewGroup(this.contextMenuContext);
                break;
            case 'duplicate':
                this.actionDuplicate(targetType, targetId);
                break;
            case 'copy':
                this.actionCopy(targetType, targetId);
                break;
            case 'paste':
                this.actionPaste();
                break;
            case 'delete':
                if (targetType === 'item') this.deleteSelectedItem();
                if (targetType === 'group') this.deleteSelectedGroup();
                break;
            case 'auto-detect':
                this.switchTab('settings');
                const samHeader = document.querySelector("#tab-content-settings .accordion-header:nth-of-type(3)");
                if (samHeader && samHeader.classList.contains('collapsed')) {
                    this.toggleAccordion(samHeader);
                }
                break;
        }
    },

    // ==================== UI STATE MANAGEMENT ====================
    switchTab(tabName) {
        this.activeTab = tabName;
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
        document.querySelectorAll('.tab-content').forEach(content => {
            content.style.display = 'none';
        });
        document.getElementById(`tab-content-${tabName}`).style.display = 'block';

        document.body.classList.remove('edit-mode-choice', 'edit-mode-group');

        if (tabName === 'choice') {
            document.body.classList.add('edit-mode-choice');
            this.updateChoiceInputs(); // Checks count to show multi-edit or single edit
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
        
        if (pages.length === 0) {
            container.innerHTML = `
                <div style="color:#888; font-size:0.8rem; padding:15px; text-align:center; background:#1a1a1a; border-radius:4px;">
                    <div style="font-size:1.5rem; margin-bottom:8px;">📄</div>
                    <div>No pages yet.</div>
                    <div style="color:#666; font-size:0.75rem; margin-top:4px;">Add an image to create your first page.</div>
                </div>
            `;
            return;
        }
        
        container.innerHTML = pages.map((page, idx) => {
            const counts = this.countPageElements(page);
            const isActive = idx === this.activePageIndex;
            
            return `
                <div class="page-list-item ${isActive ? 'active' : ''}" 
                     onclick="CYOA.editor.selectPage(${idx})"
                     style="display:flex; align-items:center; justify-content:space-between; padding:8px 10px; margin-bottom:4px; background:${isActive ? '#2e7d32' : '#2a2a2a'}; border-radius:4px; cursor:pointer; border: 1px solid ${isActive ? '#4caf50' : '#333'};">
                    <div style="display:flex; flex-direction:column;">
                        <span style="font-size:0.85rem; font-weight:${isActive ? '600' : '400'};">📄 Page ${idx + 1}</span>
                        <span style="font-size:0.7rem; color:${isActive ? '#c8e6c9' : '#888'}; margin-top:2px;">
                            ${counts.groups} groups, ${counts.items} items
                        </span>
                    </div>
                    <button onclick="event.stopPropagation(); CYOA.editor.deletePage(${idx})" 
                            style="background:#d32f2f; border:none; color:white; padding:4px 8px; border-radius:3px; cursor:pointer; font-size:0.7rem; opacity:0.8;"
                            onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.8'">✕</button>
                </div>
            `;
        }).join('');
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
        console.log(`📄 Switched to page ${index + 1}`);
    },

    // ==================== SELECTION UPDATES ====================
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
        // Handle Logic for Single vs Multi view
        if (this.selectedItems.length > 1) {
            document.getElementById('choice-props').style.display = 'none';
            document.getElementById('choice-empty-state').style.display = 'none';
            document.getElementById('multi-props').style.display = 'block';
            document.getElementById('multi-count').textContent = `${this.selectedItems.length} items`;
            return;
        }

        document.getElementById('multi-props').style.display = 'none';

        if (!this.selectedItem) {
            document.getElementById('choice-props').style.display = 'none';
            document.getElementById('choice-empty-state').style.display = 'block';
            return;
        }
        
        document.getElementById('choice-props').style.display = 'block';
        document.getElementById('choice-empty-state').style.display = 'none';

        const item = this.selectedItem;
        const group = this.engine.findGroupForItem(item.id);
        document.getElementById('edit-id').value = item.id || '';
        document.getElementById('edit-parent-group').value = group ? group.id : '(none)';
        document.getElementById('edit-max_quantity').value = item.max_quantity || 1;
        document.getElementById('edit-title').value = item.title || '';
        document.getElementById('edit-description').value = item.description || '';
        document.getElementById('edit-tags').value = (item.tags || []).join(', ');
        ['x','y','w','h'].forEach(k => { 
            document.getElementById(`edit-${k}`).value = Math.round(item.coords?.[k] || 0); 
        });
        
        const el = document.getElementById(`btn-${item.id}`);
        if(el) el.setAttribute('data-editor-title', item.title || item.id);

        this.updateCodePreview();
        if (this.triggerLabelCheck) this.triggerLabelCheck();
    },

    updateGroupInputs() {
        if (!this.selectedGroup) return;
        const g = this.selectedGroup;
        document.getElementById('group-id').value = g.id || '';
        document.getElementById('group-title').value = g.title || '';
        document.getElementById('group-description').value = g.description || '';
        ['x','y','w','h'].forEach(k => { 
            document.getElementById(`group-${k}`).value = Math.round(g.coords?.[k] || 0); 
        });

        const el = document.getElementById(`group-${g.id}`);
        if(el) el.setAttribute('data-editor-title', g.title || g.id);

        this.updateCodePreview();
        if (this.triggerLabelCheck) this.triggerLabelCheck();
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
            const inputStyle = window.getComputedStyle(input);

            if (input.tagName === 'TEXTAREA') {
                this.mirrorDiv.style.font = inputStyle.font;
                this.mirrorDiv.style.width = inputStyle.width;
                this.mirrorDiv.style.padding = inputStyle.padding;
                this.mirrorDiv.textContent = input.value + '|';
                if (input.scrollHeight > input.clientHeight) {
                    label.classList.add('label-hidden');
                } else {
                     label.classList.remove('label-hidden');
                }
                return;
            }
            
            this.measureContext.font = inputStyle.font;
            const textWidth = this.measureContext.measureText(input.value).width;
            if ((textWidth + 10) > (input.clientWidth - label.offsetWidth - 10)) {
                label.classList.add('label-hidden');
            } else {
                label.classList.remove('label-hidden');
            }
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