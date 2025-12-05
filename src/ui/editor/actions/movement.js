/**
 * src/ui/editor/actions/movement.js
 * Movement and Grouping Logic
 */

export const MovementMixin = {
    // ==================== MOVING ITEMS BETWEEN GROUPS ====================
    
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
            // Prevent dropping group into itself or its children
            if (targetGroup && targetGroup.id === item.id) return;
            
            this.moveItemToGroup(item, targetGroup, page);
            this.engine.buildMaps();
        }
    },

    updateGroupMemberships(group, pageIndex) {
        const page = this.getPageByIndex(pageIndex);
        if (!page) return;
        
        // Find items that are physically inside the group but not logically
        const itemsToMove = [];
        
        // Check root items
        for (const element of page.layout) {
            if (element.type === 'item') {
                const center = this.getItemCenter(element);
                if (this.isInsideRect(center, group.coords)) {
                    itemsToMove.push(element);
                }
            }
        }
        
        // Find items that are logically inside but physically outside
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
        
        if (itemsToMove.length > 0 || itemsToRemove.length > 0) { 
            this.engine.buildMaps(); 
        }
    }
};