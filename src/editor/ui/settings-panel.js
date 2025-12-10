/**
 * src/ui/editor/ui/settings-panel.js
 * Settings Tab - General Configuration
 */

import { createStylePanelHTML } from './style-panel.js';
import { ICONS } from './icons.js';

export function createSettingsPanel() {
    return `
        <div id="tab-content-settings" class="tab-content" style="display:none;">
    
            <!-- File Operations -->
            <div class="editor-section">
                <div class="accordion-header" onclick="CYOA.editor.toggleAccordion(this)">
    <span style="display:flex; align-items:center; gap:6px;">${ICONS.save} File Operations</span>
</div>
                <div class="accordion-content">
                    <button class="full-width-btn" style="background:#555; margin-bottom:10px;" onclick="CYOA.editor.newProject()">${ICONS.file} New Project</button>
                    <button class="full-width-btn" style="background:#4b6cb7; margin-bottom:10px;" onclick="document.getElementById('load-config-input').click()">${ICONS.folder} Load Project</button>
                    <div class="row-buttons">
                        <button class="action-btn primary-btn" onclick="CYOA.editor.exportConfig()">${ICONS.save} Save JSON</button>
                        <button class="action-btn" style="background:#444;" onclick="CYOA.editor.exportZip()">${ICONS.zip} Save Zip</button>
                    </div>
                </div>
            </div>

            <!-- Active Card Style Settings -->
            ${createStylePanelHTML()}

            <!-- Point Systems -->
            <div class="editor-section">
                <div class="accordion-header collapsed" onclick="CYOA.editor.toggleAccordion(this)">${ICONS.coin} Point Systems</div>
                <div class="accordion-content collapsed">
                    <div id="points-list-container" style="margin-bottom:10px;"></div>
                    <button class="full-width-btn" style="background:#2e7d32;" onclick="CYOA.editor.addNewPointSystem()">${ICONS.add} Add Currency</button>
                </div>
            </div>
        </div>
    `;
}

export const SettingsPanelMixin = {
    selectPage(index) {
        this.activePageIndex = index;
        const pageEl = document.getElementById(`page-${index}`);
        if (pageEl) {
            pageEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        this.renderPageNavigationBar();
        this.deselectChoice();
        this.selectedGroup = null;
        if (this.activeTab === 'group') {
            document.getElementById('group-props').style.display = 'none';
            document.getElementById('group-empty-state').style.display = 'block';
        }
    },

    updateSettingsInputs() {
        const notesEl = document.getElementById('project-notes');
        if (notesEl) {
            notesEl.value = this.engine.config.notes || '';
        }
        this.renderPageNavigationBar();
        this.renderPointsList();
        
        // Also update style settings inputs
        if (this.loadStyleSettings) {
            this.loadStyleSettings();
        }
    },

    renderPagesList() {
        this.renderPageNavigationBar();
    },
    
    renderPointsList() {
        const container = document.getElementById('points-list-container');
        if (!container) return;
        const points = this.engine.config.points || [];
        container.innerHTML = points.map((p, idx) => `
            <div style="background:#222; padding:5px; margin-bottom:5px; border-radius:3px; display:flex; gap:5px; align-items:center;">
                <input style="width:60px; background:#333; border:none; color:#fff; padding:4px;" value="${p.id}" onchange="CYOA.editor.updatePointSystem(${idx}, 'id', this.value)">
                <input style="flex:1; min-width:0; background:#333; border:none; color:#fff; padding:4px;" value="${p.name}" onchange="CYOA.editor.updatePointSystem(${idx}, 'name', this.value)">
                <input style="width:40px; background:#333; border:none; color:#fff; padding:4px; text-align:center;" type="number" value="${p.start}" onchange="CYOA.editor.updatePointSystem(${idx}, 'start', this.value)">
                <button style="width:24px; height:24px; background:#b71c1c; border:none; color:white; border-radius:3px; cursor:pointer; display:flex; align-items:center; justify-content:center;" onclick="CYOA.editor.deletePointSystem(${idx})">${ICONS.delete}</button>
            </div>
        `).join('');
    }
};
