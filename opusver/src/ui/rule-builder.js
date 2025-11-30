/**
 * Rule Builder - Visual rule editor
 */

export class RuleBuilder {
    constructor(engine) {
        this.engine = engine;
        this.currentItem = null;
        this.currentGroup = null;
    }

    // ==================== RENDER UI ====================

    renderUI(container) {
        container.innerHTML = `
            <div class="rule-builder">
                <!-- Cost Section -->
                <div class="rule-section">
                    <label>💰 Cost:</label>
                    <div id="cost-list"></div>
                    <button class="small-btn" onclick="CYOA.editor.ruleBuilder.addCost()">+ Add Cost</button>
                </div>
                
                <!-- Requirements Section -->
                <div class="rule-section">
                    <label>✅ Requirements:</label>
                    <div id="requirements-list"></div>
                    <button class="small-btn" onclick="CYOA.editor.ruleBuilder.addRequirement()">+ Add Requirement</button>
                </div>
                
                <!-- Incompatible Section -->
                <div class="rule-section">
                    <label>❌ Incompatible:</label>
                    <div id="incompatible-list"></div>
                    <button class="small-btn" onclick="CYOA.editor.ruleBuilder.addIncompatible()">+ Add Incompatible</button>
                </div>
            </div>
        `;
    }

    // ==================== LOAD ITEM ====================

    loadItem(item, group) {
        this.currentItem = item;
        this.currentGroup = group;
        
        this.renderCosts();
        this.renderRequirements();
        this.renderIncompatible();
    }

    // ==================== COST ====================

    renderCosts() {
        if (!this.currentItem) return;
        
        const container = document.getElementById('cost-list');
        if (!container) return;
        
        const costs = this.currentItem.cost || [];
        
        if (costs.length === 0) {
            container.innerHTML = '<div class="empty-state">No costs</div>';
            return;
        }
        
        container.innerHTML = costs.map((cost, index) => `
            <div class="rule-item">
                <select onchange="CYOA.editor.ruleBuilder.updateCostCurrency(${index}, this.value)">
                    ${this.getCurrencyOptions(cost.currency)}
                </select>
                <input type="number" value="${cost.value || 0}" 
                       onchange="CYOA.editor.ruleBuilder.updateCostValue(${index}, this.value)"
                       placeholder="Value">
                <input type="text" value="${cost.formula || ''}" 
                       onchange="CYOA.editor.ruleBuilder.updateCostFormula(${index}, this.value)"
                       placeholder="Formula (optional)">
                <button class="delete-mini-btn" onclick="CYOA.editor.ruleBuilder.removeCost(${index})">×</button>
            </div>
        `).join('');
    }

    getCurrencyOptions(selected) {
        const currencies = this.engine.config.points || [];
        return currencies.map(c => 
            `<option value="${c.id}" ${c.id === selected ? 'selected' : ''}>
                ${c.name}
            </option>`
        ).join('');
    }

    addCost() {
        if (!this.currentItem) return;
        
        if (!this.currentItem.cost) {
            this.currentItem.cost = [];
        }
        
        const firstCurrency = this.engine.config.points?.[0]?.id || 'points';
        
        this.currentItem.cost.push({
            currency: firstCurrency,
            value: -5
        });
        
        this.renderCosts();
        this.updateParent();
    }

    removeCost(index) {
        if (!this.currentItem?.cost) return;
        this.currentItem.cost.splice(index, 1);
        this.renderCosts();
        this.updateParent();
    }

    updateCostCurrency(index, value) {
        if (!this.currentItem?.cost?.[index]) return;
        this.currentItem.cost[index].currency = value;
        this.updateParent();
    }

    updateCostValue(index, value) {
        if (!this.currentItem?.cost?.[index]) return;
        this.currentItem.cost[index].value = parseInt(value) || 0;
        this.updateParent();
    }

    updateCostFormula(index, value) {
        if (!this.currentItem?.cost?.[index]) return;
        if (value.trim()) {
            this.currentItem.cost[index].formula = value;
        } else {
            delete this.currentItem.cost[index].formula;
        }
        this.updateParent();
    }

    // ==================== REQUIREMENTS ====================

    renderRequirements() {
        if (!this.currentItem) return;
        
        const container = document.getElementById('requirements-list');
        if (!container) return;
        
        const reqs = this.currentItem.requirements || [];
        
        if (reqs.length === 0) {
            container.innerHTML = '<div class="empty-state">No requirements</div>';
            return;
        }
        
        container.innerHTML = reqs.map((req, index) => `
            <div class="rule-item">
                <input type="text" value="${req}" 
                       onchange="CYOA.editor.ruleBuilder.updateRequirement(${index}, this.value)"
                       placeholder="item_id or formula">
                <button class="delete-mini-btn" onclick="CYOA.editor.ruleBuilder.removeRequirement(${index})">×</button>
            </div>
        `).join('');
    }

    addRequirement() {
        if (!this.currentItem) return;
        
        if (!this.currentItem.requirements) {
            this.currentItem.requirements = [];
        }
        
        this.currentItem.requirements.push('item_id');
        this.renderRequirements();
        this.updateParent();
    }

    removeRequirement(index) {
        if (!this.currentItem?.requirements) return;
        this.currentItem.requirements.splice(index, 1);
        this.renderRequirements();
        this.updateParent();
    }

    updateRequirement(index, value) {
        if (!this.currentItem?.requirements) return;
        this.currentItem.requirements[index] = value;
        this.updateParent();
    }

    // ==================== INCOMPATIBLE ====================

    renderIncompatible() {
        if (!this.currentItem) return;
        
        const container = document.getElementById('incompatible-list');
        if (!container) return;
        
        const incomp = this.currentItem.incompatible || [];
        
        if (incomp.length === 0) {
            container.innerHTML = '<div class="empty-state">No incompatibilities</div>';
            return;
        }
        
        container.innerHTML = incomp.map((id, index) => `
            <div class="rule-item">
                <input type="text" value="${id}" 
                       onchange="CYOA.editor.ruleBuilder.updateIncompatible(${index}, this.value)"
                       placeholder="item_id">
                <button class="delete-mini-btn" onclick="CYOA.editor.ruleBuilder.removeIncompatible(${index})">×</button>
            </div>
        `).join('');
    }

    addIncompatible() {
        if (!this.currentItem) return;
        
        if (!this.currentItem.incompatible) {
            this.currentItem.incompatible = [];
        }
        
        this.currentItem.incompatible.push('item_id');
        this.renderIncompatible();
        this.updateParent();
    }

    removeIncompatible(index) {
        if (!this.currentItem?.incompatible) return;
        this.currentItem.incompatible.splice(index, 1);
        this.renderIncompatible();
        this.updateParent();
    }

    updateIncompatible(index, value) {
        if (!this.currentItem?.incompatible) return;
        this.currentItem.incompatible[index] = value;
        this.updateParent();
    }

    // ==================== UPDATE PARENT ====================

    updateParent() {
        // Notify editor to update UI
        if (window.CYOA?.editor) {
            window.CYOA.editor.updateCodePreview();
            window.CYOA.editor.engine.recalculate();
            window.CYOA.editor.renderer.updateUI();
        }
    }
}