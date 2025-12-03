/**
 * CYOA Editor - Visual editing mode
 * Modular Architecture
 */

import { RuleBuilder } from '../rule-builder.js';
import { AutoDetector } from '../../utils/autodetect.js';

import { EditorGeometryMixin } from './geometry.js';
import { EditorInputMixin } from './input.js';
import { EditorUIMixin } from './ui.js';
import { EditorActionsMixin } from './actions.js';
import { EditorIntegrationsMixin } from './integrations.js';

export class CYOAEditor {
    constructor(engine, renderer) {
        this.engine = engine;
        this.renderer = renderer;
        this.ruleBuilder = new RuleBuilder(engine);
        this.autoDetector = new AutoDetector(); 
        
        this.selectedItem = null;
        this.selectedGroup = null;
        this.activePageIndex = 0;
        this.activeTab = 'choice'; 
        
        // Helpers for UI measurement
        this.measureContext = document.createElement('canvas').getContext('2d');
        this.mirrorDiv = document.createElement('div');
        this.mirrorDiv.style.cssText = 'position:absolute; visibility:hidden; height:auto; overflow:hidden; white-space:pre-wrap; word-wrap:break-word;';
        document.body.appendChild(this.mirrorDiv);

        // Drag & Resize State
        this.isDragging = false;
        this.isResizing = false;
        this.resizeMode = null; // 'tl', 'tr', 'bl', 'br'
        this.dragStart = { x: 0, y: 0 };
        this.initialRect = {};
        this.handleSize = 15; 
        this.dragContext = null;
        
        // Context Menu & Clipboard State
        this.contextMenuContext = null; // { x, y, pageIndex, targetType, targetId }
        this.clipboard = null; // { type: 'item'|'group', data: object }
        
        this.enabled = false;
        this.triggerLabelCheck = null;

        // LLM Defaults
        this.llmConfig = {
            provider: 'google', 
            baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models/',
            apiKey: '',
            model: 'gemini-2.0-flash',
            systemPrompt: `You are a layout assistant. I have a JSON with page layouts containing items and groups with coordinates.
Your task is to:
1. "Smart Align" - fix coordinates so elements are properly aligned in rows/columns
2. Group related items together
3. Keep the structure: pages[] -> layout[] -> items and groups

Return ONLY valid JSON, no explanations.`
        };

        console.log('✏️ Editor initialized');
    }

    enable() {
        if (this.enabled) return;
        this.enabled = true;
        this.createEditorUI();
        this.attachEventListeners();
        this.switchTab('choice');
        console.log('✏️ Editor enabled');
    }

    disable() {
        if (!this.enabled) return;
        this.enabled = false;
        const sidebar = document.getElementById('editor-sidebar');
        if (sidebar) sidebar.remove();
        
        const ctxMenu = document.getElementById('editor-context-menu');
        if (ctxMenu) ctxMenu.remove();

        this.removeEventListeners();
        document.querySelectorAll('.item-zone, .info-zone').forEach(el => {
            el.classList.remove('editable', 'editor-selected');
        });
        console.log('✏️ Editor disabled');
    }
}

// Apply Mixins
Object.assign(CYOAEditor.prototype, EditorGeometryMixin);
Object.assign(CYOAEditor.prototype, EditorInputMixin);
Object.assign(CYOAEditor.prototype, EditorUIMixin);
Object.assign(CYOAEditor.prototype, EditorActionsMixin);
Object.assign(CYOAEditor.prototype, EditorIntegrationsMixin);