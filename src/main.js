/**
 * src\main.js
 * CYOA Interactive System - Main Entry Point
 */

import '../styles/main.css';
import '../styles/themes.css';

import { GameEngine } from './core/engine.js';
import { UIRenderer } from './ui/renderer.js';
import { ControlPanel } from './ui/controls.js';
import { BuildManager } from './ui/build-manager.js';
import { HelpManager } from './ui/help-manager.js'; // Import HelpManager

// Global state
let engine, renderer, controls, buildManager, helpManager;

async function init() {
    console.log('🚀 Starting CYOA Interactive System...');
    
    try {
        const response = await fetch('project.json');
        
        if (!response.ok) {
            throw new Error(`Config not found (${response.status}). Ensure 'project.json' is in the root directory.`);
        }
        
        const config = await response.json();
        console.log('✅ Config loaded:', config.meta?.title || 'Untitled');

        engine = new GameEngine(config);
        renderer = new UIRenderer(engine);
        controls = new ControlPanel(engine, renderer);
        buildManager = new BuildManager(engine, renderer);
        helpManager = new HelpManager(); // Initialize HelpManager

        // Bind Build Button
        const buildBtn = document.getElementById('build-toggle');
        if (buildBtn) {
            buildBtn.addEventListener('click', () => buildManager.open());
        }

        await renderer.renderAll();
         
        engine.recalculate();

        const loading = document.getElementById('loading');
        if (loading) {
            loading.classList.add('hidden');
            setTimeout(() => loading.remove(), 300);
        }

        console.log('✨ CYOA loaded successfully!');
        console.log('💡 Tip: Click 🐞 Debug to enter edit mode');

    } catch (error) {
        console.error('❌ Initialization failed:', error);
        
        const loading = document.getElementById('loading');
        if (loading) {
            loading.innerHTML = `
                <div style="color: #ff4444;">
                    ❌ Failed to load CYOA<br>
                    <small>${error.message}</small><br><br>
                    <small style="color: #888;">
                        Check console (F12) for details<br>
                        Make sure 'project.json' exists next to index.html
                    </small>
                </div>
            `;
        }
    }
}

init();

// Export for debugging via browser console
window.CYOA = {
    get engine() { return engine; },
    get renderer() { return renderer; },
    get controls() { return controls; },
    get editor() { return controls?.editor; },
    get state() { return engine?.state; },
    get config() { return engine?.config; },
    get buildManager() { return buildManager; },
    get helpManager() { return helpManager; } // Export helpManager globally
};
 