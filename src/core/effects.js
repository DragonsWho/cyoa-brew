/**
 * src\core\effects.js
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
            
            case 'modify_cost':
                this.applyModifyCost(effect, qty);
                break;
            
            case 'roll_dice':
                this.applyRollDice(effect, sourceItem, qty);
                break;

            default:
                console.warn(`Unknown effect type: ${effect.type}`);
        }
    }

    // ==================== HANDLERS ====================

    applyGroupLimitMod(effect, qty) {
        // Changed: use findGroup() instead of config.groups.find()
        const group = this.engine.findGroup(effect.group_id);
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

    applyModifyCost(effect, qty) {
        for (let i = 0; i < qty; i++) {
            this.engine.modifiers.cost.push({
                tag: effect.tag,
                groupId: effect.group_id,
                currency: effect.currency,
                mode: effect.mode || 'add',
                value: effect.value
            });
            if (effect.once) break;
        }
    }

    applyRollDice(effect, sourceItem, qty) {
        if (!effect.currency) return;
        
        const rolledValue = this.engine.state.rollResults.get(sourceItem.id);
        
        if (rolledValue !== undefined) {
            if (this.engine.state.currencies[effect.currency] !== undefined) {
                this.engine.state.currencies[effect.currency] += (rolledValue * qty);
            }
        }
    }
}