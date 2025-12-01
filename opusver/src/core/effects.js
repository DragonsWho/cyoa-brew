
/**
 * Effect Processor - Handles active card effects
 */

export class EffectProcessor {
    constructor(engine) {
        this.engine = engine;
    }

    /**
     * Apply effects from all selected items
     */
    applyAll() {
        this.engine.restoreDefaults();

        // Iterate over selected items and apply their effects
        for (const [itemId, qty] of this.engine.state.selected) {
            const item = this.engine.findItem(itemId);
            if (!item || !item.effects) continue;

            for (const effect of item.effects) {
                this.process(effect, item, qty);
            }
        }
    }

    process(effect, sourceItem, qty) {
        switch (effect.type) {
            
            case 'modify_group_limit':
                this.applyGroupLimitMod(effect, qty);
                break;

            case 'force_selection':
                this.applyForceSelection(effect, qty);
                break;

            case 'set_value':
                this.applySetValue(effect, qty);
                break;
            
            // NEW: Modifies costs of other items
            case 'modify_cost':
                this.applyModifyCost(effect, qty);
                break;

            default:
                console.warn(`Unknown effect type: ${effect.type}`);
        }
    }

    // ==================== HANDLERS ====================

    applyGroupLimitMod(effect, qty) {
        const group = this.engine.config.groups.find(g => g.id === effect.group_id);
        if (!group || !group.rules) return;

        let value = effect.value || 0;
        if (!effect.once) {
            value *= qty;
        }

        if (group.rules.max_choices !== undefined) {
            group.rules.max_choices += value;
        }
    }

    applyForceSelection(effect, qty) {
        const targetId = effect.target_id;
        const currentQty = this.engine.state.selected.get(targetId) || 0;
        
        if (currentQty === 0) {
            this.engine.state.selected.set(targetId, 1);
            console.log(`⚡ Effect forced selection: ${targetId}`);
        }
    }

    applySetValue(effect, qty) {
        const currency = effect.currency;
        const value = effect.value;
        this.engine.state.currencies[currency] = value;
    }

    // NEW: Adds a modifier to the engine for the calculation phase
    applyModifyCost(effect, qty) {
        // Effect structure example:
        // { type: "modify_cost", tag: "magic", mode: "multiply", value: 0.5 } 
        
        // If qty > 1, do we stack discounts? Usually yes.
        // But for "multiply" (50% off), stacking acts like 0.5 * 0.5 = 0.25 (75% off)
        
        for (let i = 0; i < qty; i++) {
            this.engine.modifiers.cost.push({
                tag: effect.tag,
                groupId: effect.group_id,
                currency: effect.currency,
                mode: effect.mode || 'add',
                value: effect.value
            });
            
            // If "once" flag is true, don't stack for quantity
            if (effect.once) break;
        }
    }
}
