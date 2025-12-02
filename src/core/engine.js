/**
 * Game Engine - Core game logic and state management
 * 
 * Architecture v2 (Pages):
 * - config.pages[] contains pages
 * - Each page has .image and .layout[]
 * - layout[] contains items and groups (mixed, sorted by coords)
 * - Groups contain their own .items[]
 * - Flat Maps for O(1) lookups
 */

import { RuleEvaluator } from './rules.js';
import { GameState } from './state.js';
import { EffectProcessor } from './effects.js';

export class GameEngine {
    constructor(config) {
        this.config = config;
        this.isTestConfig = true;

        // === Flat lookup maps (built from hierarchical config) ===
        this.itemMap = new Map();       // itemId -> item object
        this.itemToGroup = new Map();   // itemId -> group object (or null for standalone)
        this.itemToPage = new Map();    // itemId -> page object
        this.groupMap = new Map();      // groupId -> group object
        this.groupToPage = new Map();   // groupId -> page object

        this.state = new GameState(config);
        this.rules = new RuleEvaluator(this);
        this.effects = new EffectProcessor(this);
        this.listeners = {};
        
        this.modifiers = {
            cost: [] 
        };
        
        this.defaults = {
            groupRules: {}
        };
        
        this.buildMaps();
        this.initDefaults();

        console.log('🎮 Engine initialized (v2 - Pages Architecture)');
    }

    /**
     * Build flat lookup maps from hierarchical page/layout config
     */
    buildMaps() {
        this.itemMap.clear();
        this.itemToGroup.clear();
        this.itemToPage.clear();
        this.groupMap.clear();
        this.groupToPage.clear();

        const pages = this.config.pages || [];
        
        for (const page of pages) {
            const layout = page.layout || [];
            
            for (const element of layout) {
                if (element.type === 'group') {
                    // Register group
                    this.groupMap.set(element.id, element);
                    this.groupToPage.set(element.id, page);
                    
                    // Register items inside group
                    const items = element.items || [];
                    for (const item of items) {
                        this.itemMap.set(item.id, item);
                        this.itemToGroup.set(item.id, element);
                        this.itemToPage.set(item.id, page);
                    }
                } else if (element.type === 'item') {
                    // Standalone item (not in any group)
                    this.itemMap.set(element.id, element);
                    this.itemToGroup.set(element.id, null);
                    this.itemToPage.set(element.id, page);
                }
            }
        }

        console.log(`📊 Maps built: ${this.itemMap.size} items, ${this.groupMap.size} groups`);
    }

    /**
     * Load a completely new configuration (e.g. from file)
     */
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
        for (const [groupId, group] of this.groupMap) {
            if (group.rules) {
                this.defaults.groupRules[groupId] = JSON.parse(JSON.stringify(group.rules));
            }
        }
    }

    restoreDefaults() {
        for (const [groupId, group] of this.groupMap) {
            if (this.defaults.groupRules[groupId]) {
                group.rules = JSON.parse(JSON.stringify(this.defaults.groupRules[groupId]));
            }
        }
    }

    // ==================== SELECTION ====================

    select(itemId) {
        const item = this.findItem(itemId);
        if (!item) return false;

        const group = this.findGroupForItem(itemId);
        // Group can be null for standalone items - that's OK

        if (!this.canSelect(item, group)) return false;

        const currentQty = this.state.selected.get(itemId) || 0;
        const maxQty = item.max_quantity || 1;

        if (currentQty >= maxQty) return false;

        // Radio logic (only if item is in a group with max_choices)
        if (group && group.rules?.max_choices) {
            if (currentQty === 0 && group.rules.max_choices === 1) {
                // Deselect others in this group
                const groupItems = group.items || [];
                for (const i of groupItems) {
                    if (this.state.selected.has(i.id) && i.id !== itemId) {
                        this.state.selected.delete(i.id);
                    }
                }
            } else {
                const totalInGroup = this.getGroupQty(group);
                if (totalInGroup >= group.rules.max_choices) {
                    console.log(`Max choices reached in ${group.id}`);
                    return false;
                }
            }
        }

        // Roll dice logic
        if (item.effects) {
            const rollEffect = item.effects.find(e => e.type === 'roll_dice');
            if (rollEffect && !this.state.rollResults.has(itemId)) {
                const min = parseInt(rollEffect.min) || 1;
                const max = parseInt(rollEffect.max) || 6;
                const result = Math.floor(Math.random() * (max - min + 1)) + min;
                this.state.rollResults.set(itemId, result);
                console.log(`🎲 Rolled for ${itemId}: ${result}`);
            }
        }

        this.state.selected.set(itemId, currentQty + 1);
        this.recalculate(); 
        this.emit('selection', { itemId, selected: true, qty: currentQty + 1 });
        return true;
    }

    deselect(itemId) {
        if (!this.state.selected.has(itemId)) return false;

        const currentQty = this.state.selected.get(itemId);
        
        if (currentQty > 1) {
            this.state.selected.set(itemId, currentQty - 1);
        } else {
            this.state.selected.delete(itemId);
        }

        this.recalculate();
        this.emit('selection', { itemId, selected: false, qty: currentQty - 1 });
        return true;
    }

    toggle(itemId) {
        if (this.state.selected.has(itemId)) {
            return this.deselect(itemId);
        } else {
            return this.select(itemId);
        }
    }

    // ==================== VALIDATION ====================

    canSelect(item, group) {
        if (!this.rules.checkRequirements(item)) return false;
        if (!this.rules.checkIncompatible(item)) return false;
        return true;
    }

    // ==================== CALCULATION ====================

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
            
            // Use group id or '_standalone' for items without group
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

    // ==================== HELPERS (O(1) lookups) ====================

    findItem(itemId) {
        return this.itemMap.get(itemId) || null;
    }

    findGroupForItem(itemId) {
        // Returns the group object, or null if standalone
        if (!this.itemToGroup.has(itemId)) return null;
        return this.itemToGroup.get(itemId);
    }

    findPageForItem(itemId) {
        return this.itemToPage.get(itemId) || null;
    }

    findGroup(groupId) {
        return this.groupMap.get(groupId) || null;
    }

    getSelectedInGroup(group) {
        if (!group || !group.items) return [];
        return group.items.filter(i => this.state.selected.has(i.id));
    }

    getGroupQty(group) {
        if (!group || !group.items) return 0;
        let total = 0;
        for (const item of group.items) {
            total += (this.state.selected.get(item.id) || 0);
        }
        return total;
    }

    /**
     * Get all items as array (for iteration)
     */
    getAllItems() {
        return Array.from(this.itemMap.values());
    }

    /**
     * Get all groups as array (for iteration)
     */
    getAllGroups() {
        return Array.from(this.groupMap.values());
    }

    // ==================== EVENTS ====================

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