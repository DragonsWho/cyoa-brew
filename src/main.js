/**
 * CYOA Interactive System - Main Entry Point
 * 
 * This file initializes the entire system:
 * 1. Loads config from JSON
 * 2. Creates game engine
 * 3. Creates UI renderer
 * 4. Sets up controls
 */

import '../styles/main.css';
import '../styles/themes.css';

import { GameEngine } from './core/engine.js';
import { UIRenderer } from './ui/renderer.js';
import { ControlPanel } from './ui/controls.js';

// Global state
let engine, renderer, controls;

async function init() {
    console.log('🚀 Starting CYOA Interactive System...');
    
    try {
        const response = await fetch('config/test_config.json');
        
        if (!response.ok) {
            throw new Error(`Config not found (${response.status})`);
        }
        
        const config = await response.json();
        console.log('✅ Config loaded:', config.meta?.title || 'Untitled');

        engine = new GameEngine(config);
        renderer = new UIRenderer(engine);
        controls = new ControlPanel(engine, renderer);

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
                        Make sure you're running via HTTP server
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
    get config() { return engine?.config; }
};

console.log('💡 Debug commands available:');
console.log('  CYOA.engine.select("item_id")  - Select an item');
console.log('  CYOA.engine.reset()            - Reset everything');
console.log('  CYOA.editor.enable()           - Enable editor');
console.log('  CYOA.state                     - View current state');