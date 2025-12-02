/**
 * CYOA Editor - Visual editing mode
 * 
 * Architecture v2: Works with config.pages[].layout[]
 * Features: Auto-grouping, Context Menu, Copy/Paste, Undo-like logic (via duplicate)
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
        this.resizeMode = null; // 'tl', 'tr', 'bl', 'br'
        this.dragStart = { x: 0, y: 0 };
        this.initialRect = {};
        this.handleSize = 15; 
        this.dragContext = null;
        
        // Context Menu & Clipboard State
        this.contextMenuContext = null; // { x, y, pageIndex, targetType, targetId }
        this.clipboard = null; // { type: 'item'|'group', data: object }
        
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
        
        const ctxMenu = document.getElementById('editor-context-menu');
        if (ctxMenu) ctxMenu.remove();

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

    // ==================== HELPER: Count page elements ====================
    
    countPageElements(page) {
        let groups = 0;
        let items = 0;
        
        if (!page || !page.layout) return { groups: 0, items: 0 };
        
        for (const element of page.layout) {
            if (element.type === 'group') {
                groups++;
                items += element.items?.length || 0;
            } else if (element.type === 'item') {
                items++;
            }
        }
        
        return { groups, items };
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
        
        const targetGroup = this.findGroupAtPoint(center, page);

        if (targetGroup !== currentGroup) {
            if (targetGroup && targetGroup.id === item.id) return;
            
            this.moveItemToGroup(item, targetGroup, page);
            this.engine.buildMaps();
        }
    }

    // ==================== HELPER: Update all items after group resize ====================
    
    updateGroupMemberships(group, pageIndex) {
        const page = this.getPageByIndex(pageIndex);
        if (!page) return;

        const itemsToMove = [];
        for (const element of page.layout) {
            if (element.type === 'item') {
                const center = this.getItemCenter(element);
                if (this.isInsideRect(center, group.coords)) {
                    itemsToMove.push(element);
                }
            }
        }

        const itemsToRemove = [];
        if (group.items) {
            for (const item of group.items) {
                const center = this.getItemCenter(item);
                if (!this.isInsideRect(center, group.coords)) {
                    itemsToRemove.push(item);
                }
            }
        }

        for (const item of itemsToMove) {
            this.moveItemToGroup(item, group, page);
        }

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

    sortCurrentPageLayout() {
        const page = this.getCurrentPage();
        if (page) {
            this.sortLayoutByCoords(page.layout);
        }
    }

    sortAllLayouts() {
        const pages = this.engine.config.pages || [];
        for (const page of pages) {
            this.sortLayoutByCoords(page.layout);
        }
        console.log('📐 Layouts sorted by coordinates');
    }

    // ==================== HELPER: Resize Detection ====================

    getResizeHandle(x, y, rect) {
        const hs = this.handleSize;
        const dist = (x1, y1, x2, y2) => Math.sqrt((x2-x1)**2 + (y2-y1)**2);

        // Top-Left
        if (dist(x, y, rect.left, rect.top) < hs) return 'tl';
        // Top-Right
        if (dist(x, y, rect.right, rect.top) < hs) return 'tr';
        // Bottom-Left
        if (dist(x, y, rect.left, rect.bottom) < hs) return 'bl';
        // Bottom-Right
        if (dist(x, y, rect.right, rect.bottom) < hs) return 'br';

        return null;
    }

    // ==================== HELPER: Smart Coordinates (Center or Mouse) ====================

    getSmartCoords(objWidth, objHeight, mouseEvent = null) {
        const pageIndex = this.activePageIndex;
        const pageEl = document.getElementById(`page-${pageIndex}`);
        
        if (!pageEl) return { x: 0, y: 0 }; 
        
        const rect = pageEl.getBoundingClientRect(); 
        const imgDim = this.renderer.pageDimensions[pageIndex];
        
        if (!imgDim) return { x: 50, y: 50 }; 

        let clientX, clientY;

        if (mouseEvent) {
            clientX = mouseEvent.x;
            clientY = mouseEvent.y;
        } else {
            clientX = window.innerWidth / 2;
            clientY = window.innerHeight / 2;
        }

        const relX = clientX - rect.left;
        const relY = clientY - rect.top;

        const scaleX = imgDim.w / rect.width;
        const scaleY = imgDim.h / rect.height;

        let finalX = (relX * scaleX) - (objWidth / 2);
        let finalY = (relY * scaleY) - (objHeight / 2);

        finalX = Math.max(0, Math.min(finalX, imgDim.w - objWidth));
        finalY = Math.max(0, Math.min(finalY, imgDim.h - objHeight));

        return { x: Math.round(finalX), y: Math.round(finalY) };
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
                
                <div id="tab-content-choice" class="tab-content" style="display:none;">
                    <div id="choice-empty-state" class="info-text">
                        <p>Select an item on the page to edit, or add a new one.</p>
                        <p style="font-size:0.8rem; color:#666;">Tip: Right-click on the page to add items quickly.</p>
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
                            <button class="action-btn btn-delete" onclick="CYOA.editor.deleteSelectedItem()">🗑️ Delete</button>
                        </div>
                    </div>
                    
                    <div class="editor-section editor-actions-fixed">
                        <button class="action-btn btn-add full-width-btn" onclick="CYOA.editor.addNewItem()">➕ Add New Item (Center)</button>
                    </div>
                </div>

                <div id="tab-content-group" class="tab-content" style="display:none;">
                    <div id="group-empty-state" class="info-text">
                        <p>Select a group (Info Box) on the page to edit, or create a new one.</p>
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
                            <button class="action-btn btn-delete" onclick="CYOA.editor.deleteSelectedGroup()">🗑️ Delete Group</button>
                        </div>
                    </div>
                    
                    <div class="editor-section editor-actions-fixed">
                        <button class="action-btn btn-add full-width-btn" onclick="CYOA.editor.addNewGroup()">➕ Add New Group (Center)</button>
                    </div>
                </div>

                <div id="tab-content-settings" class="tab-content" style="display:none;">
                    <div class="editor-section">
                        <div class="accordion-header" onclick="CYOA.editor.toggleAccordion(this)">
                            📄 Pages
                        </div>
                        <div class="accordion-content">
                            <div id="pages-list" style="margin-bottom:10px; max-height:200px; overflow-y:auto;"></div>
                            <button class="full-width-btn" style="background:#2e7d32;" onclick="document.getElementById('add-page-image-input').click()">
                                ➕ Add New Page
                            </button>
                        </div>
                    </div>
                    
                    <div class="editor-section">
                        <div class="accordion-header" onclick="CYOA.editor.toggleAccordion(this)">
                            💾 File Operations
                        </div>
                        <div class="accordion-content">
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
        
        // 2. Context Menu
        const contextMenu = document.createElement('div');
        contextMenu.id = 'editor-context-menu';
        contextMenu.className = 'custom-context-menu';
        contextMenu.style.display = 'none';
        contextMenu.innerHTML = `
            <div class="menu-label" id="ctx-label">Actions</div>
            <div class="menu-divider"></div>
            
            <div class="menu-item ctx-common" onclick="CYOA.editor.handleContextAction('add-item')">➕ Add Item Here</div>
            <div class="menu-item ctx-common" onclick="CYOA.editor.handleContextAction('add-group')">📂 Add Group Here</div>
            
            <div class="menu-divider ctx-obj"></div>
            <div class="menu-item ctx-obj" onclick="CYOA.editor.handleContextAction('duplicate')">📄 Duplicate</div>
            <div class="menu-item ctx-obj" onclick="CYOA.editor.handleContextAction('copy')">📋 Copy</div>
            <div class="menu-item ctx-obj" style="color:#ff6b6b;" onclick="CYOA.editor.handleContextAction('delete')">🗑️ Delete</div>
            
            <div class="menu-divider ctx-paste"></div>
            <div class="menu-item ctx-paste" id="ctx-paste-btn" onclick="CYOA.editor.handleContextAction('paste')">📌 Paste</div>
            
            <div class="menu-divider"></div>
            <div class="menu-item" onclick="CYOA.editor.handleContextAction('auto-detect')">🚀 Auto-Detect (SAM)</div>
        `;
        document.body.appendChild(contextMenu);

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
        this.setupContextMenu(); // Attach context menu logic
        
        this.renderPagesList();
    }

    // ==================== UI STATE MANAGEMENT ====================

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

    // ==================== PAGE MANAGEMENT ====================

    renderPagesList() {
        const container = document.getElementById('pages-list');
        if (!container) return;
        
        const pages = this.engine.config.pages || [];
        
        if (pages.length === 0) {
            container.innerHTML = `
                <div style="color:#888; font-size:0.8rem; padding:15px; text-align:center; background:#1a1a1a; border-radius:4px;">
                    <div style="font-size:1.5rem; margin-bottom:8px;">📄</div>
                    <div>No pages yet.</div>
                    <div style="color:#666; font-size:0.75rem; margin-top:4px;">Add an image to create your first page.</div>
                </div>
            `;
            return;
        }
        
        container.innerHTML = pages.map((page, idx) => {
            const counts = this.countPageElements(page);
            const isActive = idx === this.activePageIndex;
            
            return `
                <div class="page-list-item ${isActive ? 'active' : ''}" 
                     onclick="CYOA.editor.selectPage(${idx})"
                     style="display:flex; align-items:center; justify-content:space-between; padding:8px 10px; margin-bottom:4px; background:${isActive ? '#2e7d32' : '#2a2a2a'}; border-radius:4px; cursor:pointer; border: 1px solid ${isActive ? '#4caf50' : '#333'};">
                    <div style="display:flex; flex-direction:column;">
                        <span style="font-size:0.85rem; font-weight:${isActive ? '600' : '400'};">📄 Page ${idx + 1}</span>
                        <span style="font-size:0.7rem; color:${isActive ? '#c8e6c9' : '#888'}; margin-top:2px;">
                            ${counts.groups} groups, ${counts.items} items
                        </span>
                    </div>
                    <button onclick="event.stopPropagation(); CYOA.editor.deletePage(${idx})" 
                            style="background:#d32f2f; border:none; color:white; padding:4px 8px; border-radius:3px; cursor:pointer; font-size:0.7rem; opacity:0.8;"
                            onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.8'">✕</button>
                </div>
            `;
        }).join('');
    }

    selectPage(index) {
        this.activePageIndex = index;
        this.renderPagesList();
        this.deselectChoice();
        this.selectedGroup = null;
        
        if (this.activeTab === 'group') {
            document.getElementById('group-props').style.display = 'none';
            document.getElementById('group-empty-state').style.display = 'block';
        }
        
        console.log(`📄 Switched to page ${index + 1}`);
    }

    deletePage(index) {
        const pages = this.engine.config.pages || [];
        if (pages.length <= 1) {
            alert('Cannot delete the last page.');
            return;
        }
        
        const counts = this.countPageElements(pages[index]);
        const msg = counts.items > 0 || counts.groups > 0 
            ? `Delete page ${index + 1}? This will remove ${counts.groups} groups and ${counts.items} items.`
            : `Delete page ${index + 1}?`;
            
        if (!confirm(msg)) return;
        
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
                
                if (!this.engine.config.pages) {
                    this.engine.config.pages = [];
                }
                
                const newPageIndex = this.engine.config.pages.length;
                const newPage = {
                    id: `page_${newPageIndex}`,
                    image: dataUrl,
                    layout: []
                };
                
                this.engine.config.pages.push(newPage);
                this.activePageIndex = newPageIndex;
                
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
            
            input.value = ''; 
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

    // ==================== LLM & SAM LOGIC ====================
    
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
            this.renderPagesList();
            this.switchTab('choice');
        } else {
            statusEl.textContent = "No items found.";
        }

        btn.disabled = false;
        btn.style.opacity = 1;
    }

    // ==================== CONTEXT MENU & EVENTS ====================

    setupContextMenu() {
        const menu = document.getElementById('editor-context-menu');
        
        document.addEventListener('contextmenu', (e) => {
            if (!this.enabled) return;
            
            // Allow default context menu on text inputs (copy/paste)
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            
            // Only show context menu if clicked on a page or item/group
            if (!e.target.closest('.page-container')) return;

            e.preventDefault();
            
            // Determine what was clicked
            let targetType = 'bg';
            let targetId = null;
            let targetName = 'Page';

            const itemEl = e.target.closest('.item-zone');
            const groupEl = e.target.closest('.info-zone');

            if (itemEl) {
                targetType = 'item';
                targetId = itemEl.dataset.itemId;
                targetName = 'Item';
                
                // Auto-select on right click for better UX
                const item = this.engine.findItem(targetId);
                if(item) {
                    this.switchTab('choice');
                    this.selectChoice(item, itemEl);
                }
            } else if (groupEl) {
                targetType = 'group';
                targetId = groupEl.id.replace('group-', '');
                targetName = 'Group';
                
                 // Auto-select group
                const group = this.engine.findGroup(targetId);
                if(group) {
                    this.switchTab('group');
                    this.selectGroup(group);
                }
            }

            // Update active page context
            const pageContainer = e.target.closest('.page-container');
            const pageIndex = pageContainer ? parseInt(pageContainer.id.replace('page-', '')) || 0 : this.activePageIndex;
            this.activePageIndex = pageIndex;

            this.contextMenuContext = {
                x: e.clientX,
                y: e.clientY,
                pageIndex,
                targetType,
                targetId
            };

            // Update UI
            document.getElementById('ctx-label').textContent = targetType === 'bg' ? 'Page Actions' : `${targetName} Actions`;
            
            // Show/Hide based on context
            document.querySelectorAll('.ctx-obj').forEach(el => el.style.display = (targetType !== 'bg') ? 'block' : 'none');
            
            // Paste is available if clipboard has data
            const pasteBtn = document.getElementById('ctx-paste-btn');
            pasteBtn.style.display = this.clipboard ? 'block' : 'none';
            if (this.clipboard) {
                pasteBtn.textContent = `📌 Paste ${this.clipboard.type === 'item' ? 'Item' : 'Group'}`;
            }

            // Position Menu
            menu.style.left = `${e.clientX}px`;
            menu.style.top = `${e.clientY}px`;
            menu.style.display = 'block';
        });

        // Close menu on normal click
        document.addEventListener('click', (e) => {
            if (menu.style.display === 'block') {
                menu.style.display = 'none';
            }
        });
    }

    handleContextAction(action) {
        if (!this.contextMenuContext) return;
        const { targetType, targetId } = this.contextMenuContext;

        switch (action) {
            case 'add-item':
                this.switchTab('choice');
                this.addNewItem(this.contextMenuContext);
                break;
            case 'add-group':
                this.switchTab('group');
                this.addNewGroup(this.contextMenuContext);
                break;
            case 'duplicate':
                this.actionDuplicate(targetType, targetId);
                break;
            case 'copy':
                this.actionCopy(targetType, targetId);
                break;
            case 'paste':
                this.actionPaste();
                break;
            case 'delete':
                if (targetType === 'item') this.deleteSelectedItem();
                if (targetType === 'group') this.deleteSelectedGroup();
                break;
            case 'auto-detect':
                this.switchTab('settings');
                const samHeader = document.querySelector("#tab-content-settings .accordion-header:nth-of-type(3)");
                if (samHeader && samHeader.classList.contains('collapsed')) {
                    this.toggleAccordion(samHeader);
                }
                break;
        }
    }

    actionCopy(type, id) {
        let data = null;
        if (type === 'item') data = this.engine.findItem(id);
        else if (type === 'group') data = this.engine.findGroup(id);

        if (data) {
            // Deep copy to clipboard
            this.clipboard = { type, data: JSON.parse(JSON.stringify(data)) };
            console.log(`📋 Copied ${type} to clipboard`);
        }
    }

    actionPaste() {
        if (!this.clipboard) return;
        
        const { type, data } = this.clipboard;
        const page = this.getCurrentPage();
        if (!page) return;

        // Clone data again so we can paste multiple times
        const newData = JSON.parse(JSON.stringify(data));
        
        // Generate new ID
        newData.id = `${type}_${Date.now()}`;
        if (newData.title) newData.title += " (Copy)";

        // Set position to mouse cursor
        if (newData.coords) {
            const newCoords = this.getSmartCoords(newData.coords.w, newData.coords.h, this.contextMenuContext);
            newData.coords.x = newCoords.x;
            newData.coords.y = newCoords.y;
        }

        // Logic for nested items inside a group (for pasting Groups)
        if (type === 'group' && newData.items) {
            newData.items.forEach(subItem => {
                subItem.id = `item_${Math.floor(Math.random() * 1000000)}`;
            });
        }

        // Add to layout
        page.layout.push(newData);
        
        this.engine.buildMaps();
        this.renderer.renderLayout();
        
        // Select pasted object
        if (type === 'item') {
            this.switchTab('choice');
            setTimeout(() => {
                const el = document.getElementById(`btn-${newData.id}`);
                if (el) this.selectChoice(newData, el);
            }, 50);
        } else {
            this.switchTab('group');
            setTimeout(() => {
                const el = document.getElementById(`group-${newData.id}`);
                if (el) this.selectGroup(newData);
            }, 50);
        }
        this.renderPagesList();
    }

    actionDuplicate(type, id) {
        let original = null;
        if (type === 'item') original = this.engine.findItem(id);
        else if (type === 'group') original = this.engine.findGroup(id);

        if (!original) return;

        const clone = JSON.parse(JSON.stringify(original));
        clone.id = `${type}_${Date.now()}`;
        
        // Shift slightly
        if (clone.coords) {
            clone.coords.x += 20;
            clone.coords.y += 20;
        }

        // If Item, put in same parent
        if (type === 'item') {
            const parent = this.findItemParent(id);
            if (parent) {
                // Insert right after original
                if (parent.group) {
                    parent.group.items.splice(parent.index + 1, 0, clone);
                } else {
                    parent.page.layout.splice(parent.index + 1, 0, clone);
                }
            }
        } 
        // If Group, add to page
        else if (type === 'group') {
            const parent = this.findGroupParent(id);
            if (parent) {
                parent.page.layout.push(clone);
                // Regenerate IDs for inner items to avoid conflicts
                if (clone.items) {
                    clone.items.forEach(it => it.id = `item_${Math.floor(Math.random()*10000000)}`);
                }
            }
        }

        this.engine.buildMaps();
        this.renderer.renderLayout();
        
        // Select duplicate
        if (type === 'item') {
            this.switchTab('choice');
            setTimeout(() => {
                const el = document.getElementById(`btn-${clone.id}`);
                if (el) this.selectChoice(clone, el);
            }, 50);
        } else {
             this.switchTab('group');
            setTimeout(() => {
                const el = document.getElementById(`group-${clone.id}`);
                if (el) this.selectGroup(clone);
            }, 50);
        }
        this.renderPagesList();
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
        if (e.target.closest('#editor-context-menu')) return;
        if (e.button === 2) return; // Ignore right click for dragging

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
            const rect = target.getBoundingClientRect();
            
            // Check for corner resize
            this.resizeMode = this.getResizeHandle(e.clientX, e.clientY, rect);
            
            if (this.resizeMode) {
                this.isResizing = true;
            } else {
                this.isDragging = true;
            }
            
            target.classList.add('dragging');
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
            e.preventDefault(); // Prevent text selection while dragging
        }
    }

    handleMouseMove(e) {
        if (!this.enabled || !this.dragContext) return;
        if (!this.isDragging && !this.isResizing) return;
        
        const dx = e.clientX - this.dragStart.x;
        const dy = e.clientY - this.dragStart.y;
        const { scaleX, scaleY, dim, targetObj } = this.dragContext;
        
        if (this.isDragging) {
            let newX = Math.round(this.initialRect.x + dx * scaleX);
            let newY = Math.round(this.initialRect.y + dy * scaleY);
            
            // Constrain to page boundaries
            if (dim) {
                const w = targetObj.coords.w || 0;
                const h = targetObj.coords.h || 0;
                newX = Math.max(0, Math.min(newX, dim.w - w));
                newY = Math.max(0, Math.min(newY, dim.h - h));
            }
            
            targetObj.coords.x = newX;
            targetObj.coords.y = newY;
        } 
        else if (this.isResizing && this.resizeMode) {
            const deltaX = dx * scaleX;
            const deltaY = dy * scaleY;
            const start = this.initialRect;
            const minSize = 20;

            let newX = start.x;
            let newY = start.y;
            let newW = start.w;
            let newH = start.h;

            // Handle X / Width based on corner
            if (this.resizeMode.includes('l')) { // Left side (tl, bl)
                // If dragging left, w increases. If dragging right, w decreases.
                // We must change X position and Width together.
                newW = Math.max(minSize, start.w - deltaX);
                newX = start.x + (start.w - newW); 
                
                // Clamp Left Edge to 0
                if (newX < 0) {
                    newX = 0;
                    newW = (start.x + start.w); // Keep right edge constant
                }
            } else { // Right side (tr, br)
                newW = Math.max(minSize, start.w + deltaX);
                // Clamp Right Edge to page width
                if (newX + newW > dim.w) {
                    newW = dim.w - newX;
                }
            }

            // Handle Y / Height based on corner
            if (this.resizeMode.includes('t')) { // Top side (tl, tr)
                newH = Math.max(minSize, start.h - deltaY);
                newY = start.y + (start.h - newH);

                // Clamp Top Edge to 0
                if (newY < 0) {
                    newY = 0;
                    newH = (start.y + start.h); // Keep bottom edge constant
                }
            } else { // Bottom side (bl, br)
                newH = Math.max(minSize, start.h + deltaY);
                // Clamp Bottom Edge to page height
                if (newY + newH > dim.h) {
                    newH = dim.h - newY;
                }
            }

            targetObj.coords.x = Math.round(newX);
            targetObj.coords.y = Math.round(newY);
            targetObj.coords.w = Math.round(newW);
            targetObj.coords.h = Math.round(newH);
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
                this.updateGroupMemberships(targetObj, pageIndex);
            } else {
                this.updateItemGrouping(targetObj, pageIndex);
            }
            
            const page = this.getPageByIndex(pageIndex);
            if (page) {
                this.sortLayoutByCoords(page.layout);
            }
            
            this.renderer.renderLayout();
            this.renderPagesList();
            
            if (!isGroup && this.selectedItem) {
                this.updateChoiceInputs();
            }
            // Restore selection highlight manually since renderLayout clears it
            if(isGroup) {
                this.selectGroup(targetObj);
            } else {
                const el = document.getElementById(`btn-${targetObj.id}`);
                this.selectChoice(targetObj, el);
            }
        }
        
        document.querySelectorAll('.dragging').forEach(el => el.classList.remove('dragging'));
        this.isDragging = false; 
        this.isResizing = false; 
        this.resizeMode = null;
        this.dragContext = null;
    }

    handleKeyDown(e) {
        if (!this.enabled) return;
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        
        if (e.key === 'Delete') {
            if (this.activeTab === 'choice' && this.selectedItem) {
                this.deleteSelectedItem();
            } else if (this.activeTab === 'group' && this.selectedGroup) {
                this.deleteSelectedGroup();
            }
        }
    }

    // ==================== SELECTION ====================

    selectChoice(item, element) {
        this.selectedItem = item;
        document.querySelectorAll('.editor-selected').forEach(el => el.classList.remove('editor-selected'));
        if(element) {
            element.classList.add('editor-selected');
            // Set attribute for CSS Notch content
            element.setAttribute('data-editor-title', item.title || item.id);
        }
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
        if(el) {
            el.classList.add('editor-selected');
            // Set attribute for CSS Notch content
            el.setAttribute('data-editor-title', group.title || group.id);
        }
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
        
        // Update DOM title if changed
        const el = document.getElementById(`btn-${item.id}`);
        if(el) el.setAttribute('data-editor-title', item.title || item.id);

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

        // Update DOM title if changed
        const el = document.getElementById(`group-${g.id}`);
        if(el) el.setAttribute('data-editor-title', g.title || g.id);

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
                    if (el) this.selectChoice(this.selectedItem, el); // Re-select to keep highlighting
                }, 0);
            } else { 
                this.renderer.renderLayout(); 
                // Re-apply attributes after render
                const el = document.getElementById(`btn-${this.selectedItem.id}`);
                if(el) {
                    el.classList.add('editor-selected');
                    el.setAttribute('data-editor-title', this.selectedItem.title || this.selectedItem.id);
                }
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
            const el = document.getElementById(`group-${this.selectedGroup.id}`);
            if(el) {
                el.classList.add('editor-selected');
                el.setAttribute('data-editor-title', this.selectedGroup.title || this.selectedGroup.id);
            }
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
                        
                        const el = document.getElementById(`btn-${this.selectedItem.id}`);
                        if(el) this.selectChoice(this.selectedItem, el);
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
                        
                        const el = document.getElementById(`group-${this.selectedGroup.id}`);
                        if(el) this.selectGroup(this.selectedGroup);
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
        if (!confirm('Delete this item?')) return;
        
        const parent = this.findItemParent(this.selectedItem.id);
        if (parent) {
            parent.array.splice(parent.index, 1);
            this.engine.buildMaps();
        }
        
        this.deselectChoice(); 
        this.renderer.renderLayout();
        this.renderPagesList(); // Update counts
    }
    
    // Accepts optional coords (e.g. from context menu)
    addNewItem(coordsFromContext = null) {
        const page = this.getCurrentPage();
        if (!page) {
            alert('No page available. Please add a page image first via Settings tab.');
            return;
        }
        
        const defaultW = 200;
        const defaultH = 100;
        
        // Use smart coordinates logic
        const smartCoords = this.getSmartCoords(defaultW, defaultH, coordsFromContext);

        const newItem = { 
            type: 'item',
            id: `item_${Date.now()}`, 
            title: 'New Item', 
            description: '', 
            coords: { x: smartCoords.x, y: smartCoords.y, w: defaultW, h: defaultH }, 
            cost: [] 
        };
        
        // If adding via button (coordsFromContext is null), check if selectedGroup is active
        if (!coordsFromContext && this.selectedGroup && this.activeTab === 'group') {
            if (!this.selectedGroup.items) this.selectedGroup.items = [];
            this.selectedGroup.items.push(newItem);
        } else {
            page.layout.push(newItem);
        }
        
        this.engine.buildMaps();
        this.renderer.renderLayout();
        this.renderPagesList();
        
        this.switchTab('choice');
        setTimeout(() => { 
            const el = document.getElementById(`btn-${newItem.id}`); 
            if (el) this.selectChoice(newItem, el); 
        }, 50);
    }
    
    // Accepts optional coords (e.g. from context menu)
    addNewGroup(coordsFromContext = null) {
        const page = this.getCurrentPage();
        if (!page) {
            alert('No page available. Please add a page image first via Settings tab.');
            return;
        }
        
        const defaultW = 300;
        const defaultH = 200;

        // Use smart coordinates logic
        const smartCoords = this.getSmartCoords(defaultW, defaultH, coordsFromContext);

        const newGroup = { 
            type: 'group',
            id: `group_${Date.now()}`, 
            title: 'New Group', 
            description: '', 
            coords: { x: smartCoords.x, y: smartCoords.y, w: defaultW, h: defaultH }, 
            items: [] 
        };
        
        page.layout.push(newGroup);
        
        this.engine.buildMaps();
        this.renderer.renderLayout();
        this.renderPagesList();
        
        setTimeout(() => { 
            const el = document.getElementById(`group-${newGroup.id}`); 
            if (el) this.selectGroup(newGroup); 
        }, 50);
    }
    
    deleteSelectedGroup() {
        if (!this.selectedGroup) return;
        
        const itemCount = this.selectedGroup.items?.length || 0;
        if (itemCount > 0) { 
            if (!confirm(`Group has ${itemCount} items. Delete group and ALL items inside?`)) return; 
        } else { 
            if (!confirm('Delete this empty group?')) return; 
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
        this.renderPagesList();
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