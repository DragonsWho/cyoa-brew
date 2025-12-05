/**
 * src/ui/editor/ui/choice-panel.js
 * Choice/Item Editing Panel HTML
 */

export function createChoicePanel() {
    return `
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
    `;
}

export const ChoicePanelMixin = {
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
    }
};