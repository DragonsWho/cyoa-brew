/**
 * Game State - Manages current selection and currencies
 */

export class GameState {
    constructor(config) {
        this.config = config;
        this.reset();
    }

    reset() {
        // ID -> Quantity (Integer)
        this.selected = new Map();
        
        // ID -> Rolled Result (Integer) - Stores the result of random rolls so they persist
        this.rollResults = new Map();

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
            selected: Array.from(this.selected.entries()),
            rollResults: Array.from(this.rollResults.entries()),
            currencies: { ...this.currencies },
            budgets: { ...this.budgets },
            timestamp: new Date().toISOString()
        };
    }

    import(data) {
        if (Array.isArray(data.selected) && typeof data.selected[0] === 'string') {
            this.selected = new Map(data.selected.map(id => [id, 1]));
        } else {
            this.selected = new Map(data.selected || []);
        }

        // Import roll results
        this.rollResults = new Map(data.rollResults || []);
        
        this.currencies = { ...data.currencies };
        this.budgets = { ...data.budgets };
    }
}
