/**
 * src/ui/editor/actions/splitting.js
 * Split Item Logic
 */

export const SplittingMixin = {
    // ==================== SPLIT START ====================
    
    startSplit(item, axis) {
        this.history.push('split_start');
        this.splitState = { 
            item: item, 
            axis: axis, 
            splitVal: (axis === 'vertical' ? item.coords.w : item.coords.h) / 2 
        };
        const guide = document.getElementById('editor-split-guide');
        if (guide) {
            guide.style.display = 'block';
            if (axis === 'vertical') { 
                guide.style.width = '10px'; 
                guide.style.height = '0px'; 
            } else { 
                guide.style.height = '10px'; 
                guide.style.width = '0px'; 
            }
        }
        document.body.style.cursor = axis === 'vertical' ? 'col-resize' : 'row-resize';
        this.updateSplitGuideVisuals();
    },

    // ==================== SPLIT CANCEL ====================

    cancelSplit() {
        this.splitState = null;
        const guide = document.getElementById('editor-split-guide');
        if (guide) guide.style.display = 'none';
        document.body.style.cursor = '';
    },

    // ==================== SPLIT COMMIT ====================

    commitSplit() {
        if (!this.splitState) return;
        const { item, axis, splitVal } = this.splitState;
        const GAP = 10; 
        const HALF_GAP = GAP / 2;
        const parent = this.findItemParent(item.id);
        if (!parent) return;
        
        const newItem = JSON.parse(JSON.stringify(item));
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
        
        setTimeout(() => { 
            const el = document.getElementById(`btn-${newItem.id}`); 
            if (el) this.selectChoice(newItem, el); 
        }, 50);
    },

    // ==================== SPLIT GUIDE VISUALS ====================

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
                guide.style.left = (rect.left + screenOffset - 5) + 'px'; 
                guide.style.top = rect.top + 'px'; 
                guide.style.height = rect.height + 'px'; 
                guide.style.width = '10px';
            } else {
                const screenOffset = splitVal * ratioY;
                guide.style.top = (rect.top + screenOffset - 5) + 'px'; 
                guide.style.left = rect.left + 'px'; 
                guide.style.width = rect.width + 'px'; 
                guide.style.height = '10px';
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
        
        if (axis === 'vertical') { 
            const ratio = item.coords.w / rect.width; 
            this.splitState.splitVal = relX * ratio; 
        } else { 
            const ratio = item.coords.h / rect.height; 
            this.splitState.splitVal = relY * ratio; 
        }
        this.updateSplitGuideVisuals();
    }
};