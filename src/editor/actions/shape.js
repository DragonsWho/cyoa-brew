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
        const overlay = document.getElementById('shape-editor-overlay');
        
        // 1. Очищаем SVG (линии и полигон)
        this.shapeSvg.innerHTML = ''; 
        
        // 2. Очищаем старые HTML-ручки (точки), если они есть
        if (overlay) {
            overlay.querySelectorAll('.shape-handle').forEach(el => el.remove());
        }

        if (!points || points.length === 0) return;

        // --- РИСУЕМ SVG (ЛИНИИ И ЗАЛИВКУ) ---
        // 1. Полигон (Предпросмотр заливки)
        if (points.length >= 3) {
            const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
            const pointsStr = points.map(p => `${p.x},${p.y}`).join(' ');
            polygon.setAttribute("points", pointsStr);
            polygon.style.cssText = "fill: rgba(255, 215, 0, 0.2); stroke: none;";
            this.shapeSvg.appendChild(polygon);
        }

        // 2. Линии (Контур)
        const polyline = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
        let linePoints = points.map(p => `${p.x},${p.y}`).join(' ');
        if (points.length > 2) linePoints += ` ${points[0].x},${points[0].y}`;
        
        polyline.setAttribute("points", linePoints);
        polyline.style.cssText = "fill: none; stroke: #FFD700; stroke-width: 2px; vector-effect: non-scaling-stroke; stroke-dasharray: 4;";
        this.shapeSvg.appendChild(polyline);

        // --- РИСУЕМ HTML РУЧКИ (ТОЧКИ) ---
        points.forEach((p, idx) => {
            const handle = document.createElement('div');
            handle.className = 'shape-handle';
            
            // НАСТРОЙКИ ВНЕШНЕГО ВИДА ТОЧЕК
            handle.style.cssText = `
                position: absolute;
                left: ${p.x}%; 
                top: ${p.y}%;
                width: 15px;        /* Размер точки (было r=4, т.е. 8px) */
                height: 15px;       /* Квадрат, который станет кругом */
                background: #fff;
                border: 1px solid #000;
                border-radius: 50%; /* Делает идеальный круг */
                transform: translate(-50%, -50%); /* Центрируем точку точно по координатам */
                cursor: move;
                z-index: 10002;     /* Поверх SVG */
                box-shadow: 0 0 2px rgba(0,0,0,0.5);
            `;
            
            handle.addEventListener('mousedown', (e) => {
                e.stopPropagation(); 
                e.preventDefault();  
                if (e.button === 2) {
                    this.shapeItem.shapePoints.splice(idx, 1);
                    this.drawShapeOverlay();
                } else {
                    this.startDraggingPoint(idx);
                }
            });
            handle.addEventListener('contextmenu', e => e.preventDefault());

            overlay.appendChild(handle);
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
        if (this.shapeItem) {
            if (confirm("Reset shape to standard rectangle?")) {
                // 1. Очищаем данные
                this.shapeItem.shapePoints = [];
                
                // 2. Находим элемент в DOM
                const itemEl = document.getElementById(`btn-${this.shapeItem.id}`);
                if (itemEl) {
                    // Сбрасываем стили немедленно
                    itemEl.style.clipPath = 'none';
                    itemEl.classList.remove('custom-shape');
                    
                    // Удаляем SVG слой
                    const svg = itemEl.querySelector('.shape-bg-layer');
                    if(svg) svg.remove();
                }

                // 3. Перерисовываем оверлей редактора (он станет пустым)
                this.drawShapeOverlay();
                
                // 4. Форсируем обновление рендерера, чтобы он понял, что формы больше нет
                this.renderer.updateUI();
                
                // 5. Обновляем JSON превью в боковой панели
                this.updateCodePreview();
            }
        }
    },
};