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

        console.log(`📄 Loading ${pages.length} page(s)...`);

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
                    console.log(`✓ Page ${index} loaded: ${img.naturalWidth}x${img.naturalHeight}`);
                    resolve();
                };

                img.onerror = () => {
                    console.error(`✗ Failed to load page ${index}: ${src}`);
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
            if (layer) {
                layer.innerHTML = '';  
            }
        });

        const groups = this.engine.config.groups || [];
        
        console.log(`🔘 Rendering buttons for ${groups.length} group(s)...`);

        groups.forEach(group => {
            const pageIndex = group.page !== undefined ? group.page : 0;
            const layer = document.getElementById(`layer-${pageIndex}`);
            
            if (!layer) {
                console.warn(`Layer not found for page ${pageIndex}`);
                return;
            }

            const dim = this.pageDimensions[pageIndex];
            if (!dim) {
                console.warn(`Dimensions not found for page ${pageIndex}`);
                return;
            }

            // Budget badge
            if (group.rules?.budget && group.coords) {
                this.renderBudgetBadge(group, layer, dim);
            }

            // Group info zone
            if (group.coords) {
                this.renderGroupZone(group, layer, dim);
            }

            // Items
            if (group.items) {
                group.items.forEach(item => {
                    if (item.coords) {
                        this.renderItemButton(item, group, layer, dim);
                    }
                });
            }
        });
    }

    // ==================== BUDGET BADGE ====================

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

    updateBudgetBadge(group) {
        const badge = document.getElementById(`budget-${group.id}`);
        if (!badge) return;

        const budgetState = this.engine.state.budgets[group.id];
        if (!budgetState) {
            // Initial state before calculation
            const budget = group.rules.budget;
            badge.textContent = `${budget.name || budget.currency}: ${budget.amount}/${budget.amount}`;
            return;
        }

        const { total, remaining } = budgetState;
        const budget = group.rules.budget;
        badge.textContent = `${budget.name || budget.currency}: ${remaining}/${total}`;
        badge.classList.toggle('empty', remaining === 0);
    }

    // ==================== GROUP ZONE ====================

    renderGroupZone(group, layer, dim) {
        const zone = document.createElement('div');
        zone.className = 'click-zone info-zone';
        zone.id = `group-${group.id}`;

        Object.assign(zone.style, CoordHelper.toPercent(group.coords, dim));

        // Text layer for translation mode
        if (group.title || group.description) {
            zone.appendChild(this.createTextLayer(
                group.title || '',
                group.description || ''
            ));
        }

        layer.appendChild(zone);
    }

    // ==================== ITEM BUTTON ====================

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

        // Click handler
        button.onclick = () => {
            this.engine.toggle(item.id);
        };

        // Tooltip
        this.tooltip.attach(button, item, group);

        layer.appendChild(button);
    }

    // ==================== TEXT LAYER ====================

    createTextLayer(title, description) {
        const div = document.createElement('div');
        div.className = 'text-content';

        const cleanDesc = description ? 
            description.replace(/\n/g, '<br>') : '';

        div.innerHTML = `
            ${title ? `<strong>${title}</strong>` : ''}
            ${cleanDesc ? `<span>${cleanDesc}</span>` : ''}
        `;

        return div;
    }

    // ==================== POINTS BAR ====================

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
            const groupId = el.dataset.groupId;

            const item = this.engine.findItem(itemId);
            const group = this.engine.findGroupForItem(itemId);

            if (!item || !group) return;

            const isSelected = this.engine.state.selected.has(itemId);
            const canSelect = this.engine.canSelect(item, group);

            // Update classes
            el.classList.toggle('selected', isSelected);
            el.classList.toggle('disabled', !canSelect && !isSelected);
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
}