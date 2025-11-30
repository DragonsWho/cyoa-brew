/**
 * Game Engine - Core game logic and state management
 */

import { RuleEvaluator } from './rules.js';
import { GameState } from './state.js';

export class GameEngine {
    constructor(config) {
        this.config = config;
        this.state = new GameState(config);
        this.rules = new RuleEvaluator(this);
        this.listeners = {};
        
        console.log('🎮 Engine initialized');
    }

    // ==================== SELECTION ====================

    /**
     * Select an item
     * @param {string} itemId - Item ID to select
     * @returns {boolean} Success
     */
    select(itemId) {
        const item = this.findItem(itemId);
        if (!item) {
            console.warn(`Item not found: ${itemId}`);
            return false;
        }

        const group = this.findGroupForItem(itemId);
        if (!group) {
            console.warn(`Group not found for: ${itemId}`);
            return false;
        }

        // Check if can select
        if (!this.canSelect(item, group)) {
            console.log(`Cannot select ${itemId} (requirements not met)`);
            return false;
        }

        // Handle max_choices (radio button behavior)
        if (group.rules?.max_choices === 1) {
            group.items.forEach(i => {
                if (this.state.selected.has(i.id)) {
                    this.state.selected.delete(i.id);
                }
            });
        } else if (group.rules?.max_choices) {
            const selectedInGroup = this.getSelectedInGroup(group);
            if (selectedInGroup.length >= group.rules.max_choices) {
                console.log(`Max choices reached in ${group.id}`);
                return false;
            }
        }

        this.state.selected.add(itemId);
        this.recalculate();
        this.emit('selection', { itemId, selected: true });
        
        console.log(`✓ Selected: ${item.title}`);
        return true;
    }

    /**
     * Deselect an item
     */
    deselect(itemId) {
        if (!this.state.selected.has(itemId)) {
            return false;
        }

        this.state.selected.delete(itemId);
        this.recalculate();
        this.emit('selection', { itemId, selected: false });
        
        const item = this.findItem(itemId);
        console.log(`✗ Deselected: ${item?.title || itemId}`);
        return true;
    }

    /**
     * Toggle item selection
     */
    toggle(itemId) {
        if (this.state.selected.has(itemId)) {
            return this.deselect(itemId);
        } else {
            return this.select(itemId);
        }
    }

    // ==================== VALIDATION ====================

    /**
     * Check if item can be selected
     */
    canSelect(item, group) {
        if (!this.rules.checkRequirements(item)) {
            return false;
        }

        if (!this.rules.checkIncompatible(item)) {
            return false;
        }

        return true;
    }

    // ==================== CALCULATION ====================

    /**
     * Recalculate all costs and currencies
     */
    recalculate() {
        // 1. Remove invalid selections
        this.cleanupInvalidSelections();

        // 2. Reset currencies
        this.state.resetCurrencies();

        // 3. Calculate with budgets
        const groupDeltas = this.calculateGroupDeltas();
        this.applyBudgets(groupDeltas);
        this.applyDeltas(groupDeltas);

        // 4. Notify listeners
        this.emit('recalculate', { state: this.state });
    }

    /**
     * Remove selections that no longer meet requirements
     */
    cleanupInvalidSelections() {
        let changed = true;
        let iterations = 0;
        const MAX_ITERATIONS = 100;

        while (changed && iterations < MAX_ITERATIONS) {
            changed = false;
            iterations++;

            for (const itemId of Array.from(this.state.selected)) {
                const item = this.findItem(itemId);
                const group = this.findGroupForItem(itemId);

                if (!item || !this.canSelect(item, group)) {
                    this.state.selected.delete(itemId);
                    changed = true;
                }
            }
        }

        if (iterations >= MAX_ITERATIONS) {
            console.warn('⚠️ Dependency cleanup hit max iterations');
        }
    }

    /**
     * Calculate currency deltas per group
     */
    calculateGroupDeltas() {
        const deltas = {};

        for (const itemId of this.state.selected) {
            const item = this.findItem(itemId);
            const group = this.findGroupForItem(itemId);
            
            if (!item?.cost) continue;

            if (!deltas[group.id]) {
                deltas[group.id] = {};
            }

            for (const cost of item.cost) {
                const value = this.rules.evaluateCost(cost, item, group);
                const currencyId = cost.currency;

                if (!deltas[group.id][currencyId]) {
                    deltas[group.id][currencyId] = 0;
                }

                deltas[group.id][currencyId] += value;
            }
        }

        return deltas;
    }

    /**
     * Apply budget rules to deltas
     */
    applyBudgets(groupDeltas) {
        for (const group of this.config.groups) {
            if (!group.rules?.budget) continue;

            const budget = group.rules.budget;
            const targetGroups = [group.id, ...(budget.applies_to || [])];

            // Calculate total spent
            let totalSpent = 0;
            for (const gid of targetGroups) {
                if (groupDeltas[gid]?.[budget.currency] < 0) {
                    totalSpent += Math.abs(groupDeltas[gid][budget.currency]);
                }
            }

            // Apply coverage
            const covered = Math.min(totalSpent, budget.amount);
            let remaining = covered;

            for (const gid of targetGroups) {
                if (remaining <= 0) break;
                
                if (groupDeltas[gid]?.[budget.currency] < 0) {
                    const debt = Math.abs(groupDeltas[gid][budget.currency]);
                    const pay = Math.min(debt, remaining);
                    groupDeltas[gid][budget.currency] += pay;
                    remaining -= pay;
                }
            }

            // Store budget state
            this.state.budgets[group.id] = {
                total: budget.amount,
                used: covered,
                remaining: budget.amount - covered
            };
        }
    }

    /**
     * Apply deltas to currencies
     */
    applyDeltas(groupDeltas) {
        for (const groupId in groupDeltas) {
            for (const currencyId in groupDeltas[groupId]) {
                if (this.state.currencies[currencyId] !== undefined) {
                    this.state.currencies[currencyId] += groupDeltas[groupId][currencyId];
                }
            }
        }
    }

    // ==================== HELPERS ====================

    findItem(itemId) {
        for (const group of this.config.groups) {
            const item = group.items.find(i => i.id === itemId);
            if (item) return item;
        }
        return null;
    }

    findGroupForItem(itemId) {
        for (const group of this.config.groups) {
            if (group.items.find(i => i.id === itemId)) {
                return group;
            }
        }
        return null;
    }

    getSelectedInGroup(group) {
        return group.items.filter(i => this.state.selected.has(i.id));
    }

    // ==================== EVENTS ====================

    on(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    }

    emit(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(cb => cb(data));
        }
    }

    // ==================== STATE MANAGEMENT ====================

    reset() {
        this.state.reset();
        this.recalculate();
        this.emit('reset');
        console.log('🔄 State reset');
    }

    exportState() {
        return this.state.export();
    }

    importState(stateData) {
        this.state.import(stateData);
        this.recalculate();
        this.emit('import');
    }
}