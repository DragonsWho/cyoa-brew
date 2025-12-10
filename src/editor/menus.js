/**
 * src/ui/editor/menus.js
 * Editor Menus Mixin - Handles Context Menu Logic
 */

import { ICONS } from './ui/icons.js';

export const EditorMenusMixin = {
    setupContextMenu() {
        // Remove existing if any (to prevent duplicates on re-init)
        const existing = document.getElementById('editor-context-menu');
        if (existing) existing.remove();

        const contextMenu = document.createElement('div');
        contextMenu.id = 'editor-context-menu';
        contextMenu.className = 'custom-context-menu';
        contextMenu.style.display = 'none';
        
        // HTML Structure of the menu
        contextMenu.innerHTML = `
            <div class="menu-label" id="ctx-label">Actions</div>
            <div class="menu-divider"></div>
            <div class="menu-item ctx-common" onclick="CYOA.editor.handleContextAction('add-item')">${ICONS.add} Add Item Here</div>
            <div class="menu-item ctx-common" onclick="CYOA.editor.handleContextAction('add-group')">${ICONS.folder} Add Group Here</div>
            <div class="menu-divider ctx-obj"></div>
            <div class="menu-item ctx-obj" onclick="CYOA.editor.handleContextAction('duplicate')">${ICONS.duplicate} Duplicate</div>
            <div class="menu-item ctx-obj" onclick="CYOA.editor.handleContextAction('copy')">${ICONS.copy} Copy</div>
            <div class="menu-item ctx-obj" style="color:#ff6b6b;" onclick="CYOA.editor.handleContextAction('delete')">${ICONS.delete} Delete</div>
            <div class="menu-divider ctx-obj"></div>
            <div class="menu-item ctx-obj" onclick="CYOA.editor.handleContextAction('split-v')">${ICONS.split_v} Split Vertical</div>
            <div class="menu-item ctx-obj" onclick="CYOA.editor.handleContextAction('split-h')">${ICONS.split_h} Split Horizontal</div>
            <div class="menu-divider ctx-paste"></div>
            <div class="menu-item ctx-paste" id="ctx-paste-btn" onclick="CYOA.editor.handleContextAction('paste')">${ICONS.paste} Paste</div>
            <div class="menu-divider"></div> 
        `;
        document.body.appendChild(contextMenu);

        // Event Listener: OPEN Menu
        document.addEventListener('contextmenu', (e) => {
            if (!this.enabled) return;
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            if (!e.target.closest('.page-container')) return;

            e.preventDefault();
            
            let targetType = 'bg';
            let targetId = null;
            let targetName = 'Page';

            const itemEl = e.target.closest('.item-zone');
            const groupEl = e.target.closest('.info-zone');

            if (itemEl) {
                targetType = 'item';
                targetId = itemEl.dataset.itemId;
                targetName = 'Item';
                const item = this.engine.findItem(targetId);
                if(item) {
                    this.switchTab('choice');
                    this.selectChoice(item, itemEl);
                }
            } else if (groupEl) {
                targetType = 'group';
                targetId = groupEl.id.replace('group-', '');
                targetName = 'Group';
                const group = this.engine.findGroup(targetId);
                if(group) {
                    this.switchTab('group');
                    this.selectGroup(group);
                }
            }

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

            // Update Menu UI based on context
            document.getElementById('ctx-label').textContent = targetType === 'bg' ? 'Page Actions' : `${targetName} Actions`;
            document.querySelectorAll('.ctx-obj').forEach(el => el.style.display = (targetType !== 'bg') ? 'block' : 'none');
            
            const pasteBtn = document.getElementById('ctx-paste-btn');
            pasteBtn.style.display = this.clipboard ? 'block' : 'none';
            if (this.clipboard) {
                pasteBtn.textContent = `📌 Paste ${this.clipboard.type === 'item' ? 'Item' : 'Group'}`;
            }

            // Position and Show
            contextMenu.style.left = `${e.clientX}px`;
            contextMenu.style.top = `${e.clientY}px`;
            contextMenu.style.display = 'block';
        });

        // Event Listener: CLOSE Menu on click elsewhere
        document.addEventListener('click', (e) => {
            if (contextMenu.style.display === 'block') {
                contextMenu.style.display = 'none';
            }
        });
    },

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
            case 'split-v':
                if (targetType === 'item') {
                    const item = this.engine.findItem(targetId);
                    if (item) {
                        this.startSplit(item, 'vertical');
                    }
                }
                break;
            case 'split-h':
                if (targetType === 'item') {
                    const item = this.engine.findItem(targetId);
                    if (item) {
                        this.startSplit(item, 'horizontal');
                    }
                }
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
};