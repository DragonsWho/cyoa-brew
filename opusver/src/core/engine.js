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
        
        console.log('🎮 Engine initialized (Multi-select enabled)');
    }

    // ==================== SELECTION ====================

    /**
     * Select an item (Increments quantity)
     */
    select(itemId) {
        const item = this.findItem(itemId);
        if (!item) return false;

        const group = this.findGroupForItem(itemId);
        if (!group) return false;

        // Check if can select (requirements)
        // Note: For multi-select, we might want to allow checking if we can take *another* one
        if (!this.canSelect(item, group)) {
            return false;
        }

        // CHANGED: Handle Quantity logic
        const currentQty = this.state.selected.get(itemId) || 0;
        const maxQty = item.max_quantity || 1; // Default to 1 if not specified

        if (currentQty >= maxQty) {
            console.log(`Max quantity (${maxQty}) reached for ${itemId}`);
            return false;
        }

        // Handle max_choices (Radio button behavior)
        // Only trigger this if we are selecting from 0 to 1, or if it's strict single-choice group
        if (currentQty === 0 && group.rules?.max_choices === 1) {
            group.items.forEach(i => {
                if (this.state.selected.has(i.id) && i.id !== itemId) {
                    this.state.selected.delete(i.id);
                }
            });
        } else if (group.rules?.max_choices) {
            // Check total items in group (sum of quantities)
            const totalInGroup = this.getGroupQty(group);
            if (totalInGroup >= group.rules.max_choices) {
                console.log(`Max choices reached in ${group.id}`);
                return false;
            }
        }

        // Increment
        this.state.selected.set(itemId, currentQty + 1);

        this.recalculate();
        this.emit('selection', { itemId, selected: true, qty: currentQty + 1 });
        
        console.log(`✓ Selected: ${item.title} (Qty: ${currentQty + 1})`);
        return true;
    }

    /**
     * Deselect an item (Decrements quantity)
     */
    deselect(itemId) {
        if (!this.state.selected.has(itemId)) {
            return false;
        }

        const currentQty = this.state.selected.get(itemId);
        
        // CHANGED: Decrement or Remove
        if (currentQty > 1) {
             this.state.selected.set(itemId, currentQty - 1);
             console.log(`Item decreased: ${itemId} (${currentQty - 1})`);
        } else {
             this.state.selected.delete(itemId);
             console.log(`Item removed: ${itemId}`);
        }

        this.recalculate();
        this.emit('selection', { itemId, selected: false, qty: currentQty - 1 });
        return true;
    }

    /**
     * Toggle item selection
     * Note: Currently behaves as "Select if 0, Deselect if > 0"
     * Future UI needs Left/Right click to properly handle + / -
     */
    toggle(itemId) {
        if (this.state.selected.has(itemId)) {
            return this.deselect(itemId);
        } else {
            return this.select(itemId);
        }
    }

    // ==================== VALIDATION ====================

    canSelect(item, group) {
        if (!this.rules.checkRequirements(item)) return false;
        if (!this.rules.checkIncompatible(item)) return false;
        return true;
    }

    // ==================== CALCULATION ====================

    recalculate() {
        this.cleanupInvalidSelections();
        this.state.resetCurrencies();

        const groupDeltas = this.calculateGroupDeltas();
        this.applyBudgets(groupDeltas);
        this.applyDeltas(groupDeltas);

        this.emit('recalculate', { state: this.state });
    }

    cleanupInvalidSelections() {
        // Iterating keys of Map is safe
        for (const itemId of this.state.selected.keys()) {
            const item = this.findItem(itemId);
            const group = this.findGroupForItem(itemId);
            // If requirements no longer met, remove completely (reset to 0)
            if (!item || !this.canSelect(item, group)) {
                this.state.selected.delete(itemId);
            }
        }
    }

    calculateGroupDeltas() {
        const deltas = {};

        // CHANGED: Iterate over Map Keys
        for (const itemId of this.state.selected.keys()) {
            const item = this.findItem(itemId);
            const group = this.findGroupForItem(itemId);
            const qty = this.state.selected.get(itemId);
            
            if (!item?.cost) continue;

            if (!deltas[group.id]) deltas[group.id] = {};

            for (const cost of item.cost) {
                // Evaluate unit cost
                const unitValue = this.rules.evaluateCost(cost, item, group);
                const currencyId = cost.currency;

                if (!deltas[group.id][currencyId]) deltas[group.id][currencyId] = 0;

                // CHANGED: Multiply by Quantity
                deltas[group.id][currencyId] += (unitValue * qty);
            }
        }

        return deltas;
    }

    applyBudgets(groupDeltas) {
        for (const group of this.config.groups) {
            if (!group.rules?.budget) continue;

            const budget = group.rules.budget;
            const targetGroups = [group.id, ...(budget.applies_to || [])];

            let totalSpent = 0;
            for (const gid of targetGroups) {
                if (groupDeltas[gid]?.[budget.currency] < 0) {
                    totalSpent += Math.abs(groupDeltas[gid][budget.currency]);
                }
            }

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

            this.state.budgets[group.id] = {
                total: budget.amount,
                used: covered,
                remaining: budget.amount - covered
            };
        }
    }

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

    /**
     * Get list of Item objects that are selected (Unique items)
     */
    getSelectedInGroup(group) {
        return group.items.filter(i => this.state.selected.has(i.id));
    }

    /**
     * CHANGED: New helper to sum up all quantities in a group
     */
    getGroupQty(group) {
        let total = 0;
        group.items.forEach(i => {
            total += (this.state.selected.get(i.id) || 0);
        });
        return total;
    }

    // ==================== EVENTS & STATE ====================

    on(event, callback) {
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push(callback);
    }

    emit(event, data) {
        if (this.listeners[event]) this.listeners[event].forEach(cb => cb(data));
    }

    reset() {
        this.state.reset();
        this.recalculate();
        this.emit('reset');
    }
}