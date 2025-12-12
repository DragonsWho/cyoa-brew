/**
 * src/ui/panzoom-manager.js
 * Handles Smooth Zooming & Panning using CSS Transforms.
 */

import Panzoom from '@panzoom/panzoom';

export class PanzoomManager {
    constructor(engine) {
        this.engine = engine;
        this.element = document.getElementById('game-wrapper');
        this.container = document.body;
        this.instance = null;
        this.enabled = true;

        this.init();
    }

    init() {
        if (!this.element) return;

        this.instance = Panzoom(this.element, {
            maxScale: 5,        
            minScale: 0.1,      
            startScale: 1,      
            contain: 'outside', 
            noBind: true        
        });

        this.container.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
        
        this.container.addEventListener('pointerdown', this.handlePointerDown.bind(this));
        this.container.addEventListener('pointermove', this.handlePointerMove.bind(this));
        this.container.addEventListener('pointerup', this.handlePointerUp.bind(this));
        this.container.addEventListener('pointerleave', this.handlePointerUp.bind(this));
        
        console.log('🎥 Panzoom Camera Initialized');
    }

    onWheel(e) {
        if (!this.enabled) return;
        e.preventDefault(); 
        this.instance.zoomWithWheel(e);
    }

    handlePointerDown(e) {
        if (!this.enabled) return;
        if (e.target.closest('#points-bar') || e.target.closest('.bottom-tools') || e.target.closest('.modal-content')) {
            return;
        }
        this.instance.handleDown(e);
    }

    handlePointerMove(e) {
        if (!this.enabled) return;
        this.instance.handleMove(e);
    }

    handlePointerUp(e) {
        if (!this.enabled) return;
        this.instance.handleUp(e);
    }

    enable() { this.enabled = true; }
    disable() { this.enabled = false; }
}