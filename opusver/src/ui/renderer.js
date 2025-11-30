/**
 * UI Renderer - Handles all visual rendering
 */

import { CoordHelper } from '../utils/coords.js';
import { TooltipManager } from './tooltip.js';

export class UIRenderer {
    constructor(engine) {
        this.engine = engine;
        this.pageDimensions = [];
        this.tooltip = new TooltipManager(engine);

        // Listen to engine events
        this.engine.on('selection', () => this.updateUI());
        this.engine.on('recalculate', () => this.updateUI());
        this.engine.on('reset', () => this.updateUI());

        console.log('🎨 Renderer initialized');
    }

    // ==================== MAIN RENDER ====================

    async renderAll() {
        await this.renderPages();
        this.renderButtons();
        this.renderPointsBar();
        console.log('✅ All elements rendered');
    }

    // ==================== PAGES ====================

    async renderPages() {
        const wrapper = document.getElementById('game-wrapper');
        wrapper.innerHTML = '';
        this.pageDimensions = [];

        const pages = this.engine.config.meta?.pages || [];
        
        if (pages.length === 0) {
            console.warn('No pages defined in config');
            return;
        }

        const loadPromises = pages.map((src, index) => {
            return new Promise((resolve) => {
                const container = document.createElement('div');
                container.className = 'page-container';
                container.id = `page-${index}`;

                const img = document.createElement('img');
                img.className = 'page-image';
                img.src = src;
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

    // ==================== BUTTONS ====================

    renderButtons() { 
        const pages = this.engine.config.meta?.pages || [];
        pages.forEach((_, index) => {
            const layer = document.getElementById(`layer-${index}`);
            if (layer) layer.innerHTML = '';  
        });

        const groups = this.engine.config.groups || [];

        groups.forEach(group => {
            const pageIndex = group.page !== undefined ? group.page : 0;
            const layer = document.getElementById(`layer-${pageIndex}`);
            
            if (!layer || !this.pageDimensions[pageIndex]) return;

            // Budget badge
            if (group.rules?.budget && group.coords) {
                this.renderBudgetBadge(group, layer, this.pageDimensions[pageIndex]);
            }

            // Group info zone
            if (group.coords) {
                this.renderGroupZone(group, layer, this.pageDimensions[pageIndex]);
            }

            // Items
            if (group.items) {
                group.items.forEach(item => {
                    if (item.coords) {
                        this.renderItemButton(item, group, layer, this.pageDimensions[pageIndex]);
                    }
                });
            }
        });
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

    renderGroupZone(group, layer, dim) {
        const zone = document.createElement('div');
        zone.className = 'click-zone info-zone';
        zone.id = `group-${group.id}`;

        Object.assign(zone.style, CoordHelper.toPercent(group.coords, dim));

        if (group.title || group.description) {
            zone.appendChild(this.createTextLayer(
                group.title || '',
                group.description || ''
            ));
        }

        layer.appendChild(zone);
    }

    // ==================== ITEM BUTTON (UPDATED) ====================

    renderItemButton(item, group, layer, dim) {
        const button = document.createElement('div');
        button.className = 'click-zone item-zone';
        button.id = `btn-${item.id}`;
        button.dataset.itemId = item.id;
        button.dataset.groupId = group.id;

        Object.assign(button.style, CoordHelper.toPercent(item.coords, dim));

        // Text layer
        if (item.title || item.description) {
            button.appendChild(this.createTextLayer(
                item.title || '',
                item.description || ''
            ));
        }

        // CHANGED: Multi-select Logic
        const maxQty = item.max_quantity || 1;

        if (maxQty > 1) {
            // 1. Add class for styling
            button.classList.add('multi-select');

            // 2. Create Split Controls (Left -, Right +)
            const controls = document.createElement('div');
            controls.className = 'split-controls';
            
            const minusBtn = document.createElement('div');
            minusBtn.className = 'split-btn minus';
            minusBtn.onclick = (e) => {
                e.stopPropagation(); // Stop bubbling
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

            // 3. Create Quantity Badge
            const badge = document.createElement('div');
            badge.className = 'qty-badge';
            badge.style.display = 'none'; // Hidden by default
            button.appendChild(badge);

        } else {
            // Standard Behavior (Toggle)
            button.onclick = () => {
                this.engine.toggle(item.id);
            };
        }

        // Tooltip
        this.tooltip.attach(button, item, group);

        layer.appendChild(button);
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

    // ==================== UPDATE UI (UPDATED) ====================

    updateUI() {
        this.updateButtons();
        this.updatePointsBar();
        this.updateBudgets();
    }

    updateButtons() {
        document.querySelectorAll('.item-zone').forEach(el => {
            const itemId = el.dataset.itemId;
            const groupId = el.dataset.groupId;

            const item = this.engine.findItem(itemId);
            const group = this.engine.findGroupForItem(itemId);

            if (!item || !group) return;

            // CHANGED: Use Quantity logic
            const qty = this.engine.state.selected.get(itemId) || 0;
            const isSelected = qty > 0;
            const canSelect = this.engine.canSelect(item, group);
            const maxQty = item.max_quantity || 1;

            // Update classes
            el.classList.toggle('selected', isSelected);
            // Disabled if cannot select AND not already selected (so you can't start, but if selected you can deselect)
            // For multi: disable ONLY if maxed out AND cannot increment further
            if (maxQty > 1) {
                // Multi-select specific states could go here (e.g., disable only "+" side)
                el.classList.toggle('maxed', qty >= maxQty);
            } else {
                el.classList.toggle('disabled', !canSelect && !isSelected);
            }

            // CHANGED: Update Badge
            if (maxQty > 1) {
                const badge = el.querySelector('.qty-badge');
                if (badge) {
                    badge.textContent = qty;
                    badge.style.display = isSelected ? 'flex' : 'none';
                }
            }
        });
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
            const group = this.engine.config.groups.find(g => g.id === groupId);
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
}