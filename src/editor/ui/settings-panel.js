/**
 * src/editor/ui/settings-panel.js
 * Settings Tab - General Configuration
 */

import { createStylePanelHTML } from './style-panel.js';
import { createEditorPreferencesHTML } from './editor-preferences.js';
import { POINT_BAR_PRESETS } from '../data/style-presets.js';
import { ICONS } from './icons.js';

export function createSettingsPanel() {
    // Generate preset options for the dropdown
    const pointBarPresetsOpts = `<option value="">-- Choose Preset --</option>` + 
        POINT_BAR_PRESETS.map((p, i) => `<option value="${i}">${p.name}</option>`).join('');

    return `
        <div id="tab-content-settings" class="tab-content" style="display:none;">
            
            <!-- Editor Preferences -->
            ${createEditorPreferencesHTML()}

            <!-- Auto-Save (NEW) -->
            <div class="editor-section">
                <div class="accordion-header collapsed" onclick="CYOA.editor.toggleAccordion(this)">
                    <span style="display:flex; align-items:center; gap:6px;">${ICONS.history} Auto-Save & Recovery</span>
                </div>
                <div class="accordion-content collapsed">
                    <div style="background:var(--ed-panel-bg); padding:10px; border-radius:4px; margin-bottom:10px; border:1px solid var(--ed-border);">
                        <div style="display:flex; align-items:center; gap:8px; margin-bottom:10px;">
                            <input type="checkbox" id="autosave-toggle" style="cursor:pointer;">
                            <label for="autosave-toggle" style="cursor:pointer; color:var(--ed-fg); font-size:0.9rem;">Enable Auto-Save (10m)</label>
                        </div>
                        <div style="font-size:0.75rem; color:#888; margin-bottom:10px;">Saves cyclically to browser storage.</div>
                        
                        <!-- Slot 1 -->
                        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:6px; font-size:0.8rem; border-bottom:1px solid #333; padding-bottom:4px;">
                            <div style="display:flex; flex-direction:column;">
                                <span style="font-weight:bold; color:#4CAF50;">Slot 1</span>
                                <span id="autosave-time-1" style="font-size:0.7rem; color:#666;">Empty</span>
                            </div>
                            <button class="action-btn" style="width:auto; padding:4px 10px; font-size:0.75rem;" onclick="CYOA.editor.loadAutoSave(1)">Load</button>
                        </div>

                        <!-- Slot 2 -->
                        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:6px; font-size:0.8rem; border-bottom:1px solid #333; padding-bottom:4px;">
                            <div style="display:flex; flex-direction:column;">
                                <span style="font-weight:bold; color:#2196F3;">Slot 2</span>
                                <span id="autosave-time-2" style="font-size:0.7rem; color:#666;">Empty</span>
                            </div>
                            <button class="action-btn" style="width:auto; padding:4px 10px; font-size:0.75rem;" onclick="CYOA.editor.loadAutoSave(2)">Load</button>
                        </div>

                        <!-- Slot 3 -->
                        <div style="display:flex; align-items:center; justify-content:space-between; font-size:0.8rem;">
                            <div style="display:flex; flex-direction:column;">
                                <span style="font-weight:bold; color:#FF9800;">Slot 3</span>
                                <span id="autosave-time-3" style="font-size:0.7rem; color:#666;">Empty</span>
                            </div>
                            <button class="action-btn" style="width:auto; padding:4px 10px; font-size:0.75rem;" onclick="CYOA.editor.loadAutoSave(3)">Load</button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- File Operations -->
            <div class="editor-section">
                <div class="accordion-header" onclick="CYOA.editor.toggleAccordion(this)">
                    <span style="display:flex; align-items:center; gap:6px;">${ICONS.save} File Operations</span>
                </div>
                <div class="accordion-content">
                    <div style="display:flex; flex-direction:column; gap:8px; margin-bottom:10px;">
                        <button class="full-width-btn" style="display:flex; align-items:center; justify-content:center; gap:6px;" onclick="CYOA.editor.newProject()">
                            ${ICONS.new_file} New Project
                        </button>
                        <button class="full-width-btn" style="background:#4b6cb7 !important; color:white !important; display:flex; align-items:center; justify-content:center; gap:6px;" onclick="document.getElementById('load-config-input').click()">
                            ${ICONS.upload} Load Project
                        </button>
                        <button class="action-btn primary-btn" style="width:100%; display:flex; align-items:center; justify-content:center; gap:6px;" onclick="CYOA.editor.exportConfig()">
                            ${ICONS.download} Save JSON
                        </button>
                        <button class="action-btn" style="background:#444 !important; color:white !important; width:100%; display:flex; align-items:center; justify-content:center; gap:6px;" onclick="CYOA.editor.exportZip()">
                            ${ICONS.archive} Save Zip
                        </button>
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
                    <button class="full-width-btn" style="background:#2e7d32 !important; color:white !important;" onclick="CYOA.editor.addNewPointSystem()">${ICONS.add} Add Currency</button>
                </div>
            </div>

            <!-- Bottom Point Bar Style -->
            <div class="editor-section">
                <div class="accordion-header collapsed" onclick="CYOA.editor.toggleAccordion(this)">
                    <span style="display:flex; align-items:center; gap:6px;">${ICONS.edit} Bottom Bar Style</span>
                </div>
                <div class="accordion-content collapsed">
                    <div style="margin-bottom:8px;">
                        <select id="pb-preset-select" class="style-input" style="width:100%;" onchange="CYOA.editor.applyPointBarPreset(this.value)">
                            ${pointBarPresetsOpts}
                        </select>
                    </div>
                    <div class="style-row">
                        <label class="style-label">Bar BG</label>
                        <input type="color" id="style-pb-bg" class="style-input square-input" title="Background Color">
                        <span style="font-size:0.7em; color:#888; margin-left:5px;">Background</span>
                    </div>
                    <div class="style-row">
                        <label class="style-label">Name</label>
                        <input type="color" id="style-pb-label" class="style-input square-input" title="Name/Icon Color">
                        <span style="font-size:0.7em; color:#888; margin-left:5px;">Label Text & Icons</span>
                    </div>
                    <div class="style-row">
                        <label class="style-label">Value</label>
                        <input type="color" id="style-pb-val" class="style-input square-input" title="Value Color">
                        <span style="font-size:0.7em; color:#888; margin-left:5px;">Numbers</span>
                    </div>
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
        
        if (this.loadStyleSettings) {
            this.loadStyleSettings();
        }
        
        const prefColor = document.getElementById('editor-pref-color');
        if(prefColor) prefColor.value = localStorage.getItem('cyoa-editor-color') || 'red';

        // Update AutoSave UI
        const asToggle = document.getElementById('autosave-toggle');
        if(asToggle) asToggle.checked = this.isAutoSaveEnabled;
        if(this.updateAutoSaveUI) this.updateAutoSaveUI();
    },

    renderPagesList() {
        this.renderPageNavigationBar();
    },
    
    renderPointsList() {
        const container = document.getElementById('points-list-container');
        if (!container) return;
        const points = this.engine.config.points || [];
        container.innerHTML = points.map((p, idx) => `
            <div style="background:var(--ed-panel-bg); padding:5px; margin-bottom:5px; border-radius:3px; display:flex; gap:5px; align-items:center; border:1px solid var(--ed-border);">
                <input style="width:60px; background:var(--ed-input-bg); border:1px solid var(--ed-input-border); color:var(--ed-input-fg); padding:4px;" value="${p.id}" onchange="CYOA.editor.updatePointSystem(${idx}, 'id', this.value)">
                <input style="flex:1; min-width:0; background:var(--ed-input-bg); border:1px solid var(--ed-input-border); color:var(--ed-input-fg); padding:4px;" value="${p.name}" onchange="CYOA.editor.updatePointSystem(${idx}, 'name', this.value)">
                <input style="width:40px; background:var(--ed-input-bg); border:1px solid var(--ed-input-border); color:var(--ed-input-fg); padding:4px; text-align:center;" type="number" value="${p.start}" onchange="CYOA.editor.updatePointSystem(${idx}, 'start', this.value)">
                <button style="width:24px; height:24px; background:#b71c1c; border:none; color:white; border-radius:3px; cursor:pointer; display:flex; align-items:center; justify-content:center;" onclick="CYOA.editor.deletePointSystem(${idx})">${ICONS.delete}</button>
            </div>
        `).join('');
    }
};