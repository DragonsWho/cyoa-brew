/**
 * Game State - Manages current selection and currencies
 */

export class GameState {
    constructor(config) {
        this.config = config;
        this.reset();
    }

    reset() {
        this.selected = new Set();
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
            selected: Array.from(this.selected),
            currencies: { ...this.currencies },
            budgets: { ...this.budgets },
            timestamp: new Date().toISOString()
        };
    }

    import(data) {
        this.selected = new Set(data.selected || []);
        this.currencies = { ...data.currencies };
        this.budgets = { ...data.budgets };
    }
}