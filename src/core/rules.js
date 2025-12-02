/**
 * Rule Evaluator - Handles requirements, costs, and formulas
 */

export class RuleEvaluator {
    constructor(engine) {
        this.engine = engine;
    }

    // ==================== REQUIREMENTS ====================

    checkRequirements(item) {
        if (!item.requirements) return true;

        for (const req of item.requirements) {
            if (!this.evaluateRequirement(req, item)) {
                return false;
            }
        }
        return true;
    }

    evaluateRequirement(req, item) {
        // Complex formula
        if (req.includes('||') || req.includes('&&') || req.includes('(')) {
            return this.evaluateFormula(req, item, null);
        }

        // Negation: !item_id
        if (req.startsWith('!')) {
            const targetId = req.slice(1).trim();
            return !this.engine.state.selected.has(targetId);
        }

        // Simple: item_id
        return this.engine.state.selected.has(req.trim());
    }

    // ==================== INCOMPATIBLE ====================

    checkIncompatible(item) {
        if (!item.incompatible) return true;

        for (const badId of item.incompatible) {
            if (this.engine.state.selected.has(badId)) {
                return false;
            }
        }
        return true;
    }

    // ==================== COST EVALUATION ====================

    evaluateCost(cost, item, group) {
        const { value } = this.calculateCostWithDetails(cost, item, group);
        return value;
    }

    /**
     * Возвращает цену И список примененных модификаторов для UI
     */
    getCostBreakdown(cost, item, group) {
        return this.calculateCostWithDetails(cost, item, group);
    }

    calculateCostWithDetails(cost, item, group) {
        // 1. Base Calc
        let value = cost.value || cost.base || 0;
        if (cost.formula) value += this.evaluateFormula(cost.formula, item, group);
        if (cost.condition) value += this.evaluateFormula(cost.condition, item, group);

        const modifiersText = [];

        // 2. Apply Modifiers
        if (this.engine.modifiers.cost.length > 0) {
            const applicable = this.engine.modifiers.cost.filter(mod => {
                if (mod.currency && mod.currency !== cost.currency) return false;
                if (mod.groupId && (!group || group.id !== mod.groupId)) return false;
                if (mod.tag && (!item.tags || !item.tags.includes(mod.tag))) return false;
                return true;
            });

            const setters = applicable.filter(m => m.mode === 'set');
            const multipliers = applicable.filter(m => m.mode === 'multiply');
            const adders = applicable.filter(m => m.mode === 'add' || !m.mode);

            if (setters.length > 0) {
                const lastSet = setters[setters.length - 1];
                value = lastSet.value;
                modifiersText.push(`= ${value}`);
            }

            for (const mod of multipliers) {
                value *= mod.value;
                const percent = Math.round((1 - mod.value) * 100);
                if (percent > 0) modifiersText.push(`-${percent}%`);
                else modifiersText.push(`+${Math.abs(percent)}%`);
            }

            for (const mod of adders) {
                value += mod.value;
                const sign = mod.value > 0 ? '+' : '';
                modifiersText.push(`${sign}${mod.value}`);
            }
        }

        return { 
            value: Math.round(value), 
            modifiers: modifiersText 
        };
    }

    applyCostModifiers(baseValue, item, group, currency) {
        let finalValue = baseValue;

        for (const mod of this.engine.modifiers.cost) {
            let apply = true;

            if (mod.currency && mod.currency !== currency) apply = false;
            if (apply && mod.groupId && (!group || group.id !== mod.groupId)) apply = false;
            if (apply && mod.tag) {
                if (!item.tags || !item.tags.includes(mod.tag)) apply = false;
            }

            if (apply) {
                if (mod.mode === 'multiply') {
                    finalValue *= mod.value;
                } else if (mod.mode === 'add') {
                    finalValue += mod.value;
                } else if (mod.mode === 'set') {
                    finalValue = mod.value;
                }
            }
        }
        
        return Math.round(finalValue);
    }

    // ==================== FORMULA EVALUATION ====================

    evaluateFormula(formula, item, group) {
        try {
            const context = this.createFormulaContext(item, group);
            const func = new Function(...Object.keys(context), `return ${formula};`);
            return func(...Object.values(context));
        } catch (error) {
            console.error('Formula error:', formula, error);
            return 0;
        }
    }

    createFormulaContext(item, group) {
        const state = this.engine.state;

        return {
            has: (id) => state.selected.has(id),
            qty: (id) => state.selected.get(id) || 0,
            
            selected: {
                has: (id) => state.selected.has(id),
                get: (id) => state.selected.get(id) || 0,
                length: state.selected.size 
            },

            currency: { ...state.currencies },

            count: {
                ...this.createCountHelper(group),
                tag: (tagName) => {
                    let total = 0;
                    for (const [itemId, qty] of state.selected) {
                        const i = this.engine.findItem(itemId);
                        if (i && i.tags && i.tags.includes(tagName)) {
                            total += qty;
                        }
                    }
                    return total;
                }
            },

            this_group: group ? this.engine.getGroupQty(group) : 0,

            Math: Math
        };
    }

    createCountHelper(currentGroup) {
        const counts = {};
        // Changed: use getAllGroups() instead of config.groups
        for (const group of this.engine.getAllGroups()) {
            counts[group.id] = this.engine.getGroupQty(group);
        }
        if (currentGroup) {
            counts.this_group = this.engine.getGroupQty(currentGroup);
        }
        return counts;
    }
}