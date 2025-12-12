/**
 * src\ui\tooltip.js
 * Tooltip Manager - Handles hover tooltips (PC) and Long-Press (Mobile)
 */

export class TooltipManager {
    constructor(engine) {
        this.engine = engine;
        this.tooltipEl = document.getElementById('tooltip');
        this.currentItem = null;
        this.currentGroup = null;
        this.timer = null;
        
        // Mobile state
        this.touchTimer = null;
        this.isTouchAction = false;
        this.longPressTriggered = false;

        // Close tooltip on global click (mobile UX)
        document.addEventListener('touchstart', (e) => {
            if (!e.target.closest('#tooltip') && !e.target.closest('.item-zone')) {
                this.hide();
            }
        });

        console.log('💬 Tooltip manager initialized');
    }

    // ==================== ATTACH ====================

 attach(element, item, group) {
        // --- 1. ПРЕДОТВРАЩЕНИЕ КОНТЕКСТНОГО МЕНЮ (Android/iOS) ---
        // Это блокирует всплывающее окно "Сохранить изображение / Поделиться"
        element.addEventListener('contextmenu', (e) => {
            if (this.isTouchAction) {
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
        });

        // --- 2. PC MOUSE LOGIC ---
        element.addEventListener('mouseenter', (e) => {
            if (this.isTouchAction) return; 
            this.currentItem = item;
            this.currentGroup = group;
            this.updateContent(item, group);
            this.updatePosition(e);

            this.timer = setTimeout(() => {
                if (!document.body.classList.contains('text-mode')) {
                    this.show();
                }
            }, 300);
        });

        element.addEventListener('mousemove', (e) => {
            if (this.isTouchAction) return;
            this.updatePosition(e);
        });

        element.addEventListener('mouseleave', () => {
            if (this.isTouchAction) return;
            this.hide();
            clearTimeout(this.timer);
        });

        // --- 3. MOBILE TOUCH LOGIC (Long Press) ---
        element.addEventListener('touchstart', (e) => {
            this.isTouchAction = true;
            this.longPressTriggered = false;
            
            // Если тултип уже открыт и мы тыкаем в другое место - он закроется глобальным листенером.
            // Но если мы тыкаем в карточку - запускаем таймер.
            this.touchTimer = setTimeout(() => {
                this.longPressTriggered = true;
                this.currentItem = item;
                this.currentGroup = group;
                this.updateContent(item, group);
                this.show();
                
                // Вибрация, если поддерживается
                if (navigator.vibrate) navigator.vibrate(50);
            }, 500); // 500мс достаточно
        }, { passive: true }); // passive: true улучшает скролл, но мы не делаем preventDefault тут

        element.addEventListener('touchend', (e) => {
            clearTimeout(this.touchTimer);
            
            // Если сработал лонг-пресс (появился тултип)
            if (this.longPressTriggered) {
                // Блокируем клик (выбор карточки), потому что пользователь просто хотел почитать
                if (e.cancelable) e.preventDefault();
                e.stopPropagation();
            }
            
            // Сбрасываем флаг тача с задержкой, чтобы клик (если он разрешен) успел пройти
            setTimeout(() => { this.isTouchAction = false; }, 100);
        });

        element.addEventListener('touchmove', () => {
            // Если палец сдвинулся (скролл), отменяем таймер лонг-пресса
            clearTimeout(this.touchTimer);
        });
        
        // Дополнительная защита от клика при лонг-прессе
        element.addEventListener('click', (e) => {
            if (this.longPressTriggered) {
                e.stopImmediatePropagation();
                e.preventDefault();
                this.longPressTriggered = false;
            }
        }, true);
    }

    // ==================== SHOW/HIDE ====================

    show() {
        this.tooltipEl.classList.add('visible');
    }

    hide() {
        this.tooltipEl.classList.remove('visible');
    }

    // ==================== CONTENT ====================

    updateContent(item, group) {
        const isDebug = document.body.classList.contains('debug-mode') || document.body.classList.contains('edit-mode-active');
        let html = `<h4>${item.title || item.id}</h4>`;

        // 1. Tags
        if (item.tags && item.tags.length > 0) {
            html += this.renderTags(item);
        }

        // 2. Effects
        if (item.effects && item.effects.length > 0) {
            html += this.renderEffects(item);
        }

        // 3. Cost
        if (item.cost && item.cost.length > 0) {
            html += this.renderCost(item, group);
        }

        // 4. Requirements
        html += this.renderRequirements(item, group);

        // 5. Description
        if (!document.body.classList.contains('text-mode') && item.description) {
            html += `<div class="desc">${item.description}</div>`;
        }

        // 6. Debug info
        if (isDebug) {
            html += `<div class="debug-info">
                ID: ${item.id}<br>
                Group: ${group ? group.id : '(standalone)'}
            </div>`;
        }

        this.tooltipEl.innerHTML = html;
    }

    // ==================== RENDERERS ====================

    renderTags(item) {
        const tagsHtml = item.tags.map(t => 
            `<span style="background:#333; color:#aaa; padding:2px 6px; border-radius:4px; font-size:0.75em; margin-right:4px; border:1px solid #444;">${t}</span>`
        ).join('');
        return `<div style="margin-bottom:8px;">${tagsHtml}</div>`;
    }

    renderEffects(item) {
        let html = '<div style="margin-bottom:8px; border-top:1px solid #444; padding-top:4px;">';
        item.effects.forEach(eff => {
            let text = '';
            let icon = '⚡';
            switch (eff.type) {
                case 'modify_group_limit':
                    const group = this.engine.findGroup(eff.group_id);
                    const gName = group ? (group.title || eff.group_id) : eff.group_id;
                    const val = eff.value > 0 ? `+${eff.value}` : eff.value;
                    text = `Limit: <b>${val}</b> in <i>${gName}</i>`;
                    break;
                case 'modify_cost':
                    text = eff.mode === 'multiply' ? `<b>-${Math.round((1-eff.value)*100)}% Cost</b>` : `<b>${eff.value} Cost</b>`;
                    icon = '🏷️';
                    break;
                case 'force_selection':
                    text = `Adds: <b>${eff.target_id}</b>`;
                    icon = '🎁';
                    break;
                case 'set_value':
                    text = `Set <b>${eff.currency}</b> = ${eff.value}`;
                    break;
                case 'roll_dice':
                    text = `Rolls <b>${eff.min}-${eff.max}</b> ${eff.currency}`;
                    icon = '🎲';
                    break;
                default: text = eff.type;
            }
            html += `<div style="color:#4db8ff; font-size:0.9em; margin-bottom:2px;">${icon} ${text}</div>`;
        });
        html += '</div>';
        return html;
    }

    renderCost(item, group) {
        let html = '';
        item.cost.forEach(c => {
            const { value, modifiers } = this.engine.rules.getCostBreakdown(c, item, group);
            const sign = value > 0 ? '+' : '';
            let colorClass = value < 0 ? 'bad' : (value > 0 ? 'good' : 'free');
            let modHtml = modifiers.length > 0 ? `<span class="mod-applied">(${modifiers.join(' ')})</span>` : '';
            html += `<div class="cost ${colorClass}">${c.currency}: ${sign}${value} ${modHtml}</div>`;
        });
        return html;
    }

    renderRequirements(item, group) {
        let reqsHtml = '';
        if (item.incompatible) {
            item.incompatible.forEach(badId => {
                if (this.engine.state.selected.has(badId)) {
                    reqsHtml += `<span class="req-item fail">❌ Incomp: ${badId}</span>`;
                }
            });
        }
        const isSelected = this.engine.state.selected.has(item.id);
        if (!isSelected && group && group.rules?.max_choices) {
            const currentCount = this.engine.getSelectedInGroup(group).length;
            if (currentCount >= group.rules.max_choices) {
                reqsHtml += `<span class="req-item fail">⛔ Limit Reached</span>`;
            }
        }
        if (item.requirements) {
            item.requirements.forEach(req => {
                let isMet = false;
                if (req.includes('(') || req.includes('||') || req.includes('&&')) {
                    isMet = this.engine.rules.evaluateRequirement(req, null);
                } else {
                    const isNot = req.startsWith('!');
                    const cleanId = isNot ? req.slice(1) : req;
                    const targetSelected = this.engine.state.selected.has(cleanId);
                    isMet = isNot ? !targetSelected : targetSelected;
                }
                const cleanReq = req.replace(/count\.tag\(['"](.+?)['"]\)/, 'Tag:$1').replace(/\|\|/, ' OR ');
                reqsHtml += isMet ? `<span class="req-item ok">✔ ${cleanReq}</span>` : `<span class="req-item missing">⚠️ ${cleanReq}</span>`;
            });
        }
        return reqsHtml ? `<div class="reqs">${reqsHtml}</div>` : '';
    }

    updatePosition(e) {
        // Mobile position is handled by CSS (fixed bottom)
        if (window.innerWidth <= 768) return;

        const tt = this.tooltipEl;
        const ttH = tt.offsetHeight;
        const ttW = tt.offsetWidth;
        let top = e.clientY + 20;
        let left = e.clientX + 20;

        if (left + ttW > window.innerWidth) left = window.innerWidth - ttW - 20;
        if (top + ttH > window.innerHeight) top = e.clientY - ttH - 10;

        tt.style.top = top + 'px';
        tt.style.left = left + 'px';
    }
}