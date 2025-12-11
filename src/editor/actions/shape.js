/**
 * src/editor/actions/shape.js
 * Polygon Shape Editor using CSS clip-path
 * Fixed: Event bubbling and Interaction logic
 */

export const ShapeEditorMixin = {
    toggleShapeEditor() {
        const item = this.selectedItem;
        if (!item) return alert("Select an item first.");

        if (this.shapeEditorActive) {
            this.closeShapeEditor();
        } else {
            this.openShapeEditor(item);
        }
    },

    openShapeEditor(item) {
        this.shapeEditorActive = true;
        this.shapeItem = item;
        
        if (!item.shapePoints) {
            item.shapePoints = []; 
        }

        // Блокируем интерфейс редактора
        document.body.classList.add('shape-editing-mode');
        
        // Временно убираем маску, чтобы видеть весь холст для рисования
        const itemEl = document.getElementById(`btn-${item.id}`);
        if (itemEl) {
            itemEl.style.clipPath = 'none';
            // Отключаем транзишн инлайн, чтобы перебить CSS
            itemEl.style.transition = 'none'; 
        }

        this.createShapeOverlay();
        
        // Показываем UI
        const ui = document.getElementById('shape-editor-ui');
        if (ui) ui.style.display = 'block';
    },

    closeShapeEditor() {
        this.shapeEditorActive = false;
        document.body.classList.remove('shape-editing-mode');
        
        const overlay = document.getElementById('shape-editor-overlay');
        if (overlay) overlay.remove();
        
        const ui = document.getElementById('shape-editor-ui');
        if (ui) ui.style.display = 'none';
        
        // Восстанавливаем маску и стили
        if (this.shapeItem) {
            const itemEl = document.getElementById(`btn-${this.shapeItem.id}`);
            if (itemEl) {
                itemEl.style.transition = ''; // Возвращаем CSS транзишн
                // Применяем маску через рендерер или вручную
                if (this.shapeItem.shapePoints && this.shapeItem.shapePoints.length >= 3) {
                    const polygonStr = this.shapeItem.shapePoints.map(p => `${p.x}% ${p.y}%`).join(', ');
                    itemEl.style.clipPath = `polygon(${polygonStr})`;
                    itemEl.style.border = 'none';
                    itemEl.style.boxShadow = 'none';
                } else {
                    itemEl.style.clipPath = 'none';
                    itemEl.style.border = '';
                    itemEl.style.boxShadow = '';
                }
            }
        }
        
        this.shapeItem = null;
    },

    createShapeOverlay() {
        const itemEl = document.getElementById(`btn-${this.shapeItem.id}`);
        if (!itemEl) return;

        // Создаем оверлей ВНУТРИ элемента
        const overlay = document.createElement('div');
        overlay.id = 'shape-editor-overlay';
        // z-index должен быть выше контента кнопки
        overlay.style.cssText = `
            position: absolute;
            top: 0; left: 0; width: 100%; height: 100%;
            z-index: 10000; 
            cursor: crosshair;
            background: rgba(0, 255, 255, 0.1); /* Легкая подсветка зоны редактирования */
        `;
        
        itemEl.appendChild(overlay);

        this.shapeSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        this.shapeSvg.style.cssText = "width:100%; height:100%; overflow:visible;";
        this.shapeSvg.setAttribute('viewBox', '0 0 100 100');
        this.shapeSvg.setAttribute('preserveAspectRatio', 'none');
        overlay.appendChild(this.shapeSvg);

        // ВАЖНО: stopPropagation предотвращает выбор элемента редактором
        overlay.addEventListener('mousedown', (e) => this.handleShapeMouseDown(e));
        overlay.addEventListener('click', (e) => { e.stopPropagation(); e.preventDefault(); });
        
        this.drawShapeOverlay();
    },

    drawShapeOverlay() {
        const points = this.shapeItem.shapePoints;
        this.shapeSvg.innerHTML = ''; 

        if (!points || points.length === 0) return;

        // 1. Полигон (Предпросмотр заливки)
        if (points.length >= 3) {
            const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
            const pointsStr = points.map(p => `${p.x},${p.y}`).join(' ');
            polygon.setAttribute("points", pointsStr);
            polygon.style.cssText = "fill: rgba(255, 215, 0, 0.3); stroke: none;";
            this.shapeSvg.appendChild(polygon);
        }

        // 2. Линии (Контур)
        const polyline = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
        // Замыкаем линию, если точек > 2
        let linePoints = points.map(p => `${p.x},${p.y}`).join(' ');
        if (points.length > 2) linePoints += ` ${points[0].x},${points[0].y}`;
        
        polyline.setAttribute("points", linePoints);
        polyline.style.cssText = "fill: none; stroke: #FFD700; stroke-width: 2px; vector-effect: non-scaling-stroke; stroke-dasharray: 4;";
        this.shapeSvg.appendChild(polyline);

        // 3. Точки (Ручки)
        points.forEach((p, idx) => {
            const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            circle.setAttribute("cx", p.x);
            circle.setAttribute("cy", p.y);
            // r=1.5 в системе координат 0-100 может быть большим овалом, если элемент не квадратный.
            // Используем vector-effect, чтобы радиус был в пикселях экрана
            circle.setAttribute("r", "4"); 
            circle.style.cssText = "fill: #fff; stroke: #000; stroke-width: 1px; cursor: move; vector-effect: non-scaling-stroke;";
            
            circle.addEventListener('mousedown', (e) => {
                e.stopPropagation(); // Не создавать новую точку
                e.preventDefault();  // Не выделять текст
                // Правый клик = удалить
                if (e.button === 2) {
                    this.shapeItem.shapePoints.splice(idx, 1);
                    this.drawShapeOverlay();
                } else {
                    this.startDraggingPoint(idx);
                }
            });
            // Блокируем контекстное меню на точках для удаления
            circle.addEventListener('contextmenu', e => e.preventDefault());

            this.shapeSvg.appendChild(circle);
        });
    },

    handleShapeMouseDown(e) {
        // Левый клик по пустому месту = новая точка
        if (e.button !== 0) return;
        
        e.stopPropagation();
        e.preventDefault();

        if (e.target.tagName !== 'circle') {
            const rect = e.target.getBoundingClientRect();
            // Вычисляем проценты
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            
            const newPoint = { x: parseFloat(x.toFixed(1)), y: parseFloat(y.toFixed(1)) };
            
            this.shapeItem.shapePoints.push(newPoint);
            this.drawShapeOverlay();
        }
    },

    startDraggingPoint(index) {
        const itemEl = document.getElementById(`btn-${this.shapeItem.id}`);
        
        const onMove = (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const rect = itemEl.getBoundingClientRect();
            let x = ((e.clientX - rect.left) / rect.width) * 100;
            let y = ((e.clientY - rect.top) / rect.height) * 100;
            
            x = Math.max(0, Math.min(100, x));
            y = Math.max(0, Math.min(100, y));

            this.shapeItem.shapePoints[index] = { x: parseFloat(x.toFixed(1)), y: parseFloat(y.toFixed(1)) };
            this.drawShapeOverlay();
        };

        const onUp = (e) => {
            e.preventDefault();
            e.stopPropagation();
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };

        window.addEventListener('mousemove', onMove, { passive: false });
        window.addEventListener('mouseup', onUp);
    },
    
    resetShape() {
        if(this.shapeItem) {
            delete this.shapeItem.shapePoints;
            const itemEl = document.getElementById(`btn-${this.shapeItem.id}`);
            if(itemEl) itemEl.style.clipPath = 'none';
            this.drawShapeOverlay();
        }
    }
};