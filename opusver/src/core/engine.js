
/**
 * Game Engine - Core game logic and state management
 */

import { RuleEvaluator } from './rules.js';
import { GameState } from './state.js';
import { EffectProcessor } from './effects.js';

export class GameEngine {
    constructor(config) {
        this.config = config;
        this.state = new GameState(config);
        this.rules = new RuleEvaluator(this);
        this.effects = new EffectProcessor(this);
        this.listeners = {};
        
        // Хранилище для активных модификаторов (скидки, наценки)
        this.modifiers = {
            cost: [] 
        };
        
        // Capture initial defaults for restoration
        this.defaults = {
            groupRules: {}
        };
        this.initDefaults();

        console.log('🎮 Engine initialized (Tags + Modifiers)');
    }

    initDefaults() {
        // Deep copy group rules to restore them later
        this.config.groups.forEach(g => {
            if (g.rules) {
                this.defaults.groupRules[g.id] = JSON.parse(JSON.stringify(g.rules));
            }
        });
    }

    restoreDefaults() {
        // Restore group rules (max_choices, etc)
        this.config.groups.forEach(g => {
            if (this.defaults.groupRules[g.id]) {
                // Restore from copy
                g.rules = JSON.parse(JSON.stringify(this.defaults.groupRules[g.id]));
            }
        });
    }

    // ==================== SELECTION ====================

    select(itemId) {
        const item = this.findItem(itemId);
        if (!item) return false;

        const group = this.findGroupForItem(itemId);
        if (!group) return false;

        // Check requirements
        if (!this.canSelect(item, group)) return false;

        const currentQty = this.state.selected.get(itemId) || 0;
        const maxQty = item.max_quantity || 1;

        if (currentQty >= maxQty) return false;

        // Radio logic (Max choices)
        if (currentQty === 0 && group.rules?.max_choices === 1) {
            group.items.forEach(i => {
                if (this.state.selected.has(i.id) && i.id !== itemId) {
                    this.state.selected.delete(i.id);
                }
            });
        } else if (group.rules?.max_choices) {
            const totalInGroup = this.getGroupQty(group);
            if (totalInGroup >= group.rules.max_choices) {
                console.log(`Max choices reached in ${group.id} (Limit: ${group.rules.max_choices})`);
                return false;
            }
        }

        this.state.selected.set(itemId, currentQty + 1);
        this.recalculate(); 
        this.emit('selection', { itemId, selected: true, qty: currentQty + 1 });
        return true;
    }

    deselect(itemId) {
        if (!this.state.selected.has(itemId)) return false;

        const currentQty = this.state.selected.get(itemId);
        
        if (currentQty > 1) {
             this.state.selected.set(itemId, currentQty - 1);
        } else {
             this.state.selected.delete(itemId);
        }

        this.recalculate();
        this.emit('selection', { itemId, selected: false, qty: currentQty - 1 });
        return true;
    }

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
        // 1. Cleanup invalid selections first
        this.cleanupInvalidSelections();
        
        // 2. Reset currencies to base
        this.state.resetCurrencies();

        // 3. Сброс модификаторов перед новым расчетом
        this.modifiers = { cost: [] };

        // 4. APPLY EFFECTS (Заполняет this.modifiers и меняет правила групп)
        this.effects.applyAll();

        // 5. Calculate Costs (Deltas) - ТЕПЕРЬ С УЧЕТОМ МОДИФИКАТОРОВ
        const groupDeltas = this.calculateGroupDeltas();
        
        // 6. Apply Logic
        this.applyBudgets(groupDeltas);
        this.applyDeltas(groupDeltas);

        this.emit('recalculate', { state: this.state });
    }

    cleanupInvalidSelections() {
        for (const itemId of this.state.selected.keys()) {
            const item = this.findItem(itemId);
            const group = this.findGroupForItem(itemId);
            if (!item || !this.canSelect(item, group)) {
                this.state.selected.delete(itemId);
            }
        }
    }

    calculateGroupDeltas() {
        const deltas = {};
        for (const itemId of this.state.selected.keys()) {
            const item = this.findItem(itemId);
            const group = this.findGroupForItem(itemId);
            const qty = this.state.selected.get(itemId);
            
            if (!item?.cost) continue;
            if (!deltas[group.id]) deltas[group.id] = {};

            for (const cost of item.cost) {
                // Здесь RulesEvaluator применит модификаторы
                const unitValue = this.rules.evaluateCost(cost, item, group);
                const currencyId = cost.currency;
                if (!deltas[group.id][currencyId]) deltas[group.id][currencyId] = 0;
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

    getSelectedInGroup(group) {
        return group.items.filter(i => this.state.selected.has(i.id));
    }

    getGroupQty(group) {
        let total = 0;
        group.items.forEach(i => {
            total += (this.state.selected.get(i.id) || 0);
        });
        return total;
    }

    on(event, callback) {
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push(callback);
    }

    emit(event, data) {
        if (this.listeners[event]) this.listeners[event].forEach(cb => cb(data));
    }

    reset() {
        this.state.reset();
        this.restoreDefaults(); 
        this.recalculate();
        this.emit('reset');
    }
}