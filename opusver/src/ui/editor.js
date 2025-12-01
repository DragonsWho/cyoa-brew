
/**
 * CYOA Editor - Visual editing mode
 */

import { CoordHelper } from '../utils/coords.js';
import { RuleBuilder } from './rule-builder.js';

export class CYOAEditor {
    constructor(engine, renderer) {
        this.engine = engine;
        this.renderer = renderer;
        this.ruleBuilder = new RuleBuilder(engine);
        
        this.selectedItem = null;
        this.selectedGroup = null;
        this.activeTab = 'choice'; 
        
        this.measureContext = document.createElement('canvas').getContext('2d');
        
        this.mirrorDiv = document.createElement('div');
        this.mirrorDiv.style.cssText = 'position:absolute; visibility:hidden; height:auto; overflow:hidden; white-space:pre-wrap; word-wrap:break-word;';
        document.body.appendChild(this.mirrorDiv);

        this.isDragging = false;
        this.isResizing = false;
        this.dragStart = { x: 0, y: 0 };
        this.initialRect = {};
        this.handleSize = 10;
        this.dragContext = null;
        
        this.enabled = false;
        console.log('✏️ Editor initialized');
    }

    enable() {
        if (this.enabled) return;
        this.enabled = true;
        this.createEditorUI();
        this.attachEventListeners();
        this.switchTab('choice');
        console.log('✏️ Editor enabled');
    }

    disable() {
        if (!this.enabled) return;
        this.enabled = false;
        const sidebar = document.getElementById('editor-sidebar');
        if (sidebar) sidebar.remove();
        this.removeEventListeners();
        document.querySelectorAll('.item-zone, .info-zone').forEach(el => {
            el.classList.remove('editable', 'editor-selected');
        });
        console.log('✏️ Editor disabled');
    }

    createEditorUI() {
        if (document.getElementById('editor-sidebar')) return;
        
        const sidebar = document.createElement('div');
        sidebar.id = 'editor-sidebar';
        sidebar.className = 'editor-sidebar';
        
        sidebar.innerHTML = `
            <div class="editor-tabs">
                <button class="tab-btn" data-tab="choice" onclick="CYOA.editor.switchTab('choice')">Choice</button>
                <button class="tab-btn" data-tab="group" onclick="CYOA.editor.switchTab('group')">Group</button>
                <button class="tab-btn" data-tab="settings" onclick="CYOA.editor.switchTab('settings')">Settings</button>
                <button class="close-tab-btn" onclick="CYOA.controls.toggleEditMode()">✕</button>
            </div>
            
            <div class="sidebar-scroll-content">
                
                <!-- TAB 1: CHOICE -->
                <div id="tab-content-choice" class="tab-content" style="display:none;">
                    <div id="choice-empty-state" class="info-text">
                        Select an item on the page to edit.
                    </div>

                    <div id="choice-props" style="display:none;">
                        <!-- Main Properties -->
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
                                <span class="input-label">Max Qty (1 = Toggle)</span>
                            </div>

                            <div class="input-group">
                                <input type="text" id="edit-title">
                                <span class="input-label">Title</span>
                            </div>

                            <!-- NEW: Tags Input -->
                            <div class="input-group">
                                <input type="text" id="edit-tags" placeholder="magic, fire, weapon">
                                <span class="input-label">Tags (comma sep.)</span>
                            </div>

                            <div class="input-group">
                                <textarea id="edit-description" rows="5"></textarea>
                                <span class="input-label">Desc</span>
                            </div>
                        </div>

                        <!-- Position & Size -->
                        <div class="editor-section">
                            <div class="accordion-header" onclick="CYOA.editor.toggleAccordion(this)">
                                Position & Size
                            </div>
                            <div class="accordion-content">
                                <div class="row-4">
                                    <div class="input-group" title="X"><input type="number" id="edit-x"></div>
                                    <div class="input-group" title="Y"><input type="number" id="edit-y"></div>
                                    <div class="input-group" title="Width"><input type="number" id="edit-w"></div>
                                    <div class="input-group" title="Height"><input type="number" id="edit-h"></div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Rule Builder -->
                        <div id="rule-builder-container"></div>

                        <!-- RAW JSON -->
                        <div class="editor-section">
                            <div class="accordion-header collapsed" onclick="CYOA.editor.toggleAccordion(this)">
                                🔧 Raw JSON
                            </div>
                            <div class="accordion-content collapsed">
                                <textarea id="edit-raw-json" class="code-editor"></textarea>
                            </div>
                        </div>
                        
                        <!-- Actions Footer -->
                        <div class="editor-section" style="margin-top: 10px; border-top: 1px solid #222;">
                            <div class="row-buttons">
                                <button class="action-btn btn-delete" onclick="CYOA.editor.deleteSelectedItem()">🗑️ Delete</button>
                                <button class="action-btn btn-add" onclick="CYOA.editor.addNewItem()">➕ Add New</button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- TAB 2: GROUP -->
                <div id="tab-content-group" class="tab-content" style="display:none;">
                    <div id="group-empty-state" class="info-text">
                        Select a group (Info Box) or a choice first.
                    </div>

                    <div id="group-props" style="display:none;">
                         <div class="editor-section">
                            <div class="input-group">
                                <input type="text" id="group-id">
                                <span class="input-label">Group ID</span>
                            </div>
                            <div class="input-group">
                                <input type="text" id="group-title">
                                <span class="input-label">Title</span>
                            </div>
                            <div class="input-group">
                                <textarea id="group-description" rows="7"></textarea>
                                <span class="input-label">Description</span>
                            </div>
                        </div>

                        <div class="editor-section">
                            <div class="accordion-header" onclick="CYOA.editor.toggleAccordion(this)">
                                Position & Size
                            </div>
                            <div class="accordion-content">
                                <div class="row-4">
                                    <div class="input-group" title="X"><input type="number" id="group-x"></div>
                                    <div class="input-group" title="Y"><input type="number" id="group-y"></div>
                                    <div class="input-group" title="Width"><input type="number" id="group-w"></div>
                                    <div class="input-group" title="Height"><input type="number" id="group-h"></div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Group Rules (JSON) -->
                         <div class="editor-section">
                             <div class="accordion-header" onclick="CYOA.editor.toggleAccordion(this)">
                                 📜 Group Rules (JSON)
                             </div>
                             <div class="accordion-content">
                                 <textarea id="group-rules-json" class="code-editor" style="height:150px;"></textarea>
                                 <div style="font-size:0.7rem; color:#666;">Format: {"max_choices": 1, "budget": {...}}</div>
                             </div>
                         </div>

                        <!-- Actions Footer -->
                        <div class="editor-section" style="margin-top: 10px; border-top: 1px solid #222;">
                            <div class="row-buttons">
                                <button class="action-btn btn-delete" onclick="CYOA.editor.deleteSelectedGroup()">🗑️ Delete Group</button>
                                <button class="action-btn btn-add" onclick="CYOA.editor.addNewGroup()">➕ Add Group</button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- TAB 3: SETTINGS -->
                <div id="tab-content-settings" class="tab-content" style="display:none;">
                    <div class="editor-section">
                        <div class="accordion-header">File Operations</div>
                        <div class="accordion-content" style="display:block">
                            <button class="full-width-btn primary-btn" onclick="CYOA.editor.exportConfig()">💾 Save JSON</button>
                        </div>
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
    }

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
            if (this.selectedItem) {
                this.updateChoiceInputs();
                document.getElementById('choice-empty-state').style.display = 'none';
                document.getElementById('choice-props').style.display = 'block';
            }
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
        }
    }

    toggleAccordion(header) {
        header.classList.toggle('collapsed');
        const content = header.nextElementSibling;
        content.classList.toggle('collapsed');
    }

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
             const inputs = document.querySelectorAll('#editor-sidebar input[type="text"], #editor-sidebar input[type="number"], #editor-sidebar textarea:not(.code-editor)');
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

    attachEventListeners() {
        document.addEventListener('mousedown', this.handleMouseDown.bind(this));
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
        document.addEventListener('mouseup', this.handleMouseUp.bind(this));
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
    }

    removeEventListeners() {}

    handleMouseDown(e) {
        if (!this.enabled) return;
        if (e.target.closest('#editor-sidebar')) return;

        let target = null;
        let objectToEdit = null;

        if (this.activeTab === 'group') {
            target = e.target.closest('.info-zone');
            if (target) {
                const gid = target.id.replace('group-', '');
                const group = this.engine.config.groups.find(g => g.id === gid);
                if (group) {
                    this.selectGroup(group);
                    objectToEdit = group;
                }
            }
        } else {
            target = e.target.closest('.item-zone');
            if (target) {
                const itemId = target.dataset.itemId;
                const item = this.engine.findItem(itemId);
                if (item) {
                    this.selectChoice(item, target);
                    objectToEdit = item;
                    this.selectedGroup = this.engine.findGroupForItem(item.id);
                }
            } else if(this.activeTab === 'choice') {
                this.deselectChoice();
            }
        }

        if (objectToEdit && target) {
            target.classList.add('dragging');
            const rect = target.getBoundingClientRect();
            
            if (e.clientX >= rect.right - this.handleSize && e.clientY >= rect.bottom - this.handleSize) {
                this.isResizing = true;
            } else {
                this.isDragging = true;
            }
            
            this.dragStart = { x: e.clientX, y: e.clientY };
            if (!objectToEdit.coords) objectToEdit.coords = {x:0,y:0,w:100,h:100};
            this.initialRect = { ...objectToEdit.coords };
            
            const group = (objectToEdit.items) ? objectToEdit : this.engine.findGroupForItem(objectToEdit.id);
            const pageIndex = group?.page || 0;
            const dim = this.renderer.pageDimensions[pageIndex];
            const container = document.querySelector(`#page-${pageIndex}`);
            
            if (dim && container) {
                const containerRect = container.getBoundingClientRect();
                this.dragContext = {
                    scaleX: dim.w / containerRect.width,
                    scaleY: dim.h / containerRect.height,
                    dim: dim,
                    targetObj: objectToEdit
                };
            }
            e.preventDefault();
        }
    }

    handleMouseMove(e) {
        if (!this.enabled || !this.dragContext) return;
        if (!this.isDragging && !this.isResizing) return;
        
        const dx = e.clientX - this.dragStart.x;
        const dy = e.clientY - this.dragStart.y;
        const { scaleX, scaleY, dim, targetObj } = this.dragContext;
        
        if (this.isDragging) {
            targetObj.coords.x = Math.round(this.initialRect.x + dx * scaleX);
            targetObj.coords.y = Math.round(this.initialRect.y + dy * scaleY);
        } else if (this.isResizing) {
            targetObj.coords.w = Math.max(20, Math.round(this.initialRect.w + dx * scaleX));
            targetObj.coords.h = Math.max(20, Math.round(this.initialRect.h + dy * scaleY));
        }
        
        let domId = targetObj.items ? `group-${targetObj.id}` : `btn-${targetObj.id}`;
        const element = document.getElementById(domId);
        
        if (element) {
            const style = CoordHelper.toPercent(targetObj.coords, dim);
            Object.assign(element.style, style);
        }
        
        if (this.activeTab === 'group') this.updateGroupInputs();
        else this.updateChoiceInputs();
    }

    handleMouseUp() {
        document.querySelectorAll('.dragging').forEach(el => el.classList.remove('dragging'));
        this.isDragging = false;
        this.isResizing = false;
        this.dragContext = null;
    }

    handleKeyDown(e) {
        if (!this.enabled) return;
        if (e.key === 'Delete') {
             const tag = document.activeElement.tagName;
             if (tag !== 'INPUT' && tag !== 'TEXTAREA') {
                 if (this.activeTab === 'choice') this.deleteSelectedItem();
             }
        }
    }

    selectChoice(item, element) {
        this.selectedItem = item;
        document.querySelectorAll('.editor-selected').forEach(el => el.classList.remove('editor-selected'));
        if(element) element.classList.add('editor-selected');
        
        document.getElementById('choice-empty-state').style.display = 'none';
        document.getElementById('choice-props').style.display = 'block';
        
        this.updateChoiceInputs();
        this.ruleBuilder.loadItem(item, this.engine.findGroupForItem(item.id));
    }

    deselectChoice() {
        this.selectedItem = null;
        document.querySelectorAll('.item-zone.editor-selected').forEach(el => el.classList.remove('editor-selected'));
        document.getElementById('choice-props').style.display = 'none';
        document.getElementById('choice-empty-state').style.display = 'block';
    }

    selectGroup(group) {
        this.selectedGroup = group;
        document.querySelectorAll('.info-zone.editor-selected').forEach(el => el.classList.remove('editor-selected'));
        const el = document.getElementById(`group-${group.id}`);
        if(el) el.classList.add('editor-selected');

        document.getElementById('group-empty-state').style.display = 'none';
        document.getElementById('group-props').style.display = 'block';
        
        this.updateGroupInputs();
    }

    updateChoiceInputs() {
        if (!this.selectedItem) return;
        const item = this.selectedItem;
        const group = this.engine.findGroupForItem(item.id);

        document.getElementById('edit-id').value = item.id || '';
        document.getElementById('edit-parent-group').value = group ? group.id : '?';
        document.getElementById('edit-max_quantity').value = item.max_quantity || 1;
        document.getElementById('edit-title').value = item.title || '';
        document.getElementById('edit-description').value = item.description || '';
        
        // Populate Tags
        document.getElementById('edit-tags').value = (item.tags || []).join(', ');
        
        ['x','y','w','h'].forEach(k => {
            document.getElementById(`edit-${k}`).value = Math.round(item.coords?.[k] || 0);
        });

        this.updateCodePreview();
        if (this.triggerLabelCheck) this.triggerLabelCheck();
    }

    updateGroupInputs() {
        if (!this.selectedGroup) return;
        const g = this.selectedGroup;

        document.getElementById('group-id').value = g.id || '';
        document.getElementById('group-title').value = g.title || '';
        document.getElementById('group-description').value = g.description || '';
        
        ['x','y','w','h'].forEach(k => {
            document.getElementById(`group-${k}`).value = Math.round(g.coords?.[k] || 0);
        });

        this.updateCodePreview();
        if (this.triggerLabelCheck) this.triggerLabelCheck();
    }

    updateCodePreview() {
        if (this.selectedItem) {
            const el = document.getElementById('edit-raw-json');
            if (el && document.activeElement !== el) {
                el.value = JSON.stringify(this.selectedItem, null, 2);
            }
        }
        if (this.selectedGroup) {
            const rulesEl = document.getElementById('group-rules-json');
            if (rulesEl && document.activeElement !== rulesEl) {
                rulesEl.value = JSON.stringify(this.selectedGroup.rules || {}, null, 2);
            }
        }
    }

    setupChoiceListeners() {
        const update = (key, val, isNum) => {
            if (!this.selectedItem) return;
            if (isNum) val = parseInt(val) || 0;
            
            if (['x','y','w','h'].includes(key)) {
                if (!this.selectedItem.coords) this.selectedItem.coords = {};
                this.selectedItem.coords[key] = val;
            } else if (key === 'tags') {
                // Parse CSV to Array
                this.selectedItem.tags = val.split(',').map(t => t.trim()).filter(t => t);
            } else {
                this.selectedItem[key] = val;
            }

            // Special handling for max_quantity to re-render structure
            if (key === 'max_quantity') {
                 if (val <= 1) delete this.selectedItem.max_quantity; // clean up JSON
                 // Re-render to show/hide split controls
                 this.renderer.renderButtons();
                 // Re-select to keep focus outline
                 setTimeout(() => {
                    const el = document.getElementById(`btn-${this.selectedItem.id}`);
                    if (el) el.classList.add('editor-selected');
                 }, 0);
            } else {
                // Just update positions/styles for speed
                this.renderer.renderButtons();
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
    }

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
            this.renderer.renderButtons();
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
    }

    setupJsonListeners() {
        const choiceJson = document.getElementById('edit-raw-json');
        if (choiceJson) {
            choiceJson.addEventListener('change', (e) => {
                try {
                    const data = JSON.parse(e.target.value);
                    if (this.selectedItem) {
                        Object.assign(this.selectedItem, data);
                        this.renderer.renderButtons();
                        this.updateChoiceInputs();
                        this.ruleBuilder.loadItem(this.selectedItem, this.selectedGroup);
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
                        this.renderer.renderButtons(); 
                        this.engine.recalculate(); 
                    }
                } catch(err) { console.error("Rules JSON Error", err); }
            });
        }
    }

    deleteSelectedItem() {
        if (!this.selectedItem) return;
        if (!confirm('Delete item?')) return;
        const group = this.engine.findGroupForItem(this.selectedItem.id);
        if (group) {
            const idx = group.items.indexOf(this.selectedItem);
            if (idx > -1) group.items.splice(idx, 1);
        }
        this.deselectChoice();
        this.renderer.renderButtons();
    }

    addNewItem() {
        let group = this.selectedGroup || this.engine.config.groups[0];
        if (!group) return;
        const newItem = {
            id: `item_${Date.now()}`,
            title: 'New Item',
            description: '',
            coords: { x: 50, y: 50, w: 200, h: 100 },
            cost: []
        };
        group.items.push(newItem);
        this.renderer.renderButtons();
        setTimeout(() => {
            const el = document.getElementById(`btn-${newItem.id}`);
            if (el) this.selectChoice(newItem, el);
        }, 50);
    }

    // === GROUP ACTIONS ===
    addNewGroup() {
        const newGroup = {
            id: `group_${Date.now()}`,
            title: 'New Group',
            description: '',
            page: 0,
            coords: { x: 50, y: 50, w: 300, h: 200 },
            items: []
        };
        this.engine.config.groups.push(newGroup);
        this.renderer.renderButtons();
        setTimeout(() => {
            const el = document.getElementById(`group-${newGroup.id}`);
            if (el) this.selectGroup(newGroup);
        }, 50);
    }

    deleteSelectedGroup() {
        if (!this.selectedGroup) return;
        if (this.selectedGroup.items && this.selectedGroup.items.length > 0) {
            if (!confirm(`Group has ${this.selectedGroup.items.length} items. Delete group and ALL items?`)) return;
        } else {
            if (!confirm('Delete this group?')) return;
        }

        const idx = this.engine.config.groups.indexOf(this.selectedGroup);
        if (idx > -1) {
            this.engine.config.groups.splice(idx, 1);
        }
        
        // Deselect
        this.selectedGroup = null;
        document.querySelectorAll('.info-zone.editor-selected').forEach(el => el.classList.remove('editor-selected'));
        document.getElementById('group-props').style.display = 'none';
        document.getElementById('group-empty-state').style.display = 'block';
        
        this.renderer.renderButtons();
    }

    exportConfig() {
        const config = this.engine.config;
        const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${config.meta?.title || 'cyoa'}_edited.json`;
        a.click();
        URL.revokeObjectURL(url);
    }
}