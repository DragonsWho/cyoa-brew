/**
 * src\core\engine.js
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
        this.itemToGroup = new Map();   // itemId -> group object (Logical Master Group)
        this.itemToPage = new Map();    // itemId -> page object
        this.groupMap = new Map();      // groupId -> group object (Logical Master Group)
        this.groupToPage = new Map();   // groupId -> page object
        
        // NEW: Map to store ALL items belonging to a group ID across multiple pages
        this.groupItemsMap = new Map(); // groupId -> Array<Item>

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

        console.log('🎮 Engine initialized (v2.1 - Split Groups Support)');
    }

    /**
     * Build flat lookup maps from hierarchical page/layout config
     * Supports "Split Groups" (Same ID on different pages)
     */
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
                    // Logic for Split Groups:
                    // If we've seen this Group ID before, use the FIRST one as the "Master" (Logical) group.
                    // This ensures rules like 'max_choices' are taken from a single source of truth.
                    let logicalGroup = this.groupMap.get(element.id);

                    if (!logicalGroup) {
                        // First time seeing this group
                        logicalGroup = element;
                        this.groupMap.set(element.id, element);
                        this.groupToPage.set(element.id, page);
                    }

                    // Aggregate items from this chunk into the global list for this group ID
                    let currentGroupItems = this.groupItemsMap.get(element.id) || [];
                    if (element.items && element.items.length > 0) {
                        currentGroupItems = currentGroupItems.concat(element.items);
                    }
                    this.groupItemsMap.set(element.id, currentGroupItems);
                    
                    // Register items
                    const items = element.items || [];
                    for (const item of items) {
                        this.itemMap.set(item.id, item);
                        // IMPORTANT: Map item to the Logical (Master) Group, not necessarily the local container
                        this.itemToGroup.set(item.id, logicalGroup);
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

        console.log(`📊 Maps built: ${this.itemMap.size} items, ${this.groupMap.size} logical groups`);
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

        // --- Check selectable property ---
        if (item.selectable === false) return false;

        const group = this.findGroupForItem(itemId);
        
        if (!this.canSelect(item, group)) return false;

        const currentQty = this.state.selected.get(itemId) || 0;
        const maxQty = item.max_quantity !== undefined ? item.max_quantity : 1;

        if (currentQty >= maxQty) return false;

        // Radio logic (only if item is in a group with max_choices)
        if (group && group.rules?.max_choices && currentQty >= 0) {
            if (currentQty === 0 && group.rules.max_choices === 1) {
                // Deselect others in this group (across ALL pages)
                const groupItems = this.getAllItemsInGroup(group.id);
                for (const i of groupItems) {
                    if (this.state.selected.has(i.id) && i.id !== itemId) {
                        const otherQty = this.state.selected.get(i.id);
                        if (otherQty > 0) this.state.selected.delete(i.id);
                    }
                }
            } else {
                // Check if adding 1 would exceed group limit (sum of positive selections)
                const totalInGroup = this.getGroupQty(group);
                if (totalInGroup >= group.rules.max_choices) {
                    console.log(`Max choices reached in ${group.id}`);
                    return false;
                }
            }
        }

        // Roll dice logic (only trigger on 0 -> 1 transition)
        if (currentQty === 0 && item.effects) {
            const rollEffect = item.effects.find(e => e.type === 'roll_dice');
            if (rollEffect && !this.state.rollResults.has(itemId)) {
                const min = parseInt(rollEffect.min) || 1;
                const max = parseInt(rollEffect.max) || 6;
                const result = Math.floor(Math.random() * (max - min + 1)) + min;
                this.state.rollResults.set(itemId, result);
                console.log(`🎲 Rolled for ${itemId}: ${result}`);
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
        // Returns the group object (Logical Master), or null if standalone
        if (!this.itemToGroup.has(itemId)) return null;
        return this.itemToGroup.get(itemId);
    }

    findPageForItem(itemId) {
        return this.itemToPage.get(itemId) || null;
    }

    findGroup(groupId) {
        return this.groupMap.get(groupId) || null;
    }

    /**
     * Helper to get ALL items belonging to a group ID (across all pages)
     */
    getAllItemsInGroup(groupId) {
        return this.groupItemsMap.get(groupId) || [];
    }

    /**
     * Get array of selected items that belong to this group (logically)
     */
    getSelectedInGroup(group) {
        if (!group) return [];
        const allItems = this.getAllItemsInGroup(group.id);
        return allItems.filter(i => this.state.selected.has(i.id));
    }

    /**
     * Count total selected quantity for this group (logically across pages)
     */
    getGroupQty(group) {
        if (!group) return 0;
        const allItems = this.getAllItemsInGroup(group.id);
        
        let total = 0;
        for (const item of allItems) {
            total += (this.state.selected.get(item.id) || 0);
        }
        return total;
    }

    getAllItems() {
        return Array.from(this.itemMap.values());
    }

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