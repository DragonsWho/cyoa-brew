/**
 * src\core\engine.js
 * Game Engine - Core game logic and state management
 */

import { RuleEvaluator } from './rules.js';
import { GameState } from './state.js';
import { EffectProcessor } from './effects.js';

export class GameEngine {
    constructor(config) {
        this.config = config;
        this.isTestConfig = true;

        // === Flat lookup maps ===
        this.itemMap = new Map();       
        this.itemToGroup = new Map();   
        this.itemToPage = new Map();    
        this.groupMap = new Map();      
        this.groupToPage = new Map();   
        this.groupItemsMap = new Map(); 

        this.state = new GameState(config);
        this.rules = new RuleEvaluator(this);
        this.effects = new EffectProcessor(this);
        this.listeners = {};
        
        this.modifiers = { cost: [] };
        this.defaults = { groupRules: {} };
        
        this.buildMaps();
        this.initDefaults();

        console.log('🎮 Engine initialized (v2.1 - Split Groups Support)');
    }

    // ... buildMaps() ... (No change)
    buildMaps() {
        this.itemMap.clear();
        this.itemToGroup.clear();
        this.itemToPage.clear();
        this.groupMap.clear();
        this.groupToPage.clear();
        this.groupItemsMap.clear();

        const pages = this.config.pages || [];
        
        for (const page of pages) {
            const layout = page.layout || [];
            for (const element of layout) {
                if (element.type === 'group') {
                    let logicalGroup = this.groupMap.get(element.id);
                    if (!logicalGroup) {
                        logicalGroup = element;
                        this.groupMap.set(element.id, element);
                        this.groupToPage.set(element.id, page);
                    }
                    let currentGroupItems = this.groupItemsMap.get(element.id) || [];
                    if (element.items && element.items.length > 0) {
                        currentGroupItems = currentGroupItems.concat(element.items);
                    }
                    this.groupItemsMap.set(element.id, currentGroupItems);
                    const items = element.items || [];
                    for (const item of items) {
                        this.itemMap.set(item.id, item);
                        this.itemToGroup.set(item.id, logicalGroup);
                        this.itemToPage.set(item.id, page);
                    }
                } else if (element.type === 'item') {
                    this.itemMap.set(element.id, element);
                    this.itemToGroup.set(element.id, null);
                    this.itemToPage.set(element.id, page);
                }
            }
        }
    }

    // ... loadConfig() ... (No change)
    loadConfig(newConfig) {
        this.config = newConfig;
        this.isTestConfig = false;
        this.state = new GameState(newConfig);
        this.defaults.groupRules = {};
        this.buildMaps();
        this.initDefaults();
        this.emit('config_loaded');
        this.recalculate();
        console.log('📂 New Project Loaded:', this.config.meta?.title);
    }

    initDefaults() {
        // Init Group Rules Defaults
        for (const [groupId, group] of this.groupMap) {
            if (group.rules) {
                this.defaults.groupRules[groupId] = JSON.parse(JSON.stringify(group.rules));
            }
        }

        // Init Style Defaults if missing
        if (!this.config.style) {
            this.config.style = {};
        }

        const s = this.config.style;

        // === ACTIVE STYLE DEFAULTS ===
        s.borderColor = s.borderColor || '#00ff00';
        s.borderWidth = s.borderWidth !== undefined ? s.borderWidth : 3;
        
        const defaultRad = s.borderRadius !== undefined ? s.borderRadius : 12;
        if (s.radiusTL === undefined) s.radiusTL = defaultRad;
        if (s.radiusTR === undefined) s.radiusTR = defaultRad;
        if (s.radiusBR === undefined) s.radiusBR = defaultRad;
        if (s.radiusBL === undefined) s.radiusBL = defaultRad;
        
        s.shadowColor = s.shadowColor || '#00ff00';
        s.shadowWidth = s.shadowWidth !== undefined ? s.shadowWidth : 15;
        
        s.insetShadowColor = s.insetShadowColor || 'rgba(0, 255, 0, 0.2)';
        s.insetShadowWidth = s.insetShadowWidth !== undefined ? s.insetShadowWidth : 20;
        
        s.bodyColor = s.bodyColor || '#00ff00';
        s.bodyOpacity = s.bodyOpacity !== undefined ? s.bodyOpacity : 0.1;
        s.bodyImage = s.bodyImage || '';
        s.customCss = s.customCss || '';

        // === VISUAL CARD DEFAULTS ===
        s.visualBgColor = s.visualBgColor || '#222222';
        s.visualTitleColor = s.visualTitleColor || '#ffffff';
        s.visualTextColor = s.visualTextColor || '#cccccc';
        s.visualBorderColor = s.visualBorderColor || '#444444';
        s.visualBorderWidth = s.visualBorderWidth !== undefined ? s.visualBorderWidth : 1;
        s.visualRadius = s.visualRadius !== undefined ? s.visualRadius : 8;
        s.visualCustomCss = s.visualCustomCss || '';

        // === POINT BAR DEFAULTS (NEW) ===
        s.pointBarBg = s.pointBarBg || '#101010';
        s.pointBarLabelColor = s.pointBarLabelColor || '#cccccc';
        s.pointBarValueColor = s.pointBarValueColor || '#00ff88';

        // === DISABLED STYLE DEFAULTS ===
        s.disabledBorderColor = s.disabledBorderColor || '#555555';
        s.disabledBorderWidth = s.disabledBorderWidth !== undefined ? s.disabledBorderWidth : 0;
        
        if (s.disabledRadiusTL === undefined) s.disabledRadiusTL = defaultRad;
        if (s.disabledRadiusTR === undefined) s.disabledRadiusTR = defaultRad;
        if (s.disabledRadiusBR === undefined) s.disabledRadiusBR = defaultRad;
        if (s.disabledRadiusBL === undefined) s.disabledRadiusBL = defaultRad;

        s.disabledShadowColor = s.disabledShadowColor || '#000000';
        s.disabledShadowWidth = s.disabledShadowWidth !== undefined ? s.disabledShadowWidth : 0;

        s.disabledBodyColor = s.disabledBodyColor || '#000000';
        s.disabledBodyOpacity = s.disabledBodyOpacity !== undefined ? s.disabledBodyOpacity : 0.5;
        s.disabledBodyImage = s.disabledBodyImage || '';
        
        if (s.disabledCustomCss === undefined) {
            s.disabledCustomCss = 'background-image: repeating-linear-gradient(45deg, rgba(0,0,0,0.4), rgba(0,0,0,0.4) 10px, rgba(50,50,50,0.6) 10px, rgba(50,50,50,0.6) 20px);';
        }
    }

    // ... [Rest of the file remains unchanged] ...
    restoreDefaults() {
        for (const [groupId, group] of this.groupMap) {
            if (this.defaults.groupRules[groupId]) {
                group.rules = JSON.parse(JSON.stringify(this.defaults.groupRules[groupId]));
            }
        }
    }
    
    select(itemId) {
        const item = this.findItem(itemId);
        if (!item) return false;
        if (item.selectable === false) return false;

        const group = this.findGroupForItem(itemId);
        if (!this.canSelect(item, group)) return false;

        const currentQty = this.state.selected.get(itemId) || 0;
        const maxQty = item.max_quantity !== undefined ? item.max_quantity : 1;

        if (currentQty >= maxQty) return false;

        if (group && group.rules?.max_choices && currentQty >= 0) {
            if (currentQty === 0 && group.rules.max_choices === 1) {
                const groupItems = this.getAllItemsInGroup(group.id);
                for (const i of groupItems) {
                    if (this.state.selected.has(i.id) && i.id !== itemId) {
                        const otherQty = this.state.selected.get(i.id);
                        if (otherQty > 0) this.state.selected.delete(i.id);
                    }
                }
            } else {
                const totalInGroup = this.getGroupQty(group);
                if (totalInGroup >= group.rules.max_choices) {
                    return false;
                }
            }
        }

        if (currentQty === 0 && item.effects) {
            const rollEffect = item.effects.find(e => e.type === 'roll_dice');
            if (rollEffect && !this.state.rollResults.has(itemId)) {
                const min = parseInt(rollEffect.min) || 1;
                const max = parseInt(rollEffect.max) || 6;
                const result = Math.floor(Math.random() * (max - min + 1)) + min;
                this.state.rollResults.set(itemId, result);
            }
        }

        const newQty = currentQty + 1;
        if (newQty === 0) {
            this.state.selected.delete(itemId);
        } else {
            this.state.selected.set(itemId, newQty);
        }

        this.recalculate(); 
        this.emit('selection', { itemId, selected: true, qty: newQty });
        return true;
    }

    deselect(itemId) {
        const item = this.findItem(itemId);
        if (!item) return false;

        const currentQty = this.state.selected.get(itemId) || 0;
        const minQty = item.min_quantity !== undefined ? item.min_quantity : 0;

        if (currentQty <= minQty) return false;

        const newQty = currentQty - 1;
        if (newQty === 0) {
            this.state.selected.delete(itemId);
        } else {
            this.state.selected.set(itemId, newQty);
        }

        this.recalculate();
        this.emit('selection', { itemId, selected: false, qty: newQty });
        return true;
    }

    toggle(itemId) {
        const item = this.findItem(itemId);
        if (item && item.selectable === false) return false;
        if (this.state.selected.has(itemId)) {
            return this.deselect(itemId);
        } else {
            return this.select(itemId);
        }
    }

    canSelect(item, group) {
        if (!this.rules.checkRequirements(item)) return false;
        if (!this.rules.checkIncompatible(item)) return false;
        return true;
    }

    recalculate() {
        this.cleanupInvalidSelections();
        this.state.resetCurrencies();
        this.modifiers = { cost: [] };
        this.effects.applyAll();
        const groupDeltas = this.calculateGroupDeltas();
        this.applyBudgets(groupDeltas);
        this.applyDeltas(groupDeltas);
        this.emit('recalculate', { state: this.state });
    }

    cleanupInvalidSelections() {
        for (const itemId of this.state.selected.keys()) {
            const item = this.findItem(itemId);
            const group = this.findGroupForItem(itemId);
            if (!item || !this.canSelect(item, group)) {
                this.state.selected.delete(itemId);
            }
        }
    }

    calculateGroupDeltas() {
        const deltas = {};
        for (const itemId of this.state.selected.keys()) {
            const item = this.findItem(itemId);
            const group = this.findGroupForItem(itemId);
            const qty = this.state.selected.get(itemId);
            if (!item?.cost) continue;
            const groupKey = group ? group.id : '_standalone';
            if (!deltas[groupKey]) deltas[groupKey] = {};
            for (const cost of item.cost) {
                const unitValue = this.rules.evaluateCost(cost, item, group);
                const currencyId = cost.currency;
                if (!deltas[groupKey][currencyId]) deltas[groupKey][currencyId] = 0;
                deltas[groupKey][currencyId] += (unitValue * qty);
            }
        }
        return deltas;
    }

    applyBudgets(groupDeltas) {
        for (const [groupId, group] of this.groupMap) {
            if (!group.rules?.budget) continue;
            const budget = group.rules.budget;
            const targetGroups = [groupId, ...(budget.applies_to || [])];
            let totalSpent = 0;
            for (const gid of targetGroups) {
                if (groupDeltas[gid]?.[budget.currency] < 0) {
                    totalSpent += Math.abs(groupDeltas[gid][budget.currency]);
                }
            }
            const covered = Math.min(totalSpent, budget.amount);
            let remaining = covered;
            for (const gid of targetGroups) {
                if (remaining <= 0) break;
                if (groupDeltas[gid]?.[budget.currency] < 0) {
                    const debt = Math.abs(groupDeltas[gid][budget.currency]);
                    const pay = Math.min(debt, remaining);
                    groupDeltas[gid][budget.currency] += pay;
                    remaining -= pay;
                }
            }
            this.state.budgets[groupId] = {
                total: budget.amount,
                used: covered,
                remaining: budget.amount - covered
            };
        }
    }

    applyDeltas(groupDeltas) {
        for (const groupId in groupDeltas) {
            for (const currencyId in groupDeltas[groupId]) {
                if (this.state.currencies[currencyId] !== undefined) {
                    this.state.currencies[currencyId] += groupDeltas[groupId][currencyId];
                }
            }
        }
    }

    findItem(itemId) { return this.itemMap.get(itemId) || null; }
    findGroupForItem(itemId) { return this.itemToGroup.get(itemId) || null; }
    findPageForItem(itemId) { return this.itemToPage.get(itemId) || null; }
    findGroup(groupId) { return this.groupMap.get(groupId) || null; }
    getAllItemsInGroup(groupId) { return this.groupItemsMap.get(groupId) || []; }
    
    getSelectedInGroup(group) {
        if (!group) return [];
        const allItems = this.getAllItemsInGroup(group.id);
        return allItems.filter(i => this.state.selected.has(i.id));
    }

    getGroupQty(group) {
        if (!group) return 0;
        const allItems = this.getAllItemsInGroup(group.id);
        let total = 0;
        for (const item of allItems) {
            total += (this.state.selected.get(item.id) || 0);
        }
        return total;
    }

    getAllItems() { return Array.from(this.itemMap.values()); }
    getAllGroups() { return Array.from(this.groupMap.values()); }

    on(event, callback) {
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push(callback);
    }

    emit(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(cb => cb(data));
        }
    }

    reset() {
        this.state.reset();
        this.restoreDefaults(); 
        this.recalculate();
        this.emit('reset');
    }
}