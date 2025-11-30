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
                <button class="close-btn" onclick="CYOA.editor.disable()">✕</button>
            </div>
            
            <div class="editor-section">
                <h4>Selection</h4>
                <div id="editor-selection-info" class="info-text">
                    Click on any item to edit
                </div>
            </div>
            
            <div class="editor-section" id="editor-item-props" style="display:none;">
                <h4>Item Properties</h4>
                <label>ID:</label><input type="text" id="edit-id" class="editor-input">
                <label>Title:</label><input type="text" id="edit-title" class="editor-input">
                <label>Description:</label><textarea id="edit-description" class="editor-textarea" rows="4"></textarea>
                
                <h4>Position & Size</h4>
                <div class="coords-grid">
                    <div><label>X:</label><input type="number" id="edit-x" class="editor-input"></div>
                    <div><label>Y:</label><input type="number" id="edit-y" class="editor-input"></div>
                    <div><label>W:</label><input type="number" id="edit-w" class="editor-input"></div>
                    <div><label>H:</label><input type="number" id="edit-h" class="editor-input"></div>
                </div>
                
                <h4>Rules</h4>
                <div id="rule-builder-container"></div>
                
                <button class="editor-btn delete-btn" onclick="CYOA.editor.deleteSelected()">🗑️ Delete Item</button>
            </div>
            
            <div class="editor-section">
                <h4>Actions</h4>
                <button class="editor-btn" onclick="CYOA.editor.addNewItem()">➕ Add New Item</button>
                <button class="editor-btn" onclick="CYOA.editor.exportConfig()">💾 Export JSON</button>
            </div>
            
            <div class="editor-section">
                <h4>Generated Code</h4>
                <textarea id="code-preview" class="code-preview" readonly></textarea>
                <button class="editor-btn" onclick="CYOA.editor.copyCode()">📋 Copy Code</button>
            </div>
        `;
        
        document.body.appendChild(sidebar);
        this.ruleBuilder.renderUI(document.getElementById('rule-builder-container'));
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
        
        // --- ADDED: Добавляем класс для отключения анимации ---
        target.classList.add('dragging');
        // -----------------------------------------------------

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
        
        // Кэширование размеров
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
        
        // Прямое обновление стилей (самый быстрый способ)
        const element = document.getElementById(`btn-${this.selectedItem.id}`);
        if (element) {
            const style = CoordHelper.toPercent(this.selectedItem.coords, dim);
            Object.assign(element.style, style);
        }
    }

    handleMouseUp(e) {
        // --- ADDED: Удаляем класс dragging у выбранного элемента ---
        if (this.selectedItem) {
            const element = document.getElementById(`btn-${this.selectedItem.id}`);
            if (element) element.classList.remove('dragging');
        }
        // -----------------------------------------------------------

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
        this.updateFormInputs();
        
        document.getElementById('editor-selection-info').innerHTML = `
            <strong>Selected:</strong> ${item.title || item.id}<br>
            <strong>Group:</strong> ${group.title || group.id}
        `;
        
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
        document.getElementById('code-preview').value = JSON.stringify(this.selectedItem, null, 2);
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
            description: 'Edit me!',
            coords: { x: 100, y: 100, w: 300, h: 200 },
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

    copyCode() {
        const code = document.getElementById('code-preview').value;
        navigator.clipboard.writeText(code).then(() => alert('Code copied!'));
    }
}