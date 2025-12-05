/**
 * src/ui/editor/actions/navigation.js
 * Navigation: Cycle, Zoom, Transform Mode
 */

export const NavigationMixin = {
    // ==================== CYCLE SELECTION ====================
    
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
        
        this.sortLayoutByCoords(allItems);
        
        if (allItems.length === 0) return;
        
        let currentIndex = -1;
        if (this.selectedItem) { 
            currentIndex = allItems.findIndex(i => i.id === this.selectedItem.id); 
        }
        
        if (currentIndex === -1) currentIndex = 0;
        else currentIndex += direction;

        if (currentIndex >= allItems.length) currentIndex = 0;
        if (currentIndex < 0) currentIndex = allItems.length - 1;
        
        const nextItem = allItems[currentIndex];
        
        const btnEl = document.getElementById(`btn-${nextItem.id}`);
        this.selectChoice(nextItem, btnEl);
        
        if (btnEl) {
             btnEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
        }

        if (this.zoomLevel > 1) this.updateZoomFocus();
    },

    // ==================== TRANSFORM MODE ====================

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

    // ==================== ZOOM ====================

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
    }
};