/**
 * src\ui\editor\actions.js
 * Editor Actions Mixin - Provides actions for managing items and groups in the editor
 */

import { ProjectStorage } from '../../utils/storage.js';
import { CoordHelper } from '../../utils/coords.js';

export const EditorActionsMixin = {
    // ==================== HELPER: Get current page ====================
    getCurrentPage() {
        const pages = this.engine.config.pages || [];
        return pages[this.activePageIndex] || null;
    },

    getPageByIndex(index) {
        const pages = this.engine.config.pages || [];
        return pages[index] || null;
    },

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
    },

    // ==================== HELPER: Find Parent Logic ====================
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
    },

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
    },

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
    },

    // ==================== GROUPING LOGIC ====================
    moveItemToGroup(item, targetGroup, page) {
        const parent = this.findItemParent(item.id);
        if (!parent) return false;

        // Remove from current location
        parent.array.splice(parent.index, 1);

        if (targetGroup) {
            if (!targetGroup.items) targetGroup.items = [];
            targetGroup.items.push(item);
            console.log(`📦 Moved "${item.id}" into group "${targetGroup.id}"`);
        } else {
            page.layout.push(item);
            console.log(`📦 Moved "${item.id}" to page root`);
        }
        return true;
    },

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
    },

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
    },

    // ==================== SORTING ====================
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
    },

    sortCurrentPageLayout() {
        const page = this.getCurrentPage();
        if (page) this.sortLayoutByCoords(page.layout);
    },

    sortAllLayouts() {
        const pages = this.engine.config.pages || [];
        for (const page of pages) {
            this.sortLayoutByCoords(page.layout);
        }
        console.log('📐 Layouts sorted by coordinates');
    },

    // ==================== MULTI-SELECT ALIGNMENT ACTIONS ====================
    alignSelectedItems(mode) {
        if (this.selectedItems.length < 2) return;
        const items = this.selectedItems;
        let val = 0;

        if (mode === 'top') {
            val = Math.min(...items.map(i => i.coords.y));
            items.forEach(i => i.coords.y = val);
        } else if (mode === 'left') {
            val = Math.min(...items.map(i => i.coords.x));
            items.forEach(i => i.coords.x = val);
        } else if (mode === 'bottom') {
            val = Math.max(...items.map(i => i.coords.y + i.coords.h));
            items.forEach(i => i.coords.y = val - i.coords.h);
        } else if (mode === 'right') {
            val = Math.max(...items.map(i => i.coords.x + i.coords.w));
            items.forEach(i => i.coords.x = val - i.coords.w);
        }

        this.renderer.renderLayout();
    },

    matchSizeSelectedItems(mode) {
        if (this.selectedItems.length < 2) return;
        const items = this.selectedItems;
        // Use the last selected item (primary selection) as the reference
        const ref = this.selectedItem || items[0];
        
        if (mode === 'width' || mode === 'both') {
            const w = ref.coords.w;
            items.forEach(i => i.coords.w = w);
        }
        if (mode === 'height' || mode === 'both') {
            const h = ref.coords.h;
            items.forEach(i => i.coords.h = h);
        }
        
        this.renderer.renderLayout();
    },

    distributeSelectedItems(mode) {
        if (this.selectedItems.length < 3) return;
        const items = [...this.selectedItems]; // Copy for sorting

        if (mode === 'vertical') {
            items.sort((a,b) => a.coords.y - b.coords.y);
            const first = items[0];
            const last = items[items.length-1];
            const totalDist = last.coords.y - first.coords.y;
            const step = totalDist / (items.length - 1);
            
            for(let i=1; i<items.length-1; i++) {
                items[i].coords.y = Math.round(first.coords.y + (step * i));
            }
        } else if (mode === 'horizontal') {
            items.sort((a,b) => a.coords.x - b.coords.x);
            const first = items[0];
            const last = items[items.length-1];
            const totalDist = last.coords.x - first.coords.x;
            const step = totalDist / (items.length - 1);
            
            for(let i=1; i<items.length-1; i++) {
                items[i].coords.x = Math.round(first.coords.x + (step * i));
            }
        }
        this.renderer.renderLayout();
    },

    deleteSelectedItems() {
        if (!this.selectedItems.length) return;
        if (!confirm(`Delete ${this.selectedItems.length} items?`)) return;

        this.selectedItems.forEach(item => {
             const parent = this.findItemParent(item.id);
             if (parent) {
                 parent.array.splice(parent.index, 1);
             }
        });
        
        this.engine.buildMaps();
        this.deselectChoice();
        this.renderer.renderLayout();
        this.renderPagesList();
    },

    // ==================== CRUD OPERATIONS ====================
    
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
    },
    
    addNewGroup(coordsFromContext = null) {
        const page = this.getCurrentPage();
        if (!page) {
            alert('No page available. Please add a page image first via Settings tab.');
            return;
        }
        
        const defaultW = 300;
        const defaultH = 200;
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
    },

    deleteSelectedItem() {
        if (!this.selectedItem) return; 
        
        // Handle Multi-Select Delete
        if (this.selectedItems.length > 1) {
            this.deleteSelectedItems();
            return;
        }

        if (!confirm('Delete this item?')) return;
        
        const parent = this.findItemParent(this.selectedItem.id);
        if (parent) {
            parent.array.splice(parent.index, 1);
            this.engine.buildMaps();
        }
        
        this.deselectChoice(); 
        this.renderer.renderLayout();
        this.renderPagesList();
    },

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
    },

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
    },

    // ==================== CLIPBOARD ACTIONS ====================
    actionCopy(type, id) {
        let data = null;
        if (type === 'item') data = this.engine.findItem(id);
        else if (type === 'group') data = this.engine.findGroup(id);

        if (data) {
            // Deep copy to clipboard
            this.clipboard = { type, data: JSON.parse(JSON.stringify(data)) };
            console.log(`📋 Copied ${type} to clipboard`);
        }
    },

    actionPaste() {
        if (!this.clipboard) return;
        
        const { type, data } = this.clipboard;
        const page = this.getCurrentPage();
        if (!page) return;

        const newData = JSON.parse(JSON.stringify(data));
        
        newData.id = `${type}_${Date.now()}`;
        if (newData.title) newData.title += " (Copy)";

        if (newData.coords) {
            const newCoords = this.getSmartCoords(newData.coords.w, newData.coords.h, this.contextMenuContext);
            newData.coords.x = newCoords.x;
            newData.coords.y = newCoords.y;
        }

        if (type === 'group' && newData.items) {
            newData.items.forEach(subItem => {
                subItem.id = `item_${Math.floor(Math.random() * 1000000)}`;
            });
        }

        page.layout.push(newData);
        
        this.engine.buildMaps();
        this.renderer.renderLayout();
        
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
    },

    actionDuplicate(type, id) {
        let original = null;
        if (type === 'item') original = this.engine.findItem(id);
        else if (type === 'group') original = this.engine.findGroup(id);

        if (!original) return;

        const clone = JSON.parse(JSON.stringify(original));
        clone.id = `${type}_${Date.now()}`;
        
        if (clone.coords) {
            clone.coords.x += 20;
            clone.coords.y += 20;
        }

        if (type === 'item') {
            const parent = this.findItemParent(id);
            if (parent) {
                if (parent.group) {
                    parent.group.items.splice(parent.index + 1, 0, clone);
                } else {
                    parent.page.layout.splice(parent.index + 1, 0, clone);
                }
            }
        } 
        else if (type === 'group') {
            const parent = this.findGroupParent(id);
            if (parent) {
                parent.page.layout.push(clone);
                if (clone.items) {
                    clone.items.forEach(it => it.id = `item_${Math.floor(Math.random()*10000000)}`);
                }
            }
        }

        this.engine.buildMaps();
        this.renderer.renderLayout();
        
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
    },

    // ==================== VISUAL HELPERS (LLM SUPPORT) ====================
    
    async copyDebugImageToClipboard() {
        const page = this.getCurrentPage();
        if (!page || !page.image) {
            alert("No image on this page.");
            return;
        }

        const btn = document.getElementById('btn-copy-debug-img');
        if(btn) { 
            btn.disabled = true; 
            btn.textContent = "⏳ Generating..."; 
            btn.style.opacity = "0.7";
        }

        try {
            // 1. Load Image
            const img = new Image();
            img.crossOrigin = "Anonymous";
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
                img.src = page.image;
            });

            // 2. Setup Canvas
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d');

            // 3. Draw Original Image
            ctx.drawImage(img, 0, 0);

            // 4. Calculate Font Size
            const fontSize = Math.max(16, Math.min(48, Math.floor(canvas.width / 60)));
            const lineWidth = Math.max(3, Math.floor(fontSize / 5));

            // 5. Helper to draw boxes
            const drawBox = (obj, isGroup) => {
                if (!obj.coords) return;
                
                // Convert coords to pixels
                const c = CoordHelper.toPixels(obj.coords, { w: canvas.width, h: canvas.height });

                // Draw Rect
                ctx.lineWidth = lineWidth;
                ctx.strokeStyle = isGroup ? '#FFD700' : '#00FF00'; // Gold for Group, Green for Item
                ctx.strokeRect(c.x, c.y, c.w, c.h);

                // Draw Label
                ctx.font = `bold ${fontSize}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'top'; // Draw text INSIDE the box (downwards from top edge)
                
                let text = obj.id;
                if (isGroup) text = `[Group] ${text}`;
                
                // Truncate overly long IDs
                if (text.length > 30) text = text.substring(0, 27) + '...';

                const tx = c.x + c.w / 2;
                const ty = c.y + lineWidth + 5; // Padding from top border inside

                // Black stroke (halo)
                ctx.lineJoin = 'round';
                ctx.lineWidth = lineWidth + 2;
                ctx.strokeStyle = '#000000';
                ctx.strokeText(text, tx, ty);
                
                // White/Gold fill
                ctx.fillStyle = isGroup ? '#FFD700' : '#FFFFFF';
                ctx.fillText(text, tx, ty);
            };

            // 6. Flatten layout for drawing
            const groupsToDraw = [];
            const itemsToDraw = [];

            const traverse = (list) => {
                list.forEach(el => {
                    if (el.type === 'group') {
                        groupsToDraw.push(el);
                        if (el.items) traverse(el.items);
                    } else {
                        itemsToDraw.push(el);
                    }
                });
            };
            traverse(page.layout);

            groupsToDraw.forEach(g => drawBox(g, true));
            itemsToDraw.forEach(i => drawBox(i, false));

            // 7. Copy to Clipboard
            canvas.toBlob(async (blob) => {
                if (!blob) {
                    throw new Error("Canvas failed to blob");
                }
                try {
                    const item = new ClipboardItem({ "image/png": blob });
                    await navigator.clipboard.write([item]);
                    
                    if(btn) { 
                        btn.textContent = "✅ Copied!"; 
                        setTimeout(() => {
                            btn.disabled = false;
                            btn.textContent = "📸 Copy Layout Image (For LLM)";
                            btn.style.opacity = "1";
                        }, 2000);
                    }
                } catch (err) {
                    console.error("Clipboard Error:", err);
                    alert("Failed to copy image to clipboard. See console for details.\nNote: This feature requires a secure context (HTTPS or localhost).");
                    if(btn) { 
                        btn.disabled = false; 
                        btn.textContent = "📸 Copy Layout Image (For LLM)";
                        btn.style.opacity = "1";
                    }
                }
            }, 'image/png');

        } catch (e) {
            console.error("Image Gen Error:", e);
            alert("Error generating debug image: " + e.message);
            if(btn) { 
                btn.disabled = false; 
                btn.textContent = "📸 Copy Layout Image (For LLM)";
                btn.style.opacity = "1";
            }
        }
    },

    // ==================== EXPORT ====================
    exportConfig() {
        this.sortAllLayouts();
        ProjectStorage.save(this.engine.config);
    },

    async exportZip() {
        try {
            this.sortAllLayouts();
            await ProjectStorage.saveZip(this.engine.config);
        } catch (e) {
            alert(e.message);
        }
    }
};