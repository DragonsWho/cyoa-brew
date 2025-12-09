/**
 * src/editor/ui/ai-panel.js
 * AI OCR Tab Panel - Combines LLM Assistant and SAM Auto-Detect
 */

import { createLlmPanelHTML } from './llm-panel.js';

export function createAiPanelHTML() {
    return `
        <div id="tab-content-ai" class="tab-content" style="display:none;">
            

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


            <!-- SAM Auto-Detect (Moved from Settings) -->
            <div class="editor-section">
                <div class="accordion-header collapsed" onclick="CYOA.editor.toggleAccordion(this)">🤖 Auto-Detect (SAM)</div>
                <div class="accordion-content collapsed">
                    <div class="info-text" style="font-size:0.75rem; margin:5px 0 10px 0; padding:8px;">
                        Uses Roboflow to detect items in your image automatically.
                    </div>
                    <div class="input-group">
                        <input type="text" 
                            id="roboflow-api-key" 
                            class="masked-input" 
                            placeholder="Key..." 
                            autocomplete="off" 
                            spellcheck="false">
                        <span class="input-label">API Key</span>
                    </div>
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

            <!-- LLM Assistant (Imported from existing module) -->
            ${createLlmPanelHTML()}
            
        </div>
    `;
}