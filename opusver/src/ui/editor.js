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
        this.selectedGroup = null; // Currently selected Group Object
        this.activeTab = 'choice'; // 'choice', 'group', 'settings'
        
        // Canvas for measuring text width (simple inputs)
        this.measureContext = document.createElement('canvas').getContext('2d');
        
        // Mirror div for measuring textarea height/overlap
        this.mirrorDiv = document.createElement('div');
        this.mirrorDiv.style.position = 'absolute';
        this.mirrorDiv.style.visibility = 'hidden';
        this.mirrorDiv.style.height = 'auto';
        this.mirrorDiv.style.overflow = 'hidden';
        this.mirrorDiv.style.whiteSpace = 'pre-wrap'; 
        this.mirrorDiv.style.wordWrap = 'break-word';
        document.body.appendChild(this.mirrorDiv);

        // Dragging state
        this.isDragging = false;
        this.isResizing = false;
        this.dragStart = { x: 0, y: 0 };
        this.initialRect = {};
        this.handleSize = 10;
        this.dragContext = null;
        
        this.enabled = false;
        
        console.log('✏️ Editor initialized');
    }

    // ==================== ENABLE/DISABLE ====================

    enable() {
        if (this.enabled) return;
        this.enabled = true;
        this.createEditorUI();
        this.attachEventListeners();
        this.switchTab('choice'); // Default tab
        console.log('✏️ Editor enabled');
    }

    disable() {
        if (!this.enabled) return;
        this.enabled = false;
        
        const sidebar = document.getElementById('editor-sidebar');
        if (sidebar) sidebar.remove();
        
        this.removeEventListeners();
        
        // Cleanup visual classes
        document.querySelectorAll('.item-zone, .info-zone').forEach(el => {
            el.classList.remove('editable', 'editor-selected');
        });
        
        console.log('✏️ Editor disabled');
    }

    // ==================== UI CREATION ====================

    createEditorUI() {
        if (document.getElementById('editor-sidebar')) return;
        
        const sidebar = document.createElement('div');
        sidebar.id = 'editor-sidebar';
        sidebar.className = 'editor-sidebar';
        
        sidebar.innerHTML = `
            <div class="editor-header">
                <h3>CYOA Editor</h3>
                <button class="close-btn" onclick="CYOA.controls.toggleEditMode()">✕</button>
            </div>

            <!-- Tabs -->
            <div class="editor-tabs">
                <button class="tab-btn" data-tab="choice" onclick="CYOA.editor.switchTab('choice')">Choice</button>
                <button class="tab-btn" data-tab="group" onclick="CYOA.editor.switchTab('group')">Group</button>
                <button class="tab-btn" data-tab="settings" onclick="CYOA.editor.switchTab('settings')">Settings</button>
            </div>
            
            <div class="sidebar-scroll-content">
                
                <!-- TAB 1: CHOICE -->
                <div id="tab-content-choice" class="tab-content" style="display:none;">
                    <div id="choice-empty-state" class="info-text" style="margin: 20px;">
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
                                <input type="text" id="edit-title">
                                <span class="input-label">Title</span>
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
                        
                        <!-- Rules Container (Injected) -->
                        <div id="rule-builder-container"></div>
                        
                        <!-- Actions -->
                        <div class="editor-section" style="margin-top: 20px;">
                            <button class="delete-item-btn" onclick="CYOA.editor.deleteSelectedItem()">
                                🗑️ Delete Choice
                            </button>
                             <button class="full-width-btn" onclick="CYOA.editor.addNewItem()">
                                ➕ Add New Choice
                            </button>
                        </div>
                    </div>
                </div>

                <!-- TAB 2: GROUP -->
                <div id="tab-content-group" class="tab-content" style="display:none;">
                    <div id="group-empty-state" class="info-text" style="margin: 20px;">
                        Select a group on the page (Info Box) or select a choice first.
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
                                <textarea id="group-description" rows="3"></textarea>
                                <span class="input-label">Description</span>
                            </div>
                        </div>

                        <div class="editor-section">
                            <div class="accordion-header" onclick="CYOA.editor.toggleAccordion(this)">
                                Group Area
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
                        
                        <!-- Group Rules Placeholder (Future) -->
                         <div class="editor-section">
                             <h4>Group Rules (e.g. Max Choices)</h4>
                             <div class="info-text">Coming soon...</div>
                         </div>
                    </div>
                </div>

                <!-- TAB 3: SETTINGS -->
                <div id="tab-content-settings" class="tab-content" style="display:none;">
                    <div class="editor-section">
                        <h4>File Operations</h4>
                        <div class="row-2">
                             <button class="full-width-btn" style="opacity:0.5; cursor:not-allowed;">📂 Load JSON</button>
                             <button class="full-width-btn primary-btn" onclick="CYOA.editor.exportConfig()">💾 Save JSON</button>
                        </div>
                    </div>
                    
                    <div class="editor-section">
                        <h4>Visual Settings</h4>
                         <div class="info-text">Shadows, Colors, Night Mode toggles will go here.</div>
                    </div>
                </div>

            </div>
        `;
        
        document.body.appendChild(sidebar);
        this.ruleBuilder.renderUI(document.getElementById('rule-builder-container'));
        
        // Listeners for inputs
        this.setupChoiceListeners();
        this.setupGroupListeners();
        this.setupLabelAutoHiding();
    }

    // ==================== TAB LOGIC ====================

    switchTab(tabName) {
        this.activeTab = tabName;

        // Visual Tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        // Content Visibility
        document.querySelectorAll('.tab-content').forEach(content => {
            content.style.display = 'none';
        });
        document.getElementById(`tab-content-${tabName}`).style.display = 'block';

        // Context Switching Logic
        document.body.classList.remove('edit-mode-choice', 'edit-mode-group');

        if (tabName === 'choice') {
            document.body.classList.add('edit-mode-choice');
            // If we have a selected item, ensure properties are shown
            if (this.selectedItem) {
                this.updateChoiceInputs();
                document.getElementById('choice-empty-state').style.display = 'none';
                document.getElementById('choice-props').style.display = 'block';
            }
        } else if (tabName === 'group') {
            document.body.classList.add('edit-mode-group');
            
            // Auto-select group if an item was selected
            if (this.selectedItem) {
                const group = this.engine.findGroupForItem(this.selectedItem.id);
                if (group) this.selectGroup(group);
            }
            
            // If we have a selected group, show properties
            if (this.selectedGroup) {
                document.getElementById('group-empty-state').style.display = 'none';
                document.getElementById('group-props').style.display = 'block';
            }
        } else {
            // Settings
        }
    }

    toggleAccordion(header) {
        header.classList.toggle('collapsed');
        const content = header.nextElementSibling;
        content.classList.toggle('collapsed');
    }

    // ==================== LABEL AUTO HIDING ====================
    // (Existing logic kept, just ensuring it triggers on tab switch)
    setupLabelAutoHiding() {
        const checkCollision = (input) => {
            const label = input.nextElementSibling;
            if (!label || !label.classList.contains('input-label')) return;

            const inputStyle = window.getComputedStyle(input);
            const labelStyle = window.getComputedStyle(label);

            if (input.tagName === 'TEXTAREA') {
                this.mirrorDiv.style.font = inputStyle.font;
                this.mirrorDiv.style.lineHeight = inputStyle.lineHeight;
                this.mirrorDiv.style.padding = inputStyle.padding;
                this.mirrorDiv.style.width = inputStyle.width;
                this.mirrorDiv.style.boxSizing = inputStyle.boxSizing;
                
                this.mirrorDiv.textContent = input.value;
                const marker = document.createElement('span');
                marker.textContent = '|'; 
                this.mirrorDiv.appendChild(marker);

                const markerRect = marker.getBoundingClientRect();
                const mirrorRect = this.mirrorDiv.getBoundingClientRect();
                const textBottomRelative = markerRect.bottom - mirrorRect.top;
                const textRightRelative = markerRect.right - mirrorRect.left;
                
                const labelWidth = label.offsetWidth + parseFloat(labelStyle.right || 0) + 5;
                const labelHeight = label.offsetHeight + parseFloat(labelStyle.bottom || 0) + 2;
                const inputHeight = input.clientHeight;

                if (input.scrollHeight > input.clientHeight) {
                    label.classList.add('label-hidden');
                    return;
                }
                const dangerZoneY = inputHeight - labelHeight;
                const dangerZoneX = input.clientWidth - labelWidth;

                if (textBottomRelative > dangerZoneY && textRightRelative > dangerZoneX) {
                    label.classList.add('label-hidden');
                } else {
                    label.classList.remove('label-hidden');
                }
                return;
            }

            // Simple Inputs
            const inputWidth = input.clientWidth;
            const labelTotalWidth = label.offsetWidth + parseFloat(labelStyle.right) + 8;
            this.measureContext.font = inputStyle.font;
            const textWidth = this.measureContext.measureText(input.value).width;

            if ((textWidth + 8) > (inputWidth - labelTotalWidth)) {
                label.classList.add('label-hidden');
            } else {
                label.classList.remove('label-hidden');
            }
        };

        const attach = () => {
             const inputs = document.querySelectorAll('#editor-sidebar input[type="text"], #editor-sidebar input[type="number"], #editor-sidebar textarea');
             inputs.forEach(input => {
                input.removeEventListener('input', input._labelHandler); // cleanup old
                input._labelHandler = () => checkCollision(input);
                input.addEventListener('input', input._labelHandler);
                checkCollision(input);
             });
        };

        // Attach periodically/on interaction
        this.triggerLabelCheck = attach;
        window.addEventListener('resize', attach);
        // Initial attach
        setTimeout(attach, 500); 
    }

    // ==================== INTERACTION HANDLERS ====================

    attachEventListeners() {
        document.addEventListener('mousedown', this.handleMouseDown.bind(this));
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
        document.addEventListener('mouseup', this.handleMouseUp.bind(this));
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
    }

    removeEventListeners() {
        // ... (standard removal code)
    }

    handleMouseDown(e) {
        if (!this.enabled) return;
        if (e.target.closest('#editor-sidebar')) return;

        let target = null;
        let objectToEdit = null;

        // Logic depends on active tab
        if (this.activeTab === 'group') {
            // In Group Mode: Try to click Group Zones
            target = e.target.closest('.info-zone');
            if (target) {
                // ID format: "group-ID"
                const gid = target.id.replace('group-', '');
                const group = this.engine.config.groups.find(g => g.id === gid);
                if (group) {
                    this.selectGroup(group);
                    objectToEdit = group;
                }
            }
        } else {
            // In Choice (or Settings) Mode: Try to click Items
            target = e.target.closest('.item-zone');
            if (target) {
                const itemId = target.dataset.itemId;
                const item = this.engine.findItem(itemId);
                if (item) {
                    this.selectChoice(item, target);
                    objectToEdit = item;
                    // Also update selected group reference for context
                    this.selectedGroup = this.engine.findGroupForItem(item.id);
                }
            } else {
                // Clicked void -> Deselect
                if(this.activeTab === 'choice') this.deselectChoice();
            }
        }

        if (objectToEdit && target) {
            target.classList.add('dragging');
            
            const rect = target.getBoundingClientRect();
            const handleX = rect.right - this.handleSize;
            const handleY = rect.bottom - this.handleSize;
            
            if (e.clientX >= handleX && e.clientY >= handleY) {
                this.isResizing = true;
            } else {
                this.isDragging = true;
            }
            
            this.dragStart = { x: e.clientX, y: e.clientY };
            // Ensure object has coords initialized
            if (!objectToEdit.coords) objectToEdit.coords = {x:0,y:0,w:100,h:100};
            this.initialRect = { ...objectToEdit.coords };
            
            // Scaling context
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
                    targetObj: objectToEdit // Reference to what we are moving
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
        
        // Update Data
        if (this.isDragging) {
            targetObj.coords.x = Math.round(this.initialRect.x + dx * scaleX);
            targetObj.coords.y = Math.round(this.initialRect.y + dy * scaleY);
        } else if (this.isResizing) {
            targetObj.coords.w = Math.max(20, Math.round(this.initialRect.w + dx * scaleX));
            targetObj.coords.h = Math.max(20, Math.round(this.initialRect.h + dy * scaleY));
        }
        
        // Visual Update (Direct DOM manipulation for performance)
        // Determine ID based on type
        let domId = targetObj.items ? `group-${targetObj.id}` : `btn-${targetObj.id}`;
        const element = document.getElementById(domId);
        
        if (element) {
            const style = CoordHelper.toPercent(targetObj.coords, dim);
            Object.assign(element.style, style);
        }
        
        // Update inputs live
        if (this.activeTab === 'group') this.updateGroupInputs();
        else this.updateChoiceInputs();
    }

    handleMouseUp(e) {
        document.querySelectorAll('.dragging').forEach(el => el.classList.remove('dragging'));
        this.isDragging = false;
        this.isResizing = false;
        this.dragContext = null;
    }

    handleKeyDown(e) {
        if (!this.enabled) return;
        // Delete support
        if (e.key === 'Delete') {
             const tag = document.activeElement.tagName;
             if (tag !== 'INPUT' && tag !== 'TEXTAREA') {
                 if (this.activeTab === 'choice') this.deleteSelectedItem();
                 // if (this.activeTab === 'group') this.deleteSelectedGroup(); // Not implemented yet safely
             }
        }
    }

    // ==================== SELECTION LOGIC ====================

    selectChoice(item, element) {
        this.selectedItem = item;
        
        // Visuals
        document.querySelectorAll('.editor-selected').forEach(el => el.classList.remove('editor-selected'));
        if(element) element.classList.add('editor-selected');
        
        // UI State
        document.getElementById('choice-empty-state').style.display = 'none';
        document.getElementById('choice-props').style.display = 'block';
        
        // Populate inputs
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

        // Visuals
        document.querySelectorAll('.info-zone.editor-selected').forEach(el => el.classList.remove('editor-selected'));
        const el = document.getElementById(`group-${group.id}`);
        if(el) el.classList.add('editor-selected');

        // UI State
        document.getElementById('group-empty-state').style.display = 'none';
        document.getElementById('group-props').style.display = 'block';
        
        this.updateGroupInputs();
    }

    // ==================== FORM HANDLING: CHOICE ====================

    updateChoiceInputs() {
        if (!this.selectedItem) return;
        const item = this.selectedItem;
        const group = this.engine.findGroupForItem(item.id);

        document.getElementById('edit-id').value = item.id || '';
        document.getElementById('edit-parent-group').value = group ? group.id : '?';
        document.getElementById('edit-title').value = item.title || '';
        document.getElementById('edit-description').value = item.description || '';
        
        document.getElementById('edit-x').value = Math.round(item.coords?.x || 0);
        document.getElementById('edit-y').value = Math.round(item.coords?.y || 0);
        document.getElementById('edit-w').value = Math.round(item.coords?.w || 0);
        document.getElementById('edit-h').value = Math.round(item.coords?.h || 0);

        if (this.triggerLabelCheck) this.triggerLabelCheck();
    }

    setupChoiceListeners() {
        const update = (key, val, isNum = false) => {
            if (!this.selectedItem) return;
            if (isNum) val = parseInt(val) || 0;
            
            // Nested coords check
            if (['x','y','w','h'].includes(key)) {
                if (!this.selectedItem.coords) this.selectedItem.coords = {};
                this.selectedItem.coords[key] = val;
            } else {
                this.selectedItem[key] = val;
            }
            this.renderer.renderButtons(); // Re-render to see changes
        };

        const map = {
            'edit-id': 'id',
            'edit-title': 'title',
            'edit-description': 'description',
            'edit-x': 'x', 'edit-y': 'y', 'edit-w': 'w', 'edit-h': 'h'
        };

        for (const [id, key] of Object.entries(map)) {
            const el = document.getElementById(id);
            if (!el) continue;
            const isNum = ['x','y','w','h'].includes(key);
            el.addEventListener('input', (e) => update(key, e.target.value, isNum));
        }
    }

    // ==================== FORM HANDLING: GROUP ====================

    updateGroupInputs() {
        if (!this.selectedGroup) return;
        const g = this.selectedGroup;

        document.getElementById('group-id').value = g.id || '';
        document.getElementById('group-title').value = g.title || '';
        document.getElementById('group-description').value = g.description || '';
        
        document.getElementById('group-x').value = Math.round(g.coords?.x || 0);
        document.getElementById('group-y').value = Math.round(g.coords?.y || 0);
        document.getElementById('group-w').value = Math.round(g.coords?.w || 0);
        document.getElementById('group-h').value = Math.round(g.coords?.h || 0);
        
        if (this.triggerLabelCheck) this.triggerLabelCheck();
    }

    setupGroupListeners() {
        const update = (key, val, isNum = false) => {
            if (!this.selectedGroup) return;
            if (isNum) val = parseInt(val) || 0;
            
            if (['x','y','w','h'].includes(key)) {
                if (!this.selectedGroup.coords) this.selectedGroup.coords = {};
                this.selectedGroup.coords[key] = val;
            } else {
                this.selectedGroup[key] = val;
            }
            this.renderer.renderButtons();
        };

        const map = {
            'group-id': 'id',
            'group-title': 'title',
            'group-description': 'description',
            'group-x': 'x', 'group-y': 'y', 'group-w': 'w', 'group-h': 'h'
        };

        for (const [id, key] of Object.entries(map)) {
            const el = document.getElementById(id);
            if (!el) continue;
            const isNum = ['x','y','w','h'].includes(key);
            el.addEventListener('input', (e) => update(key, e.target.value, isNum));
        }
    }

    // ==================== ACTIONS ====================

    deleteSelectedItem() {
        if (!this.selectedItem) return;
        if (!confirm('Delete this item?')) return;
        
        const group = this.engine.findGroupForItem(this.selectedItem.id);
        if (group) {
            const idx = group.items.indexOf(this.selectedItem);
            if (idx > -1) group.items.splice(idx, 1);
        }
        this.deselectChoice();
        this.renderer.renderButtons();
    }

    addNewItem() {
        // Add to currently selected group OR first group
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
        
        // Select it
        setTimeout(() => {
            const el = document.getElementById(`btn-${newItem.id}`);
            if (el) this.selectChoice(newItem, el);
        }, 50);
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