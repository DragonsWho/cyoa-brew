/**
 * Game State - Manages current selection and currencies
 */

export class GameState {
    constructor(config) {
        this.config = config;
        this.reset();
    }

    reset() {
        // CHANGED: Use Map instead of Set to store Quantity (ID -> Integer)
        this.selected = new Map();
        this.currencies = {};
        this.budgets = {};
        this.resetCurrencies();
    }

    resetCurrencies() {
        if (!this.config.points) {
            console.warn('No points defined in config');
            return;
        }

        this.config.points.forEach(p => {
            this.currencies[p.id] = p.start;
        });
    }

    export() {
        return {
            // CHANGED: Convert Map to array of entries [[id, qty], [id, qty]]
            selected: Array.from(this.selected.entries()),
            currencies: { ...this.currencies },
            budgets: { ...this.budgets },
            timestamp: new Date().toISOString()
        };
    }

    import(data) {
        // CHANGED: Reconstruct Map from entries
        // Support legacy format (array of strings) just in case old save loads
        if (Array.isArray(data.selected) && typeof data.selected[0] === 'string') {
            this.selected = new Map(data.selected.map(id => [id, 1]));
        } else {
            this.selected = new Map(data.selected || []);
        }
        
        this.currencies = { ...data.currencies };
        this.budgets = { ...data.budgets };
    }
}