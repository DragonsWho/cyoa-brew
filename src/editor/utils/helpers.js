/**
 * src/ui/editor/utils/helpers.js
 * Editor Helpers Mixin
 * Handles data traversal, finding parents, sorting, and ID generation.
 */

export const EditorHelpersMixin = {
    // ==================== ID GENERATION ====================
    generateId(prefix) {
        return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    },

    // ==================== PAGE ACCESSORS ====================
    getCurrentPage() {
        const pages = this.engine.config.pages || [];
        return pages[this.activePageIndex] || null;
    },

    getPageByIndex(index) {
        const pages = this.engine.config.pages || [];
        return pages[index] || null;
    },

    // ==================== TRAVERSAL & COUNTS ====================
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

    // ==================== FIND PARENT LOGIC ====================
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
                // Assuming isInsideRect is available from GeometryMixin
                if (this.isInsideRect(point, element.coords)) {
                    return element;
                }
            }
        }
        return null;
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
            if (Math.abs(aY - bY) < ROW_THRESHOLD) { return aX - bX; }
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
    }
};