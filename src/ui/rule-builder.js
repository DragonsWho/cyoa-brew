
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
            <!-- Cost Section -->
            <div class="editor-section">
                <div class="accordion-header" onclick="CYOA.editor.toggleAccordion(this)">
                    💰 Cost
                </div>
                <div class="accordion-content">
                    <div id="cost-list" class="compact-list"></div>
                    <button class="full-width-btn" onclick="CYOA.editor.ruleBuilder.addCost()">+ Add Cost</button>
                </div>
            </div>
            
            <!-- Requirements Section -->
            <div class="editor-section">
                <div class="accordion-header collapsed" onclick="CYOA.editor.toggleAccordion(this)">
                    ✅ Requirements
                </div>
                <div class="accordion-content collapsed">
                    <div id="requirements-list" class="compact-list"></div>
                    <button class="full-width-btn" onclick="CYOA.editor.ruleBuilder.addRequirement()">+ Add Requirement</button>
                </div>
            </div>

            <!-- Effects Section -->
            <div class="editor-section">
                <div class="accordion-header collapsed" onclick="CYOA.editor.toggleAccordion(this)">
                    ⚡ Effects
                </div>
                <div class="accordion-content collapsed">
                    <div id="effects-list" class="compact-list"></div>
                    <button class="full-width-btn" onclick="CYOA.editor.ruleBuilder.addEffect()">+ Add Effect</button>
                </div>
            </div>
            
            <!-- Incompatible Section -->
            <div class="editor-section">
                <div class="accordion-header collapsed" onclick="CYOA.editor.toggleAccordion(this)">
                    ❌ Incompatible
                </div>
                <div class="accordion-content collapsed">
                    <div id="incompatible-list" class="compact-list"></div>
                    <button class="full-width-btn" onclick="CYOA.editor.ruleBuilder.addIncompatible()">+ Add Incompatible</button>
                </div>
            </div>
        `;
    }

    loadItem(item, group) {
        this.currentItem = item;
        this.currentGroup = group;
        this.renderCosts();
        this.renderRequirements();
        this.renderEffects();
        this.renderIncompatible();
    }

    // ==================== EFFECTS (UPDATED) ====================

    renderEffects() {
        if (!this.currentItem) return;
        const container = document.getElementById('effects-list');
        if (!container) return;
        const effects = this.currentItem.effects || [];
        
        if (effects.length === 0) {
            container.innerHTML = '<div style="color:#666; font-size:0.8rem; text-align:center; padding:2px;">No effects</div>';
            return;
        }

        container.innerHTML = effects.map((eff, index) => {
            let inputs = '';
            
            // 1. Modify Group Limit
            if (eff.type === 'modify_group_limit') {
                inputs = `
                    <select onchange="CYOA.editor.ruleBuilder.updateEffectProp(${index}, 'group_id', this.value)" style="width:100px;">
                        <option value="">Select Group...</option>
                        ${this.getGroupOptions(eff.group_id)}
                    </select>
                    <input type="number" value="${eff.value || 0}" 
                           onchange="CYOA.editor.ruleBuilder.updateEffectProp(${index}, 'value', this.value)"
                           placeholder="+/-" style="width:50px;">
                `;
            } 
            // 2. Force Selection
            else if (eff.type === 'force_selection') {
                inputs = `
                    <input type="text" value="${eff.target_id || ''}" 
                           onchange="CYOA.editor.ruleBuilder.updateEffectProp(${index}, 'target_id', this.value)"
                           placeholder="Target Item ID">
                `;
            } 
            // 3. Set Value
            else if (eff.type === 'set_value') {
                inputs = `
                    <select onchange="CYOA.editor.ruleBuilder.updateEffectProp(${index}, 'currency', this.value)" style="width:80px;">
                        ${this.getCurrencyOptions(eff.currency)}
                    </select>
                    <input type="number" value="${eff.value || 0}" 
                           onchange="CYOA.editor.ruleBuilder.updateEffectProp(${index}, 'value', this.value)"
                           placeholder="Val" style="width:50px;">
                `;
            }
            // 4. Modify Cost (NEW)
            else if (eff.type === 'modify_cost') {
                inputs = `
                    <input type="text" value="${eff.tag || ''}" 
                           onchange="CYOA.editor.ruleBuilder.updateEffectProp(${index}, 'tag', this.value)"
                           placeholder="Tag (e.g. magic)" style="width: 80px;">
                    
                    <select onchange="CYOA.editor.ruleBuilder.updateEffectProp(${index}, 'mode', this.value)" style="width:60px;">
                        <option value="add" ${(!eff.mode || eff.mode === 'add') ? 'selected' : ''}>Flat (+/-)</option>
                        <option value="multiply" ${eff.mode === 'multiply' ? 'selected' : ''}>% (Mult)</option>
                    </select>

                    <input type="number" value="${eff.value}" 
                           step="0.1"
                           onchange="CYOA.editor.ruleBuilder.updateEffectProp(${index}, 'value', this.value)"
                           placeholder="Val" style="width:50px;">
                `;
            }

            return `
            <div style="background:#222; padding:4px; border:1px solid #333; border-radius:4px; margin-bottom:4px;">
                <div class="compact-row">
                    <select onchange="CYOA.editor.ruleBuilder.updateEffectType(${index}, this.value)" style="font-weight:bold; color:#4CAF50;">
                        <option value="modify_group_limit" ${eff.type === 'modify_group_limit' ? 'selected' : ''}>Limit Mod</option>
                        <option value="modify_cost" ${eff.type === 'modify_cost' ? 'selected' : ''}>Cost Mod (Discount)</option>
                        <option value="force_selection" ${eff.type === 'force_selection' ? 'selected' : ''}>Force Select</option>
                        <option value="set_value" ${eff.type === 'set_value' ? 'selected' : ''}>Set Variable</option>
                    </select>
                    <button class="icon-btn" onclick="CYOA.editor.ruleBuilder.removeEffect(${index})">×</button>
                </div>
                <div style="display:flex; gap:4px; margin-top:4px;">
                    ${inputs}
                </div>
                ${eff.type === 'modify_cost' && eff.mode === 'multiply' ? '<div style="font-size:0.7em; color:#888;">0.5 = 50% discount</div>' : ''}
            </div>
            `;
        }).join('');
    }

    addEffect() {
        if (!this.currentItem) return;
        if (!this.currentItem.effects) this.currentItem.effects = [];
        
        // Default new effect
        this.currentItem.effects.push({ 
            type: 'modify_group_limit', 
            group_id: this.engine.config.groups[0]?.id || '',
            value: 1 
        });
        
        this.renderEffects();
        this.updateParent();
    }

    removeEffect(index) {
        if (!this.currentItem?.effects) return;
        this.currentItem.effects.splice(index, 1);
        this.renderEffects();
        this.updateParent();
    }

    updateEffectType(index, newType) {
        if (!this.currentItem?.effects?.[index]) return;
        
        // Reset props based on new type
        const newEffect = { type: newType };
        
        if (newType === 'modify_group_limit') {
            newEffect.group_id = this.engine.config.groups[0]?.id || '';
            newEffect.value = 1;
        } else if (newType === 'force_selection') {
            newEffect.target_id = '';
        } else if (newType === 'set_value') {
            newEffect.currency = 'points';
            newEffect.value = 0;
        } else if (newType === 'modify_cost') {
            newEffect.tag = 'magic';
            newEffect.mode = 'add'; // 'add' (flat) or 'multiply' (%)
            newEffect.value = 2;    // +2 points (flat) or 0.5 (50%)
        }
        
        this.currentItem.effects[index] = newEffect;
        this.renderEffects();
        this.updateParent();
    }

    updateEffectProp(index, prop, value) {
        if (!this.currentItem?.effects?.[index]) return;
        
        // Parse numbers
        if (prop === 'value') {
            const floatVal = parseFloat(value);
            value = isNaN(floatVal) ? 0 : floatVal;
        }
        
        this.currentItem.effects[index][prop] = value;
        this.updateParent();
    }

    // ==================== HELPERS ====================

    getCurrencyOptions(selected) {
        const currencies = this.engine.config.points || [];
        return currencies.map(c => 
            `<option value="${c.id}" ${c.id === selected ? 'selected' : ''}>${c.name}</option>`
        ).join('');
    }

    getGroupOptions(selected) {
        const groups = this.engine.config.groups || [];
        return groups.map(g => 
            `<option value="${g.id}" ${g.id === selected ? 'selected' : ''}>${g.title || g.id}</option>`
        ).join('');
    }
    
    // ... (COSTS & REQUIREMENTS & INCOMPATIBLE methods remain unchanged from previous versions)
    
    renderCosts() {
        if (!this.currentItem) return;
        const container = document.getElementById('cost-list');
        if (!container) return;
        const costs = this.currentItem.cost || [];
        if (costs.length === 0) {
            container.innerHTML = '<div style="color:#666; font-size:0.8rem; text-align:center; padding:2px;">No costs</div>';
            return;
        }
        container.innerHTML = costs.map((cost, index) => `
            <div class="compact-row">
                <select onchange="CYOA.editor.ruleBuilder.updateCostCurrency(${index}, this.value)" title="Currency">
                    ${this.getCurrencyOptions(cost.currency)}
                </select>
                <input type="text" value="${cost.value !== undefined ? cost.value : (cost.formula || 0)}" 
                       onchange="CYOA.editor.ruleBuilder.updateCostValueOrFormula(${index}, this.value)"
                       placeholder="Val">
                <button class="icon-btn" onclick="CYOA.editor.ruleBuilder.removeCost(${index})">×</button>
            </div>
        `).join('');
    }

    addCost() {
        if (!this.currentItem) return;
        if (!this.currentItem.cost) this.currentItem.cost = [];
        const firstCurrency = this.engine.config.points?.[0]?.id || 'points';
        this.currentItem.cost.push({ currency: firstCurrency, value: -1 });
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

    updateCostValueOrFormula(index, value) {
        if (!this.currentItem?.cost?.[index]) return;
        if (!isNaN(value) && value.trim() !== '') {
            this.currentItem.cost[index].value = parseInt(value);
            delete this.currentItem.cost[index].formula;
        } else {
            this.currentItem.cost[index].formula = value;
            delete this.currentItem.cost[index].value;
        }
        this.updateParent();
    }

    renderRequirements() {
        if (!this.currentItem) return;
        const container = document.getElementById('requirements-list');
        if (!container) return;
        const reqs = this.currentItem.requirements || [];
        if (reqs.length === 0) {
            container.innerHTML = '<div style="color:#666; font-size:0.8rem; text-align:center; padding:2px;">No requirements</div>';
            return;
        }
        container.innerHTML = reqs.map((req, index) => `
            <div class="compact-row" style="grid-template-columns: 1fr 24px;">
                <input type="text" value="${req}" 
                       onchange="CYOA.editor.ruleBuilder.updateRequirement(${index}, this.value)"
                       placeholder="item_id or count.tag('x')>1">
                <button class="icon-btn" onclick="CYOA.editor.ruleBuilder.removeRequirement(${index})">×</button>
            </div>
        `).join('');
    }

    addRequirement() {
        if (!this.currentItem) return;
        if (!this.currentItem.requirements) this.currentItem.requirements = [];
        this.currentItem.requirements.push('');
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

    renderIncompatible() {
        if (!this.currentItem) return;
        const container = document.getElementById('incompatible-list');
        if (!container) return;
        const incomp = this.currentItem.incompatible || [];
        if (incomp.length === 0) {
            container.innerHTML = '<div style="color:#666; font-size:0.8rem; text-align:center; padding:2px;">No incompatibilities</div>';
            return;
        }
        container.innerHTML = incomp.map((id, index) => `
            <div class="compact-row" style="grid-template-columns: 1fr 24px;">
                <input type="text" value="${id}" 
                       onchange="CYOA.editor.ruleBuilder.updateIncompatible(${index}, this.value)"
                       placeholder="item_id">
                <button class="icon-btn" onclick="CYOA.editor.ruleBuilder.removeIncompatible(${index})">×</button>
            </div>
        `).join('');
    }

    addIncompatible() {
        if (!this.currentItem) return;
        if (!this.currentItem.incompatible) this.currentItem.incompatible = [];
        this.currentItem.incompatible.push('');
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

    updateParent() {
        if (window.CYOA?.editor) {
            window.CYOA.editor.updateCodePreview();
            window.CYOA.editor.engine.recalculate();
            window.CYOA.editor.renderer.updateUI();
        }
    }
}