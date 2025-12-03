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
        document.removeEventListener('mousedown', this.handleMouseDown.bind(this));
        document.removeEventListener('mousemove', this.handleMouseMove.bind(this));
        document.removeEventListener('mouseup', this.handleMouseUp.bind(this));
        document.removeEventListener('keydown', this.handleKeyDown.bind(this));
    },

    // ==================== DRAG & DROP LOGIC ====================
    handleMouseDown(e) {
        if (!this.enabled) return;
        if (e.target.closest('#editor-sidebar')) return;
        if (e.target.closest('.modal-content')) return;
        if (e.target.closest('#editor-context-menu')) return;
        if (e.button === 2) return; 

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
            // GLOBAL PERFORMANCE FIX: Disable CSS transitions
            document.body.classList.add('editor-interacting');

            const rect = target.getBoundingClientRect();
            
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
        const COLLISION_GAP = 10; 

        // === 0. PREPARE NEIGHBORS (Universal Logic) ===
        const page = this.getPageByIndex(pageIndex);
        let neighbors = [];
        
        if (page && page.layout) {
            if (isGroup) {
                // For Groups: Collide with other Groups
                neighbors = page.layout.filter(el => el.type === 'group' && el.id !== targetObj.id && el.coords);
            } else {
                // For Items: Collide with other Items (flattened list)
                const allItems = [];
                page.layout.forEach(el => {
                    if (el.type === 'item') allItems.push(el);
                    if (el.type === 'group' && el.items) allItems.push(...el.items);
                });
                neighbors = allItems.filter(el => el.id !== targetObj.id && el.coords);
            }
        }

        const overlaps = (pos1, size1, pos2, size2) => (pos1 < pos2 + size2) && (pos1 + size1 > pos2);
        
        // ========== DRAGGING LOGIC (Axis-Separated Slide & Sweep) ==========
        if (this.isDragging) {
            let destX = Math.round(this.initialRect.x + dx * scaleX);
            let destY = Math.round(this.initialRect.y + dy * scaleY);
            
            let limitMinX = 0;
            let limitMaxX = dim ? dim.w - targetObj.coords.w : 99999;
            let limitMinY = 0;
            let limitMaxY = dim ? dim.h - targetObj.coords.h : 99999;
            
            const myW = targetObj.coords.w;
            const myH = targetObj.coords.h;

            // --- PASS 1: RESOLVE X-AXIS ---
            // Use Safe Y (current) to check for walls
            const currentY = targetObj.coords.y; 
            const dirX = destX - targetObj.coords.x; 

            for (const n of neighbors) {
                if (overlaps(currentY, myH, n.coords.y, n.coords.h)) {
                    const myCenterX = targetObj.coords.x + (myW / 2);
                    const nCenterX = n.coords.x + (n.coords.w / 2);

                    if (dirX > 0 && myCenterX < nCenterX) {
                        const limit = n.coords.x - myW - COLLISION_GAP;
                        limitMaxX = Math.min(limitMaxX, limit);
                    } 
                    else if (dirX < 0 && myCenterX > nCenterX) {
                        const limit = n.coords.x + n.coords.w + COLLISION_GAP;
                        limitMinX = Math.max(limitMinX, limit);
                    }
                }
            }
            const resolvedX = Math.max(limitMinX, Math.min(destX, limitMaxX));

            // --- PASS 2: RESOLVE Y-AXIS ---
            // Use Resolved X to check for ceilings/floors
            const dirY = destY - targetObj.coords.y;
            for (const n of neighbors) {
                if (overlaps(resolvedX, myW, n.coords.x, n.coords.w)) {
                    const myCenterY = targetObj.coords.y + (myH / 2);
                    const nCenterY = n.coords.y + (n.coords.h / 2);

                    if (dirY > 0 && myCenterY < nCenterY) {
                        const limit = n.coords.y - myH - COLLISION_GAP;
                        limitMaxY = Math.min(limitMaxY, limit);
                    }
                    else if (dirY < 0 && myCenterY > nCenterY) {
                        const limit = n.coords.y + n.coords.h + COLLISION_GAP;
                        limitMinY = Math.max(limitMinY, limit);
                    }
                }
            }

            targetObj.coords.x = resolvedX;
            targetObj.coords.y = Math.max(limitMinY, Math.min(destY, limitMaxY));
        } 
        // ========== RESIZING LOGIC (Synchronous Push) ==========
        else if (this.isResizing && this.resizeMode) {
            const deltaX = dx * scaleX;
            const deltaY = dy * scaleY;
            const start = this.initialRect;
            const MIN_SIZE = 30;

            let finalX = start.x;
            let finalY = start.y;
            let finalW = start.w;
            let finalH = start.h;

            let limitLeft = 0;
            let limitRight = dim ? dim.w : 9999;
            let limitTop = 0;
            let limitBottom = dim ? dim.h : 9999;

            // 1. CALCULATE LIMITS BASED ON NEIGHBORS
            
            // X-AXIS
            if (this.resizeMode.includes('r')) {
                for (const n of neighbors) {
                    if (overlaps(start.y, start.h, n.coords.y, n.coords.h)) {
                        if (n.coords.x > start.x) { 
                            const maxAllowedRight = (n.coords.x + n.coords.w) - MIN_SIZE - COLLISION_GAP;
                            limitRight = Math.min(limitRight, maxAllowedRight);
                        }
                    }
                }
                finalW = Math.max(MIN_SIZE, Math.min(start.w + deltaX, limitRight - start.x));
            } 
            else if (this.resizeMode.includes('l')) {
                for (const n of neighbors) {
                    if (overlaps(start.y, start.h, n.coords.y, n.coords.h)) {
                        if (n.coords.x + n.coords.w < start.x + start.w) { 
                            const minAllowedLeft = n.coords.x + MIN_SIZE + COLLISION_GAP;
                            limitLeft = Math.max(limitLeft, minAllowedLeft);
                        }
                    }
                }
                const proposedX = Math.max(limitLeft, Math.min(start.x + deltaX, start.x + start.w - MIN_SIZE));
                finalW = (start.x + start.w) - proposedX;
                finalX = proposedX;
            }

            // Y-AXIS (Use new X/W for correctness)
            if (this.resizeMode.includes('b')) {
                for (const n of neighbors) {
                    if (overlaps(finalX, finalW, n.coords.x, n.coords.w)) {
                        if (n.coords.y > start.y) { 
                            const maxAllowedBottom = (n.coords.y + n.coords.h) - MIN_SIZE - COLLISION_GAP;
                            limitBottom = Math.min(limitBottom, maxAllowedBottom);
                        }
                    }
                }
                finalH = Math.max(MIN_SIZE, Math.min(start.h + deltaY, limitBottom - start.y));
            }
            else if (this.resizeMode.includes('t')) {
                for (const n of neighbors) {
                    if (overlaps(finalX, finalW, n.coords.x, n.coords.w)) {
                        if (n.coords.y + n.coords.h < start.y + start.h) { 
                            const minAllowedTop = n.coords.y + MIN_SIZE + COLLISION_GAP;
                            limitTop = Math.max(limitTop, minAllowedTop);
                        }
                    }
                }
                const proposedY = Math.max(limitTop, Math.min(start.y + deltaY, start.y + start.h - MIN_SIZE));
                finalH = (start.y + start.h) - proposedY;
                finalY = proposedY;
            }

            // 2. PUSH NEIGHBORS (Synchronous Movement)
            for (const n of neighbors) {
                const isVertAligned = overlaps(finalY, finalH, n.coords.y, n.coords.h);
                const isHorzAligned = overlaps(finalX, finalW, n.coords.x, n.coords.w);

                // Push Right
                if (this.resizeMode.includes('r') && isVertAligned) {
                    const myRight = finalX + finalW;
                    if (n.coords.x < myRight + COLLISION_GAP && n.coords.x > start.x) {
                        const nRight = n.coords.x + n.coords.w;
                        n.coords.x = myRight + COLLISION_GAP;
                        n.coords.w = nRight - n.coords.x;
                    }
                }
                // Push Left
                if (this.resizeMode.includes('l') && isVertAligned) {
                    const myLeft = finalX;
                    const nRight = n.coords.x + n.coords.w;
                    if (nRight > myLeft - COLLISION_GAP && nRight < start.x + start.w) {
                        n.coords.w = (myLeft - COLLISION_GAP) - n.coords.x;
                    }
                }
                // Push Down
                if (this.resizeMode.includes('b') && isHorzAligned) {
                    const myBottom = finalY + finalH;
                    if (n.coords.y < myBottom + COLLISION_GAP && n.coords.y > start.y) {
                        const nBottom = n.coords.y + n.coords.h;
                        n.coords.y = myBottom + COLLISION_GAP;
                        n.coords.h = nBottom - n.coords.y;
                    }
                }
                // Push Up
                if (this.resizeMode.includes('t') && isHorzAligned) {
                    const myTop = finalY;
                    const nBottom = n.coords.y + n.coords.h;
                    if (nBottom > myTop - COLLISION_GAP && nBottom < start.y + start.h) {
                        n.coords.h = (myTop - COLLISION_GAP) - n.coords.y;
                    }
                }

                // Update Neighbor Visuals
                const domId = n.type === 'group' ? `group-${n.id}` : `btn-${n.id}`;
                const elN = document.getElementById(domId);
                if (elN) Object.assign(elN.style, CoordHelper.toPercent(n.coords, dim));
            }

            targetObj.coords.x = Math.round(finalX);
            targetObj.coords.y = Math.round(finalY);
            targetObj.coords.w = Math.round(finalW);
            targetObj.coords.h = Math.round(finalH);
        }
        
        // Update Target Visual
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
        document.body.classList.remove('editor-interacting');

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