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

        // Debug toggle
        const debugBtn = document.getElementById('debug-toggle');
        if (debugBtn) {
            debugBtn.addEventListener('click', () => this.toggleDebug());
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

        const isActive = document.body.classList.contains('text-mode');
        console.log(isActive ? '📖 Text mode ON' : '📖 Text mode OFF');
    }

    toggleDebug() {
        document.body.classList.toggle('debug-mode');
        const btn = document.getElementById('debug-toggle');
        if (btn) {
            btn.classList.toggle('active');
        }

        const isActive = document.body.classList.contains('debug-mode');
        
        // Enable/disable editor
        if (isActive) {
            this.editor.enable();
            // Setup form listeners after UI is created
            setTimeout(() => this.editor.setupFormListeners(), 100);
        } else {
            this.editor.disable();
        }
        
        console.log(isActive ? '🐞 Debug mode ON' : '🐞 Debug mode OFF');
    }

    reset() {
        if (confirm('Reset all selections?')) {
            this.engine.reset();
            console.log('🔄 Reset complete');
        }
    }
}