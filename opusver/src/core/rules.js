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

        // Simple: item_id (Map.has works like Set.has)
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
        let value = cost.value || cost.base || 0;

        if (cost.formula) {
            const formulaResult = this.evaluateFormula(cost.formula, item, group);
            value += formulaResult;
        }

        if (cost.condition) {
            const conditionResult = this.evaluateFormula(cost.condition, item, group);
            value += conditionResult;
        }

        return value;
    }

    // ==================== FORMULA EVALUATION ====================

    evaluateFormula(formula, item, group) {
        try {
            const context = this.createFormulaContext(item, group);
            // Create function with context keys as arguments
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
            // Helper: has(id) - Checks existence (Qty > 0)
            has: (id) => state.selected.has(id),
            
            // Helper: qty(id) - Gets exact quantity
            qty: (id) => state.selected.get(id) || 0,

            // Helper: selected object (Backward compatibility + new features)
            selected: {
                has: (id) => state.selected.has(id),
                get: (id) => state.selected.get(id) || 0,
                // Count of UNIQUE items selected
                length: state.selected.size 
            },

            // Currencies
            currency: { ...state.currencies },

            // Counts per group (Sum of Quantities) + TAG SUPPORT
            count: {
                ...this.createCountHelper(group),
                // NEW: Tag counting helper -> count.tag('magic')
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

            // Current group count (Sum of Quantities)
            this_group: group ? this.engine.getGroupQty(group) : 0,

            // Math functions
            Math: Math
        };
    }

    createCountHelper(currentGroup) {
        const counts = {};

        for (const group of this.engine.config.groups) {
            // Use getGroupQty to sum up multiples
            counts[group.id] = this.engine.getGroupQty(group);
        }

        if (currentGroup) {
            counts.this_group = this.engine.getGroupQty(currentGroup);
        }

        return counts;
    }
}