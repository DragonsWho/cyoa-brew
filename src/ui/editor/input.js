import { CoordHelper } from '../../utils/coords.js';
import { ProjectStorage } from '../../utils/storage.js';

export const EditorInputMixin = {
    attachEventListeners() {
        document.addEventListener('mousedown', this.handleMouseDown.bind(this));
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
        document.addEventListener('mouseup', this.handleMouseUp.bind(this));
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
    },
    
    removeEventListeners() {
        // Implementation for cleanup if needed later
    },

    // ==================== DRAG & DROP LOGIC ====================
    handleMouseDown(e) {
        if (!this.enabled) return;
        if (e.target.closest('#editor-sidebar')) return;
        if (e.target.closest('.modal-content')) return;
        if (e.target.closest('#editor-context-menu')) return;
        if (e.button === 2) return; // Ignore right click for dragging

        let target = null;
        let objectToEdit = null;
        let pageIndex = 0;
        
        const pageContainer = e.target.closest('.page-container');
        if (pageContainer) {
            pageIndex = parseInt(pageContainer.id.replace('page-', '')) || 0;
            this.activePageIndex = pageIndex;
            this.renderPagesList();
        }

        if (this.activeTab === 'group') {
            target = e.target.closest('.info-zone');
            if (target) {
                const gid = target.id.replace('group-', '');
                const group = this.engine.findGroup(gid);
                if (group) { 
                    this.selectGroup(group); 
                    objectToEdit = group; 
                }
            }
        } else {
            target = e.target.closest('.item-zone');
            if (target) {
                const itemId = target.dataset.itemId;
                const item = this.engine.findItem(itemId);
                if (item) { 
                    this.selectChoice(item, target); 
                    objectToEdit = item; 
                    this.selectedGroup = this.engine.findGroupForItem(item.id); 
                }
            } else if(this.activeTab === 'choice') { 
                this.deselectChoice(); 
            }
        }
        
        if (objectToEdit && target) {
            const rect = target.getBoundingClientRect();
            
            // Check for corner resize
            this.resizeMode = this.getResizeHandle(e.clientX, e.clientY, rect);
            
            if (this.resizeMode) {
                this.isResizing = true;
            } else {
                this.isDragging = true;
            }
            
            target.classList.add('dragging');
            this.dragStart = { x: e.clientX, y: e.clientY };
            if (!objectToEdit.coords) objectToEdit.coords = {x:0,y:0,w:100,h:100};
            this.initialRect = { ...objectToEdit.coords };
            
            const dim = this.renderer.pageDimensions[pageIndex];
            const container = document.querySelector(`#page-${pageIndex}`);
            if (dim && container) {
                const containerRect = container.getBoundingClientRect();
                this.dragContext = { 
                    scaleX: dim.w / containerRect.width, 
                    scaleY: dim.h / containerRect.height, 
                    dim: dim, 
                    targetObj: objectToEdit,
                    pageIndex: pageIndex,
                    isGroup: objectToEdit.type === 'group'
                };
            }
            e.preventDefault(); 
        }
    },

    handleMouseMove(e) {
        if (!this.enabled || !this.dragContext) return;
        if (!this.isDragging && !this.isResizing) return;
        
        const dx = e.clientX - this.dragStart.x;
        const dy = e.clientY - this.dragStart.y;
        const { scaleX, scaleY, dim, targetObj, pageIndex, isGroup } = this.dragContext;
        
        // ========== DRAGGING LOGIC (Move) ==========
        if (this.isDragging) {
            let newX = Math.round(this.initialRect.x + dx * scaleX);
            let newY = Math.round(this.initialRect.y + dy * scaleY);
            
            // Constrain to page boundaries
            if (dim) {
                const w = targetObj.coords.w || 0;
                const h = targetObj.coords.h || 0;
                newX = Math.max(0, Math.min(newX, dim.w - w));
                newY = Math.max(0, Math.min(newY, dim.h - h));
            }
            
            // --- Group Collision Logic for Dragging ---
            if (isGroup) {
                const testRectX = { ...targetObj.coords, x: newX };
                const collidersX = this.getCollidingGroups(testRectX, targetObj.id, pageIndex);
                if (collidersX.length > 0) newX = targetObj.coords.x; 

                const testRectY = { ...targetObj.coords, y: newY, x: newX }; 
                const collidersY = this.getCollidingGroups(testRectY, targetObj.id, pageIndex);
                if (collidersY.length > 0) newY = targetObj.coords.y; 
            }
            
            targetObj.coords.x = newX;
            targetObj.coords.y = newY;
        } 
        // ========== RESIZING LOGIC (Scale & Push) ==========
        else if (this.isResizing && this.resizeMode) {
            const deltaX = dx * scaleX;
            const deltaY = dy * scaleY;
            const start = this.initialRect;
            const minSize = 30;

            let newX = start.x;
            let newY = start.y;
            let newW = start.w;
            let newH = start.h;

            if (this.resizeMode.includes('l')) { 
                newW = Math.max(minSize, start.w - deltaX);
                newX = start.x + (start.w - newW); 
                if (newX < 0) { newX = 0; newW = (start.x + start.w); }
            } else { 
                newW = Math.max(minSize, start.w + deltaX);
                if (newX + newW > dim.w) newW = dim.w - newX;
            }

            if (this.resizeMode.includes('t')) { 
                newH = Math.max(minSize, start.h - deltaY);
                newY = start.y + (start.h - newH);
                if (newY < 0) { newY = 0; newH = (start.y + start.h); }
            } else { 
                newH = Math.max(minSize, start.h + deltaY);
                if (newY + newH > dim.h) newH = dim.h - newY;
            }

            if (isGroup) {
                const proposedRect = { x: newX, y: newY, w: newW, h: newH };
                const neighbors = this.getCollidingGroups(proposedRect, targetObj.id, pageIndex);
                
                for (const neighbor of neighbors) {
                    if (this.resizeMode.includes('r')) { 
                        const neighborRight = neighbor.coords.x + neighbor.coords.w;
                        const newNeighborX = newX + newW;
                        const newNeighborW = neighborRight - newNeighborX;
                        if (newNeighborW < minSize) {
                            newW = (neighborRight - minSize) - newX;
                        } else {
                            neighbor.coords.x = newNeighborX;
                            neighbor.coords.w = newNeighborW;
                        }
                    } else if (this.resizeMode.includes('l')) {
                        const neighborX = neighbor.coords.x;
                        const newNeighborW = newX - neighborX;
                        if (newNeighborW < minSize) {
                            const limit = neighborX + minSize;
                            newW = (start.x + start.w) - limit;
                            newX = limit;
                        } else {
                            neighbor.coords.w = newNeighborW;
                        }
                    }

                    if (this.resizeMode.includes('b')) { 
                        const neighborBottom = neighbor.coords.y + neighbor.coords.h;
                        const newNeighborY = newY + newH;
                        const newNeighborH = neighborBottom - newNeighborY;
                        if (newNeighborH < minSize) {
                            newH = (neighborBottom - minSize) - newY;
                        } else {
                            neighbor.coords.y = newNeighborY;
                            neighbor.coords.h = newNeighborH;
                        }
                    } else if (this.resizeMode.includes('t')) {
                        const neighborY = neighbor.coords.y;
                        const newNeighborH = newY - neighborY;
                        if (newNeighborH < minSize) {
                            const limit = neighborY + minSize;
                            newH = (start.y + start.h) - limit;
                            newY = limit;
                        } else {
                            neighbor.coords.h = newNeighborH;
                        }
                    }

                    const elN = document.getElementById(`group-${neighbor.id}`);
                    if (elN) {
                        const styleN = CoordHelper.toPercent(neighbor.coords, dim);
                        Object.assign(elN.style, styleN);
                    }
                }
            }

            targetObj.coords.x = Math.round(newX);
            targetObj.coords.y = Math.round(newY);
            targetObj.coords.w = Math.round(newW);
            targetObj.coords.h = Math.round(newH);
        }
        
        let domId = targetObj.type === 'group' ? `group-${targetObj.id}` : `btn-${targetObj.id}`;
        const element = document.getElementById(domId);
        if (element) { 
            const style = CoordHelper.toPercent(targetObj.coords, dim); 
            Object.assign(element.style, style); 
        }
        
        if (this.activeTab === 'group') this.updateGroupInputs(); 
        else this.updateChoiceInputs();
    },

    handleMouseUp() {
        if (this.dragContext) {
            const { targetObj, pageIndex, isGroup } = this.dragContext;
            
            if (isGroup) {
                this.updateGroupMemberships(targetObj, pageIndex);
            } else {
                this.updateItemGrouping(targetObj, pageIndex);
            }
            
            const page = this.getPageByIndex(pageIndex);
            if (page) {
                this.sortLayoutByCoords(page.layout);
            }
            
            this.renderer.renderLayout();
            this.renderPagesList();
            
            if (!isGroup && this.selectedItem) {
                this.updateChoiceInputs();
            }
            if(isGroup) {
                this.selectGroup(targetObj);
            } else {
                const el = document.getElementById(`btn-${targetObj.id}`);
                this.selectChoice(targetObj, el);
            }
        }
        
        document.querySelectorAll('.dragging').forEach(el => el.classList.remove('dragging'));
        this.isDragging = false; 
        this.isResizing = false; 
        this.resizeMode = null;
        this.dragContext = null;
    },

    handleKeyDown(e) {
        if (!this.enabled) return;
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        
        if (e.key === 'Delete') {
            if (this.activeTab === 'choice' && this.selectedItem) {
                this.deleteSelectedItem();
            } else if (this.activeTab === 'group' && this.selectedGroup) {
                this.deleteSelectedGroup();
            }
        }
    },

    // ==================== FORM INPUT LISTENERS ====================
    setupChoiceListeners() {
        const update = (key, val, isNum) => {
            if (!this.selectedItem) return;
            if (isNum) val = parseInt(val) || 0;
            if (['x','y','w','h'].includes(key)) { 
                if (!this.selectedItem.coords) this.selectedItem.coords = {}; 
                this.selectedItem.coords[key] = val; 
            } else if (key === 'tags') { 
                this.selectedItem.tags = val.split(',').map(t => t.trim()).filter(t => t); 
            } else { 
                this.selectedItem[key] = val; 
            }
            if (key === 'max_quantity') {
                if (val <= 1) delete this.selectedItem.max_quantity;
                this.renderer.renderLayout();
                setTimeout(() => { 
                    const el = document.getElementById(`btn-${this.selectedItem.id}`); 
                    if (el) this.selectChoice(this.selectedItem, el);
                }, 0);
            } else { 
                this.renderer.renderLayout(); 
                const el = document.getElementById(`btn-${this.selectedItem.id}`);
                if(el) {
                    el.classList.add('editor-selected');
                    el.setAttribute('data-editor-title', this.selectedItem.title || this.selectedItem.id);
                }
            }
            this.updateCodePreview();
        };
        const inputs = ['edit-id', 'edit-title', 'edit-description', 'edit-tags', 'edit-x', 'edit-y', 'edit-w', 'edit-h', 'edit-max_quantity'];
        inputs.forEach(id => {
            const el = document.getElementById(id); 
            if (!el) return;
            const key = id.split('-').pop(); 
            const realKey = (id === 'edit-description') ? 'description' : key; 
            const isNum = ['x','y','w','h', 'max_quantity'].includes(key); 
            el.addEventListener('input', (e) => update(realKey, e.target.value, isNum));
        });
    },

    setupGroupListeners() {
        const update = (key, val, isNum) => {
            if (!this.selectedGroup) return;
            if (isNum) val = parseInt(val) || 0;
            if (['x','y','w','h'].includes(key)) { 
                if (!this.selectedGroup.coords) this.selectedGroup.coords = {}; 
                this.selectedGroup.coords[key] = val; 
            } else { 
                this.selectedGroup[key] = val; 
            }
            this.renderer.renderLayout();
            const el = document.getElementById(`group-${this.selectedGroup.id}`);
            if(el) {
                el.classList.add('editor-selected');
                el.setAttribute('data-editor-title', this.selectedGroup.title || this.selectedGroup.id);
            }
            this.updateCodePreview();
        };
        const inputs = ['group-id', 'group-title', 'group-description', 'group-x', 'group-y', 'group-w', 'group-h'];
        inputs.forEach(id => {
            const el = document.getElementById(id); 
            if (!el) return;
            const key = id.split('-').pop(); 
            const realKey = (id === 'group-description') ? 'description' : key; 
            const isNum = ['x','y','w','h'].includes(key);
            el.addEventListener('input', (e) => update(realKey, e.target.value, isNum));
        });
    },

    setupJsonListeners() {
        const choiceJson = document.getElementById('edit-raw-json');
        if (choiceJson) {
            choiceJson.addEventListener('change', (e) => {
                try { 
                    const data = JSON.parse(e.target.value); 
                    if (this.selectedItem) { 
                        Object.assign(this.selectedItem, data); 
                        this.engine.buildMaps();
                        this.renderer.renderLayout(); 
                        this.updateChoiceInputs(); 
                        this.ruleBuilder.loadItem(this.selectedItem, this.selectedGroup); 
                        const el = document.getElementById(`btn-${this.selectedItem.id}`);
                        if(el) this.selectChoice(this.selectedItem, el);
                    } 
                } catch(err) { console.error("JSON Error", err); }
            });
        }
        const rulesJson = document.getElementById('group-rules-json');
        if (rulesJson) {
            rulesJson.addEventListener('change', (e) => {
                try { 
                    const data = JSON.parse(e.target.value); 
                    if (this.selectedGroup) { 
                        this.selectedGroup.rules = data; 
                        this.renderer.renderLayout(); 
                        this.engine.recalculate(); 
                        const el = document.getElementById(`group-${this.selectedGroup.id}`);
                        if(el) this.selectGroup(this.selectedGroup);
                    } 
                } catch(err) { console.error("Rules JSON Error", err); }
            });
        }
    },

    setupAddPageListener() {
        const input = document.getElementById('add-page-image-input');
        if (!input) return;

        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (evt) => {
                const dataUrl = evt.target.result;
                if (!this.engine.config.pages) this.engine.config.pages = [];
                
                const newPageIndex = this.engine.config.pages.length;
                const newPage = {
                    id: `page_${newPageIndex}`,
                    image: dataUrl,
                    layout: []
                };
                
                this.engine.config.pages.push(newPage);
                this.activePageIndex = newPageIndex;
                
                if (!this.engine.config.points || this.engine.config.points.length === 0) {
                    this.engine.config.points = [{ id: "points", name: "Points", start: 0 }];
                }
                
                this.engine.buildMaps();
                this.engine.state.resetCurrencies();
                this.renderer.renderAll().then(() => {
                    this.renderPagesList();
                });
            };
            reader.readAsDataURL(file);
            input.value = ''; 
        });
    },

    setupLoadListener() {
        const input = document.getElementById('load-config-input');
        if (!input) return;

        input.addEventListener('change', async (e) => {
            if (e.target.files.length === 0) return;
            const file = e.target.files[0];

            try {
                if (!this.engine.isTestConfig) {
                    if (!confirm("Are you sure? Loading a new project will discard current changes.")) {
                        input.value = '';
                        return;
                    }
                }
                const { config, warning } = await ProjectStorage.load(file);
                if (warning) alert(warning);
                this.engine.loadConfig(config);
                
                this.deselectChoice();
                this.selectedGroup = null;
                this.activePageIndex = 0;
                this.renderPagesList();
            } catch (err) {
                alert(`Error loading project: ${err.message}`);
            } finally {
                input.value = '';
            }
        });
    }
};