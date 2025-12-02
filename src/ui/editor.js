/**
 * CYOA Editor - Visual editing mode
 * 
 * Architecture v2: Works with config.pages[].layout[]
 * Features: Auto-grouping by coordinates, auto-sorting
 */

import { CoordHelper } from '../utils/coords.js';
import { RuleBuilder } from './rule-builder.js';
import { AutoDetector } from '../utils/autodetect.js';
import { ProjectStorage } from '../utils/storage.js';

export class CYOAEditor {
    constructor(engine, renderer) {
        this.engine = engine;
        this.renderer = renderer;
        this.ruleBuilder = new RuleBuilder(engine);
        this.autoDetector = new AutoDetector(); 
        
        this.selectedItem = null;
        this.selectedGroup = null;
        this.activePageIndex = 0;
        this.activeTab = 'choice'; 
        
        this.measureContext = document.createElement('canvas').getContext('2d');
        
        this.mirrorDiv = document.createElement('div');
        this.mirrorDiv.style.cssText = 'position:absolute; visibility:hidden; height:auto; overflow:hidden; white-space:pre-wrap; word-wrap:break-word;';
        document.body.appendChild(this.mirrorDiv);

        this.isDragging = false;
        this.isResizing = false;
        this.dragStart = { x: 0, y: 0 };
        this.initialRect = {};
        this.handleSize = 10;
        this.dragContext = null;
        
        this.enabled = false;
        this.triggerLabelCheck = null;

        // LLM Defaults
        this.llmConfig = {
            provider: 'google', 
            baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models/',
            apiKey: '',
            model: 'gemini-2.0-flash',
            systemPrompt: `You are a layout assistant. I have a JSON with page layouts containing items and groups with coordinates.
Your task is to:
1. "Smart Align" - fix coordinates so elements are properly aligned in rows/columns
2. Group related items together
3. Keep the structure: pages[] -> layout[] -> items and groups

Return ONLY valid JSON, no explanations.`
        };

        console.log('✏️ Editor initialized');
    }

    enable() {
        if (this.enabled) return;
        this.enabled = true;
        this.createEditorUI();
        this.attachEventListeners();
        this.switchTab('choice');
        console.log('✏️ Editor enabled');
    }

    disable() {
        if (!this.enabled) return;
        this.enabled = false;
        const sidebar = document.getElementById('editor-sidebar');
        if (sidebar) sidebar.remove();
        this.removeEventListeners();
        document.querySelectorAll('.item-zone, .info-zone').forEach(el => {
            el.classList.remove('editable', 'editor-selected');
        });
        console.log('✏️ Editor disabled');
    }

    // ==================== HELPER: Get current page ====================
    
    getCurrentPage() {
        const pages = this.engine.config.pages || [];
        return pages[this.activePageIndex] || null;
    }

    getPageByIndex(index) {
        const pages = this.engine.config.pages || [];
        return pages[index] || null;
    }

    // ==================== HELPER: Find item's parent ====================
    
    findItemParent(itemId) {
        const pages = this.engine.config.pages || [];
        
        for (const page of pages) {
            const layout = page.layout || [];
            
            for (let i = 0; i < layout.length; i++) {
                const element = layout[i];
                if (element.type === 'item' && element.id === itemId) {
                    return { array: layout, index: i, page, group: null };
                }
                if (element.type === 'group') {
                    const items = element.items || [];
                    for (let j = 0; j < items.length; j++) {
                        if (items[j].id === itemId) {
                            return { array: items, index: j, group: element, page };
                        }
                    }
                }
            }
        }
        return null;
    }

    // ==================== HELPER: Find group's parent ====================
    
    findGroupParent(groupId) {
        const pages = this.engine.config.pages || [];
        
        for (const page of pages) {
            const layout = page.layout || [];
            for (let i = 0; i < layout.length; i++) {
                if (layout[i].type === 'group' && layout[i].id === groupId) {
                    return { array: layout, index: i, page };
                }
            }
        }
        return null;
    }

    // ==================== HELPER: Check if point is inside rect ====================
    
    isInsideRect(point, rect) {
        if (!rect) return false;
        return (
            point.x >= rect.x &&
            point.x <= rect.x + rect.w &&
            point.y >= rect.y &&
            point.y <= rect.y + rect.h
        );
    }

    // ==================== HELPER: Get item center ====================
    
    getItemCenter(item) {
        if (!item.coords) return { x: 0, y: 0 };
        return {
            x: item.coords.x + (item.coords.w || 0) / 2,
            y: item.coords.y + (item.coords.h || 0) / 2
        };
    }

    // ==================== HELPER: Find group containing point ====================
    
    findGroupAtPoint(point, page) {
        if (!page || !page.layout) return null;
        
        for (const element of page.layout) {
            if (element.type === 'group' && element.coords) {
                if (this.isInsideRect(point, element.coords)) {
                    return element;
                }
            }
        }
        return null;
    }

    // ==================== HELPER: Move item to new parent ====================
    
    moveItemToGroup(item, targetGroup, page) {
        const parent = this.findItemParent(item.id);
        if (!parent) return false;

        // Remove from current location
        parent.array.splice(parent.index, 1);

        if (targetGroup) {
            // Add to group's items
            if (!targetGroup.items) targetGroup.items = [];
            targetGroup.items.push(item);
            console.log(`📦 Moved "${item.id}" into group "${targetGroup.id}"`);
        } else {
            // Add to page layout root
            page.layout.push(item);
            console.log(`📦 Moved "${item.id}" to page root`);
        }

        return true;
    }

    // ==================== HELPER: Update item grouping based on coords ====================
    
    updateItemGrouping(item, pageIndex) {
        const page = this.getPageByIndex(pageIndex);
        if (!page) return;

        const center = this.getItemCenter(item);
        const currentParent = this.findItemParent(item.id);
        const currentGroup = currentParent?.group || null;
        
        // Find which group (if any) the item center is now inside
        const targetGroup = this.findGroupAtPoint(center, page);

        // If group changed, move the item
        if (targetGroup !== currentGroup) {
            // Don't move item into itself (if it's somehow a group)
            if (targetGroup && targetGroup.id === item.id) return;
            
            this.moveItemToGroup(item, targetGroup, page);
            this.engine.buildMaps();
        }
    }

    // ==================== HELPER: Update all items after group resize ====================
    
    updateGroupMemberships(group, pageIndex) {
        const page = this.getPageByIndex(pageIndex);
        if (!page) return;

        // Check all standalone items in layout - should they move into this group?
        const itemsToMove = [];
        for (const element of page.layout) {
            if (element.type === 'item') {
                const center = this.getItemCenter(element);
                if (this.isInsideRect(center, group.coords)) {
                    itemsToMove.push(element);
                }
            }
        }

        // Check items inside this group - should they move out?
        const itemsToRemove = [];
        if (group.items) {
            for (const item of group.items) {
                const center = this.getItemCenter(item);
                if (!this.isInsideRect(center, group.coords)) {
                    itemsToRemove.push(item);
                }
            }
        }

        // Move items into group
        for (const item of itemsToMove) {
            this.moveItemToGroup(item, group, page);
        }

        // Move items out of group
        for (const item of itemsToRemove) {
            this.moveItemToGroup(item, null, page);
        }

        if (itemsToMove.length > 0 || itemsToRemove.length > 0) {
            this.engine.buildMaps();
        }
    }

    // ==================== HELPER: Sort layout by coordinates ====================
    
    sortLayoutByCoords(layout) {
        if (!layout || !Array.isArray(layout)) return;
        
        const ROW_THRESHOLD = 50;
        
        layout.sort((a, b) => {
            const aY = a.coords?.y || 0;
            const bY = b.coords?.y || 0;
            const aX = a.coords?.x || 0;
            const bX = b.coords?.x || 0;
            
            if (Math.abs(aY - bY) < ROW_THRESHOLD) {
                return aX - bX;
            }
            return aY - bY;
        });

        for (const element of layout) {
            if (element.type === 'group' && element.items) {
                this.sortLayoutByCoords(element.items);
            }
        }
    }

    // ==================== HELPER: Sort current page ====================
    
    sortCurrentPageLayout() {
        const page = this.getCurrentPage();
        if (page) {
            this.sortLayoutByCoords(page.layout);
        }
    }

    // ==================== HELPER: Sort all pages ====================
    
    sortAllLayouts() {
        const pages = this.engine.config.pages || [];
        for (const page of pages) {
            this.sortLayoutByCoords(page.layout);
        }
        console.log('📐 Layouts sorted by coordinates');
    }

    // ==================== CREATE UI ====================

    createEditorUI() {
        if (document.getElementById('editor-sidebar')) return;
        
        const sidebar = document.createElement('div');
        sidebar.id = 'editor-sidebar';
        sidebar.className = 'editor-sidebar';
        
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.id = 'load-config-input';
        fileInput.accept = '.json';
        fileInput.style.display = 'none';
        
        sidebar.appendChild(fileInput);

        // File input for adding pages
        const pageImageInput = document.createElement('input');
        pageImageInput.type = 'file';
        pageImageInput.id = 'add-page-image-input';
        pageImageInput.accept = 'image/*';
        pageImageInput.style.display = 'none';
        
        sidebar.appendChild(pageImageInput);

        sidebar.innerHTML += `
            <div class="editor-tabs">
                <button class="tab-btn" data-tab="choice" onclick="CYOA.editor.switchTab('choice')">Choice</button>
                <button class="tab-btn" data-tab="group" onclick="CYOA.editor.switchTab('group')">Group</button>
                <button class="tab-btn" data-tab="settings" onclick="CYOA.editor.switchTab('settings')">Settings</button>
                <button class="close-tab-btn" onclick="CYOA.controls.toggleEditMode()">✕</button>
            </div>
            
            <div class="sidebar-scroll-content">
                
                <!-- TAB 1: CHOICE -->
                <div id="tab-content-choice" class="tab-content" style="display:none;">
                    <div id="choice-empty-state" class="info-text">
                        Select an item on the page to edit.
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
                        
                        <div id="rule-builder-container"></div>

                        <div class="editor-section">
                            <div class="accordion-header collapsed" onclick="CYOA.editor.toggleAccordion(this)">
                                🔧 Raw JSON
                            </div>
                            <div class="accordion-content collapsed">
                                <textarea id="edit-raw-json" class="code-editor"></textarea>
                            </div>
                        </div>
                        
                        <div class="editor-section" style="margin-top: 10px; border-top: 1px solid #222;">
                            <div class="row-buttons">
                                <button class="action-btn btn-delete" onclick="CYOA.editor.deleteSelectedItem()">🗑️ Delete</button>
                                <button class="action-btn btn-add" onclick="CYOA.editor.addNewItem()">➕ Add New</button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- TAB 2: GROUP -->
                <div id="tab-content-group" class="tab-content" style="display:none;">
                    <div id="group-empty-state" class="info-text">
                        Select a group (Info Box) or a choice first.
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
                                <textarea id="group-description" rows="7"></textarea>
                                <span class="input-label">Description</span>
                            </div>
                        </div>

                        <div class="editor-section">
                            <div class="accordion-header" onclick="CYOA.editor.toggleAccordion(this)">
                                Position & Size
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
                        
                         <div class="editor-section">
                             <div class="accordion-header" onclick="CYOA.editor.toggleAccordion(this)">
                                 📜 Group Rules (JSON)
                             </div>
                             <div class="accordion-content">
                                 <textarea id="group-rules-json" class="code-editor" style="height:150px;"></textarea>
                             </div>
                         </div>

                        <div class="editor-section" style="margin-top: 10px; border-top: 1px solid #222;">
                            <div class="row-buttons">
                                <button class="action-btn btn-delete" onclick="CYOA.editor.deleteSelectedGroup()">🗑️ Delete Group</button>
                                <button class="action-btn btn-add" onclick="CYOA.editor.addNewGroup()">➕ Add Group</button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- TAB 3: SETTINGS -->
                <div id="tab-content-settings" class="tab-content" style="display:none;">
                    
                    <!-- Page Management -->
                    <div class="editor-section">
                        <div class="accordion-header">📄 Pages</div>
                        <div class="accordion-content" style="display:block">
                            <div id="pages-list" style="margin-bottom:10px; max-height:150px; overflow-y:auto;"></div>
                            <button class="full-width-btn" style="background:#2e7d32;" onclick="document.getElementById('add-page-image-input').click()">
                                ➕ Add New Page
                            </button>
                        </div>
                    </div>
                    
                    <!-- File Operations -->
                    <div class="editor-section">
                        <div class="accordion-header">File Operations</div>
                        <div class="accordion-content" style="display:block">
                            <button class="full-width-btn" style="background:#4b6cb7; margin-bottom:10px;" onclick="document.getElementById('load-config-input').click()">
                                📂 Load Project (JSON)
                            </button>
                            
                            <div class="row-buttons">
                                <button class="action-btn primary-btn" onclick="CYOA.editor.exportConfig()">
                                    💾 Save JSON
                                </button>
                                <button class="action-btn" style="background:#444;" onclick="CYOA.editor.exportZip()">
                                    📦 Save Zip
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- LLM REFINEMENT -->
                    <div class="editor-section">
                         <div class="accordion-header collapsed" onclick="CYOA.editor.toggleAccordion(this)">
                            🧠 AI Smart Refine
                        </div>
                        <div class="accordion-content collapsed">
                            <div class="info-text" style="font-size:0.75rem; margin:5px 0;">
                                Send current layout to LLM to fix alignments and groupings. 
                                <br><span style="color:#4CAF50;">Recommended: Gemini 2.0 Flash</span>
                            </div>
                            <div class="input-group">
                                <select id="llm-provider" style="width:100%; padding:8px; background:#222; color:#fff; border:1px solid #333; border-radius:4px;">
                                    <option value="google">Google AI Studio (Gemini)</option>
                                    <option value="openai">OpenAI / Compatible</option>
                                    <option value="manual">Manual (Copy/Paste)</option>
                                </select>
                            </div>
                            <div id="llm-api-fields">
                                <div class="input-group">
                                    <input type="password" id="llm-key" placeholder="API Key">
                                    <span class="input-label">API Key</span>
                                </div>
                                <div class="input-group">
                                    <input type="text" id="llm-model" value="gemini-2.0-flash">
                                    <span class="input-label">Model Name</span>
                                </div>
                                <div class="input-group" id="llm-base-url-group">
                                    <input type="text" id="llm-base-url" value="https://generativelanguage.googleapis.com/v1beta/models/">
                                    <span class="input-label">Base URL</span>
                                </div>
                            </div>
                            <div class="editor-section" style="border:none; padding:0; margin-top:10px;">
                                <div class="accordion-header collapsed" onclick="CYOA.editor.toggleAccordion(this)" style="font-size:0.8rem;">
                                    📝 Edit System Prompt
                                </div>
                                <div class="accordion-content collapsed">
                                    <textarea id="llm-prompt" class="code-editor" style="height:150px;"></textarea>
                                </div>
                            </div>
                            <button id="btn-run-llm" class="full-width-btn primary-btn" style="margin-top:15px; background: linear-gradient(45deg, #9C27B0, #673AB7);">
                                ✨ Refine Coordinates
                            </button>
                            <!-- MANUAL MODE UI -->
                            <div id="llm-manual-ui" style="display:none; margin-top:15px; border-top:1px dashed #444; padding-top:10px;">
                                <div style="font-size:0.8rem; color:#aaa; margin-bottom:5px;">1. Copy Prompt</div>
                                <textarea id="llm-manual-out" class="code-editor" style="height:80px;" readonly></textarea>
                                <button class="full-width-btn" onclick="CYOA.editor.copyManualPrompt()" style="margin-bottom:10px;">📋 Copy to Clipboard</button>
                                <div style="font-size:0.8rem; color:#aaa; margin-bottom:5px;">2. Paste Response (JSON)</div>
                                <textarea id="llm-manual-in" class="code-editor" style="height:80px;" placeholder="Paste JSON response here..."></textarea>
                                <button class="full-width-btn primary-btn" onclick="CYOA.editor.processLlmResponse(document.getElementById('llm-manual-in').value)">Apply JSON</button>
                            </div>
                        </div>
                    </div>

                    <!-- SAM3 DETECTOR -->
                    <div class="editor-section">
                        <div class="accordion-header collapsed" onclick="CYOA.editor.toggleAccordion(this)">
                            🤖 Auto-Detect (SAM3)
                        </div>
                        <div class="accordion-content collapsed">
                            <div style="margin-bottom:10px; border:1px solid #333; border-radius:4px;">
                                <div style="padding:5px 10px; background:#222; font-size:0.8rem; cursor:pointer;" onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display==='none'?'block':'none'">
                                    ❓ How to get HF Token (Free)
                                </div>
                                <div style="display:none; padding:10px; font-size:0.75rem; color:#aaa; background:#1a1a1a;">
                                    1. Register at <a href="https://huggingface.co/join" target="_blank" style="color:#4CAF50;">Hugging Face</a> (Free).<br>
                                    2. Go to <a href="https://huggingface.co/settings/tokens" target="_blank" style="color:#4CAF50;">Settings > Tokens</a>.<br>
                                    3. Create new token (Read).<br>
                                </div>
                            </div>
                            <div class="input-group">
                                <input type="password" id="sam-token" placeholder="hf_...">
                                <span class="input-label">Hugging Face Token</span>
                            </div>
                            <div class="input-group" style="margin-top:10px;">
                                <input type="text" id="sam-prompt" value="content block, game card, description panel">
                                <span class="input-label">Search Prompt</span>
                            </div>
                            <div style="margin-top:10px;">
                                <div style="display:flex; justify-content:space-between; font-size:0.8rem; color:#888;">
                                    <span>Shave (Tightness)</span>
                                    <span id="shave-val">2.0%</span>
                                </div>
                                <input type="range" id="sam-shave" min="0.005" max="0.05" step="0.005" value="0.02" style="width:100%;" 
                                       oninput="document.getElementById('shave-val').textContent = (this.value*100).toFixed(1)+'%'">
                            </div>
                             <div class="input-group" style="margin-top:10px;">
                                <input type="number" id="sam-debug-index" placeholder="None">
                                <span class="input-label">Debug Item Index (Optional)</span>
                            </div>
                            <button id="btn-run-sam" class="full-width-btn primary-btn" style="margin-top:15px; background: linear-gradient(45deg, #4b6cb7, #182848);">
                                🚀 Run Auto-Detect on Current Page
                            </button>
                            <div id="sam-status" style="margin-top:10px; font-size:0.75rem; color:#ffd700; min-height:1.2em;"></div>
                             <div class="editor-section" style="margin-top:15px; border:1px solid #333; padding:0;">
                                <div class="accordion-header collapsed" onclick="CYOA.editor.toggleAccordion(this)" style="padding:5px 10px; font-size:0.8rem;">
                                    🐞 Debug Gallery
                                </div>
                                <div class="accordion-content collapsed" id="sam-debug-gallery" style="background:#000; padding:10px;">
                                    <div style="font-size:0.7rem; color:#666;">Images will appear here...</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            <!-- LLM PREVIEW MODAL -->
            <div id="llm-preview-modal" class="modal-overlay" style="display:none;">
                <div class="modal-content">
                    <h3>🔍 Review Changes</h3>
                    <div style="font-size:0.8rem; color:#aaa; margin-bottom:10px;">
                        The AI suggests the following structure. Check coordinates and groups.
                    </div>
                    <textarea id="llm-result-json" class="code-editor" style="height:400px; font-size:11px;"></textarea>
                    <div class="row-buttons" style="margin-top:10px;">
                        <button class="action-btn" onclick="document.getElementById('llm-preview-modal').style.display='none'" style="background:#444;">Cancel</button>
                        <button class="action-btn primary-btn" onclick="CYOA.editor.applyLlmChanges()">✅ Apply Changes</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(sidebar);
        this.ruleBuilder.renderUI(document.getElementById('rule-builder-container'));
        
        this.setupChoiceListeners();
        this.setupGroupListeners();
        this.setupJsonListeners();
        this.setupLabelAutoHiding();
        this.setupSamListeners();
        this.setupLlmListeners(); 
        this.setupLoadListener();
        this.setupAddPageListener();
        
        this.renderPagesList();
    }

    // ==================== PAGE MANAGEMENT ====================

    renderPagesList() {
        const container = document.getElementById('pages-list');
        if (!container) return;
        
        const pages = this.engine.config.pages || [];
        
        if (pages.length === 0) {
            container.innerHTML = '<div style="color:#666; font-size:0.8rem; padding:10px;">No pages yet. Add an image to create a page.</div>';
            return;
        }
        
        container.innerHTML = pages.map((page, idx) => `
            <div class="page-list-item ${idx === this.activePageIndex ? 'active' : ''}" 
                 onclick="CYOA.editor.selectPage(${idx})"
                 style="display:flex; align-items:center; justify-content:space-between; padding:8px; margin-bottom:4px; background:${idx === this.activePageIndex ? '#2e7d32' : '#333'}; border-radius:4px; cursor:pointer;">
                <span style="font-size:0.85rem;">📄 Page ${idx + 1} (${page.layout?.length || 0} items)</span>
                <button onclick="event.stopPropagation(); CYOA.editor.deletePage(${idx})" 
                        style="background:#d32f2f; border:none; color:white; padding:2px 6px; border-radius:3px; cursor:pointer; font-size:0.7rem;">✕</button>
            </div>
        `).join('');
    }

    selectPage(index) {
        this.activePageIndex = index;
        this.renderPagesList();
        this.deselectChoice();
        this.selectedGroup = null;
        console.log(`📄 Switched to page ${index + 1}`);
    }

    deletePage(index) {
        const pages = this.engine.config.pages || [];
        if (pages.length <= 1) {
            alert('Cannot delete the last page.');
            return;
        }
        
        if (!confirm(`Delete page ${index + 1}? This will remove all items on this page.`)) return;
        
        pages.splice(index, 1);
        
        if (this.activePageIndex >= pages.length) {
            this.activePageIndex = pages.length - 1;
        }
        
        this.engine.buildMaps();
        this.renderer.renderAll();
        this.renderPagesList();
    }

    setupAddPageListener() {
        const input = document.getElementById('add-page-image-input');
        if (!input) return;

        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (evt) => {
                const dataUrl = evt.target.result;
                
                // Initialize pages array if needed
                if (!this.engine.config.pages) {
                    this.engine.config.pages = [];
                }
                
                // Create new page
                const newPageIndex = this.engine.config.pages.length;
                const newPage = {
                    id: `page_${newPageIndex}`,
                    image: dataUrl,
                    layout: []
                };
                
                this.engine.config.pages.push(newPage);
                this.activePageIndex = newPageIndex;
                
                // Ensure points exist
                if (!this.engine.config.points || this.engine.config.points.length === 0) {
                    this.engine.config.points = [{ id: "points", name: "Points", start: 0 }];
                }
                
                this.engine.buildMaps();
                this.engine.state.resetCurrencies();
                this.renderer.renderAll().then(() => {
                    this.renderPagesList();
                });
                
                console.log(`📄 Added new page ${newPageIndex + 1}`);
            };
            reader.readAsDataURL(file);
            
            input.value = ''; // Reset for next upload
        });
    }

    setupLoadListener() {
        const input = document.getElementById('load-config-input');
        if (!input) return;

        input.addEventListener('change', async (e) => {
            if (e.target.files.length === 0) return;
            const file = e.target.files[0];

            try {
                if (!this.engine.isTestConfig) {
                    if (!confirm("Are you sure? Loading a new project will discard current changes.")) {
                        input.value = '';
                        return;
                    }
                }

                const { config, warning } = await ProjectStorage.load(file);
                
                if (warning) {
                    alert(warning);
                }

                this.engine.loadConfig(config);
                
                this.deselectChoice();
                this.selectedGroup = null;
                this.activePageIndex = 0;
                this.renderPagesList();

            } catch (err) {
                alert(`Error loading project: ${err.message}`);
                console.error(err);
            } finally {
                input.value = '';
            }
        });
    }

    switchTab(tabName) {
        this.activeTab = tabName;
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
        document.querySelectorAll('.tab-content').forEach(content => {
            content.style.display = 'none';
        });
        document.getElementById(`tab-content-${tabName}`).style.display = 'block';

        document.body.classList.remove('edit-mode-choice', 'edit-mode-group');

        if (tabName === 'choice') {
            document.body.classList.add('edit-mode-choice');
            if (this.selectedItem) {
                this.updateChoiceInputs();
                document.getElementById('choice-empty-state').style.display = 'none';
                document.getElementById('choice-props').style.display = 'block';
            }
        } else if (tabName === 'group') {
            document.body.classList.add('edit-mode-group');
            if (this.selectedItem) {
                const group = this.engine.findGroupForItem(this.selectedItem.id);
                if (group) this.selectGroup(group);
            }
            if (this.selectedGroup) {
                document.getElementById('group-empty-state').style.display = 'none';
                document.getElementById('group-props').style.display = 'block';
            }
        } else if (tabName === 'settings') {
            this.renderPagesList();
        }
    }

    toggleAccordion(header) {
        header.classList.toggle('collapsed');
        const content = header.nextElementSibling;
        content.classList.toggle('collapsed');
    }

    // ==================== LLM LOGIC ====================

    setupLlmListeners() {
        const providerSel = document.getElementById('llm-provider');
        const baseUrlGroup = document.getElementById('llm-base-url-group');
        const baseUrlInput = document.getElementById('llm-base-url');
        const manualUi = document.getElementById('llm-manual-ui');
        const apiFields = document.getElementById('llm-api-fields');
        const runBtn = document.getElementById('btn-run-llm');
        const promptArea = document.getElementById('llm-prompt');

        if (promptArea) promptArea.value = this.llmConfig.systemPrompt;

        if (providerSel) {
            providerSel.addEventListener('change', (e) => {
                const val = e.target.value;
                this.llmConfig.provider = val;
                
                if (val === 'google') {
                    baseUrlInput.value = 'https://generativelanguage.googleapis.com/v1beta/models/';
                    document.getElementById('llm-model').value = 'gemini-2.0-flash';
                    manualUi.style.display = 'none';
                    apiFields.style.display = 'block';
                    baseUrlGroup.style.display = 'block';
                    runBtn.textContent = '✨ Refine Coordinates';
                } else if (val === 'openai') {
                    baseUrlInput.value = 'https://api.openai.com/v1';
                    document.getElementById('llm-model').value = 'gpt-4o';
                    manualUi.style.display = 'none';
                    apiFields.style.display = 'block';
                    baseUrlGroup.style.display = 'block';
                    runBtn.textContent = '✨ Refine Coordinates';
                } else if (val === 'manual') {
                    manualUi.style.display = 'block';
                    apiFields.style.display = 'none';
                    runBtn.textContent = '📝 Generate Prompt';
                }
            });
        }

        if (runBtn) {
            runBtn.addEventListener('click', async () => {
                this.llmConfig.apiKey = document.getElementById('llm-key').value;
                this.llmConfig.model = document.getElementById('llm-model').value;
                this.llmConfig.baseUrl = document.getElementById('llm-base-url').value;
                this.llmConfig.systemPrompt = document.getElementById('llm-prompt').value;

                const cleanConfig = JSON.parse(JSON.stringify(this.engine.config));
                
                if (cleanConfig.pages) {
                    cleanConfig.pages.forEach(p => {
                        p.image = "<IMAGE_PLACEHOLDER>";
                    });
                }

                const contextData = {
                    pages: cleanConfig.pages,
                    points: cleanConfig.points
                };

                const fullPrompt = `${this.llmConfig.systemPrompt}\n\n${JSON.stringify(contextData, null, 2)}`;

                if (this.llmConfig.provider === 'manual') {
                    document.getElementById('llm-manual-out').value = fullPrompt;
                    alert("Prompt generated below. Copy it to your LLM.");
                    return;
                }

                if (!this.llmConfig.apiKey) {
                    alert("Please enter an API Key!");
                    return;
                }

                runBtn.disabled = true;
                runBtn.textContent = '⏳ Processing...';

                try {
                    const result = await this.callLlmApi(fullPrompt);
                    this.processLlmResponse(result);
                } catch (e) {
                    alert(`LLM Error: ${e.message}`);
                    console.error(e);
                } finally {
                    runBtn.disabled = false;
                    runBtn.textContent = '✨ Refine Coordinates';
                }
            });
        }
    }

    async callLlmApi(prompt) {
        const { provider, baseUrl, apiKey, model } = this.llmConfig;
        let url, body, headers;

        if (provider === 'google') {
            url = `${baseUrl}${model}:generateContent?key=${apiKey}`;
            headers = { 'Content-Type': 'application/json' };
            body = JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            });
        } else {
            url = `${baseUrl.replace(/\/+$/, '')}/chat/completions`;
            headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            };
            if (url.includes('openrouter')) {
                headers['HTTP-Referer'] = window.location.href;
            }

            body = JSON.stringify({
                model: model,
                messages: [
                    { role: "user", content: prompt } 
                ],
                temperature: 0.1 
            });
        }

        const response = await fetch(url, { method: 'POST', headers, body });
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error?.message || JSON.stringify(data));
        }

        let text = '';
        if (provider === 'google') {
            text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        } else {
            text = data.choices?.[0]?.message?.content || '';
        }

        return text;
    }

    processLlmResponse(text) {
        let jsonStr = text;
        if (text.includes('```json')) {
            jsonStr = text.split('```json')[1].split('```')[0];
        } else if (text.includes('```')) {
            jsonStr = text.split('```')[1].split('```')[0];
        }

        try {
            const jsonObj = JSON.parse(jsonStr);
            
            if (!jsonObj.pages) throw new Error("Missing 'pages' array in response");

            document.getElementById('llm-result-json').value = JSON.stringify(jsonObj, null, 2);
            document.getElementById('llm-preview-modal').style.display = 'flex';
        } catch (e) {
            alert(`Failed to parse JSON response: ${e.message}\nCheck console for raw output.`);
            console.log("Raw LLM Output:", text);
        }
    }

    applyLlmChanges() {
        try {
            const raw = document.getElementById('llm-result-json').value;
            const newConfig = JSON.parse(raw);
            
            const currentPages = this.engine.config.pages || [];
            if (newConfig.pages) {
                newConfig.pages.forEach((page, idx) => {
                    if (currentPages[idx]) {
                        page.image = currentPages[idx].image;
                    }
                });
            }

            if (!newConfig.meta) newConfig.meta = this.engine.config.meta;

            this.engine.config.pages = newConfig.pages;
            if (newConfig.points) this.engine.config.points = newConfig.points;

            this.engine.buildMaps();
            this.engine.reset();
            this.engine.recalculate();
            this.renderer.renderAll();
            
            this.deselectChoice();
            this.renderPagesList();
            
            document.getElementById('llm-preview-modal').style.display = 'none';
            alert("Changes applied successfully!");
            
        } catch (e) {
            alert(`Error applying changes: ${e.message}`);
        }
    }

    copyManualPrompt() {
        const el = document.getElementById('llm-manual-out');
        el.select();
        document.execCommand('copy');
    }

    // ==================== SAM DETECTION ====================

    setupLabelAutoHiding() {
        const checkCollision = (input) => {
            const label = input.nextElementSibling;
            if (!label || !label.classList.contains('input-label')) return;
            const inputStyle = window.getComputedStyle(input);

            if (input.tagName === 'TEXTAREA') {
                this.mirrorDiv.style.font = inputStyle.font;
                this.mirrorDiv.style.width = inputStyle.width;
                this.mirrorDiv.style.padding = inputStyle.padding;
                this.mirrorDiv.textContent = input.value + '|';
                if (input.scrollHeight > input.clientHeight) {
                    label.classList.add('label-hidden');
                } else {
                     label.classList.remove('label-hidden');
                }
                return;
            }
            
            this.measureContext.font = inputStyle.font;
            const textWidth = this.measureContext.measureText(input.value).width;
            if ((textWidth + 10) > (input.clientWidth - label.offsetWidth - 10)) {
                label.classList.add('label-hidden');
            } else {
                label.classList.remove('label-hidden');
            }
        };

        const attach = () => {
             const inputs = document.querySelectorAll('#editor-sidebar input[type="text"], #editor-sidebar input[type="number"], #editor-sidebar input[type="password"], #editor-sidebar textarea:not(.code-editor)');
             inputs.forEach(input => {
                input.removeEventListener('input', input._labelHandler);
                input._labelHandler = () => checkCollision(input);
                input.addEventListener('input', input._labelHandler);
                checkCollision(input);
             });
        };
        this.triggerLabelCheck = attach;
        setTimeout(attach, 500); 
    }

    setupSamListeners() {
        const runBtn = document.getElementById('btn-run-sam');

        if (runBtn) {
            runBtn.addEventListener('click', () => this.runSamDetection());
        }
    }

    async runSamDetection() {
        const tokenInput = document.getElementById('sam-token');
        const promptInput = document.getElementById('sam-prompt');
        const shaveInput = document.getElementById('sam-shave');
        const debugIdxInput = document.getElementById('sam-debug-index');
        const statusEl = document.getElementById('sam-status');
        const galleryEl = document.getElementById('sam-debug-gallery');

        const page = this.getCurrentPage();
        if (!page || !page.image) { 
            alert("Please add a page with an image first!"); 
            return; 
        }
        if (!tokenInput.value) { 
            alert("Please enter your Hugging Face Token!"); 
            return; 
        }

        const btn = document.getElementById('btn-run-sam');
        btn.disabled = true;
        btn.style.opacity = 0.5;

        galleryEl.innerHTML = '';
        
        let debugIdx = -1;
        if (debugIdxInput.value) {
            debugIdx = parseInt(debugIdxInput.value) - 1; 
        }

        this.autoDetector.statusCallback = (msg) => { statusEl.textContent = msg; };

        this.autoDetector.debugCallback = (title, dataUrl) => {
            const wrapper = document.createElement('div');
            wrapper.style.marginBottom = "15px";
            const label = document.createElement('div');
            label.textContent = title;
            label.style.color = "#4CAF50";
            label.style.fontSize = "0.75rem";
            label.style.marginBottom = "5px";
            const img = document.createElement('img');
            img.src = dataUrl;
            img.style.maxWidth = "100%";
            img.style.border = "1px solid #444";
            img.style.cursor = "pointer";
            img.onclick = () => {
                const w = window.open("");
                w.document.write(`<img src="${dataUrl}" style="border:1px solid red;">`);
            };
            wrapper.appendChild(label);
            wrapper.appendChild(img);
            galleryEl.appendChild(wrapper);
            const accHeader = galleryEl.previousElementSibling;
            if (accHeader && accHeader.classList.contains('collapsed')) CYOA.editor.toggleAccordion(accHeader);
        };

        // Convert data URL to File for SAM
        const response = await fetch(page.image);
        const blob = await response.blob();
        const file = new File([blob], "page.png", { type: blob.type });

        const detectedItems = await this.autoDetector.processImage(
            file,
            promptInput.value,
            parseFloat(shaveInput.value),
            tokenInput.value,
            debugIdx
        );

        if (detectedItems.length > 0) {
            for (const item of detectedItems) {
                item.type = 'item';
                page.layout.push(item);
            }
            
            this.sortLayoutByCoords(page.layout);
            
            this.engine.buildMaps();
            this.engine.recalculate();
            this.renderer.renderLayout();
            
            statusEl.textContent = `Done! Added ${detectedItems.length} items.`;
            this.switchTab('choice');
        } else {
            statusEl.textContent = "No items found.";
        }

        btn.disabled = false;
        btn.style.opacity = 1;
    }

    // ==================== EVENT LISTENERS ====================

    attachEventListeners() {
        document.addEventListener('mousedown', this.handleMouseDown.bind(this));
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
        document.addEventListener('mouseup', this.handleMouseUp.bind(this));
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
    }
    
    removeEventListeners() {}

    handleMouseDown(e) {
        if (!this.enabled) return;
        if (e.target.closest('#editor-sidebar')) return;
        if (e.target.closest('.modal-content')) return;

        let target = null;
        let objectToEdit = null;
        let pageIndex = 0;
        
        const pageContainer = e.target.closest('.page-container');
        if (pageContainer) {
            pageIndex = parseInt(pageContainer.id.replace('page-', '')) || 0;
            this.activePageIndex = pageIndex;
            this.renderPagesList();
        }

        if (this.activeTab === 'group') {
            target = e.target.closest('.info-zone');
            if (target) {
                const gid = target.id.replace('group-', '');
                const group = this.engine.findGroup(gid);
                if (group) { 
                    this.selectGroup(group); 
                    objectToEdit = group; 
                }
            }
        } else {
            target = e.target.closest('.item-zone');
            if (target) {
                const itemId = target.dataset.itemId;
                const item = this.engine.findItem(itemId);
                if (item) { 
                    this.selectChoice(item, target); 
                    objectToEdit = item; 
                    this.selectedGroup = this.engine.findGroupForItem(item.id); 
                }
            } else if(this.activeTab === 'choice') { 
                this.deselectChoice(); 
            }
        }
        
        if (objectToEdit && target) {
            target.classList.add('dragging');
            const rect = target.getBoundingClientRect();
            if (e.clientX >= rect.right - this.handleSize && e.clientY >= rect.bottom - this.handleSize) { 
                this.isResizing = true; 
            } else { 
                this.isDragging = true; 
            }
            this.dragStart = { x: e.clientX, y: e.clientY };
            if (!objectToEdit.coords) objectToEdit.coords = {x:0,y:0,w:100,h:100};
            this.initialRect = { ...objectToEdit.coords };
            
            const dim = this.renderer.pageDimensions[pageIndex];
            const container = document.querySelector(`#page-${pageIndex}`);
            if (dim && container) {
                const containerRect = container.getBoundingClientRect();
                this.dragContext = { 
                    scaleX: dim.w / containerRect.width, 
                    scaleY: dim.h / containerRect.height, 
                    dim: dim, 
                    targetObj: objectToEdit,
                    pageIndex: pageIndex,
                    isGroup: objectToEdit.type === 'group'
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
        const { scaleX, scaleY, dim, targetObj, pageIndex } = this.dragContext;
        
        if (this.isDragging) {
            targetObj.coords.x = Math.round(this.initialRect.x + dx * scaleX);
            targetObj.coords.y = Math.round(this.initialRect.y + dy * scaleY);
        } else if (this.isResizing) {
            targetObj.coords.w = Math.max(20, Math.round(this.initialRect.w + dx * scaleX));
            targetObj.coords.h = Math.max(20, Math.round(this.initialRect.h + dy * scaleY));
        }
        
        let domId = targetObj.type === 'group' ? `group-${targetObj.id}` : `btn-${targetObj.id}`;
        const element = document.getElementById(domId);
        if (element) { 
            const style = CoordHelper.toPercent(targetObj.coords, dim); 
            Object.assign(element.style, style); 
        }
        
        if (this.activeTab === 'group') this.updateGroupInputs(); 
        else this.updateChoiceInputs();
    }

    handleMouseUp() {
        if (this.dragContext) {
            const { targetObj, pageIndex, isGroup } = this.dragContext;
            
            if (isGroup) {
                // Group was moved/resized - check if items should move in/out
                this.updateGroupMemberships(targetObj, pageIndex);
            } else {
                // Item was moved - check if it should change groups
                this.updateItemGrouping(targetObj, pageIndex);
            }
            
            // Sort layout after any drag operation
            const page = this.getPageByIndex(pageIndex);
            if (page) {
                this.sortLayoutByCoords(page.layout);
            }
            
            // Re-render to reflect changes
            this.renderer.renderLayout();
            
            // Update UI to show new group assignment
            if (!isGroup && this.selectedItem) {
                this.updateChoiceInputs();
            }
        }
        
        document.querySelectorAll('.dragging').forEach(el => el.classList.remove('dragging'));
        this.isDragging = false; 
        this.isResizing = false; 
        this.dragContext = null;
    }

    handleKeyDown(e) {
        if (!this.enabled) return;
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        
        if (e.key === 'Delete') {
            if (this.activeTab === 'choice') this.deleteSelectedItem();
        }
    }

    // ==================== SELECTION ====================

    selectChoice(item, element) {
        this.selectedItem = item;
        document.querySelectorAll('.editor-selected').forEach(el => el.classList.remove('editor-selected'));
        if(element) element.classList.add('editor-selected');
        document.getElementById('choice-empty-state').style.display = 'none';
        document.getElementById('choice-props').style.display = 'block';
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
        document.querySelectorAll('.info-zone.editor-selected').forEach(el => el.classList.remove('editor-selected'));
        const el = document.getElementById(`group-${group.id}`);
        if(el) el.classList.add('editor-selected');
        document.getElementById('group-empty-state').style.display = 'none';
        document.getElementById('group-props').style.display = 'block';
        this.updateGroupInputs();
    }

    // ==================== UPDATE INPUTS ====================

    updateChoiceInputs() {
        if (!this.selectedItem) return;
        const item = this.selectedItem;
        const group = this.engine.findGroupForItem(item.id);
        document.getElementById('edit-id').value = item.id || '';
        document.getElementById('edit-parent-group').value = group ? group.id : '(none)';
        document.getElementById('edit-max_quantity').value = item.max_quantity || 1;
        document.getElementById('edit-title').value = item.title || '';
        document.getElementById('edit-description').value = item.description || '';
        document.getElementById('edit-tags').value = (item.tags || []).join(', ');
        ['x','y','w','h'].forEach(k => { 
            document.getElementById(`edit-${k}`).value = Math.round(item.coords?.[k] || 0); 
        });
        this.updateCodePreview();
        if (this.triggerLabelCheck) this.triggerLabelCheck();
    }

    updateGroupInputs() {
        if (!this.selectedGroup) return;
        const g = this.selectedGroup;
        document.getElementById('group-id').value = g.id || '';
        document.getElementById('group-title').value = g.title || '';
        document.getElementById('group-description').value = g.description || '';
        ['x','y','w','h'].forEach(k => { 
            document.getElementById(`group-${k}`).value = Math.round(g.coords?.[k] || 0); 
        });
        this.updateCodePreview();
        if (this.triggerLabelCheck) this.triggerLabelCheck();
    }

    updateCodePreview() {
        if (this.selectedItem) {
            const el = document.getElementById('edit-raw-json');
            if (el && document.activeElement !== el) el.value = JSON.stringify(this.selectedItem, null, 2);
        }
        if (this.selectedGroup) {
            const rulesEl = document.getElementById('group-rules-json');
            if (rulesEl && document.activeElement !== rulesEl) rulesEl.value = JSON.stringify(this.selectedGroup.rules || {}, null, 2);
        }
    }

    // ==================== INPUT LISTENERS ====================

    setupChoiceListeners() {
        const update = (key, val, isNum) => {
            if (!this.selectedItem) return;
            if (isNum) val = parseInt(val) || 0;
            if (['x','y','w','h'].includes(key)) { 
                if (!this.selectedItem.coords) this.selectedItem.coords = {}; 
                this.selectedItem.coords[key] = val; 
            } else if (key === 'tags') { 
                this.selectedItem.tags = val.split(',').map(t => t.trim()).filter(t => t); 
            } else { 
                this.selectedItem[key] = val; 
            }
            if (key === 'max_quantity') {
                if (val <= 1) delete this.selectedItem.max_quantity;
                this.renderer.renderLayout();
                setTimeout(() => { 
                    const el = document.getElementById(`btn-${this.selectedItem.id}`); 
                    if (el) el.classList.add('editor-selected'); 
                }, 0);
            } else { 
                this.renderer.renderLayout(); 
            }
            this.updateCodePreview();
        };
        const inputs = ['edit-id', 'edit-title', 'edit-description', 'edit-tags', 'edit-x', 'edit-y', 'edit-w', 'edit-h', 'edit-max_quantity'];
        inputs.forEach(id => {
            const el = document.getElementById(id); 
            if (!el) return;
            const key = id.split('-').pop(); 
            const realKey = (id === 'edit-description') ? 'description' : key; 
            const isNum = ['x','y','w','h', 'max_quantity'].includes(key); 
            el.addEventListener('input', (e) => update(realKey, e.target.value, isNum));
        });
    }

    setupGroupListeners() {
        const update = (key, val, isNum) => {
            if (!this.selectedGroup) return;
            if (isNum) val = parseInt(val) || 0;
            if (['x','y','w','h'].includes(key)) { 
                if (!this.selectedGroup.coords) this.selectedGroup.coords = {}; 
                this.selectedGroup.coords[key] = val; 
            } else { 
                this.selectedGroup[key] = val; 
            }
            this.renderer.renderLayout();
            this.updateCodePreview();
        };
        const inputs = ['group-id', 'group-title', 'group-description', 'group-x', 'group-y', 'group-w', 'group-h'];
        inputs.forEach(id => {
            const el = document.getElementById(id); 
            if (!el) return;
            const key = id.split('-').pop(); 
            const realKey = (id === 'group-description') ? 'description' : key; 
            const isNum = ['x','y','w','h'].includes(key);
            el.addEventListener('input', (e) => update(realKey, e.target.value, isNum));
        });
    }

    setupJsonListeners() {
        const choiceJson = document.getElementById('edit-raw-json');
        if (choiceJson) {
            choiceJson.addEventListener('change', (e) => {
                try { 
                    const data = JSON.parse(e.target.value); 
                    if (this.selectedItem) { 
                        Object.assign(this.selectedItem, data); 
                        this.engine.buildMaps();
                        this.renderer.renderLayout(); 
                        this.updateChoiceInputs(); 
                        this.ruleBuilder.loadItem(this.selectedItem, this.selectedGroup); 
                    } 
                } catch(err) { 
                    console.error("JSON Error", err); 
                }
            });
        }
        const rulesJson = document.getElementById('group-rules-json');
        if (rulesJson) {
            rulesJson.addEventListener('change', (e) => {
                try { 
                    const data = JSON.parse(e.target.value); 
                    if (this.selectedGroup) { 
                        this.selectedGroup.rules = data; 
                        this.renderer.renderLayout(); 
                        this.engine.recalculate(); 
                    } 
                } catch(err) { 
                    console.error("Rules JSON Error", err); 
                }
            });
        }
    }

    // ==================== ADD / DELETE ====================

    deleteSelectedItem() {
        if (!this.selectedItem) return; 
        if (!confirm('Delete item?')) return;
        
        const parent = this.findItemParent(this.selectedItem.id);
        if (parent) {
            parent.array.splice(parent.index, 1);
            this.engine.buildMaps();
        }
        
        this.deselectChoice(); 
        this.renderer.renderLayout();
    }
    
    addNewItem() {
        const page = this.getCurrentPage();
        if (!page) {
            alert('No page available. Please add an image first.');
            return;
        }
        
        const newItem = { 
            type: 'item',
            id: `item_${Date.now()}`, 
            title: 'New Item', 
            description: '', 
            coords: { x: 50, y: 50, w: 200, h: 100 }, 
            cost: [] 
        };
        
        if (this.selectedGroup) {
            if (!this.selectedGroup.items) this.selectedGroup.items = [];
            this.selectedGroup.items.push(newItem);
        } else {
            page.layout.push(newItem);
        }
        
        this.engine.buildMaps();
        this.renderer.renderLayout();
        
        setTimeout(() => { 
            const el = document.getElementById(`btn-${newItem.id}`); 
            if (el) this.selectChoice(newItem, el); 
        }, 50);
    }
    
    addNewGroup() {
        const page = this.getCurrentPage();
        if (!page) {
            alert('No page available. Please add an image first.');
            return;
        }
        
        const newGroup = { 
            type: 'group',
            id: `group_${Date.now()}`, 
            title: 'New Group', 
            description: '', 
            coords: { x: 50, y: 50, w: 300, h: 200 }, 
            items: [] 
        };
        
        page.layout.push(newGroup);
        
        this.engine.buildMaps();
        this.renderer.renderLayout();
        
        setTimeout(() => { 
            const el = document.getElementById(`group-${newGroup.id}`); 
            if (el) this.selectGroup(newGroup); 
        }, 50);
    }
    
    deleteSelectedGroup() {
        if (!this.selectedGroup) return;
        
        const itemCount = this.selectedGroup.items?.length || 0;
        if (itemCount > 0) { 
            if (!confirm(`Group has ${itemCount} items. Delete group and ALL items?`)) return; 
        } else { 
            if (!confirm('Delete this group?')) return; 
        }
        
        const parent = this.findGroupParent(this.selectedGroup.id);
        if (parent) {
            parent.array.splice(parent.index, 1);
            this.engine.buildMaps();
        }
        
        this.selectedGroup = null; 
        document.querySelectorAll('.info-zone.editor-selected').forEach(el => el.classList.remove('editor-selected'));
        document.getElementById('group-props').style.display = 'none'; 
        document.getElementById('group-empty-state').style.display = 'block';
        this.renderer.renderLayout();
    }

    // ==================== EXPORT ====================

    exportConfig() {
        this.sortAllLayouts();
        ProjectStorage.save(this.engine.config);
    }

    async exportZip() {
        try {
            this.sortAllLayouts();
            await ProjectStorage.saveZip(this.engine.config);
        } catch (e) {
            alert(e.message);
        }
    }
}