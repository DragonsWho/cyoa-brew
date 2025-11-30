/**
 * Tooltip Manager - Handles hover tooltips
 */

export class TooltipManager {
    constructor(engine) {
        this.engine = engine;
        this.tooltipEl = document.getElementById('tooltip');
        this.currentItem = null;
        this.currentGroup = null;
        this.timer = null;

        console.log('💬 Tooltip manager initialized');
    }

    // ==================== ATTACH ====================

    attach(element, item, group) {
        element.addEventListener('mouseenter', (e) => {
            this.currentItem = item;
            this.currentGroup = group;
            this.updateContent(item, group);
            this.updatePosition(e);

            // Delay show
            this.timer = setTimeout(() => {
                // Don't show if text mode is active
                if (!document.body.classList.contains('text-mode')) {
                    this.show();
                }
            }, 500);
        });

        element.addEventListener('mousemove', (e) => {
            this.updatePosition(e);
        });

        element.addEventListener('mouseleave', () => {
            this.hide();
            this.currentItem = null;
            this.currentGroup = null;
            clearTimeout(this.timer);
        });
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
        const isDebug = document.body.classList.contains('debug-mode');
        let html = `<h4>${item.title}</h4>`;

        // Cost
        if (item.cost && item.cost.length > 0) {
            html += this.renderCost(item, group);
        }

        // Requirements
        html += this.renderRequirements(item, group);

        // Description (only if not in text mode)
        if (!document.body.classList.contains('text-mode') && item.description) {
            html += `<div class="desc">${item.description}</div>`;
        }

        // Debug info
        if (isDebug) {
            html += `<div class="debug-info">ID: ${item.id}<br>Group: ${group.id}</div>`;
        }

        this.tooltipEl.innerHTML = html;
    }

    // ==================== COST ====================

    renderCost(item, group) {
        let html = '';

        item.cost.forEach(c => {
            const finalVal = this.engine.rules.evaluateCost(c, item, group);
            const sign = finalVal > 0 ? '+' : '';
            
            let colorClass = finalVal < 0 ? 'bad' : '';
            if (finalVal === 0) colorClass = 'free';

            html += `<div class="cost ${colorClass}">${c.currency}: ${sign}${finalVal}</div>`;
        });

        return html;
    }

    // ==================== REQUIREMENTS ====================

    renderRequirements(item, group) {
        let reqsHtml = '';

        // Incompatible
        if (item.incompatible) {
            item.incompatible.forEach(badId => {
                if (this.engine.state.selected.has(badId)) {
                    const badItem = this.engine.findItem(badId);
                    reqsHtml += `<span class="req-item fail">❌ Incompatible with: ${badItem?.title || badId}</span>`;
                }
            });
        }

        // Max choices
        const isSelected = this.engine.state.selected.has(item.id);
        if (!isSelected && group.rules?.max_choices) {
            const currentCount = this.engine.getSelectedInGroup(group).length;
            if (currentCount >= group.rules.max_choices) {
                reqsHtml += `<span class="req-item fail">⛔ Max limit reached (${group.rules.max_choices})</span>`;
            }
        }

        // Requirements
        if (item.requirements) {
            item.requirements.forEach(req => {
                reqsHtml += this.renderRequirement(req);
            });
        }

        if (reqsHtml) {
            return `<div class="reqs">${reqsHtml}</div>`;
        }

        return '';
    }

    renderRequirement(req) {
        let isMet = false;
        let displayText = req;

        // Complex formula
        if (req.includes('(') || req.includes('||') || req.includes('&&')) {
            isMet = this.engine.rules.evaluateRequirement(req, null);
            
            // Make it readable
            displayText = displayText.replace(/has\(['"](.+?)['"]\)/g, (match, id) => {
                const item = this.engine.findItem(id);
                return item?.title || id;
            });
            displayText = displayText
                .replace(/\|\|/g, " <b style='color:#fff'>OR</b> ")
                .replace(/&&/g, " <b style='color:#fff'>AND</b> ");
        } else {
            // Simple requirement
            const isNot = req.startsWith('!');
            const cleanId = isNot ? req.slice(1) : req;
            isMet = this.engine.rules.evaluateRequirement(req, null);
            
            const targetItem = this.engine.findItem(cleanId);
            displayText = (isNot ? "NOT " : "") + (targetItem?.title || cleanId);
        }

        if (!isMet) {
            return `<span class="req-item missing">⚠️ Requires: ${displayText}</span>`;
        } else {
            return `<span class="req-item ok">✔ ${displayText}</span>`;
        }
    }

    // ==================== POSITION ====================

    updatePosition(e) {
        const tt = this.tooltipEl;
        const ttH = tt.offsetHeight;
        const ttW = tt.offsetWidth;

        let top = e.clientY + 20;
        let left = e.clientX + 20;

        // Keep in viewport
        if (left + ttW > window.innerWidth) {
            left = window.innerWidth - ttW - 20;
        }

        if (top + ttH > window.innerHeight) {
            top = e.clientY - ttH - 10;
        }

        tt.style.top = top + 'px';
        tt.style.left = left + 'px';
    }
}