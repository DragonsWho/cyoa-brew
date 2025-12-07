/**
 * src/ui/editor/ui/sidebar.js
 * Main Sidebar Creation and Tab Management
 */

import { createChoicePanel } from './choice-panel.js';
import { createGroupPanel } from './group-panel.js';
import { createSettingsPanel } from './settings-panel.js';
import { createAiPanelHTML } from './ai-panel.js';

export const SidebarMixin = {
    // ==================== CREATE SIDEBAR ====================
    
    createEditorUI() {
        if (document.getElementById('editor-sidebar')) return;
        
        if (!document.getElementById('editor-split-guide')) {
            const guide = document.createElement('div');
            guide.id = 'editor-split-guide';
            guide.style.cssText = `position: fixed; background: rgba(0, 255, 255, 0.8); border: 1px solid white; box-shadow: 0 0 5px cyan; pointer-events: none; z-index: 10000; display: none;`;
            document.body.appendChild(guide);
        }

        const sidebar = document.createElement('div');
        sidebar.id = 'editor-sidebar';
        sidebar.className = 'editor-sidebar';
        
        sidebar.innerHTML = `
            <!-- Hidden File Inputs -->
            <input type="file" id="load-config-input" accept=".json" style="display:none;">
            <input type="file" id="add-page-image-input" accept="image/*" style="display:none;">

            <div class="editor-tabs">
                <button class="tab-btn" data-tab="choice" onclick="CYOA.editor.switchTab('choice')">Choice</button>
                <button class="tab-btn" data-tab="group" onclick="CYOA.editor.switchTab('group')">Group</button>
                <button class="tab-btn" data-tab="settings" onclick="CYOA.editor.switchTab('settings')">Settings</button>
                <button class="tab-btn" data-tab="ai" onclick="CYOA.editor.switchTab('ai')" title="AI Tools">AI Tools</button>
                <button class="close-tab-btn" onclick="CYOA.controls.toggleEditMode()">✕</button>
            </div>
            
            <!-- Page Navigation Strip -->
            <div class="editor-page-nav-container">
                <button class="nav-arrow" onclick="CYOA.editor.scrollPageNav(-100)">‹</button>
                <div id="editor-page-nav-scroll" class="nav-scroll-area"></div>
                <button class="nav-arrow" onclick="CYOA.editor.scrollPageNav(100)">›</button>
            </div>
            
            <div class="sidebar-scroll-content">
                ${createChoicePanel()}
                ${createGroupPanel()}
                ${createSettingsPanel()}
                ${createAiPanelHTML()}
            </div>
            
            <!-- Modals -->
            <div id="llm-preview-modal" class="modal-overlay" style="display:none;">
                <div class="modal-content" style="max-width:700px;">
                    <h3 style="margin:0 0 5px 0;">🔍 Review AI Changes</h3>
                    <div id="llm-result-summary" style="font-size:0.8rem; color:#4CAF50; margin-bottom:10px; padding:6px 10px; background:#1a2f1a; border-radius:4px; display:none;"></div>
                    <textarea id="llm-result-json" class="code-editor" style="height:400px; font-size:11px;"></textarea>
                    <div class="row-buttons" style="margin-top:12px;">
                        <button class="action-btn" onclick="document.getElementById('llm-preview-modal').style.display='none'" style="background:#444;">Cancel</button>
                        <button class="action-btn primary-btn" onclick="CYOA.editor.applyLlmChanges()">✅ Apply Changes</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(sidebar);
        this.ruleBuilder.renderUI(document.getElementById('rule-builder-container'));
        
        // Setup listeners
        this.setupAllListeners();
        
        const navScroll = document.getElementById('editor-page-nav-scroll');
        if (navScroll) {
            navScroll.addEventListener('wheel', (e) => {
                e.preventDefault();
                navScroll.scrollLeft += e.deltaY;
            });
        }
        
        if (this.setupContextMenu) {
             this.setupContextMenu(); 
        }
        
        this.renderPageNavigationBar();
    },

    // ==================== PAGE NAV RENDERER ====================

    renderPageNavigationBar() {
        const container = document.getElementById('editor-page-nav-scroll');
        if (!container) return;
        
        const pages = this.engine.config.pages || [];
        
        let html = '';
        
        if (pages.length > 0) {
            pages.forEach((page, idx) => {
                const counts = this.countPageElements(page);
                const isActive = idx === this.activePageIndex;
                const tooltip = `Page ${idx + 1}\nItems: ${counts.items}\nGroups: ${counts.groups}`;
                
                html += `
                    <div class="nav-page-btn ${isActive ? 'active' : ''}" 
                        onclick="CYOA.editor.selectPage(${idx})" 
                        title="${tooltip}">
                        <span class="page-num">${idx + 1}</span>
                        ${isActive ? `<span class="page-close" onclick="event.stopPropagation(); CYOA.editor.deletePage(${idx})">×</span>` : ''}
                    </div>
                    <div class="nav-divider">|</div>
                `;
            });
        }

        html += `
            <div class="nav-page-btn nav-add-btn" 
                 onclick="document.getElementById('add-page-image-input').click()" 
                 title="Add New Page Image">
                 <span>+</span>
            </div>
        `;
        
        container.innerHTML = html;
        
        setTimeout(() => {
            const activeEl = container.querySelector('.nav-page-btn.active');
            if (activeEl) activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }, 10);
    },

    scrollPageNav(amount) {
        const container = document.getElementById('editor-page-nav-scroll');
        if (container) container.scrollBy({ left: amount, behavior: 'smooth' });
    },

    // ==================== TAB SWITCHING ====================

    switchTab(tabName) {
        // --- NEW: Reset Preview Mode when switching tabs ---
        if (this.activeTab === 'settings' && tabName !== 'settings') {
            this.togglePreviewMode(false);
        }

        this.activeTab = tabName;
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tabName));
        document.querySelectorAll('.tab-content').forEach(content => content.style.display = 'none');
        document.getElementById(`tab-content-${tabName}`).style.display = 'block';
        document.body.classList.remove('edit-mode-choice', 'edit-mode-group');
        
        if (tabName === 'choice') {
            document.body.classList.add('edit-mode-choice');
            this.updateChoiceInputs();
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
            this.updateSettingsInputs(); 
        } else if (tabName === 'ai') {
            // Setup for AI tab if needed
        }
    },

    toggleAccordion(header) {
        header.classList.toggle('collapsed');
        const content = header.nextElementSibling;
        content.classList.toggle('collapsed');
    }
};