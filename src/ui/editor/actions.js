/**
 * src\ui\editor\actions.js
 * Editor Actions Mixin - Added robust ID generation to prevent duplicates
 */

import { ProjectStorage } from '../../utils/storage.js';
import { CoordHelper } from '../../utils/coords.js';

export const EditorActionsMixin = {
    // ... [Existing methods: getCurrentPage, countPageElements, findItemParent, findGroupParent, findGroupAtPoint...] ...
    // ... [Copy all helper methods from previous version until CRUD OPERATIONS] ...

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
        
        const traverse = (list) => {
            list.forEach(el => {
                if (el.type === 'group') {
                    groups++;
                    if (el.items) traverse(el.items);
                } else if (el.type === 'item') {
                    items++;
                }
            });
        };
        traverse(page.layout);
        
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

    moveItemToGroup(item, targetGroup, page) {
        const parent = this.findItemParent(item.id);
        if (!parent) return false;
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
        for (const item of itemsToMove) { this.moveItemToGroup(item, group, page); }
        for (const item of itemsToRemove) { this.moveItemToGroup(item, null, page); }
        if (itemsToMove.length > 0 || itemsToRemove.length > 0) { this.engine.buildMaps(); }
    },

    sortLayoutByCoords(layout) {
        if (!layout || !Array.isArray(layout)) return;
        const ROW_THRESHOLD = 50;
        layout.sort((a, b) => {
            const aY = a.coords?.y || 0;
            const bY = b.coords?.y || 0;
            const aX = a.coords?.x || 0;
            const bX = b.coords?.x || 0;
            if (Math.abs(aY - bY) < ROW_THRESHOLD) { return aX - bX; }
            return aY - bY;
        });
        for (const element of layout) {
            if (element.type === 'group' && element.items) { this.sortLayoutByCoords(element.items); }
        }
    },

    sortCurrentPageLayout() { const page = this.getCurrentPage(); if (page) this.sortLayoutByCoords(page.layout); },
    sortAllLayouts() {
        const pages = this.engine.config.pages || [];
        for (const page of pages) { this.sortLayoutByCoords(page.layout); }
    },

    alignSelectedItems(mode) {
        this.history.push('align_items');
        if (this.selectedItems.length < 2) return;
        const items = this.selectedItems;
        let val = 0;
        if (mode === 'top') { val = Math.min(...items.map(i => i.coords.y)); items.forEach(i => i.coords.y = val); }
        else if (mode === 'left') { val = Math.min(...items.map(i => i.coords.x)); items.forEach(i => i.coords.x = val); }
        else if (mode === 'bottom') { val = Math.max(...items.map(i => i.coords.y + i.coords.h)); items.forEach(i => i.coords.y = val - i.coords.h); }
        else if (mode === 'right') { val = Math.max(...items.map(i => i.coords.x + i.coords.w)); items.forEach(i => i.coords.x = val - i.coords.w); }
        this.renderer.renderLayout();
    },

    matchSizeSelectedItems(mode) {
        this.history.push('resize_match');
        if (this.selectedItems.length < 2) return;
        const items = this.selectedItems;
        const ref = this.selectedItem || items[0];
        if (mode === 'width' || mode === 'both') { const w = ref.coords.w; items.forEach(i => i.coords.w = w); }
        if (mode === 'height' || mode === 'both') { const h = ref.coords.h; items.forEach(i => i.coords.h = h); }
        this.renderer.renderLayout();
    },

    deleteSelectedItems() {
        this.history.push('delete_multi');
        if (!this.selectedItems.length) return;
        if (!confirm(`Delete ${this.selectedItems.length} items?`)) return;
        this.selectedItems.forEach(item => {
             const parent = this.findItemParent(item.id);
             if (parent) { parent.array.splice(parent.index, 1); }
        });
        this.engine.buildMaps();
        this.deselectChoice();
        this.renderer.renderLayout();
        this.renderPagesList();
    },

    // ==================== HELPER: Unique ID Generator ====================
    generateId(prefix) {
        return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    },


    // ==================== NEW: DRAW CREATION LOGIC ====================
    
    startDragCreation(type, x, y, pageIndex) {
        const page = this.getPageByIndex(pageIndex);
        if (!page) return null;

        // Initialize with 1x1 size at click point
        const newObj = {
            id: this.generateId(type),
            type: type,
            title: `New ${type === 'item' ? 'Item' : 'Group'}`,
            description: '',
            coords: { x: Math.round(x), y: Math.round(y), w: 1, h: 1 }
        };

        if (type === 'item') {
            newObj.cost = [];
        } else {
            newObj.items = [];
        }

        // Add to layout immediately so it's rendered
        page.layout.push(newObj);
        this.engine.buildMaps();
        this.renderer.renderLayout(); // Create DOM element

        return newObj;
    },

    // ==================== STANDARD CRUD ====================
    
    addNewItem(coordsFromContext = null) {
        this.history.push('add_item');
        const page = this.getCurrentPage();
        if (!page) { alert('No page available.'); return; }
        
        const defaultW = 200;
        const defaultH = 100;
        const smartCoords = this.getSmartCoords(defaultW, defaultH, coordsFromContext);

        const newItem = { 
            type: 'item', 
            id: this.generateId('item'), 
            title: 'New Item', 
            description: '', 
            coords: { x: smartCoords.x, y: smartCoords.y, w: defaultW, h: defaultH }, 
            cost: [] 
        };
        
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
        setTimeout(() => { const el = document.getElementById(`btn-${newItem.id}`); if (el) this.selectChoice(newItem, el); }, 50);
    },
    
    addNewGroup(coordsFromContext = null) {
        this.history.push('add_group');
        const page = this.getCurrentPage();
        if (!page) return;
        const defaultW = 300;
        const defaultH = 200;
        const smartCoords = this.getSmartCoords(defaultW, defaultH, coordsFromContext);
        
        const newGroup = { 
            type: 'group', 
            id: this.generateId('group'), 
            title: 'New Group', 
            description: '', 
            coords: { x: smartCoords.x, y: smartCoords.y, w: defaultW, h: defaultH }, 
            items: [] 
        };
        
        page.layout.push(newGroup);
        this.engine.buildMaps();
        this.renderer.renderLayout();
        this.renderPagesList();
        setTimeout(() => { const el = document.getElementById(`group-${newGroup.id}`); if (el) this.selectGroup(newGroup); }, 50);
    },

    deleteSelectedItem() {
        this.history.push('delete_item');
        if (!this.selectedItem) return; 
        if (this.selectedItems.length > 1) { this.deleteSelectedItems(); return; }
        if (!confirm('Delete this item?')) return;
        const parent = this.findItemParent(this.selectedItem.id);
        if (parent) { parent.array.splice(parent.index, 1); this.engine.buildMaps(); }
        this.deselectChoice(); 
        this.renderer.renderLayout();
        this.renderPagesList();
    },

    deleteSelectedGroup() {
        this.history.push('delete_group');
        if (!this.selectedGroup) return;
        const itemCount = this.selectedGroup.items?.length || 0;
        if (itemCount > 0) { if (!confirm(`Group has ${itemCount} items. Delete group and ALL items inside?`)) return; } else { if (!confirm('Delete this empty group?')) return; }
        const parent = this.findGroupParent(this.selectedGroup.id);
        if (parent) { parent.array.splice(parent.index, 1); this.engine.buildMaps(); }
        this.selectedGroup = null; 
        document.querySelectorAll('.info-zone.editor-selected').forEach(el => el.classList.remove('editor-selected'));
        document.getElementById('group-props').style.display = 'none'; 
        document.getElementById('group-empty-state').style.display = 'block';
        this.renderer.renderLayout();
        this.renderPagesList();
    },

    deletePage(index) {
        this.history.push('delete_page');
        const pages = this.engine.config.pages || [];
        if (pages.length <= 1) { alert('Cannot delete the last page.'); return; }
        const counts = this.countPageElements(pages[index]);
        if (!confirm(`Delete page ${index + 1}? (${counts.items} items)`)) return;
        pages.splice(index, 1);
        if (this.activePageIndex >= pages.length) this.activePageIndex = pages.length - 1;
        this.engine.buildMaps();
        this.renderer.renderAll();
        this.renderPagesList();
    },
    
    // ==================== SPLIT, DUPLICATE, COPY, ZOOM, ETC ... ====================
    
    startSplit(item, axis) {
        this.history.push('split_start');
        this.splitState = { item: item, axis: axis, splitVal: (axis === 'vertical' ? item.coords.w : item.coords.h) / 2 };
        const guide = document.getElementById('editor-split-guide');
        if (guide) {
            guide.style.display = 'block';
            if (axis === 'vertical') { guide.style.width = '10px'; guide.style.height = '0px'; } else { guide.style.height = '10px'; guide.style.width = '0px'; }
        }
        document.body.style.cursor = axis === 'vertical' ? 'col-resize' : 'row-resize';
        this.updateSplitGuideVisuals();
    },

    cancelSplit() {
        this.splitState = null;
        const guide = document.getElementById('editor-split-guide');
        if (guide) guide.style.display = 'none';
        document.body.style.cursor = '';
    },

    commitSplit() {
        if (!this.splitState) return;
        const { item, axis, splitVal } = this.splitState;
        const GAP = 10; const HALF_GAP = GAP / 2;
        const parent = this.findItemParent(item.id);
        if (!parent) return;
        const newItem = JSON.parse(JSON.stringify(item));
        
        // FIXED: Robust ID gen
        newItem.id = this.generateId('item');
        newItem.title += " (Split)";

        if (axis === 'vertical') {
            const originalW = item.coords.w;
            const w1 = splitVal - HALF_GAP;
            const w2 = originalW - splitVal - HALF_GAP;
            item.coords.w = Math.max(10, Math.round(w1));
            newItem.coords.x = Math.round(item.coords.x + splitVal + HALF_GAP);
            newItem.coords.w = Math.max(10, Math.round(w2));
        } else {
            const originalH = item.coords.h;
            const h1 = splitVal - HALF_GAP;
            const h2 = originalH - splitVal - HALF_GAP;
            item.coords.h = Math.max(10, Math.round(h1));
            newItem.coords.y = Math.round(item.coords.y + splitVal + HALF_GAP);
            newItem.coords.h = Math.max(10, Math.round(h2));
        }

        parent.array.splice(parent.index + 1, 0, newItem);
        this.engine.buildMaps();
        this.renderer.renderLayout();
        this.renderPagesList();
        this.cancelSplit();
        setTimeout(() => { const el = document.getElementById(`btn-${newItem.id}`); if (el) this.selectChoice(newItem, el); }, 50);
    },

    updateSplitGuideVisuals() {
        if (!this.splitState) return;
        const { item, axis, splitVal } = this.splitState;
        const btnId = `btn-${item.id}`;
        const el = document.getElementById(btnId);
        const guide = document.getElementById('editor-split-guide');
        if (el && guide) {
            const rect = el.getBoundingClientRect();
            const ratioX = rect.width / item.coords.w;
            const ratioY = rect.height / item.coords.h;
            if (axis === 'vertical') {
                const screenOffset = splitVal * ratioX;
                guide.style.left = (rect.left + screenOffset - 5) + 'px'; guide.style.top = rect.top + 'px'; guide.style.height = rect.height + 'px'; guide.style.width = '10px';
            } else {
                const screenOffset = splitVal * ratioY;
                guide.style.top = (rect.top + screenOffset - 5) + 'px'; guide.style.left = rect.left + 'px'; guide.style.width = rect.width + 'px'; guide.style.height = '10px';
            }
            guide.style.display = 'block';
        }
    },
    
    updateSplitGuideFromMouse(e) {
        if (!this.splitState) return;
        const { item, axis } = this.splitState;
        const btnId = `btn-${item.id}`;
        const el = document.getElementById(btnId);
        if (!el) return;
        const rect = el.getBoundingClientRect();
        let relX = e.clientX - rect.left;
        let relY = e.clientY - rect.top;
        relX = Math.max(0, Math.min(relX, rect.width));
        relY = Math.max(0, Math.min(relY, rect.height));
        if (axis === 'vertical') { const ratio = item.coords.w / rect.width; this.splitState.splitVal = relX * ratio; } 
        else { const ratio = item.coords.h / rect.height; this.splitState.splitVal = relY * ratio; }
        this.updateSplitGuideVisuals();
    },

    actionCopy(type, id) {
        let data = null;
        if (type === 'item') data = this.engine.findItem(id);
        else if (type === 'group') data = this.engine.findGroup(id);
        if (data) { this.clipboard = { type, data: JSON.parse(JSON.stringify(data)) }; console.log(`📋 Copied ${type}`); }
    },

    actionPaste() {
        if (!this.clipboard) return;
        this.history.push('paste');
        const { type, data } = this.clipboard;
        const page = this.getCurrentPage();
        if (!page) return;
        const newData = JSON.parse(JSON.stringify(data));
        
        // FIXED: Robust ID gen
        newData.id = this.generateId(type);
        
        if (newData.title) newData.title += " (Copy)";
        if (newData.coords) {
            const newCoords = this.getSmartCoords(newData.coords.w, newData.coords.h, this.contextMenuContext);
            newData.coords.x = newCoords.x; newData.coords.y = newCoords.y;
        }
        if (type === 'group' && newData.items) { newData.items.forEach(subItem => { subItem.id = this.generateId('item'); }); }
        page.layout.push(newData);
        this.engine.buildMaps();
        this.renderer.renderLayout();
        if (type === 'item') {
            this.switchTab('choice');
            setTimeout(() => { const el = document.getElementById(`btn-${newData.id}`); if (el) this.selectChoice(newData, el); }, 50);
        } else {
            this.switchTab('group');
            setTimeout(() => { const el = document.getElementById(`group-${newData.id}`); if (el) this.selectGroup(newData); }, 50);
        }
        this.renderPagesList();
    },

    actionDuplicate(type, id) {
        this.history.push('duplicate');
        let original = null;
        if (type === 'item') original = this.engine.findItem(id);
        else if (type === 'group') original = this.engine.findGroup(id);
        if (!original) return;
        const clone = JSON.parse(JSON.stringify(original));
        
        // FIXED: Robust ID gen
        clone.id = this.generateId(type);
        
        if (clone.coords) { clone.coords.x += 20; clone.coords.y += 20; }
        if (type === 'item') {
            const parent = this.findItemParent(id);
            if (parent) {
                if (parent.group) parent.group.items.splice(parent.index + 1, 0, clone);
                else parent.page.layout.splice(parent.index + 1, 0, clone);
            }
        } 
        else if (type === 'group') {
            const parent = this.findGroupParent(id);
            if (parent) {
                parent.page.layout.push(clone);
                if (clone.items) clone.items.forEach(it => it.id = this.generateId('item'));
            }
        }
        this.engine.buildMaps();
        this.renderer.renderLayout();
        this.renderPagesList();
        setTimeout(() => {
            if (type === 'item') { this.switchTab('choice'); this.selectChoice(clone, document.getElementById(`btn-${clone.id}`)); } 
            else { this.switchTab('group'); this.selectGroup(clone); }
        }, 50);
    },

    cycleSelection(direction) {
        const page = this.getCurrentPage();
        if (!page || !page.layout) return;
        
        let allItems = [];
        const traverse = (list) => {
            list.forEach(el => {
                if (el.type === 'item') allItems.push(el);
                if (el.type === 'group' && el.items) traverse(el.items);
            });
        };
        traverse(page.layout);
        
        // Ensure sorting so cycling is logical (Left -> Right, Top -> Bottom)
        this.sortLayoutByCoords(allItems);
        
        if (allItems.length === 0) return;
        
        let currentIndex = -1;
        if (this.selectedItem) { 
            currentIndex = allItems.findIndex(i => i.id === this.selectedItem.id); 
        }
        
        // If current not found (e.g. deleted or reference mismatch), start from 0
        if (currentIndex === -1) currentIndex = 0;
        else currentIndex += direction;

        // Wrap around
        if (currentIndex >= allItems.length) currentIndex = 0;
        if (currentIndex < 0) currentIndex = allItems.length - 1;
        
        const nextItem = allItems[currentIndex];
        
        // Important: Update selection
        const btnEl = document.getElementById(`btn-${nextItem.id}`);
        this.selectChoice(nextItem, btnEl);
        
        // If element exists, scroll to it (nice UX improvement)
        if (btnEl) {
             btnEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
        }

        if (this.zoomLevel > 1) this.updateZoomFocus();
    },

    toggleTransformMode() {
        if (this.transformMode === 'move') this.transformMode = 'shrink';
        else if (this.transformMode === 'shrink') this.transformMode = 'grow';
        else this.transformMode = 'move';
    },

    showModeToast() {
        let toast = document.getElementById('mode-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'mode-toast';
            toast.style.cssText = 'position:fixed; top:70px; left:50%; transform:translateX(-50%); background:rgba(0,0,0,0.8); padding:5px 15px; border-radius:20px; color:#fff; pointer-events:none; font-weight:bold; z-index:9999; transition: opacity 0.5s; opacity:0;';
            document.body.appendChild(toast);
        }
        let text = "Move (WASD)";
        if (this.transformMode === 'shrink') text = "Shrink Size (WASD)";
        if (this.transformMode === 'grow') text = "Grow Size (WASD)";
        toast.textContent = text;
        toast.style.opacity = '1';
        clearTimeout(this._toastTimer);
        this._toastTimer = setTimeout(() => toast.style.opacity = '0', 1500);
    },

    toggleZoom() {
        this.zoomLevel++;
        if (this.zoomLevel > 4) this.zoomLevel = 1;
        this.setZoom(this.zoomLevel);
    },

    setZoom(level) {
        this.zoomLevel = level;
        this.updateZoomFocus();
        const toast = document.getElementById('mode-toast');
        if (toast) {
            toast.textContent = `Zoom x${level}`;
            toast.style.opacity = '1';
            clearTimeout(this._toastTimer);
            this._toastTimer = setTimeout(() => toast.style.opacity = '0', 1000);
        }
    },

    updateZoomFocus() {
        const pageId = `page-${this.activePageIndex}`;
        const pageEl = document.getElementById(pageId);
        if (!pageEl) return;

        if (this.zoomLevel === 1) {
            pageEl.style.transform = '';
            pageEl.style.transformOrigin = '';
            pageEl.style.margin = ''; 
            return;
        }

        let focusX = 50;
        let focusY = 50;

        if (this.selectedItem && this.selectedItem.coords) {
             const dim = this.renderer.pageDimensions[this.activePageIndex];
             if (dim) {
                 const cx = this.selectedItem.coords.x + (this.selectedItem.coords.w/2);
                 const cy = this.selectedItem.coords.y + (this.selectedItem.coords.h/2);
                 focusX = (cx / dim.w) * 100;
                 focusY = (cy / dim.h) * 100;
             }
        }

        pageEl.style.transition = 'transform 0.2s';
        pageEl.style.transformOrigin = `${focusX}% ${focusY}%`;
        pageEl.style.transform = `scale(${this.zoomLevel})`;
        
        const vMargin = (this.zoomLevel - 1) * 30; 
        pageEl.style.margin = `${vMargin}vh 0`;

        if (this.selectedItem) {
            setTimeout(() => {
                const btn = document.getElementById(`btn-${this.selectedItem.id}`);
                if (btn) {
                    btn.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
                }
            }, 100);
        }
    },

    addNewPointSystem() {
        this.history.push('add_currency');
        if (!this.engine.config.points) this.engine.config.points = [];
        this.engine.config.points.push({ id: this.generateId('pts'), name: "New Currency", start: 10 });
        this.engine.state.resetCurrencies();
        this.renderPointsList();
        this.renderer.renderAll();
    },

    deletePointSystem(index) {
        this.history.push('delete_currency');
        if (!this.engine.config.points) return;
        if (!confirm("Delete this currency?")) return;
        this.engine.config.points.splice(index, 1);
        this.engine.state.resetCurrencies();
        this.renderPointsList();
        this.renderer.renderAll();
    },

    updatePointSystem(index, field, value) {
        if (!this.engine.config.points || !this.engine.config.points[index]) return;
        const pt = this.engine.config.points[index];
        if (field === 'start') value = parseInt(value) || 0;
        pt[field] = value;
        this.engine.state.resetCurrencies(); 
        this.renderer.renderAll();
    },

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
    },
    
    async copyDebugImageToClipboard() {
        const page = this.getCurrentPage();
        if (!page || !page.image) { alert("No image on this page."); return; }
        const btn = document.getElementById('btn-copy-debug-img');
        if(btn) { btn.disabled = true; btn.textContent = "⏳ Generating..."; btn.style.opacity = "0.7"; }
        try {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; img.src = page.image; });
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            const fontSize = Math.max(16, Math.min(48, Math.floor(canvas.width / 60)));
            const lineWidth = Math.max(3, Math.floor(fontSize / 5));
            const drawBox = (obj, isGroup) => {
                if (!obj.coords) return;
                const c = CoordHelper.toPixels(obj.coords, { w: canvas.width, h: canvas.height });
                ctx.lineWidth = lineWidth;
                ctx.strokeStyle = isGroup ? '#FFD700' : '#00FF00'; 
                ctx.strokeRect(c.x, c.y, c.w, c.h);
                ctx.font = `bold ${fontSize}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'top'; 
                let text = obj.id;
                if (isGroup) text = `[Group] ${text}`;
                if (text.length > 30) text = text.substring(0, 27) + '...';
                const tx = c.x + c.w / 2;
                const ty = c.y + lineWidth + 5; 
                ctx.lineJoin = 'round';
                ctx.lineWidth = lineWidth + 2;
                ctx.strokeStyle = '#000000';
                ctx.strokeText(text, tx, ty);
                ctx.fillStyle = isGroup ? '#FFD700' : '#FFFFFF';
                ctx.fillText(text, tx, ty);
            };
            const groupsToDraw = [];
            const itemsToDraw = [];
            const traverse = (list) => {
                list.forEach(el => {
                    if (el.type === 'group') { groupsToDraw.push(el); if (el.items) traverse(el.items); } 
                    else { itemsToDraw.push(el); }
                });
            };
            traverse(page.layout);
            groupsToDraw.forEach(g => drawBox(g, true));
            itemsToDraw.forEach(i => drawBox(i, false));
            canvas.toBlob(async (blob) => {
                if (!blob) throw new Error("Canvas failed to blob");
                try {
                    const item = new ClipboardItem({ "image/png": blob });
                    await navigator.clipboard.write([item]);
                    if(btn) { 
                        btn.textContent = "✅ Copied!"; 
                        setTimeout(() => { btn.disabled = false; btn.textContent = "📸 Copy Layout Image (For LLM)"; btn.style.opacity = "1"; }, 2000);
                    }
                } catch (err) {
                    console.error("Clipboard Error:", err);
                    alert("Failed to copy image to clipboard.\nNote: This feature requires HTTPS or localhost.");
                    if(btn) { btn.disabled = false; btn.textContent = "📸 Copy Layout Image (For LLM)"; btn.style.opacity = "1"; }
                }
            }, 'image/png');
        } catch (e) {
            console.error("Image Gen Error:", e);
            alert("Error generating debug image: " + e.message);
            if(btn) { btn.disabled = false; btn.textContent = "📸 Copy Layout Image (For LLM)"; btn.style.opacity = "1"; }
        }
    },
};