/**
 * src/ui/editor/ui/settings-panel.js
 */

import { createLlmPanelHTML } from './llm-panel.js';

export function createSettingsPanel() {
    return `
        <div id="tab-content-settings" class="tab-content" style="display:none;">
            
            <!-- Project Notes -->
            <div class="editor-section"> 
                <div class="accordion-header collapsed" onclick="CYOA.editor.toggleAccordion(this)">📝 Project Notes & Global Rules</div> 
                <div class="accordion-content collapsed">
                    <div style="margin-bottom:5px; font-size:0.75rem; color:#888;">
                        Shared context for the LLM. Keep track of global mechanics here.
                    </div>
                    <textarea id="project-notes" class="code-editor" style="height:150px; font-family: sans-serif; font-size: 0.9rem; color:#ddd;" placeholder="Enter global game rules or notes here..."></textarea>
                </div>
            </div>

            <!-- Removed 'Page Operations' accordion as button moved to navbar -->

            <!-- File Operations -->
            <div class="editor-section">
                <div class="accordion-header" onclick="CYOA.editor.toggleAccordion(this)">💾 File Operations</div>
                <div class="accordion-content">
                    <button class="full-width-btn" style="background:#555; margin-bottom:10px;" onclick="CYOA.editor.newProject()">📄 New Project</button>
                    <button class="full-width-btn" style="background:#4b6cb7; margin-bottom:10px;" onclick="document.getElementById('load-config-input').click()">📂 Load Project</button>
                    <div class="row-buttons">
                        <button class="action-btn primary-btn" onclick="CYOA.editor.exportConfig()">💾 Save JSON</button>
                        <button class="action-btn" style="background:#444;" onclick="CYOA.editor.exportZip()">📦 Save Zip</button>
                    </div>
                </div>
            </div>

            <!-- AI Assistant -->
            ${createLlmPanelHTML()}

            <!-- SAM Auto-Detect -->
            <div class="editor-section">
                <div class="accordion-header collapsed" onclick="CYOA.editor.toggleAccordion(this)">🤖 Auto-Detect (SAM)</div>
                <div class="accordion-content collapsed">
                    <div class="input-group"><input type="password" id="roboflow-api-key" placeholder="Key..."><span class="input-label">API Key</span></div>
                    <div style="display:flex; gap:5px; margin-top:10px;">
                        <div class="input-group"><input type="text" id="roboflow-workspace" value="1-wnpqj"><span class="input-label">Workspace</span></div>
                        <div class="input-group"><input type="text" id="roboflow-workflow" value="sam3-with-prompts"><span class="input-label">Workflow</span></div>
                    </div>
                    <div class="input-group" style="margin-top:10px;"><input type="text" id="sam-prompt" value="game card"><span class="input-label">Prompt</span></div>
                    <div style="margin-top:10px;">
                        <div style="display:flex; justify-content:space-between; font-size:0.8rem; color:#888;"><span>Shave</span><span id="shave-val">2.0%</span></div>
                        <input type="range" id="sam-shave" min="0.005" max="0.05" step="0.005" value="0.02" style="width:100%;" oninput="document.getElementById('shave-val').textContent = (this.value*100).toFixed(1)+'%'">
                    </div>
                    <button id="btn-run-sam" class="full-width-btn primary-btn" style="margin-top:15px;">🚀 Run Inference</button>
                    <div id="sam-status" style="margin-top:10px; font-size:0.75rem; color:#ffd700; min-height:1.2em;"></div>
                     <div class="editor-section" style="margin-top:15px; border:1px solid #333; padding:0;">
                        <div class="accordion-header collapsed" onclick="CYOA.editor.toggleAccordion(this)" style="padding:5px 10px; font-size:0.8rem;">🐞 Debug Gallery</div>
                        <div class="accordion-content collapsed" id="sam-debug-gallery" style="background:#000; padding:10px;"></div>
                    </div>
                </div>
            </div>

            <!-- Point Systems -->
            <div class="editor-section">
                <div class="accordion-header collapsed" onclick="CYOA.editor.toggleAccordion(this)">💰 Point Systems</div>
                <div class="accordion-content collapsed">
                    <div id="points-list-container" style="margin-bottom:10px;"></div>
                    <button class="full-width-btn" style="background:#2e7d32;" onclick="CYOA.editor.addNewPointSystem()">➕ Add Currency</button>
                </div>
            </div>
        </div>
    `;
}

export const SettingsPanelMixin = {
    selectPage(index) {
        this.activePageIndex = index;
        
        // Scroll workspace to the selected page
        const pageEl = document.getElementById(`page-${index}`);
        if (pageEl) {
            pageEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        this.renderPageNavigationBar(); // Re-render nav to update active state
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
    },

    // Legacy method redirection
    renderPagesList() {
        this.renderPageNavigationBar();
    },
    
    renderPointsList() {
        const container = document.getElementById('points-list-container');
        if (!container) return;
        const points = this.engine.config.points || [];
        container.innerHTML = points.map((p, idx) => `
            <div style="background:#222; padding:5px; margin-bottom:5px; border-radius:3px; display:flex; gap:5px;">
                <input style="width:80px; background:#333; border:none; color:#fff;" value="${p.id}" onchange="CYOA.editor.updatePointSystem(${idx}, 'id', this.value)">
                <input style="flex:1; background:#333; border:none; color:#fff;" value="${p.name}" onchange="CYOA.editor.updatePointSystem(${idx}, 'name', this.value)">
                <input style="width:50px; background:#333; border:none; color:#fff;" type="number" value="${p.start}" onchange="CYOA.editor.updatePointSystem(${idx}, 'start', this.value)">
                <button style="background:#b71c1c; border:none; color:white;" onclick="CYOA.editor.deletePointSystem(${idx})">🗑️</button>
            </div>
        `).join('');
    }
};