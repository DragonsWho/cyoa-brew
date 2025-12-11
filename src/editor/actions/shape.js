/**
 * src/editor/actions/shape.js
 * Polygon Shape Editor using SVG Overlay
 */

export const ShapeEditorMixin = {
    
    // Входная точка
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
        
        // Инициализируем массив, если его нет
        if (!item.shapePoints) {
            item.shapePoints = []; 
        }

        // 1. Блокируем интерфейс редактора (курсоры, ховеры на других элементах)
        document.body.classList.add('shape-editing-mode');
        
        // 2. Подготовка целевого элемента
        const itemEl = document.getElementById(`btn-${item.id}`);
        if (itemEl) {
            // ВАЖНО: Убираем маску (clip-path), чтобы видеть весь прямоугольник
            itemEl.style.clipPath = 'none';
            // Отключаем transition, чтобы рисование было отзывчивым
            itemEl.style.transition = 'none'; 
            // Показываем рамку прямоугольника (bounding box)
            itemEl.style.border = '1px dashed #00ffff'; 
            itemEl.style.boxShadow = 'none';

            // СКРЫВАЕМ игровой SVG-слой, чтобы он не мешал и не дублировался
            const gameSvg = itemEl.querySelector('.shape-bg-layer');
            if (gameSvg) gameSvg.style.display = 'none';
        }

        // 3. Создаем оверлей для рисования
        this.createShapeOverlay();
        
        // 4. Показываем панельку с подсказками
        const ui = document.getElementById('shape-editor-ui');
        if (ui) ui.style.display = 'block';

        // Перерисовываем UI, чтобы renderer не попытался вернуть стили обратно прямо сейчас
        this.renderer.updateUI();
    },

    closeShapeEditor() {
        this.shapeEditorActive = false;
        document.body.classList.remove('shape-editing-mode');
        
        // Удаляем оверлей редактора
        const overlay = document.getElementById('shape-editor-overlay');
        if (overlay) overlay.remove();
        
        const ui = document.getElementById('shape-editor-ui');
        if (ui) ui.style.display = 'none';
        
        // Восстанавливаем состояние элемента
        if (this.shapeItem) {
            const itemEl = document.getElementById(`btn-${this.shapeItem.id}`);
            if (itemEl) {
                // Сбрасываем наши временные стили
                itemEl.style.transition = ''; 
                itemEl.style.border = ''; 
                
                // ВОЗВРАЩАЕМ видимость игрового SVG (renderer его обновит)
                const gameSvg = itemEl.querySelector('.shape-bg-layer');
                if (gameSvg) gameSvg.style.display = ''; 
            }
            
            // Принудительно обновляем UI через Renderer.
            // Renderer увидит, что isEditingThis = false, и применит красивый SVG и clip-path.
            this.renderer.updateUI(); 
        }
        
        this.shapeItem = null;
    },

    createShapeOverlay() {
        const itemEl = document.getElementById(`btn-${this.shapeItem.id}`);
        if (!itemEl) return;

        // Создаем контейнер оверлея
        const overlay = document.createElement('div');
        overlay.id = 'shape-editor-overlay';
        overlay.style.cssText = `
            position: absolute;
            top: 0; left: 0; width: 100%; height: 100%;
            z-index: 10000; 
            cursor: crosshair;
            background: rgba(0, 255, 255, 0.05); /* Легкая подсветка зоны редактирования */
        `;
        
        itemEl.appendChild(overlay);

        // Создаем SVG для редактора (рисуем линии и точки)
        this.shapeSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        this.shapeSvg.style.cssText = "width:100%; height:100%; overflow:visible;";
        this.shapeSvg.setAttribute('viewBox', '0 0 100 100');
        this.shapeSvg.setAttribute('preserveAspectRatio', 'none');
        overlay.appendChild(this.shapeSvg);

        // Обработчики мыши
        // stopPropagation нужен, чтобы клики не выделяли саму карточку в редакторе (не запускали drag)
        overlay.addEventListener('mousedown', (e) => this.handleShapeMouseDown(e));
        
        // Блокируем стандартный клик
        overlay.addEventListener('click', (e) => { e.stopPropagation(); e.preventDefault(); });
        
        this.drawShapeOverlay();
    },

    drawShapeOverlay() {
        const points = this.shapeItem.shapePoints;
        this.shapeSvg.innerHTML = ''; 

        if (!points || points.length === 0) return;

        // 1. Полигон (Предпросмотр заливки - полупрозрачный желтый)
        if (points.length >= 3) {
            const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
            const pointsStr = points.map(p => `${p.x},${p.y}`).join(' ');
            polygon.setAttribute("points", pointsStr);
            polygon.style.cssText = "fill: rgba(255, 215, 0, 0.2); stroke: none;";
            this.shapeSvg.appendChild(polygon);
        }

        // 2. Линии (Контур - пунктир)
        const polyline = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
        let linePoints = points.map(p => `${p.x},${p.y}`).join(' ');
        // Если точек > 2, замыкаем контур визуально
        if (points.length > 2) linePoints += ` ${points[0].x},${points[0].y}`;
        
        polyline.setAttribute("points", linePoints);
        polyline.style.cssText = "fill: none; stroke: #FFD700; stroke-width: 2px; vector-effect: non-scaling-stroke; stroke-dasharray: 4;";
        this.shapeSvg.appendChild(polyline);

        // 3. Точки (Ручки управления)
        points.forEach((p, idx) => {
            const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            circle.setAttribute("cx", p.x);
            circle.setAttribute("cy", p.y);
            circle.setAttribute("r", "4"); // Размер точки
            // vector-effect: non-scaling-stroke позволяет точкам не плющиться при ресайзе, но для радиуса это не работает напрямую в SVG 1.1,
            // однако курсор будет работать.
            circle.style.cssText = "fill: #fff; stroke: #000; stroke-width: 1px; cursor: move; vector-effect: non-scaling-stroke;";
            
            circle.addEventListener('mousedown', (e) => {
                e.stopPropagation(); 
                e.preventDefault();
                
                // Правый клик = удалить точку
                if (e.button === 2) {
                    this.shapeItem.shapePoints.splice(idx, 1);
                    this.drawShapeOverlay();
                } else {
                    // Левый клик = тащить точку
                    this.startDraggingPoint(idx);
                }
            });
            
            // Блокируем контекстное меню браузера на точках
            circle.addEventListener('contextmenu', e => e.preventDefault());

            this.shapeSvg.appendChild(circle);
        });
    },

    handleShapeMouseDown(e) {
        // Работаем только с левой кнопкой
        if (e.button !== 0) return;
        
        e.stopPropagation();
        e.preventDefault();

        // Защита от undefined
        if (!this.shapeItem.shapePoints) {
            this.shapeItem.shapePoints = [];
        }

        // Если кликнули по самому кружочку, это обработается в слушателе кружочка.
        // Здесь обрабатываем клик по пустому месту -> Добавить точку.
        if (e.target.tagName !== 'circle') {
            const rect = e.target.getBoundingClientRect();
            // Переводим пиксели в проценты (0-100)
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
            
            // Ограничиваем точками внутри блока (0-100)
            // Можно убрать clamp, если хотите разрешить выход за границы (но clip-path обрежет)
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

        // passive: false нужно для корректной работы preventDefault при перетаскивании
        window.addEventListener('mousemove', onMove, { passive: false });
        window.addEventListener('mouseup', onUp);
    },
    
    resetShape() {
        if(this.shapeItem) {
            // Очищаем массив точек -> renderer поймет, что это прямоугольник
            this.shapeItem.shapePoints = [];
            
            // Сбрасываем clip-path сразу
            const itemEl = document.getElementById(`btn-${this.shapeItem.id}`);
            if(itemEl) itemEl.style.clipPath = 'none';
            
            this.drawShapeOverlay();
        }
    }
};