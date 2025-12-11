/**
 * src/editor/actions/shape.js
 * Polygon Shape Editor using CSS clip-path
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
        
        // Если точек нет, создаем дефолтный треугольник, чтобы пользователю было с чего начать,
        // или оставляем пустым, чтобы он начал кликать. 
        // Лучше: если точек нет, даем пользователю кликать "с нуля".
        if (!item.shapePoints) {
            item.shapePoints = []; // [{x: 0, y: 0}, ...] in percent
        }

        // Блокируем обычное выделение
        document.body.classList.add('shape-editing-mode');
        
        // Создаем SVG слой поверх элемента для рисования
        this.createShapeOverlay();
        this.renderShapeUI();
    },

    closeShapeEditor() {
        this.shapeEditorActive = false;
        this.shapeItem = null;
        document.body.classList.remove('shape-editing-mode');
        
        const overlay = document.getElementById('shape-editor-overlay');
        if (overlay) overlay.remove();
        
        const ui = document.getElementById('shape-editor-ui');
        if (ui) ui.style.display = 'none';
        
        this.renderer.renderLayout(); // Обновить вид
    },

    createShapeOverlay() {
        const itemEl = document.getElementById(`btn-${this.shapeItem.id}`);
        if (!itemEl) return;

        const rect = itemEl.getBoundingClientRect();
        
        // Оверлей должен перекрывать элемент и следовать за ним (но пока мы запретим перемещение элемента во время редактирования формы)
        const overlay = document.createElement('div');
        overlay.id = 'shape-editor-overlay';
        overlay.style.cssText = `
            position: absolute;
            top: 0; left: 0; width: 100%; height: 100%;
            z-index: 5000;
            cursor: crosshair;
        `;
        
        // Вставляем ВНУТРЬ item-zone, чтобы координаты были локальными (0-100%)
        itemEl.appendChild(overlay);

        // SVG для отрисовки линий
        this.shapeSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        this.shapeSvg.style.cssText = "width:100%; height:100%; overflow:visible;";
        overlay.appendChild(this.shapeSvg);

        // Слушатели
        overlay.addEventListener('mousedown', (e) => this.handleShapeMouseDown(e));
        overlay.addEventListener('dblclick', (e) => this.handleShapeDblClick(e));
        
        // Рендер точек
        this.drawShapeOverlay();
    },

    drawShapeOverlay() {
        const points = this.shapeItem.shapePoints;
        this.shapeSvg.innerHTML = ''; // Clear

        if (!points || points.length === 0) return;

        // 1. Рисуем полигон (линии)
        const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
        const pointsStr = points.map(p => `${p.x},${p.y}`).join(' '); // Тут координаты в %, но SVG polygon требует absolute units или viewBox.
        // Проще использовать viewBox="0 0 100 100" и preserveAspectRatio="none"
        
        this.shapeSvg.setAttribute('viewBox', '0 0 100 100');
        this.shapeSvg.setAttribute('preserveAspectRatio', 'none');

        polygon.setAttribute("points", pointsStr);
        polygon.style.cssText = "fill: rgba(0, 255, 0, 0.3); stroke: #00ff00; stroke-width: 1px; vector-effect: non-scaling-stroke;";
        this.shapeSvg.appendChild(polygon);

        // 2. Рисуем точки (ручки)
        points.forEach((p, idx) => {
            const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            circle.setAttribute("cx", p.x);
            circle.setAttribute("cy", p.y);
            circle.setAttribute("r", "2"); // Радиус маленький, так как scale 100x100
            circle.style.cssText = "fill: #fff; stroke: #000; stroke-width: 0.5px; cursor: pointer; vector-effect: non-scaling-stroke;";
            
            // Хак для увеличения зоны клика при маленьком радиусе
            circle.setAttribute("pointer-events", "all");
            
            circle.addEventListener('mousedown', (e) => {
                e.stopPropagation(); // Не создавать новую точку
                this.startDraggingPoint(idx, e);
            });

            this.shapeSvg.appendChild(circle);
        });
        
        // Обновляем clip-path самого элемента в реальном времени
        this.applyShapeToItemDOM();
    },

    applyShapeToItemDOM() {
        const points = this.shapeItem.shapePoints;
        const el = document.getElementById(`btn-${this.shapeItem.id}`);
        if (!el) return;

        if (!points || points.length < 3) {
            el.style.clipPath = 'none';
        } else {
            const polygonStr = points.map(p => `${p.x}% ${p.y}%`).join(', ');
            el.style.clipPath = `polygon(${polygonStr})`;
        }
    },

    handleShapeMouseDown(e) {
        // Добавление новой точки
        if (e.target.tagName !== 'circle') {
            const rect = e.target.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            
            // Округляем для красоты
            const newPoint = { x: parseFloat(x.toFixed(1)), y: parseFloat(y.toFixed(1)) };
            
            this.shapeItem.shapePoints.push(newPoint);
            this.drawShapeOverlay();
        }
    },

    handleShapeDblClick(e) {
        // Удаление точки (если попали в круг, но событие всплывает)
        // Для простоты сделаем удаление последней точки если клик по фону,
        // или переделаем логику кружков.
        // Реализуем удаление через нажатие правой кнопкой или модификатор в `startDraggingPoint`.
    },

    startDraggingPoint(index, startEvent) {
        const itemEl = document.getElementById(`btn-${this.shapeItem.id}`);
        const rect = itemEl.getBoundingClientRect();
        
        const onMove = (e) => {
            let x = ((e.clientX - rect.left) / rect.width) * 100;
            let y = ((e.clientY - rect.top) / rect.height) * 100;
            
            // Clamp 0-100
            x = Math.max(0, Math.min(100, x));
            y = Math.max(0, Math.min(100, y));

            this.shapeItem.shapePoints[index] = { x: parseFloat(x.toFixed(1)), y: parseFloat(y.toFixed(1)) };
            this.drawShapeOverlay();
        };

        const onUp = () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };

        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    },
    
    resetShape() {
        if(this.shapeItem) {
            delete this.shapeItem.shapePoints;
            this.drawShapeOverlay();
            this.applyShapeToItemDOM();
        }
    }
};