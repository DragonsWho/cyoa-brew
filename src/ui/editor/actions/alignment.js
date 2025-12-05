/**
 * src/ui/editor/actions/alignment.js
 * Alignment and Size Matching
 */

export const AlignmentMixin = {
    // ==================== ALIGNMENT ====================
    
    alignSelectedItems(mode) {
        this.history.push('align_items');
        if (this.selectedItems.length < 2) return;
        
        const items = this.selectedItems;
        let val = 0;
        
        if (mode === 'top') { 
            val = Math.min(...items.map(i => i.coords.y)); 
            items.forEach(i => i.coords.y = val); 
        }
        else if (mode === 'left') { 
            val = Math.min(...items.map(i => i.coords.x)); 
            items.forEach(i => i.coords.x = val); 
        }
        else if (mode === 'bottom') { 
            val = Math.max(...items.map(i => i.coords.y + i.coords.h)); 
            items.forEach(i => i.coords.y = val - i.coords.h); 
        }
        else if (mode === 'right') { 
            val = Math.max(...items.map(i => i.coords.x + i.coords.w)); 
            items.forEach(i => i.coords.x = val - i.coords.w); 
        }
        
        this.renderer.renderLayout();
    },

    // ==================== SIZE MATCHING ====================

    matchSizeSelectedItems(mode) {
        this.history.push('resize_match');
        if (this.selectedItems.length < 2) return;
        
        const items = this.selectedItems;
        const ref = this.selectedItem || items[0]; // Reference item
        
        if (mode === 'width' || mode === 'both') { 
            const w = ref.coords.w; 
            items.forEach(i => i.coords.w = w); 
        }
        if (mode === 'height' || mode === 'both') { 
            const h = ref.coords.h; 
            items.forEach(i => i.coords.h = h); 
        }
        
        this.renderer.renderLayout();
    }
};