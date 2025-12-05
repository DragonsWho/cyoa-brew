
/**
 * src/ui/editor/history.js
 * History Manager - Handles Undo/Redo functionality for the Editor
 */

import { ProjectStorage } from '../utils/storage.js';

export class HistoryManager {
    constructor(editor) {
        this.editor = editor;
        this.undoStack = [];
        this.redoStack = [];
        this.maxHistory = 50;
        this.batching = false;
        this.initialState = null;
    }

    /**
     * Create a snapshot of the current configuration
     */
    createSnapshot() {
        // Deep copy the config using the storage helper or JSON
        return JSON.parse(JSON.stringify(this.editor.engine.config));
    }

    /**
     * Push a new state to history.
     * @param {string} actionType - Optional label for the action
     */
    push(actionType = 'unknown') {
        if (this.batching) return; // Don't push intermediate states during batch

        const snapshot = this.createSnapshot();
        
        // If snapshot is identical to last state, ignore (optional optim)
        // For simplicity, we just push
        
        this.undoStack.push(snapshot);
        if (this.undoStack.length > this.maxHistory) {
            this.undoStack.shift();
        }
        
        // Clear redo stack on new action
        this.redoStack = [];
        
        console.log(`📝 History: Pushed state (${actionType}). Stack: ${this.undoStack.length}`);
    }

    /**
     * Start a batch operation (e.g., holding a key down).
     * Saves the state BEFORE the batch starts.
     */
    startBatch() {
        if (this.batching) return;
        this.push('batch_start'); // Save state before changes
        this.batching = true;
    }

    /**
     * End a batch operation.
     */
    endBatch() {
        this.batching = false;
        // We don't push here, because the state is now "current". 
        // We only needed to save the "before" state.
    }

    undo() {
        if (this.undoStack.length === 0) {
            console.log('📝 History: Nothing to undo');
            return;
        }

        // Save current state to redo stack
        const currentConfig = this.createSnapshot();
        this.redoStack.push(currentConfig);

        const prevState = this.undoStack.pop();
        this.restore(prevState);
        console.log('↩️ Undo');
    }

    redo() {
        if (this.redoStack.length === 0) {
            console.log('📝 History: Nothing to redo');
            return;
        }

        const nextState = this.redoStack.pop();
        
        // Save current state to undo stack before restoring next
        this.undoStack.push(this.createSnapshot());
        // Maintain stack limit logic during redo as well
        if (this.undoStack.length > this.maxHistory) {
            this.undoStack.shift();
        }

        this.restore(nextState);
        console.log('↪️ Redo');
    }

    restore(config) {
        // Load config into engine
        this.editor.engine.config = config;
        
        // Rebuild maps and UI
        this.editor.engine.buildMaps();
        this.editor.engine.state.resetCurrencies(); // Refresh currencies just in case
        this.editor.engine.recalculate();
        
        // Refresh editor UI
        this.editor.renderer.renderAll();
        this.editor.renderPagesList();
        
        // Try to restore selection if ID still exists
        if (this.editor.selectedItem) {
            const item = this.editor.engine.findItem(this.editor.selectedItem.id);
            if (item) {
                this.editor.selectChoice(item, document.getElementById(`btn-${item.id}`));
            } else {
                this.editor.deselectChoice();
            }
        }
    }
}