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
                if (!document.body.classList.contains('text-mode')) {
                    this.show();
                }
            }, 300);
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
                Group: ${group ? group.id : '(standalone)'}<br>
                Coords: [${item.coords?.x}, ${item.coords?.y}, ${item.coords?.w}, ${item.coords?.h}]
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
                    // Changed: use findGroup() instead of config.groups.find()
                    const group = this.engine.findGroup(eff.group_id);
                    const gName = group ? (group.title || eff.group_id) : eff.group_id;
                    const val = eff.value > 0 ? `+${eff.value}` : eff.value;
                    text = `Allows <b>${val}</b> more choices in <i>${gName}</i>`;
                    break;

                case 'modify_cost':
                    const target = eff.tag ? `[${eff.tag}]` : (eff.group_id ? `Group` : 'items');
                    if (eff.mode === 'multiply') {
                        const percent = Math.round((1 - eff.value) * 100);
                        text = `<b>${percent}% Discount</b> on ${target} items`;
                    } else {
                        const sign = eff.value > 0 ? 'Discount' : 'Markup';
                        text = `<b>${Math.abs(eff.value)} point ${sign}</b> on ${target} items`;
                    }
                    icon = '🏷️';
                    break;

                case 'force_selection':
                    const forcedItem = this.engine.findItem(eff.target_id);
                    const name = forcedItem ? forcedItem.title : eff.target_id;
                    text = `Automatically adds: <b>${name}</b>`;
                    icon = '🎁';
                    break;

                case 'set_value':
                    text = `Sets <b>${eff.currency}</b> to ${eff.value}`;
                    break;

                case 'roll_dice':
                    const current = this.engine.state.rollResults.get(item.id);
                    const range = `${eff.min || 1}-${eff.max || 6}`;
                    if (current !== undefined) {
                        text = `Rolled Result: <b>${current}</b> ${eff.currency}`;
                        icon = '🎲';
                    } else {
                        text = `Rolls <b>${range}</b> ${eff.currency}`;
                        icon = '🎲';
                    }
                    break;

                default:
                    text = `Unknown Effect: ${eff.type}`;
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
            
            let colorClass = value < 0 ? 'bad' : ''; 
            if (value === 0) colorClass = 'free';      
            if (value > 0) colorClass = 'good';        

            let modHtml = '';
            if (modifiers.length > 0) {
                modHtml = `<span class="mod-applied">(${modifiers.join(' ')})</span>`;
            }

            html += `<div class="cost ${colorClass}">
                ${c.currency}: ${sign}${value} ${modHtml}
            </div>`;
        });
        return html;
    }

    renderRequirements(item, group) {
        let reqsHtml = '';

        if (item.incompatible) {
            item.incompatible.forEach(badId => {
                if (this.engine.state.selected.has(badId)) {
                    const badItem = this.engine.findItem(badId);
                    reqsHtml += `<span class="req-item fail">❌ Incompatible with: ${badItem?.title || badId}</span>`;
                }
            });
        }

        // Changed: add null check for group
        const isSelected = this.engine.state.selected.has(item.id);
        if (!isSelected && group && group.rules?.max_choices) {
            const currentCount = this.engine.getSelectedInGroup(group).length;
            if (currentCount >= group.rules.max_choices) {
                reqsHtml += `<span class="req-item fail">⛔ Max choices reached (${group.rules.max_choices})</span>`;
            }
        }

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

        const formatText = (txt) => {
            return txt
                .replace(/count\.tag\(['"](.+?)['"]\)/g, "Tag: $1")
                .replace(/count\.([a-zA-Z0-9_]+)/g, "Group: $1")
                .replace(/has\(['"](.+?)['"]\)/g, "$1")
                .replace(/\|\|/g, " OR ")
                .replace(/&&/g, " AND ")
                .replace(/>=/g, "≥")
                .replace(/<=/g, "≤");
        };

        if (req.includes('(') || req.includes('||') || req.includes('&&') || req.includes('count.')) {
            isMet = this.engine.rules.evaluateRequirement(req, null);
            displayText = formatText(req);
        } else {
            const isNot = req.startsWith('!');
            const cleanId = isNot ? req.slice(1) : req;
            const targetSelected = this.engine.state.selected.has(cleanId);
            isMet = isNot ? !targetSelected : targetSelected;
            const targetItem = this.engine.findItem(cleanId);
            const name = targetItem?.title || cleanId;
            displayText = (isNot ? "NOT " : "") + name;
        }

        if (!isMet) {
            return `<span class="req-item missing">⚠️ Requires: ${displayText}</span>`;
        } else {
            return `<span class="req-item ok">✔ ${displayText}</span>`;
        }
    }

    updatePosition(e) {
        const tt = this.tooltipEl;
        const ttH = tt.offsetHeight;
        const ttW = tt.offsetWidth;

        let top = e.clientY + 20;
        let left = e.clientX + 20;

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