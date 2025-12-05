/**
 * src/ui/editor/actions/clipboard.js
 * Copy, Paste, Clipboard Operations
 */

export const ClipboardMixin = {
    // ==================== COPY ====================
    
    actionCopy(type, id) {
        let data = null;
        if (type === 'item') data = this.engine.findItem(id);
        else if (type === 'group') data = this.engine.findGroup(id);
        
        if (data) { 
            this.clipboard = { type, data: JSON.parse(JSON.stringify(data)) }; 
            console.log(`📋 Copied ${type}`); 
        }
    },

    // ==================== PASTE ====================

    actionPaste() {
        if (!this.clipboard) return;
        this.history.push('paste');
        const { type, data } = this.clipboard;
        const page = this.getCurrentPage();
        if (!page) return;
        
        const newData = JSON.parse(JSON.stringify(data));
        newData.id = this.generateId(type);
        
        if (newData.title) newData.title += " (Copy)";
        if (newData.coords) {
            const newCoords = this.getSmartCoords(newData.coords.w, newData.coords.h, this.contextMenuContext);
            newData.coords.x = newCoords.x; 
            newData.coords.y = newCoords.y;
        }
        
        if (type === 'group' && newData.items) { 
            newData.items.forEach(subItem => { subItem.id = this.generateId('item'); }); 
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
    }
};