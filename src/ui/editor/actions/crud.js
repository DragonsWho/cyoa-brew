/**
 * src/ui/editor/actions/crud.js
 * CRUD Operations: Create, Delete, Duplicate
 */

export const CRUDMixin = {
    // ==================== CREATE ====================
    
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
        
        // Add to selected group if inside group tab, else root
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
        setTimeout(() => { 
            const el = document.getElementById(`group-${newGroup.id}`); 
            if (el) this.selectGroup(newGroup); 
        }, 50);
    },

    startDragCreation(type, x, y, pageIndex) {
        const page = this.getPageByIndex(pageIndex);
        if (!page) return null;

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

        page.layout.push(newObj);
        this.engine.buildMaps();
        this.renderer.renderLayout(); 

        return newObj;
    },

    // ==================== DELETE ====================

    deleteSelectedItem() {
        this.history.push('delete_item');
        if (!this.selectedItem) return; 
        if (this.selectedItems.length > 1) { this.deleteSelectedItems(); return; }
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
        this.history.push('delete_group');
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

    // ==================== DUPLICATE ====================

    actionDuplicate(type, id) {
        this.history.push('duplicate');
        let original = null;
        if (type === 'item') original = this.engine.findItem(id);
        else if (type === 'group') original = this.engine.findGroup(id);
        if (!original) return;
        
        const clone = JSON.parse(JSON.stringify(original));
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
            if (type === 'item') { 
                this.switchTab('choice'); 
                this.selectChoice(clone, document.getElementById(`btn-${clone.id}`)); 
            } else { 
                this.switchTab('group'); 
                this.selectGroup(clone); 
            }
        }, 50);
    },

    // ==================== POINTS MANAGEMENT ====================

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
    }
};