/**
 * src/ui/editor/ui/choice-panel.js
 * Choice/Item Editing Panel HTML
 */

import { imageCropper } from '../utils/image-tools.js';
import { ICONS } from './icons.js';

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
                            <button class="action-btn" style="background:#444;" onclick="CYOA.editor.alignSelectedItems('top')">${ICONS.arrow_up} Align Top</button>
                            <button class="action-btn" style="background:#444;" onclick="CYOA.editor.alignSelectedItems('bottom')">${ICONS.arrow_down} Align Bottom</button>
                        </div>
                        <div class="row-buttons">
                            <button class="action-btn" style="background:#444;" onclick="CYOA.editor.alignSelectedItems('left')">${ICONS.arrow_left} Align Left</button>
                            <button class="action-btn" style="background:#444;" onclick="CYOA.editor.alignSelectedItems('right')">${ICONS.arrow_right} Align Right</button>
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
                    <button class="action-btn btn-delete" onclick="CYOA.editor.deleteSelectedItems()">${ICONS.delete} Delete All</button>
                </div>
            </div>

            <div id="choice-empty-state" class="info-text">
                <p>Select a card to edit.</p>
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
                    
                    <!-- SPECIAL FLAGS -->
                    <div style="display: flex; gap: 10px; margin-bottom: 8px;">
                        <div class="input-group" style="flex:1; display: flex; align-items: center; padding: 4px 5px; background: transparent; border: none;">
                            <input type="checkbox" id="edit-selectable" style="width: auto; margin: 0 8px 0 0; cursor: pointer;">
                            <label for="edit-selectable" style="color: #ccc; font-size: 0.8rem; cursor: pointer;">Static</label>
                        </div>
                        <div class="input-group" style="flex:1; display: flex; align-items: center; padding: 4px 5px; background: transparent; border: none;">
                            <input type="checkbox" id="edit-visual-card" style="width: auto; margin: 0 8px 0 0; cursor: pointer;">
                            <label for="edit-visual-card" style="color: #4CAF50; font-size: 0.8rem; cursor: pointer; font-weight:bold;">Visual Card</label>
                        </div>
                    </div>

                    <!-- VISUAL CARD IMAGE (Only visible if visual card is checked) -->
                    <div id="visual-card-options" style="display:none; margin-bottom: 10px; background: #222; padding: 8px; border-radius: 4px; border: 1px solid #444;">
                         <div style="display:flex; gap:10px; align-items:center;">
                             <div id="vc-img-preview" style="width: 40px; height: 40px; background: #000; background-size: cover; background-position: center; border: 1px solid #555;"></div>
                             <div style="flex:1;">
  
                                <button class="full-width-btn" style="margin-top:0; font-size:0.8rem;" onclick="document.getElementById('vc-image-upload').click()">${ICONS.image} Upload & Crop Image</button>
                                <input type="file" id="vc-image-upload" accept="image/*" style="display:none;">
                             </div>
                         </div>
                    </div>

                    <div class="row-2">
                        <div class="input-group">
                            <input type="number" id="edit-min_quantity" placeholder="0">
                            <span class="input-label">Min Qty</span>
                        </div>
                        <div class="input-group">
                            <input type="number" id="edit-max_quantity" min="1" placeholder="1">
                            <span class="input-label">Max Qty</span>
                        </div>
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
                    <button class="action-btn btn-delete" onclick="CYOA.editor.deleteSelectedItem()">${ICONS.delete} Delete</button>
                </div>
            </div>
            <div class="editor-section editor-actions-fixed">
                <button class="action-btn btn-add full-width-btn" onclick="CYOA.editor.addNewItem()">${ICONS.add} Add New Card</button>
            </div>
        </div>
    `;
}

export const ChoicePanelMixin = {
    // Inject image cropper
    imageCropper: imageCropper,

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
        document.getElementById('edit-max_quantity').value = item.max_quantity !== undefined ? item.max_quantity : 1;
        document.getElementById('edit-min_quantity').value = item.min_quantity !== undefined ? item.min_quantity : 0;
        document.getElementById('edit-title').value = item.title || '';
        document.getElementById('edit-description').value = item.description || '';
        document.getElementById('edit-tags').value = (item.tags || []).join(', ');
        ['x','y','w','h'].forEach(k => { document.getElementById(`edit-${k}`).value = Math.round(item.coords?.[k] || 0); });
        
        // Static Checkbox
        const selCheck = document.getElementById('edit-selectable');
        if (selCheck) selCheck.checked = (item.selectable === false);

        // Visual Card Logic
        const vcCheck = document.getElementById('edit-visual-card');
        const vcOptions = document.getElementById('visual-card-options');
        const vcPreview = document.getElementById('vc-img-preview');
        
        if (vcCheck) {
            const isVc = !!item.isVisualCard;
            vcCheck.checked = isVc;
            if (isVc) {
                vcOptions.style.display = 'block';
                vcPreview.style.backgroundImage = item.cardImage ? `url('${item.cardImage}')` : 'none';
            } else {
                vcOptions.style.display = 'none';
            }
        }

        const el = document.getElementById(`btn-${item.id}`);
        if(el) el.setAttribute('data-editor-title', item.title || item.id);
        this.updateCodePreview();
    }
};