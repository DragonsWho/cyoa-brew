/**
 * src\ui\renderer.js
 * UI Renderer - Handles all visual rendering
 * 
 * Architecture v2: Renders from config.pages[].layout[]
 */

import { CoordHelper } from '../utils/coords.js';
import { TooltipManager } from './tooltip.js';

export class UIRenderer {
    constructor(engine) {
        this.engine = engine;
        this.pageDimensions = [];
        this.tooltip = new TooltipManager(engine);

        this.engine.on('selection', () => this.updateUI());
        this.engine.on('recalculate', () => this.updateUI());
        this.engine.on('reset', () => this.updateUI());
        
        this.engine.on('config_loaded', () => {
            console.log('🔄 Renderer: Config loaded, rebuilding UI...');
            this.renderAll();
        });

        this.buttonStateCache = new Map();
        console.log('🎨 Renderer initialized');
    }

    // ==================== MAIN RENDER ====================

    async renderAll() {
        await this.renderPages();
        this.renderLayout();
        this.renderPointsBar();
        console.log('✅ All elements rendered');
    }

    // ==================== PAGES ====================

    async renderPages() {
        const wrapper = document.getElementById('game-wrapper');
        wrapper.innerHTML = '';
        this.pageDimensions = [];

        const pages = this.engine.config.pages || [];
        
        if (pages.length === 0) {
            console.warn('No pages defined in config');
            return;
        }

        const loadPromises = pages.map((page, index) => {
            return new Promise((resolve) => {
                const container = document.createElement('div');
                container.className = 'page-container';
                container.id = `page-${index}`;
                container.dataset.pageId = page.id;

                const img = document.createElement('img');
                img.className = 'page-image';
                img.src = page.image;
                img.alt = `Page ${index + 1}`;

                const layer = document.createElement('div');
                layer.className = 'page-layer';
                layer.id = `layer-${index}`;

                container.appendChild(img);
                container.appendChild(layer);
                wrapper.appendChild(container);

                img.onload = () => {
                    this.pageDimensions[index] = {
                        w: img.naturalWidth,
                        h: img.naturalHeight
                    };
                    resolve();
                };

                img.onerror = () => {
                    console.warn(`Failed to load image for page ${index}`);
                    this.pageDimensions[index] = { w: 1920, h: 1080 };
                    resolve();
                };
            });
        });

        await Promise.all(loadPromises);
    }

    // ==================== LAYOUT RENDERING ====================

    renderLayout() {
        const pages = this.engine.config.pages || [];
        
        // Clear all layers first
        pages.forEach((_, index) => {
            const layer = document.getElementById(`layer-${index}`);
            if (layer) layer.innerHTML = '';
        });

        // Render each page's layout
        pages.forEach((page, pageIndex) => {
            const layer = document.getElementById(`layer-${pageIndex}`);
            const dim = this.pageDimensions[pageIndex];
            
            if (!layer || !dim) return;

            const layout = page.layout || [];
            
            for (const element of layout) {
                if (element.type === 'group') {
                    this.renderGroup(element, layer, dim);
                } else if (element.type === 'item') {
                    // Standalone item (not in a group)
                    this.renderItem(element, null, layer, dim);
                }
            }
        });
        
        this.updateUI();
    }

    renderGroup(group, layer, dim) {
        // Render group zone (info box)
        if (group.coords) {
            const zone = document.createElement('div');
            zone.className = 'click-zone info-zone';
            zone.id = `group-${group.id}`;
            zone.dataset.groupId = group.id;

            Object.assign(zone.style, CoordHelper.toPercent(group.coords, dim));

            if (group.title || group.description) {
                zone.appendChild(this.createTextLayer(
                    group.title || '',
                    group.description || ''
                ));
            }

            layer.appendChild(zone);

            // Budget badge
            if (group.rules?.budget) {
                this.renderBudgetBadge(group, layer, dim);
            }
        }

        // Render items inside group
        const items = group.items || [];
        for (const item of items) {
            this.renderItem(item, group, layer, dim);
        }
    }

    renderItem(item, group, layer, dim) {
        if (!item.coords) return;

        const button = document.createElement('div');
        button.className = 'click-zone item-zone';
        button.id = `btn-${item.id}`;
        button.dataset.itemId = item.id;
        button.dataset.groupId = group ? group.id : '';

        Object.assign(button.style, CoordHelper.toPercent(item.coords, dim));

        // Text layer
        if (item.title || item.description) {
            button.appendChild(this.createTextLayer(
                item.title || '',
                item.description || ''
            ));
        }

        const maxQty = item.max_quantity !== undefined ? item.max_quantity : 1;
        const minQty = item.min_quantity !== undefined ? item.min_quantity : 0;

        if (maxQty > 1 || minQty < 0) {
            button.classList.add('multi-select');
            const controls = document.createElement('div');
            controls.className = 'split-controls';
            
            const minusBtn = document.createElement('div');
            minusBtn.className = 'split-btn minus';
            minusBtn.onclick = (e) => {
                e.stopPropagation(); 
                this.engine.deselect(item.id);
            };

            const plusBtn = document.createElement('div');
            plusBtn.className = 'split-btn plus';
            plusBtn.onclick = (e) => {
                e.stopPropagation();
                this.engine.select(item.id);
            };

            controls.appendChild(minusBtn);
            controls.appendChild(plusBtn);
            button.appendChild(controls);

            const badge = document.createElement('div');
            badge.className = 'qty-badge';
            badge.style.display = 'none'; 
            button.appendChild(badge);

        } else {
            button.onclick = () => {
                this.engine.toggle(item.id);
            };
        }

        this.tooltip.attach(button, item, group);

        layer.appendChild(button);
    }

    renderBudgetBadge(group, layer, dim) {
        const badge = document.createElement('div');
        badge.className = 'group-budget-badge';
        badge.id = `budget-${group.id}`;

        const style = CoordHelper.toPercent(group.coords, dim);
        const leftVal = parseFloat(style.left);
        const widthVal = parseFloat(style.width);
        const topVal = parseFloat(style.top);

        badge.style.left = (leftVal + widthVal / 2) + '%';
        badge.style.top = topVal + '%';

        layer.appendChild(badge);
        this.updateBudgetBadge(group);
    }

    createTextLayer(title, description) {
        const div = document.createElement('div');
        div.className = 'text-content';
        const cleanDesc = description ? description.replace(/\n/g, '<br>') : '';
        div.innerHTML = `
            ${title ? `<strong>${title}</strong>` : ''}
            ${cleanDesc ? `<span>${cleanDesc}</span>` : ''}
        `;
        return div;
    }

    renderPointsBar() {
        const bar = document.getElementById('points-bar');
        bar.innerHTML = '';
        const points = this.engine.config.points || [];

        points.forEach(p => {
            const div = document.createElement('div');
            div.className = 'currency';
            div.id = `curr-${p.id}`;
            div.innerHTML = `
                ${p.name}: 
                <span>${this.engine.state.currencies[p.id] || p.start}</span>
            `;
            bar.appendChild(div);
        });
    }

    // ==================== UPDATE UI ====================

    updateUI() {
        this.updateButtons();
        this.updatePointsBar();
        this.updateBudgets();
    }

 updateButtons() {
        document.querySelectorAll('.item-zone').forEach(el => {
            const itemId = el.dataset.itemId;
            
            // Быстрый поиск через Map в движке
            const item = this.engine.findItem(itemId);
            const group = this.engine.findGroupForItem(itemId);

            if (!item) return;

            // 1. Вычисляем текущее логическое состояние
            const qty = this.engine.state.selected.get(itemId) || 0;
            const isSelected = qty !== 0; // Выбрано, если не 0 (включая отрицательные)
            
            // canSelect проверяет требования (reqs/costs). 
            const canSelect = this.engine.canSelect(item, group);
            
            const maxQty = item.max_quantity !== undefined ? item.max_quantity : 1;
            const minQty = item.min_quantity !== undefined ? item.min_quantity : 0;
            
            // Для рулетки: активно ли вращение?
            const isSpinning = el.classList.contains('spinning-active');

            // 2. Формируем уникальный ключ состояния
            // Если этот ключ совпадет с прошлым - значит визуально ничего менять не надо
            const stateKey = `${isSelected}|${canSelect}|${qty}|${isSpinning}|${maxQty}|${minQty}`;
            
            // 3. ПРОВЕРКА КЭША (ОПТИМИЗАЦИЯ)
            if (this.buttonStateCache.get(itemId) === stateKey) {
                return; 
            }

            // Запоминаем новое состояние
            this.buttonStateCache.set(itemId, stateKey);

            // 4. ОБНОВЛЕНИЕ DOM
            
            // -- КЛАСС SELECTED --
            if (el.classList.contains('selected') !== isSelected) {
                el.classList.toggle('selected', isSelected);
            }

            // -- КЛАСС DISABLED (ГЛОБАЛЬНО) --
            // Карточка "выключена" визуально (серые полоски), ТОЛЬКО если
            // мы её еще не выбрали И не можем выбрать (не выполнены условия).
            // Если мы на 0, но canSelect=true, она должна быть активна.
            const isDisabled = !canSelect && !isSelected;
            if (el.classList.contains('disabled') !== isDisabled) {
                el.classList.toggle('disabled', isDisabled);
            }

            // -- ЛОГИКА МУЛЬТИ-ВЫБОРА / ОТРИЦАТЕЛЬНЫХ ЗНАЧЕНИЙ --
            if (maxQty > 1 || minQty < 0) {
                const isMaxed = qty >= maxQty;
                // Класс maxed делает карточку визуально "полной" (зеленоватый фон), 
                // но не disabled.
                if (el.classList.contains('maxed') !== isMaxed) {
                    el.classList.toggle('maxed', isMaxed);
                }
                
                const badge = el.querySelector('.qty-badge');
                if (badge) {
                    badge.textContent = qty;

                    // Стиль для отрицательных значений
                    if (qty < 0) {
                        badge.classList.add('negative');
                        badge.style.backgroundColor = '';
                        badge.style.borderColor = '';
                        badge.style.color = '';
                    } else {
                        badge.classList.remove('negative');
                    }
                    
                    // Показываем бейдж, если количество не равно 0
                    // (для мульти-выбора иногда полезно видеть и 0, но по стандарту скрываем)
                    const displayStyle = (qty !== 0) ? 'flex' : 'none';
                    if (badge.style.display !== displayStyle) {
                        badge.style.display = displayStyle;
                    }
                }
            } 

            // -- ЛОГИКА РУЛЕТКИ --
            const hasDiceEffect = item.effects && item.effects.some(e => e.type === 'roll_dice');
            if (hasDiceEffect) {
                const rolledValue = this.engine.state.rollResults.get(itemId);
                const currentBadge = el.querySelector('.roll-result-badge');

                if (isSelected && rolledValue !== undefined) {
                    if (!el.dataset.hasAnimated && !isSpinning && !currentBadge) {
                        this.playRouletteAnimation(el, rolledValue, item);
                    } else if (el.dataset.hasAnimated && !currentBadge && !isSpinning) {
                        this.showPermanentBadge(el, rolledValue, true);
                    }
                } else {
                    // Очистка при отмене выбора
                    if (currentBadge) currentBadge.remove();
                    if (isSpinning) {
                        const mask = el.querySelector('.roulette-mask');
                        if (mask) mask.remove();
                        el.classList.remove('spinning-active');
                    }
                    delete el.dataset.hasAnimated;
                }
            }
        });
    }

    playRouletteAnimation(container, targetNumber, item) {
        if (container.classList.contains('spinning-active')) return;
        container.classList.add('spinning-active');

        const mask = document.createElement('div');
        mask.className = 'roulette-mask';
        const strip = document.createElement('div');
        strip.className = 'roulette-strip';
        
        const containerHeight = container.offsetHeight;
        const itemHeight = Math.floor(containerHeight * 0.65); 
        const maskOffset = (containerHeight - itemHeight) / 2;

        const diceEffect = item.effects.find(e => e.type === 'roll_dice');
        const min = parseInt(diceEffect?.min) || 1;
        const max = parseInt(diceEffect?.max) || 20;

        const totalItems = 30 + Math.floor(Math.random() * 15);
        const numbers = [];
        for (let i = 0; i < totalItems; i++) {
            numbers.push(Math.floor(Math.random() * (max - min + 1)) + min);
        }
        
        const targetIndex = totalItems - 3;
        numbers[targetIndex] = targetNumber;

        strip.innerHTML = numbers.map(n => 
            `<div class="roulette-item" style="height:${itemHeight}px; line-height:${itemHeight}px;">${n}</div>`
        ).join('');
        
        mask.appendChild(strip);
        container.appendChild(mask);

        const spinProfiles = [
            { name: 'standard', duration: 2000, bezier: 'cubic-bezier(0.1, 0.7, 0.1, 1)', type: 'direct' },
            { name: 'slam', duration: 1500, bezier: 'cubic-bezier(0.5, 0.0, 0.1, 1)', type: 'direct' },
            { name: 'heavy', duration: 2500, bezier: 'cubic-bezier(0, 0.95, 0.2, 1)', type: 'direct' },
            { name: 'tease_top', duration: 2000, bezier: 'cubic-bezier(0.1, 1, 0.8, 1)', type: 'nudge', offsetPercent: 0.45 },
            { name: 'tease_tiny', duration: 2200, bezier: 'cubic-bezier(0.1, 1, 0.6, 1)', type: 'nudge', offsetPercent: 0.2 },
            { name: 'grind', duration: 2800, bezier: 'cubic-bezier(0.25, 1, 0.5, 1)', type: 'direct' }
        ];

        const profile = spinProfiles[Math.floor(Math.random() * spinProfiles.length)];

        const baseTargetY = -1 * (targetIndex * itemHeight) + maskOffset;
        let initialY = baseTargetY;
        
        if (profile.type === 'nudge') {
            initialY = baseTargetY + (itemHeight * profile.offsetPercent);
        }

        strip.offsetHeight;
        strip.style.transition = `transform ${profile.duration}ms ${profile.bezier}`;
        strip.style.transform = `translateY(${initialY}px)`;

        const finalize = () => {
            const winnerEl = strip.querySelectorAll('.roulette-item')[targetIndex];
            if(winnerEl) winnerEl.classList.add('winner');

            setTimeout(() => {
                mask.style.opacity = '0';
                mask.style.transition = 'opacity 0.2s';
                this.showPermanentBadge(container, targetNumber);
                
                container.dataset.hasAnimated = "true";
                container.classList.remove('spinning-active');
                setTimeout(() => mask.remove(), 200);
            }, 400);
        };

        if (profile.type === 'nudge') {
            setTimeout(() => {
                strip.style.transition = 'transform 300ms cubic-bezier(0.5, 0, 0.5, 1)'; 
                strip.style.transform = `translateY(${baseTargetY}px)`;
                setTimeout(finalize, 300);
            }, profile.duration - 50); 
        } else {
            setTimeout(finalize, profile.duration);
        }
    }

    showPermanentBadge(container, value, instant = false) {
        const old = container.querySelector('.roll-result-badge');
        if (old) old.remove();

        const badge = document.createElement('div');
        badge.className = 'roll-result-badge';
        badge.textContent = value;
        
        if (!instant) {
            badge.classList.add('spawn-anim');
            container.appendChild(badge);
            requestAnimationFrame(() => {
                badge.classList.remove('spawn-anim');
            });
        } else {
            container.appendChild(badge);
        }
    }

    updatePointsBar() {
        for (const currencyId in this.engine.state.currencies) {
            const span = document.querySelector(`#curr-${currencyId} span`);
            if (span) {
                const value = this.engine.state.currencies[currencyId];
                span.textContent = value;
                span.parentElement.classList.toggle('negative', value < 0);
            }
        }
    }

    updateBudgets() {
        for (const groupId in this.engine.state.budgets) {
            const group = this.engine.findGroup(groupId);
            if (group) {
                this.updateBudgetBadge(group);
            }
        }
    }

    updateBudgetBadge(group) {
        const badge = document.getElementById(`budget-${group.id}`);
        if (!badge) return;

        const budgetState = this.engine.state.budgets[group.id];
        if (!budgetState) {
            const budget = group.rules.budget;
            badge.textContent = `${budget.name || budget.currency}: ${budget.amount}/${budget.amount}`;
            return;
        }

        const { total, remaining } = budgetState;
        const budget = group.rules.budget;
        badge.textContent = `${budget.name || budget.currency}: ${remaining}/${total}`;
        badge.classList.toggle('empty', remaining === 0);
    }

    // ==================== LEGACY COMPATIBILITY ====================
    // These methods are called by editor.js - keeping them for now

    renderButtons() {
        this.renderLayout();
    }
}