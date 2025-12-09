/**
 * src\ui\renderer.js
 * UI Renderer - Handles all visual rendering
 * UPDATED: Added Help Button to points bar
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

    // Force refresh helper
    clearStateCache() {
        this.buttonStateCache.clear();
    }

    async renderAll() {
        await this.renderPages();
        this.renderLayout();
        this.renderPointsBar();
        this.applyGlobalStyles(); 
        console.log('✅ All elements rendered');
    }

    // ... [KEEP ALL STYLES AND PAGE RENDERING METHODS AS IS] ...
    // ... [applyGlobalStyles, applyCustomCss, forceImportant, renderPages, renderLayout] ...
    // ... [syncGroupDOM, syncItemDOM, setupItemEvents, syncBudgetBadges, createTextLayer] ...
    // ... [getTinyReqString, getCostString] ...

    applyGlobalStyles() {
        const style = this.engine.config.style;
        if (!style) return;

        const root = document.documentElement;
        
        // --- ACTIVE STYLE ---
        root.style.setProperty('--sel-border-c', style.borderColor || '#00ff00');
        root.style.setProperty('--sel-border-w', `${style.borderWidth !== undefined ? style.borderWidth : 3}px`);
        root.style.setProperty('--sel-radius-tl', `${style.radiusTL !== undefined ? style.radiusTL : 12}px`);
        root.style.setProperty('--sel-radius-tr', `${style.radiusTR !== undefined ? style.radiusTR : 12}px`);
        root.style.setProperty('--sel-radius-br', `${style.radiusBR !== undefined ? style.radiusBR : 12}px`);
        root.style.setProperty('--sel-radius-bl', `${style.radiusBL !== undefined ? style.radiusBL : 12}px`);
        
        root.style.setProperty('--sel-shadow-c', style.shadowColor || '#00ff00');
        root.style.setProperty('--sel-shadow-w', `${style.shadowWidth !== undefined ? style.shadowWidth : 15}px`);
        
        root.style.setProperty('--sel-inset-c', style.insetShadowColor || 'rgba(0, 255, 0, 0.2)');
        root.style.setProperty('--sel-inset-w', `${style.insetShadowWidth !== undefined ? style.insetShadowWidth : 20}px`);
        
        root.style.setProperty('--sel-bg-color', style.bodyColor || '#00ff00');
        root.style.setProperty('--sel-bg-opacity', style.bodyOpacity !== undefined ? style.bodyOpacity : 0.1);
        
        if (style.bodyImage) {
            root.style.setProperty('--sel-bg-image', `url("${style.bodyImage}")`);
        } else {
            root.style.setProperty('--sel-bg-image', 'none');
        }

        // --- VISUAL CARD STYLE ---
        root.style.setProperty('--vis-bg-color', style.visualBgColor || '#222222');
        root.style.setProperty('--vis-title-color', style.visualTitleColor || '#ffffff');
        root.style.setProperty('--vis-text-color', style.visualTextColor || '#cccccc');
        root.style.setProperty('--vis-border-color', style.visualBorderColor || '#444444');
        root.style.setProperty('--vis-border-w', `${style.visualBorderWidth !== undefined ? style.visualBorderWidth : 1}px`);
        root.style.setProperty('--vis-radius', `${style.visualRadius !== undefined ? style.visualRadius : 8}px`);

        // --- DISABLED STYLE ---
        root.style.setProperty('--dis-border-c', style.disabledBorderColor || '#333333');
        root.style.setProperty('--dis-border-w', `${style.disabledBorderWidth !== undefined ? style.disabledBorderWidth : 0}px`);
        root.style.setProperty('--dis-radius-tl', `${style.disabledRadiusTL !== undefined ? style.disabledRadiusTL : 12}px`);
        root.style.setProperty('--dis-radius-tr', `${style.disabledRadiusTR !== undefined ? style.disabledRadiusTR : 12}px`);
        root.style.setProperty('--dis-radius-br', `${style.disabledRadiusBR !== undefined ? style.disabledRadiusBR : 12}px`);
        root.style.setProperty('--dis-radius-bl', `${style.disabledRadiusBL !== undefined ? style.disabledRadiusBL : 12}px`);
        root.style.setProperty('--dis-shadow-c', style.disabledShadowColor || '#000000');
        root.style.setProperty('--dis-shadow-w', `${style.disabledShadowWidth !== undefined ? style.disabledShadowWidth : 0}px`);
        root.style.setProperty('--dis-bg-color', style.disabledBodyColor || '#000000');
        root.style.setProperty('--dis-bg-opacity', style.disabledBodyOpacity !== undefined ? style.disabledBodyOpacity : 0.5);

        if (style.disabledBodyImage) {
            root.style.setProperty('--dis-bg-image', `url("${style.disabledBodyImage}")`);
        } else {
            root.style.setProperty('--dis-bg-image', 'none');
        }

        this.applyCustomCss(style.customCss, style.disabledCustomCss);
    }

    applyCustomCss(activeCss, disabledCss) {
        let styleTag = document.getElementById('custom-card-style');
        if (!styleTag) {
            styleTag = document.createElement('style');
            styleTag.id = 'custom-card-style';
            document.head.appendChild(styleTag);
        }
        
        let content = '';
        if (activeCss) {
            content += `#game-wrapper .click-zone.selected { ${this.forceImportant(activeCss)} } `;
        }
        if (disabledCss) {
            content += `#game-wrapper .click-zone.disabled { ${this.forceImportant(disabledCss)} } `;
        }
        
        styleTag.textContent = content;
    }

    forceImportant(cssText) {
        if (!cssText) return '';
        return cssText.split(';')
            .map(rule => {
                if (!rule.trim()) return '';
                if (rule.toLowerCase().includes('!important')) return rule;
                return rule + ' !important';
            })
            .join(';');
    }

    async renderPages() {
        const wrapper = document.getElementById('game-wrapper');
        wrapper.innerHTML = '';
        this.pageDimensions = [];

        const pages = this.engine.config.pages || [];
        
        if (pages.length === 0) {
            return;
        }

        const loadPromises = pages.map((page, index) => {
            return new Promise((resolve) => {
                const container = document.createElement('div');
                container.className = 'page-container';
                container.id = `page-${index}`;
                container.dataset.pageId = page.id;

                const separator = document.createElement('div');
                separator.className = 'page-separator';
                separator.textContent = `Page ${index + 1}`;
                container.appendChild(separator);

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
                    this.pageDimensions[index] = { w: 1920, h: 1080 };
                    resolve();
                };
            });
        });

        await Promise.all(loadPromises);
    }

    renderLayout() {
        const pages = this.engine.config.pages || [];
        
        pages.forEach((page, pageIndex) => {
            const layer = document.getElementById(`layer-${pageIndex}`);
            const dim = this.pageDimensions[pageIndex];
            if (!layer || !dim) return;

            const existingElements = Array.from(layer.children);
            const activeIds = new Set();
            const layout = page.layout || [];
            
            for (const element of layout) {
                if (element.type === 'group') {
                    this.syncGroupDOM(element, layer, dim, activeIds);
                    const items = element.items || [];
                    for (const item of items) {
                        this.syncItemDOM(item, element, layer, dim, activeIds);
                    }
                } else if (element.type === 'item') {
                    this.syncItemDOM(element, null, layer, dim, activeIds);
                }
            }
            
            existingElements.forEach(el => {
                if (el.classList.contains('group-budget-badge')) return; 
                if (el.id && !activeIds.has(el.id)) {
                    el.remove();
                }
            });

            this.syncBudgetBadges(page, layer, dim);
        });
        
        this.updateUI();
    }

    syncGroupDOM(group, layer, dim, activeIds) {
        if (!group.coords) return;
        const domId = `group-${group.id}`;
        activeIds.add(domId);
        let zone = document.getElementById(domId);
        let isNew = false;
        if (!zone) {
            isNew = true;
            zone = document.createElement('div');
            zone.className = 'click-zone info-zone';
            zone.id = domId;
            zone.dataset.groupId = group.id;
            layer.appendChild(zone);
        }
        Object.assign(zone.style, CoordHelper.toPercent(group.coords, dim));
        const newTitle = group.title || '';
        const newDesc = group.description || '';
        const combinedContent = `${newTitle}|${newDesc}`;
        if (isNew || zone.dataset.contentHash !== combinedContent) {
            zone.innerHTML = ''; 
            if (newTitle || newDesc) {
                zone.appendChild(this.createTextLayer(newTitle, newDesc));
            }
            zone.dataset.contentHash = combinedContent;
        }
    }

    syncItemDOM(item, group, layer, dim, activeIds) {
        if (!item.coords) return;
        const domId = `btn-${item.id}`;
        activeIds.add(domId);
        let button = document.getElementById(domId);
        let isNew = false;
        
        // Create element if not exists
        if (!button) {
            isNew = true;
            button = document.createElement('div');
            button.className = 'click-zone item-zone';
            button.id = domId;
            layer.appendChild(button);
            this.setupItemEvents(button, item, group);
        }
        
        // Update basic attributes
        button.dataset.itemId = item.id;
        button.dataset.groupId = group ? group.id : '';
        Object.assign(button.style, CoordHelper.toPercent(item.coords, dim));

        // Handle Visual Card CSS Class
        if (item.isVisualCard) {
            if (!button.classList.contains('visual-card')) button.classList.add('visual-card');
        } else {
            if (button.classList.contains('visual-card')) button.classList.remove('visual-card');
        }

        // Handle Static Info CSS Class
        const isStatic = (item.selectable === false);
        if (button.classList.contains('static-info') !== isStatic) {
            button.classList.toggle('static-info', isStatic);
        }

        // Content Hashing to prevent unnecessary re-renders of inner HTML
        const newTitle = item.title || '';
        const newDesc = item.description || '';
        const isMulti = (item.max_quantity !== undefined && item.max_quantity > 1) || (item.min_quantity !== undefined && item.min_quantity < 0);
        const cardImage = item.cardImage || '';
        const costStr = this.getCostString(item);
        
        const contentHash = `${newTitle}|${newDesc}|${isMulti}|${item.isVisualCard}|${cardImage.length}|${costStr}`;

        if (isNew || button.dataset.contentHash !== contentHash) {
            button.innerHTML = '';
            
            // --- RENDER VISUAL CARD ---
            if (item.isVisualCard) {
                // RENDER SPECIAL CARD STRUCTURE
                
                // 1. Image (Changed to <img> tag for correct cropping proportions)
                if (item.cardImage) {
                    const img = document.createElement('img');
                    img.className = 'vc-image';
                    img.src = item.cardImage;
                    button.appendChild(img);
                } else {
                    // Placeholder if no image but visual card
                    const imgDiv = document.createElement('div');
                    imgDiv.className = 'vc-image'; 
                    button.appendChild(imgDiv);
                }
                
                // 2. Content Container
                const contentDiv = document.createElement('div');
                contentDiv.className = 'vc-content';
                
                // 3. Title (Centered via CSS)
                if (newTitle) {
                    const titleDiv = document.createElement('div');
                    titleDiv.className = 'vc-title';
                    titleDiv.textContent = newTitle;
                    contentDiv.appendChild(titleDiv);
                }

                // 4. Cost Line (Separate line under title, small font, centered)
                if (costStr) {
                    const costDiv = document.createElement('div');
                    costDiv.className = 'vc-cost';
                    costDiv.innerHTML = costStr; 
                    contentDiv.appendChild(costDiv);
                }

                // 5. Requirements (Tiny line)
                const reqString = this.getTinyReqString(item);
                if (reqString) {
                    const reqDiv = document.createElement('div');
                    reqDiv.className = 'vc-req';
                    reqDiv.textContent = reqString;
                    contentDiv.appendChild(reqDiv);
                }

                // 6. Body
                if (newDesc) {
                    const bodyDiv = document.createElement('div');
                    bodyDiv.className = 'vc-body';
                    bodyDiv.innerHTML = newDesc.replace(/\n/g, '<br>');
                    contentDiv.appendChild(bodyDiv);
                }
                
                button.appendChild(contentDiv);

            }
            // --- RENDER STANDARD CARD ---
            else {
                if (newTitle || newDesc) {
                    button.appendChild(this.createTextLayer(newTitle, newDesc));
                }
            }

            // Multi-select controls
            if (!isStatic && isMulti) {
                button.classList.add('multi-select');
                const controls = document.createElement('div');
                controls.className = 'split-controls';
                
                const minusBtn = document.createElement('div');
                minusBtn.className = 'split-btn minus';
                minusBtn.onclick = (e) => { e.stopPropagation(); this.engine.deselect(item.id); };
                
                const plusBtn = document.createElement('div');
                plusBtn.className = 'split-btn plus';
                plusBtn.onclick = (e) => { e.stopPropagation(); this.engine.select(item.id); };
                
                controls.appendChild(minusBtn);
                controls.appendChild(plusBtn);
                button.appendChild(controls);
                
                const badge = document.createElement('div');
                badge.className = 'qty-badge';
                badge.style.display = 'none'; 
                button.appendChild(badge);
            } else {
                button.classList.remove('multi-select');
            }
            
            button.dataset.contentHash = contentHash;
        }
        
        if (isNew) {
            this.tooltip.attach(button, item, group);
        }
    }

    setupItemEvents(button, item, group) {
        button.onclick = (e) => {
             const currentItem = this.engine.findItem(button.dataset.itemId);
             const isMulti = (currentItem.max_quantity !== undefined && currentItem.max_quantity > 1);
             if (!isMulti && currentItem.selectable !== false) {
                 this.engine.toggle(currentItem.id);
             }
        };
    }

    syncBudgetBadges(page, layer, dim) {
        const layout = page.layout || [];
        const activeBadges = new Set();
        layout.forEach(element => {
            if (element.type === 'group' && element.rules?.budget) {
                const badgeId = `budget-${element.id}`;
                activeBadges.add(badgeId);
                let badge = document.getElementById(badgeId);
                if (!badge) {
                    badge = document.createElement('div');
                    badge.className = 'group-budget-badge';
                    badge.id = badgeId;
                    layer.appendChild(badge);
                }
                const style = CoordHelper.toPercent(element.coords, dim);
                const leftVal = parseFloat(style.left);
                const widthVal = parseFloat(style.width);
                const topVal = parseFloat(style.top);
                badge.style.left = (leftVal + widthVal / 2) + '%';
                badge.style.top = topVal + '%';
                this.updateBudgetBadge(element);
            }
        });
        Array.from(layer.getElementsByClassName('group-budget-badge')).forEach(el => {
            if (!activeBadges.has(el.id)) el.remove();
        });
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

    getTinyReqString(item) {
        let parts = [];
        if (item.requirements) {
            item.requirements.forEach(r => {
                if(!r.includes('(')) parts.push(`Req: ${r}`);
            });
        }
        return parts.join(' • ');
    }

    getCostString(item) {
        if (!item.cost || item.cost.length === 0) return '';
        let parts = [];
        item.cost.forEach(c => {
            const val = c.value !== undefined ? c.value : (c.base || 0);
            const valStr = val > 0 ? `+${val}` : val;
            parts.push(`${valStr} ${c.currency}`);
        });
        return parts.join(' • ');
    }

    renderPointsBar() {
        const bar = document.getElementById('points-bar');
        bar.innerHTML = '';
        
        // 1. Render Currencies
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

        // 2. Render HELP Button (NEW)
        // Check if button exists to prevent duplicates if logic changes, 
        // though innerHTML='' clears it anyway.
        const helpBtn = document.createElement('button');
        helpBtn.className = 'help-bar-btn';
        helpBtn.innerHTML = '!';
        helpBtn.title = 'Help & Info';
        helpBtn.onclick = () => {
            if (window.CYOA && window.CYOA.helpManager) {
                window.CYOA.helpManager.open();
            } else {
                alert("Help module not loaded yet.");
            }
        };
        
        // Right-aligning it in the flex container via CSS margin-left auto if needed,
        // or just append it at the end.
        bar.appendChild(helpBtn);
    }

    updateUI() {
        this.updateButtons();
        this.updatePointsBar();
        this.updateBudgets();
    }

    updateButtons() {
        document.querySelectorAll('.item-zone').forEach(el => {
            const itemId = el.dataset.itemId;
            const item = this.engine.findItem(itemId);
            if (!item) return;
            if (item.selectable === false) return;

            const qty = this.engine.state.selected.get(itemId) || 0;
            const isSelected = qty !== 0; 
            const canSelect = this.engine.canSelect(item, this.engine.findGroupForItem(itemId));
            const maxQty = item.max_quantity !== undefined ? item.max_quantity : 1;
            const minQty = item.min_quantity !== undefined ? item.min_quantity : 0;
            const isSpinning = el.classList.contains('spinning-active');

            const stateKey = `${isSelected}|${canSelect}|${qty}|${isSpinning}|${maxQty}|${minQty}`;
            
            if (this.buttonStateCache.get(itemId) === stateKey) {
                return; 
            }
            this.buttonStateCache.set(itemId, stateKey);

            if (el.classList.contains('selected') !== isSelected) {
                el.classList.toggle('selected', isSelected);
            }

            const isDisabled = !canSelect && !isSelected;
            if (el.classList.contains('disabled') !== isDisabled) {
                el.classList.toggle('disabled', isDisabled);
            }
           // === FIX START: ВОССТАНОВЛЕНИЕ ЗАПУСКА РУЛЕТКИ ===
            // Если предмет выбран, имеет эффект кубика, и мы еще не крутили рулетку:
            if (isSelected && item.effects) {
                const diceEffect = item.effects.find(e => e.type === 'roll_dice');
                // Проверяем, есть ли сохраненный результат броска
                const rolledValue = this.engine.state.rollResults.get(itemId);
                
                // Если результат есть, но анимация еще не играла (нет флага на DOM элементе)
                if (diceEffect && rolledValue !== undefined && el.dataset.hasAnimated !== "true") {
                    // Запускаем анимацию
                    this.playRouletteAnimation(el, rolledValue, item);
                } 
                // Если анимация уже была, убедимся, что бейдж (кружок с цифрой) на месте
                else if (diceEffect && rolledValue !== undefined) {
                    this.showPermanentBadge(el, rolledValue, true); // true = без анимации появления
                }
            }
            // Если предмет отменили (сняли выбор), сбрасываем флаг анимации и удаляем бейдж
            if (!isSelected) {
                delete el.dataset.hasAnimated;
                const oldBadge = el.querySelector('.roll-result-badge');
                if (oldBadge) oldBadge.remove();
            }
            if (maxQty > 1 || minQty < 0) {
                const isMaxed = qty >= maxQty;
                if (el.classList.contains('maxed') !== isMaxed) {
                    el.classList.toggle('maxed', isMaxed);
                }
                const badge = el.querySelector('.qty-badge');
                if (badge) {
                    badge.textContent = qty;
                    if (qty < 0) badge.classList.add('negative');
                    else badge.classList.remove('negative');
                    const displayStyle = (qty !== 0) ? 'flex' : 'none';
                    if (badge.style.display !== displayStyle) badge.style.display = displayStyle;
                }
            } 
        });
    }

 playRouletteAnimation(container, targetNumber, item) {
        if (container.classList.contains('spinning-active')) return;
        
        container.classList.add('spinning-active');
        
        // 1. Создаем DOM структуру
        const mask = document.createElement('div');
        mask.className = 'roulette-mask';
        
        const strip = document.createElement('div');
        strip.className = 'roulette-strip';
        
        // 2. Вычисляем размеры
        const containerHeight = container.offsetHeight;
        // Цифра занимает 65% высоты карты
        const itemHeight = Math.floor(containerHeight * 0.65); 
        // Центрируем
        const maskOffset = (containerHeight - itemHeight) / 2; 
        
        // 3. Генерируем случайные числа
        const diceEffect = item.effects.find(e => e.type === 'roll_dice');
        const min = parseInt(diceEffect?.min) || 1;
        const max = parseInt(diceEffect?.max) || 20;
        
        const totalItems = 30 + Math.floor(Math.random() * 15); // Длина ленты
        const numbers = [];
        for(let i=0; i<totalItems; i++) {
            numbers.push(Math.floor(Math.random() * (max - min + 1)) + min);
        }
        
        // Подменяем одно из последних чисел на РЕАЛЬНЫЙ результат
        const targetIndex = totalItems - 3;
        numbers[targetIndex] = targetNumber;
        
        // Вставляем HTML
        strip.innerHTML = numbers.map(n => 
            `<div class="roulette-item" style="height:${itemHeight}px; line-height:${itemHeight}px;">${n}</div>`
        ).join('');
        
        mask.appendChild(strip);
        container.appendChild(mask);
        
        // 4. Запускаем CSS transition
        // Принудительный reflow, чтобы браузер понял начальную позицию
        strip.offsetHeight; 
        
        const duration = 2000;
        // Смещаем ленту так, чтобы нужное число оказалось по центру
        const targetY = -1 * (targetIndex * itemHeight) + maskOffset;
        
        strip.style.transition = `transform ${duration}ms cubic-bezier(0.1, 0.7, 0.1, 1)`;
        strip.style.transform = `translateY(${targetY}px)`;
        
        // 5. Завершение
        setTimeout(() => {
            const winnerEl = strip.querySelectorAll('.roulette-item')[targetIndex];
            if (winnerEl) winnerEl.classList.add('winner');
            
            setTimeout(() => {
                mask.style.opacity = '0'; // Исчезаем маску
                mask.style.transition = 'opacity 0.5s';
                
                // Показываем финальный бейдж
                this.showPermanentBadge(container, targetNumber);
                
                container.dataset.hasAnimated = "true";
                container.classList.remove('spinning-active');
                
                setTimeout(() => mask.remove(), 500); // Удаляем из DOM
            }, 600); // Пауза, чтобы увидеть золотую цифру
        }, duration);
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
    }    showPermanentBadge(container,value,instant=false){const old=container.querySelector('.roll-result-badge');if(old)old.remove();const badge=document.createElement('div');badge.className='roll-result-badge';badge.textContent=value;if(!instant){badge.classList.add('spawn-anim');container.appendChild(badge);requestAnimationFrame(()=>{badge.classList.remove('spawn-anim');});}else{container.appendChild(badge);}}
    updatePointsBar(){for(const currencyId in this.engine.state.currencies){const span=document.querySelector(`#curr-${currencyId} span`);if(span){const value=this.engine.state.currencies[currencyId];span.textContent=value;span.parentElement.classList.toggle('negative',value<0);}}}
    updateBudgets(){for(const groupId in this.engine.state.budgets){const group=this.engine.findGroup(groupId);if(group){this.updateBudgetBadge(group);}}}
    updateBudgetBadge(group){const badge=document.getElementById(`budget-${group.id}`);if(!badge)return;const budgetState=this.engine.state.budgets[group.id];if(!budgetState){const budget=group.rules.budget;badge.textContent=`${budget.name||budget.currency}: ${budget.amount}/${budget.amount}`;return;}const {total,remaining}=budgetState;const budget=group.rules.budget;badge.textContent=`${budget.name||budget.currency}: ${remaining}/${total}`;badge.classList.toggle('empty',remaining===0);}
}