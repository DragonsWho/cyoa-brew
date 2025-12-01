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
        // 1. Reset dynamic rules (like group limits) to default
        this.engine.restoreDefaults();

        // 2. Iterate over selected items and apply their effects
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
            
            // "Этот рюкзак позволяет взять +2 предмета в разделе Оружие"
            case 'modify_group_limit':
                this.applyGroupLimitMod(effect, qty);
                break;

            // "Взял Рыцаря -> Получил Меч (бесплатно и принудительно)"
            case 'force_selection':
                this.applyForceSelection(effect, qty);
                break;

            // "Установить Силу на 10" (вместо +10)
            case 'set_value':
                this.applySetValue(effect, qty);
                break;

            default:
                console.warn(`Unknown effect type: ${effect.type}`);
        }
    }

    // ==================== HANDLERS ====================

    applyGroupLimitMod(effect, qty) {
        const group = this.engine.config.groups.find(g => g.id === effect.group_id);
        if (!group || !group.rules) return;

        // Support formula or fixed value
        let value = effect.value || 0;
        
        // Multiply by qty (if I buy 2 backpacks, I get +4 slots)
        // Unless specific flag "once" is set
        if (!effect.once) {
            value *= qty;
        }

        if (group.rules.max_choices !== undefined) {
            group.rules.max_choices += value;
        }
    }

    applyForceSelection(effect, qty) {
        // Prevent infinite loops if A forces B and B forces A
        // We check if it's already selected to avoid recursion in simple cases
        // Note: For multi-select, this might need logic "Force N times"
        
        const targetId = effect.target_id;
        const currentQty = this.engine.state.selected.get(targetId) || 0;
        
        // If not selected, select it
        if (currentQty === 0) {
            // We use a silent select (no event emission yet) to avoid render thrashing
            // We bypass canSelect check because Force usually overrides requirements
            this.engine.state.selected.set(targetId, 1);
            console.log(`⚡ Effect forced selection: ${targetId}`);
        }
    }

    applySetValue(effect, qty) {
        // This overrides the calculated currency value
        // We store it in a special "overrides" state in engine or set directly
        // For simplicity, we'll write directly to state, but this runs BEFORE deltas
        // so deltas might modify it further. Ideally, 'set' happens last.
        // Let's assume this sets the BASE value.
        
        const currency = effect.currency;
        const value = effect.value;
        this.engine.state.currencies[currency] = value;
    }
}