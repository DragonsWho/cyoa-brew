/**
 * Control Panel - Handles UI controls (buttons, settings)
 */

import { CYOAEditor } from './editor.js';

export class ControlPanel {
    constructor(engine, renderer) {
        this.engine = engine;
        this.renderer = renderer;
        this.editor = new CYOAEditor(engine, renderer);

        this.setupControls();
        console.log('🎮 Controls initialized');
    }

    // ==================== SETUP ====================

    setupControls() {
        // Text toggle
        const textBtn = document.getElementById('text-toggle');
        if (textBtn) {
            textBtn.addEventListener('click', () => this.toggleText());
        }

        // Edit/Debug toggle (Renamed)
        const editBtn = document.getElementById('edit-toggle');
        if (editBtn) {
            editBtn.addEventListener('click', () => this.toggleEditMode());
        }

        // Reset
        const resetBtn = document.getElementById('reset-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.reset());
        }
    }

    // ==================== ACTIONS ====================

    toggleText() {
        document.body.classList.toggle('text-mode');
        const btn = document.getElementById('text-toggle');
        if (btn) {
            btn.classList.toggle('active');
        }
    }

    toggleEditMode() {
        // Toggle the main edit class
        document.body.classList.toggle('edit-mode-active');
        
        const btn = document.getElementById('edit-toggle');
        if (btn) {
            btn.classList.toggle('active');
        }

        const isActive = document.body.classList.contains('edit-mode-active');
        
        // Enable/disable editor logic
        if (isActive) {
            this.editor.enable();
            // Also enable visual debug borders for items by default
            document.body.classList.add('show-zones'); 
        } else {
            this.editor.disable();
            document.body.classList.remove('show-zones');
            document.body.classList.remove('edit-mode-choice');
            document.body.classList.remove('edit-mode-group');
        }
        
        console.log(isActive ? '✏️ Edit mode ON' : '✏️ Edit mode OFF');
    }

    reset() {
        if (confirm('Reset all selections?')) {
            this.engine.reset();
            console.log('🔄 Reset complete');
        }
    }
}