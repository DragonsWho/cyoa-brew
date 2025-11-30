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
        this.makeBoxesDraggable();
        console.log('✏️ Editor enabled');
    }

    disable() {
        if (!this.enabled) return;
        this.enabled = false;
        
        const sidebar = document.getElementById('editor-sidebar');
        if (sidebar) sidebar.remove();
        
        this.removeEventListeners();
        
        document.querySelectorAll('.click-zone').forEach(el => {
            el.classList.remove('editable');
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
                <h3>🎨 CYOA Editor</h3>
                <button class="close-btn" onclick="CYOA.controls.toggleDebug()">✕</button>
            </div>
            
            <div class="sidebar-scroll-content">
                <!-- Selection Info -->
                <div class="editor-section" style="padding-top:10px;">
                    <div id="editor-selection-info" class="info-text" style="font-size: 0.8rem; color: #888;">
                        No selection
                    </div>
                </div>
                
                <div id="editor-item-props" style="display:none;">
                    
                    <!-- Main Properties -->
                    <div class="editor-section">
                        <div class="row-2">
                            <div class="input-group">
                                <input type="text" id="edit-id">
                                <span class="input-label">ID</span>
                            </div>
                            <div class="input-group">
                                <input type="text" id="edit-group-display" readonly style="color:#888; cursor:default;">
                                <span class="input-label">GRP</span>
                            </div>
                        </div>
                        
                        <div class="input-group">
                            <input type="text" id="edit-title">
                            <span class="input-label">Title</span>
                        </div>
                        
                        <div class="input-group">
                            <textarea id="edit-description" rows="7"></textarea>
                            <span class="input-label" style="top: 8px;">Desc</span>
                        </div>
                    </div>

                    <!-- Position & Size (Accordion) -->
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
                    
                    <!-- Rules Container (Filled by RuleBuilder) -->
                    <div id="rule-builder-container"></div>
                    
                    <!-- Raw JSON Editor (Accordion) -->
                    <div class="editor-section">
                        <div class="accordion-header collapsed" onclick="CYOA.editor.toggleAccordion(this)">
                            🔧 Raw JSON
                        </div>
                        <div class="accordion-content collapsed">
                            <textarea id="edit-raw-json" class="code-editor"></textarea>
                            <div style="font-size:0.7rem; color:#666; margin-top:4px;">Edit above to update item</div>
                        </div>
                    </div>

                    <!-- Actions Footer -->
                    <div class="editor-section" style="margin-top: 20px; border-top: 1px solid #333; padding-top: 15px;">
                        <button class="delete-item-btn" onclick="CYOA.editor.deleteSelected()">
                            🗑️ Delete Item
                        </button>
                    </div>
                </div>

                <!-- Global Actions -->
                <div class="editor-section">
                     <div class="row-2">
                        <button class="full-width-btn" onclick="CYOA.editor.addNewItem()">➕ Add Item</button>
                        <button class="full-width-btn primary-btn" onclick="CYOA.editor.exportConfig()">💾 Save JSON</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(sidebar);
        this.ruleBuilder.renderUI(document.getElementById('rule-builder-container'));
        
        // Setup listeners
        this.setupFormListeners();
        this.setupJsonListener();
    }

    toggleAccordion(header) {
        header.classList.toggle('collapsed');
        const content = header.nextElementSibling;
        content.classList.toggle('collapsed');
    }

    // ==================== DRAG & DROP ====================

    makeBoxesDraggable() {
        document.querySelectorAll('.item-zone').forEach(el => {
            el.classList.add('editable');
        });
    }

    attachEventListeners() {
        document.addEventListener('mousedown', this.handleMouseDown.bind(this));
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
        document.addEventListener('mouseup', this.handleMouseUp.bind(this));
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
    }

    removeEventListeners() {
        document.removeEventListener('mousedown', this.handleMouseDown.bind(this));
        document.removeEventListener('mousemove', this.handleMouseMove.bind(this));
        document.removeEventListener('mouseup', this.handleMouseUp.bind(this));
        document.removeEventListener('keydown', this.handleKeyDown.bind(this));
    }

    handleMouseDown(e) {
        if (!this.enabled) return;

        // Ignore clicks inside sidebar
        if (e.target.closest('#editor-sidebar')) return;
        
        const target = e.target.closest('.item-zone');
        if (!target) {
            this.deselectItem();
            return;
        }
        
        const itemId = target.dataset.itemId;
        if (!itemId) return;
        
        const item = this.engine.findItem(itemId);
        const group = this.engine.findGroupForItem(itemId);
        
        if (!item || !group) return;
        
        this.selectItem(item, group, target);
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
        this.initialRect = { ...item.coords };
        
        // Cache dimensions
        const pageIndex = group.page || 0;
        const dim = this.renderer.pageDimensions[pageIndex];
        const container = document.querySelector(`#page-${pageIndex}`);
        
        if (!dim || !container) {
            this.dragContext = null; 
            return;
        }

        const containerRect = container.getBoundingClientRect();
        
        this.dragContext = {
            scaleX: dim.w / containerRect.width,
            scaleY: dim.h / containerRect.height,
            dim: dim
        };

        e.preventDefault();
    }

    handleMouseMove(e) {
        if (!this.enabled) return;
        if ((!this.isDragging && !this.isResizing) || !this.selectedItem || !this.dragContext) return;
        
        const dx = e.clientX - this.dragStart.x;
        const dy = e.clientY - this.dragStart.y;
        
        const { scaleX, scaleY, dim } = this.dragContext;
        
        if (this.isDragging) {
            this.selectedItem.coords.x = Math.round(this.initialRect.x + dx * scaleX);
            this.selectedItem.coords.y = Math.round(this.initialRect.y + dy * scaleY);
        } else if (this.isResizing) {
            this.selectedItem.coords.w = Math.max(20, Math.round(this.initialRect.w + dx * scaleX));
            this.selectedItem.coords.h = Math.max(20, Math.round(this.initialRect.h + dy * scaleY));
        }
        
        // Direct style update for performance
        const element = document.getElementById(`btn-${this.selectedItem.id}`);
        if (element) {
            const style = CoordHelper.toPercent(this.selectedItem.coords, dim);
            Object.assign(element.style, style);
        }
    }

    handleMouseUp(e) {
        if (this.selectedItem) {
            const element = document.getElementById(`btn-${this.selectedItem.id}`);
            if (element) element.classList.remove('dragging');
        }

        if (this.isDragging || this.isResizing) {
            this.updateFormInputs();
            this.updateCodePreview();
        }
        
        this.isDragging = false;
        this.isResizing = false;
        this.dragContext = null;
    }

    handleKeyDown(e) {
        if (!this.enabled) return;
        if (e.key === 'Delete' && this.selectedItem) {
            if (document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
                this.deleteSelected();
            }
        }
    }

    // ==================== SELECTION ====================

    selectItem(item, group, element) {
        this.selectedItem = item;
        this.selectedGroup = group;
        
        document.querySelectorAll('.item-zone').forEach(el => el.classList.remove('editor-selected'));
        element.classList.add('editor-selected');
        
        document.getElementById('editor-item-props').style.display = 'block';
        
        // Update Readonly Group Field
        const groupInput = document.getElementById('edit-group-display');
        if(groupInput) groupInput.value = group.title || group.id;

        this.updateFormInputs();
        
        document.getElementById('editor-selection-info').innerHTML = 
            `<span style="color:#4CAF50">Editing:</span> ${item.title || item.id}`;
        
        this.ruleBuilder.loadItem(item, group);
    }

    deselectItem() {
        this.selectedItem = null;
        this.selectedGroup = null;
        document.querySelectorAll('.item-zone').forEach(el => el.classList.remove('editor-selected'));
        document.getElementById('editor-item-props').style.display = 'none';
        document.getElementById('editor-selection-info').innerHTML = 'Click on any item to edit';
    }

    // ==================== FORM UPDATES ====================

    updateFormInputs() {
        if (!this.selectedItem) return;
        const item = this.selectedItem;
        
        document.getElementById('edit-id').value = item.id || '';
        document.getElementById('edit-title').value = item.title || '';
        document.getElementById('edit-description').value = item.description || '';
        
        document.getElementById('edit-x').value = Math.round(item.coords.x);
        document.getElementById('edit-y').value = Math.round(item.coords.y);
        document.getElementById('edit-w').value = Math.round(item.coords.w);
        document.getElementById('edit-h').value = Math.round(item.coords.h);
        
        this.updateCodePreview();
    }

    updateCodePreview() {
        if (!this.selectedItem) return;
        const el = document.getElementById('edit-raw-json');
        if (el) {
            el.value = JSON.stringify(this.selectedItem, null, 2);
        }
    }

    setupFormListeners() {
        const inputs = {
            'edit-id': (val) => { this.selectedItem.id = val; },
            'edit-title': (val) => { this.selectedItem.title = val; },
            'edit-description': (val) => { this.selectedItem.description = val; },
            'edit-x': (val) => { this.selectedItem.coords.x = parseInt(val) || 0; },
            'edit-y': (val) => { this.selectedItem.coords.y = parseInt(val) || 0; },
            'edit-w': (val) => { this.selectedItem.coords.w = parseInt(val) || 20; },
            'edit-h': (val) => { this.selectedItem.coords.h = parseInt(val) || 20; }
        };
        
        for (const [id, handler] of Object.entries(inputs)) {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', (e) => {
                    if (this.selectedItem) {
                        handler(e.target.value);
                        this.renderer.renderButtons();
                        this.updateCodePreview();
                    }
                });
            }
        }
    }

    setupJsonListener() {
        const jsonArea = document.getElementById('edit-raw-json');
        if (jsonArea) {
            jsonArea.addEventListener('input', (e) => {
                try {
                    const newData = JSON.parse(e.target.value);
                    if (this.selectedItem && this.selectedGroup) {
                        // Update object properties in place
                        Object.keys(this.selectedItem).forEach(key => delete this.selectedItem[key]);
                        Object.assign(this.selectedItem, newData);
                        
                        // Refresh UI
                        this.renderer.renderButtons();
                        
                        // Refresh Inputs without infinite loop
                        // (We manually update fields instead of calling updateFormInputs which updates JSON)
                        document.getElementById('edit-id').value = newData.id || '';
                        document.getElementById('edit-title').value = newData.title || '';
                        document.getElementById('edit-description').value = newData.description || '';
                        document.getElementById('edit-x').value = newData.coords?.x || 0;
                        document.getElementById('edit-y').value = newData.coords?.y || 0;
                        document.getElementById('edit-w').value = newData.coords?.w || 0;
                        document.getElementById('edit-h').value = newData.coords?.h || 0;
                        
                        this.ruleBuilder.loadItem(this.selectedItem, this.selectedGroup);
                        
                        // Re-select visually in case ID changed
                        const newEl = document.getElementById(`btn-${newData.id}`);
                        if (newEl) newEl.classList.add('editor-selected');
                    }
                } catch (err) {
                    // Invalid JSON, ignore or show error state
                }
            });
        }
    }

    // ==================== ACTIONS ====================

    deleteSelected() {
        if (!this.selectedItem || !this.selectedGroup) return;
        if (!confirm(`Delete "${this.selectedItem.title || this.selectedItem.id}"?`)) return;
        
        const index = this.selectedGroup.items.indexOf(this.selectedItem);
        if (index > -1) this.selectedGroup.items.splice(index, 1);
        
        this.deselectItem();
        this.renderer.renderButtons();
        console.log('🗑️ Item deleted');
    }

    addNewItem() {
        let group = this.engine.config.groups[0];
        if (!group) return;
        
        const newItem = {
            id: `new_item_${Date.now()}`,
            title: 'New Item',
            description: 'Description',
            coords: { x: 100, y: 100, w: 200, h: 100 },
            cost: []
        };
        
        group.items.push(newItem);
        this.renderer.renderButtons();
        
        const element = document.getElementById(`btn-${newItem.id}`);
        if (element) this.selectItem(newItem, group, element);
        
        console.log('➕ New item added');
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