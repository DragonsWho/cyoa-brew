/**
 * src/ui/editor/ui/group-panel.js
 * Group Editing Panel HTML
 */

export function createGroupPanel() {
    return `
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
    `;
}

export const GroupPanelMixin = {
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
    }
};