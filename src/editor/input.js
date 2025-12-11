/**
 * src/ui/editor/input.js
 * Editor Input Mixin
 */

import { CoordHelper } from '../utils/coords.js';

export const EditorInputMixin = {
    // ... (attachEventListeners and removeEventListeners remain same) ...
    attachEventListeners() {
        this._boundMouseDown = this.handleMouseDown.bind(this);
        this._boundMouseMove = this.handleMouseMove.bind(this);
        this._boundMouseUp = this.handleMouseUp.bind(this);
        this._boundKeyDown = this.handleKeyDown.bind(this);
        this._boundKeyUp = this.handleKeyUp.bind(this);

        document.addEventListener('mousedown', this._boundMouseDown);
        document.addEventListener('mousemove', this._boundMouseMove);
        document.addEventListener('mouseup', this._boundMouseUp);
        document.addEventListener('keydown', this._boundKeyDown);
        document.addEventListener('keyup', this._boundKeyUp);
    },
    
    removeEventListeners() {
        document.removeEventListener('mousedown', this._boundMouseDown);
        document.removeEventListener('mousemove', this._boundMouseMove);
        document.removeEventListener('mouseup', this._boundMouseUp);
        document.removeEventListener('keydown', this._boundKeyDown);
        document.removeEventListener('keyup', this._boundKeyUp);
    },

    // ... (Keyboard handling remains the same) ...
    handleKeyDown(e) {
        if (!this.enabled) return;
        if (document.body.classList.contains('editor-preview-active')) return;
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        const code = e.code;
        const ctrl = e.ctrlKey || e.metaKey;
        const shift = e.shiftKey;

        if (code === 'KeyZ') this.isHoldingZ = true;
        if (code === 'KeyX') this.isHoldingX = true;

        if (ctrl) {
            if (code === 'KeyZ' && !shift) { e.preventDefault(); this.history.undo(); return; }
            if (code === 'KeyY' || (code === 'KeyZ' && shift)) { e.preventDefault(); this.history.redo(); return; }
        }

        if (code === 'Escape') {
            // FIX: Если активен редактор формы, Escape закрывает его
            if (this.shapeEditorActive) {
                this.closeShapeEditor();
                return;
            }
            if (this.splitState) this.cancelSplit();
            if (this.creationState) {
                const { obj, pageIndex } = this.creationState;
                const page = this.getPageByIndex(pageIndex);
                if (page) {
                     const idx = page.layout.indexOf(obj);
                     if (idx > -1) page.layout.splice(idx, 1);
                }
                this.creationState = null;
                this.renderer.renderLayout();
            }
            this.setZoom(1); 
            return;
        }
        
        // ... (rest of keyboard handlers like Delete, F, Q, R, T, E, WASD) ...
        if (code === 'Delete' || code === 'Backspace') {
            this.history.push('delete');
            if (this.activeTab === 'choice' && this.selectedItems.length > 0) { this.deleteSelectedItem(); } 
            else if (this.activeTab === 'group' && this.selectedGroup) { this.deleteSelectedGroup(); }
            return;
        }
        if (code === 'KeyF') { this.toggleZoom(); return; }
        if (code === 'Tab') { e.preventDefault(); this.cycleSelection(shift ? -1 : 1); return; }
        if (code === 'KeyQ') {
            this.history.push('duplicate');
            if (this.activeTab === 'choice' && this.selectedItem) this.actionDuplicate('item', this.selectedItem.id);
            else if (this.activeTab === 'group' && this.selectedGroup) this.actionDuplicate('group', this.selectedGroup.id);
            return;
        }
        if (code === 'KeyR') {
            if (this.splitState) { this.commitSplit(); } 
            else if (this.selectedItem) { this.startSplit(this.selectedItem, 'horizontal'); }
            return;
        }
        if (code === 'KeyT') {
            if (this.splitState) { this.cancelSplit(); this.startSplit(this.selectedItem, 'vertical'); } 
            else if (this.selectedItem) { this.startSplit(this.selectedItem, 'vertical'); }
            return;
        }
        if (code === 'KeyE') { this.toggleTransformMode(); this.showModeToast(); return; }

        const moveKeys = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
        if (moveKeys.includes(code)) {
            if (this.splitState) { this.handleSplitKeyboard(e); } 
            else { this.handleWasd(e); }
        }
    },

    handleKeyUp(e) {
        if (!this.enabled) return;
        const code = e.code;
        if (code === 'KeyZ') this.isHoldingZ = false;
        if (code === 'KeyX') this.isHoldingX = false;
        
        const moveKeys = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
        if (moveKeys.includes(code)) { this.history.endBatch(); }
    },

    // ... (handleWasd and handleSplitKeyboard remain same) ...
    handleWasd(e) {
        if (!this.selectedItem && !this.selectedGroup) return;
        this.history.startBatch();

        const targets = this.activeTab === 'choice' ? this.selectedItems : [this.selectedGroup];
        if (targets.length === 0 || !targets[0]) return;

        const pageIndex = this.activePageIndex;
        const dim = this.renderer.pageDimensions[pageIndex];
        if (!dim) return;

        const step = e.shiftKey ? 10 : 1; 
        const code = e.code;
        
        const isUp = code === 'KeyW' || code === 'ArrowUp';
        const isDown = code === 'KeyS' || code === 'ArrowDown';
        const isLeft = code === 'KeyA' || code === 'ArrowLeft';
        const isRight = code === 'KeyD' || code === 'ArrowRight';

        targets.forEach(item => {
            if (!item.coords) return;
            const maxX = dim.w - item.coords.w;
            const maxY = dim.h - item.coords.h;

            if (this.transformMode === 'move') {
                if (isUp) item.coords.y -= step;
                if (isDown) item.coords.y += step;
                if (isLeft) item.coords.x -= step;
                if (isRight) item.coords.x += step;
                item.coords.x = Math.max(0, Math.min(item.coords.x, maxX));
                item.coords.y = Math.max(0, Math.min(item.coords.y, maxY));
            } 
            else if (this.transformMode === 'shrink') {
                if (isUp) { item.coords.y += step; item.coords.h -= step; }
                if (isDown) { item.coords.h -= step; }
                if (isLeft) { item.coords.x += step; item.coords.w -= step; }
                if (isRight) { item.coords.w -= step; }
            } 
            else if (this.transformMode === 'grow') {
                if (isUp) { item.coords.y -= step; item.coords.h += step; }
                if (isDown) { item.coords.h += step; }
                if (isLeft) { item.coords.x -= step; item.coords.w += step; }
                if (isRight) { item.coords.w += step; }
            }

            if (item.coords.w < 5) item.coords.w = 5;
            if (item.coords.h < 5) item.coords.h = 5;
            if (item.coords.w > dim.w) item.coords.w = dim.w;
            if (item.coords.h > dim.h) item.coords.h = dim.h;

            const domId = (item.type === 'group' || this.activeTab === 'group') ? `group-${item.id}` : `btn-${item.id}`;
            const el = document.getElementById(domId);
            if (el) {
                const styles = CoordHelper.toPercent(item.coords, dim);
                Object.assign(el.style, styles);
                el.classList.add('editor-selected');
            }
        });

        if (this.activeTab === 'choice') this.updateChoiceInputs();
        else this.updateGroupInputs();
        if (this.zoomLevel > 1) this.updateZoomFocus();
    },

    handleSplitKeyboard(e) {
        const code = e.code;
        const step = e.shiftKey ? 10 : 1;
        const { axis } = this.splitState;
        const isUp = code === 'KeyW';
        const isDown = code === 'KeyS';
        const isLeft = code === 'KeyA';
        const isRight = code === 'KeyD';

        if (axis === 'vertical') {
            if (isLeft) this.splitState.splitVal -= step;
            if (isRight) this.splitState.splitVal += step;
        } else {
            if (isUp) this.splitState.splitVal -= step;
            if (isDown) this.splitState.splitVal += step;
        }
        this.updateSplitGuideVisuals(); 
    },

    // ==================== MOUSE HANDLING ====================

    handleMouseDown(e) {
        if (!this.enabled) return;
        if (document.body.classList.contains('editor-preview-active')) return;
        
        // --- FIX: SHAPE EDITOR AUTO-CLOSE ---
        // Если редактор формы активен, проверяем, куда кликнули
        if (this.shapeEditorActive) {
            // Если клик не по оверлею (т.е. мимо), закрываем редактор
            if (!e.target.closest('#shape-editor-overlay')) {
                this.closeShapeEditor();
                // Не делаем return, чтобы клик мог выделить другой объект сразу
            } else {
                // Если клик по оверлею, shape.js сам его обработает, тут ничего не делаем
                return;
            }
        }

        // ... (UI protection logic) ...
        if (e.target.closest('#editor-sidebar')) return;
        if (e.target.closest('.modal-content')) return;
        if (e.target.closest('#editor-context-menu')) return;
        if (e.target.closest('#audit-chat-window')) return; 

        // ... (Creation Mode logic) ...
        if (e.button === 0) {
            const isZ = this.isHoldingZ;
            const isX = this.isHoldingX;
            if (isZ || isX) {
                // ... (Creation logic remains same) ...
                const targetPageContainer = e.target.closest('.page-container');
                if (!targetPageContainer) return;
                e.preventDefault();
                const targetPageIndex = parseInt(targetPageContainer.id.replace('page-', '')) || 0;
                if (this.activePageIndex !== targetPageIndex) {
                    this.activePageIndex = targetPageIndex;
                    this.renderPagesList();
                }
                const pageEl = targetPageContainer;
                const dim = this.renderer.pageDimensions[targetPageIndex];
                if (pageEl && dim) {
                    const rect = pageEl.getBoundingClientRect();
                    const scaleX = dim.w / rect.width;
                    const scaleY = dim.h / rect.height;
                    let rawRelX = (e.clientX - rect.left) * scaleX;
                    let rawRelY = (e.clientY - rect.top) * scaleY;
                    const relX = Math.max(0, Math.min(rawRelX, dim.w));
                    const relY = Math.max(0, Math.min(rawRelY, dim.h));
                    const type = isX ? 'group' : 'item';
                    if (isX) this.switchTab('group'); else this.switchTab('choice');
                    const newObj = this.startDragCreation(type, relX, relY, targetPageIndex);
                    if (newObj) {
                        this.creationState = { active: true, type, startX: relX, startY: relY, obj: newObj, pageIndex: targetPageIndex, scaleX, scaleY, dim };
                        document.body.style.cursor = 'crosshair';
                    }
                    return;
                }
            }
        }
        
        // ... (Split mode logic) ...
        if (this.splitState && e.button === 0) { e.preventDefault(); this.commitSplit(); return; }
        if (this.splitState && e.button === 2) { e.preventDefault(); this.cancelSplit(); return; }
        if (e.button === 2) return; 

        // ... (Selection logic) ...
        let objectToEdit = null;
        const pageContainer = e.target.closest('.page-container');
        if (pageContainer) {
            this.activePageIndex = parseInt(pageContainer.id.replace('page-', '')) || 0;
            this.renderPagesList();
        }

        if (this.activeTab === 'group') {
            const target = e.target.closest('.info-zone');
            if (target) {
                const group = this.engine.findGroup(target.id.replace('group-', ''));
                if (group) { this.selectGroup(group); objectToEdit = group; }
            } else {
                 this.selectedGroup = null;
                 this.switchTab('group');
            }
        } else {
            const target = e.target.closest('.item-zone');
            if (target) {
                const item = this.engine.findItem(target.dataset.itemId);
                if (item) {
                    objectToEdit = item;
                    if (e.shiftKey) {
                        if (this.selectedItems.includes(item)) {
                            this.selectedItems = this.selectedItems.filter(i => i !== item);
                            if (this.selectedItem === item) this.selectedItem = this.selectedItems[this.selectedItems.length - 1] || null;
                        } else {
                            this.selectedItems.push(item);
                            this.selectedItem = item; 
                        }
                    } else {
                        if (!this.selectedItems.includes(item)) { 
                            this.selectChoice(item, target); 
                        } else { 
                            this.selectedItem = item; 
                            this.switchTab('choice');
                            this.updateChoiceInputs();
                        }
                    }
                    this.refreshSelectionVisuals();
                    this.switchTab('choice');
                    if (this.zoomLevel > 1) this.updateZoomFocus();
                }
            } else {
                if (!e.shiftKey) { this.deselectChoice(); }
                if (pageContainer) {
                    this.isMarqueeSelecting = true;
                    this.marqueeStart = { x: e.clientX, y: e.clientY };
                    if (!this.marqueeBox) {
                        this.marqueeBox = document.createElement('div');
                        this.marqueeBox.className = 'selection-marquee';
                        document.body.appendChild(this.marqueeBox);
                    }
                    this.marqueeBox.style.display = 'block';
                    this.marqueeBox.style.left = e.clientX + 'px';
                    this.marqueeBox.style.top = e.clientY + 'px';
                    this.marqueeBox.style.width = '0px';
                    this.marqueeBox.style.height = '0px';
                    e.preventDefault();
                    return;
                }
            }
        }
        
        // ... (Drag setup logic) ...
        if (objectToEdit) {
            this.history.startBatch();
            document.body.classList.add('editor-interacting');

            const domId = objectToEdit.type === 'group' ? `group-${objectToEdit.id}` : `btn-${objectToEdit.id}`;
            const targetEl = document.getElementById(domId);
            if (!targetEl) return;

            const rect = targetEl.getBoundingClientRect();
            // This is where standard resize handles are checked. 
            // Since we disable clip-path on selection (see renderer.js updateButtons), rect will be the full box.
            this.resizeMode = (this.selectedItems.length <= 1) ? this.getResizeHandle(e.clientX, e.clientY, rect) : null;
            if (this.resizeMode) { this.isResizing = true; } else { this.isDragging = true; }
            targetEl.classList.add('dragging');
            this.dragStart = { x: e.clientX, y: e.clientY };
            this.initialRects = this.selectedItems.map(it => ({ id: it.id, x: it.coords.x, y: it.coords.y, w: it.coords.w, h: it.coords.h }));
            if (objectToEdit.type === 'group') {
                 if (!objectToEdit.coords) objectToEdit.coords = {x:0,y:0,w:100,h:100};
                 this.initialRect = { ...objectToEdit.coords };
                 this.initialRects = [{ id: objectToEdit.id, ...objectToEdit.coords }];
            } else { this.initialRect = { ...objectToEdit.coords }; }

            const dim = this.renderer.pageDimensions[this.activePageIndex];
            const container = document.querySelector(`#page-${this.activePageIndex}`);
            if (dim && container) {
                const containerRect = container.getBoundingClientRect();
                this.dragContext = { 
                    scaleX: dim.w / containerRect.width, 
                    scaleY: dim.h / containerRect.height, 
                    dim: dim, targetObj: objectToEdit, pageIndex: this.activePageIndex, isGroup: objectToEdit.type === 'group'
                };
            }
            e.preventDefault(); 
        }
    },

    // ... (rest of the file remains same: handleMouseMove, handleMouseUp, etc) ...
    handleMouseMove(e) {
        if (!this.enabled) return;
        if (document.body.classList.contains('editor-preview-active')) return;
        if (this.splitState) { this.updateSplitGuideFromMouse(e); return; }

        if (this.creationState && this.creationState.active) {
            const { startX, startY, obj, scaleX, scaleY, dim } = this.creationState;
            const pageEl = document.getElementById(`page-${this.creationState.pageIndex}`);
            const rect = pageEl.getBoundingClientRect(); 
            const rawCurrentX = (e.clientX - rect.left) * scaleX;
            const rawCurrentY = (e.clientY - rect.top) * scaleY;
            const currentX = Math.max(0, Math.min(rawCurrentX, dim.w));
            const currentY = Math.max(0, Math.min(rawCurrentY, dim.h));
            let x = Math.min(startX, currentX);
            let y = Math.min(startY, currentY);
            let w = Math.abs(currentX - startX);
            let h = Math.abs(currentY - startY);
            obj.coords.x = Math.round(x);
            obj.coords.y = Math.round(y);
            obj.coords.w = Math.max(1, Math.round(w));
            obj.coords.h = Math.max(1, Math.round(h));
            const domId = (obj.type === 'group') ? `group-${obj.id}` : `btn-${obj.id}`;
            const el = document.getElementById(domId);
            if (el) {
                const styles = CoordHelper.toPercent(obj.coords, dim);
                Object.assign(el.style, styles);
                el.classList.add('editor-selected');
            }
            return;
        }

        if (this.isMarqueeSelecting) {
            const x = Math.min(e.clientX, this.marqueeStart.x);
            const y = Math.min(e.clientY, this.marqueeStart.y);
            const w = Math.abs(e.clientX - this.marqueeStart.x);
            const h = Math.abs(e.clientY - this.marqueeStart.y);
            this.marqueeBox.style.left = x + 'px';
            this.marqueeBox.style.top = y + 'px';
            this.marqueeBox.style.width = w + 'px';
            this.marqueeBox.style.height = h + 'px';
            return;
        }

        if (!this.dragContext || (!this.isDragging && !this.isResizing)) return;
        const dx = e.clientX - this.dragStart.x;
        const dy = e.clientY - this.dragStart.y;
        const { scaleX, scaleY, dim, targetObj, isGroup } = this.dragContext;
        
        if (this.isDragging) {
            const itemsToMove = isGroup ? [targetObj] : this.selectedItems;
            itemsToMove.forEach(item => {
                const initial = this.initialRects.find(r => r.id === item.id);
                if (!initial) return;
                let destX = Math.round(initial.x + dx * scaleX);
                let destY = Math.round(initial.y + dy * scaleY);
                destX = Math.max(0, Math.min(destX, dim.w - item.coords.w));
                destY = Math.max(0, Math.min(destY, dim.h - item.coords.h));
                item.coords.x = destX;
                item.coords.y = destY;
                const domId = isGroup ? `group-${item.id}` : `btn-${item.id}`;
                const el = document.getElementById(domId);
                if (el) Object.assign(el.style, CoordHelper.toPercent(item.coords, dim));
            });
        } 
        else if (this.isResizing && this.resizeMode) {
            const start = this.initialRect;
            const deltaX = dx * scaleX;
            const deltaY = dy * scaleY;
            const MIN_SIZE = 10;
            let finalX = start.x, finalY = start.y, finalW = start.w, finalH = start.h;

            if (this.resizeMode.includes('r')) finalW = Math.min(dim.w - start.x, Math.max(MIN_SIZE, start.w + deltaX));
            if (this.resizeMode.includes('l')) {
                const proposedX = Math.max(0, Math.min(start.x + deltaX, start.x + start.w - MIN_SIZE));
                finalW = (start.x + start.w) - proposedX;
                finalX = proposedX;
            }
            if (this.resizeMode.includes('b')) finalH = Math.min(dim.h - start.y, Math.max(MIN_SIZE, start.h + deltaY));
            if (this.resizeMode.includes('t')) {
                const proposedY = Math.max(0, Math.min(start.y + deltaY, start.y + start.h - MIN_SIZE));
                finalH = (start.y + start.h) - proposedY;
                finalY = proposedY;
            }
            targetObj.coords.x = Math.round(finalX);
            targetObj.coords.y = Math.round(finalY);
            targetObj.coords.w = Math.round(finalW);
            targetObj.coords.h = Math.round(finalH);
            const domId = isGroup ? `group-${targetObj.id}` : `btn-${targetObj.id}`;
            const element = document.getElementById(domId);
            if (element) Object.assign(element.style, CoordHelper.toPercent(targetObj.coords, dim));
        }
        
        if (this.activeTab === 'group') this.updateGroupInputs(); 
        else this.updateChoiceInputs();
    },

    handleMouseUp(e) {
        if (!this.enabled) return;
        if (document.body.classList.contains('editor-preview-active')) return;

        if (this.creationState && this.creationState.active) {
            const { obj, type } = this.creationState;
            if (obj.coords.w < 10 || obj.coords.h < 10) {
                 const defW = type === 'group' ? 300 : 200;
                 const defH = type === 'group' ? 200 : 100;
                 const dim = this.renderer.pageDimensions[this.creationState.pageIndex];
                 let cx = obj.coords.x - (defW / 2);
                 let cy = obj.coords.y - (defH / 2);
                 cx = Math.max(0, Math.min(cx, dim.w - defW));
                 cy = Math.max(0, Math.min(cy, dim.h - defH));
                 obj.coords.x = Math.round(cx); obj.coords.y = Math.round(cy);
                 obj.coords.w = defW; obj.coords.h = defH;
            }
            this.history.push(`create_${type}`);
            this.creationState = null;
            document.body.style.cursor = '';
            this.renderer.renderLayout();
            this.renderPagesList();
            if (type === 'item') {
                const el = document.getElementById(`btn-${obj.id}`);
                this.selectChoice(obj, el);
            } else {
                const el = document.getElementById(`group-${obj.id}`);
                this.selectGroup(obj);
            }
            return;
        }

        this.history.endBatch();
        document.body.classList.remove('editor-interacting');

        if (this.isMarqueeSelecting) {
            this.isMarqueeSelecting = false;
            if (this.marqueeBox) {
                const rect = this.marqueeBox.getBoundingClientRect();
                this.marqueeBox.style.display = 'none';
                if (rect.width > 5 && rect.height > 5) {
                    this.performMarqueeSelection(rect);
                }
            }
            return;
        }

        if (this.dragContext) {
            const { targetObj, pageIndex, isGroup } = this.dragContext;
            if (isGroup) { this.updateGroupMemberships(targetObj, pageIndex); } 
            else { this.selectedItems.forEach(item => { this.updateItemGrouping(item, pageIndex); }); }
            const page = this.getPageByIndex(pageIndex);
            if (page) this.sortLayoutByCoords(page.layout);
            this.renderer.renderLayout();
            this.renderPagesList();
            this.refreshSelectionVisuals();
            if (!isGroup && this.selectedItem) { this.updateChoiceInputs(); }
        }
        
        document.querySelectorAll('.dragging').forEach(el => el.classList.remove('dragging'));
        this.isDragging = false; 
        this.isResizing = false; 
        this.resizeMode = null;
        this.dragContext = null;
    },

    performMarqueeSelection(marqueeRect) {
        const page = this.getCurrentPage();
        if (!page) return;
        this.selectedItems = [];
        document.querySelectorAll('.item-zone').forEach(el => {
             const elRect = el.getBoundingClientRect();
             const intersects = !(elRect.right < marqueeRect.left || elRect.left > marqueeRect.right || elRect.bottom < marqueeRect.top || elRect.top > marqueeRect.bottom);
             if (intersects) {
                 const id = el.dataset.itemId;
                 const item = this.engine.findItem(id);
                 if (item) this.selectedItems.push(item);
             }
        });
        if (this.selectedItems.length > 0) this.selectedItem = this.selectedItems[0];
        else this.selectedItem = null;
        this.refreshSelectionVisuals();
        this.switchTab('choice');
    },

    refreshSelectionVisuals() {
        document.querySelectorAll('.editor-selected').forEach(el => el.classList.remove('editor-selected'));
        this.selectedItems.forEach(item => {
            const el = document.getElementById(`btn-${item.id}`);
            if (el) {
                el.classList.add('editor-selected');
                el.setAttribute('data-editor-title', item.title || item.id);
            }
        });
        // FIX: Обновляем UI Renderer, чтобы применить/снять clip-path
        this.renderer.updateUI(); 
        if (this.activeTab === 'choice') {
            this.updateChoiceInputs();
        }
    }
};