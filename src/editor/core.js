/**
 * src/ui/editor/core.js
 * CYOA Editor - Visual editing mode
 * Fully Modular Architecture (Refactored)
 */

import { RuleBuilder } from '../ui/rule-builder.js';
import { AutoDetector } from './utils/autodetect.js'; 
import { HistoryManager } from './history.js';

// Geometry & Input (unchanged)
import { EditorGeometryMixin } from './geometry.js';
import { EditorInputMixin } from './input.js';

// Actions (split into 6 modules)
import { CRUDMixin } from './actions/crud.js';
import { MovementMixin } from './actions/movement.js';
import { AlignmentMixin } from './actions/alignment.js';
import { SplittingMixin } from './actions/splitting.js';
import { ClipboardMixin } from './actions/clipboard.js';
import { NavigationMixin } from './actions/navigation.js';

// UI (split into 6 modules)
import { SidebarMixin } from './ui/sidebar.js';
import { ChoicePanelMixin } from './ui/choice-panel.js';
import { GroupPanelMixin } from './ui/group-panel.js';
import { SettingsPanelMixin } from './ui/settings-panel.js';
import { ListenersMixin } from './ui/listeners.js';
import { SelectionMixin } from './ui/selection.js';

// Integrations
import { LLMCoreMixin } from './integrations/llm/core.js';
import { ManualModeMixin } from './integrations/llm/manual-mode.js';
import { ResponseHandlerMixin } from './integrations/llm/response-handler.js';
import { LLMListenersMixin } from './integrations/llm/ui-listeners.js';
import { SAMCoreMixin } from './integrations/sam/core.js';
import { SAMListenersMixin } from './integrations/sam/ui-listeners.js';

// IO & Menus & Helpers
import { EditorIOMixin } from './io.js';
import { EditorMenusMixin } from './menus.js'; 
import { EditorHelpersMixin } from './utils/helpers.js';

export class CYOAEditor {
    constructor(engine, renderer) {
        this.engine = engine;
        this.renderer = renderer;
        this.ruleBuilder = new RuleBuilder(engine);
        this.autoDetector = new AutoDetector(); 
        this.history = new HistoryManager(this);
        
        this.selectedItem = null;
        this.selectedGroup = null;
        this.selectedItems = [];
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
        this.resizeMode = null; 
        this.dragStart = { x: 0, y: 0 };
        this.initialRect = {};
        this.initialRects = []; 
        this.handleSize = 15; 
        this.dragContext = null;
        
        // Marquee Selection State
        this.isMarqueeSelecting = false;
        this.marqueeStart = { x: 0, y: 0 };
        this.marqueeBox = null;

        // Creation Drag State (Z/X drawing)
        this.creationState = null;

        // Split State
        this.splitState = null;

        // Context Menu & Clipboard State
        this.contextMenuContext = null; 
        this.clipboard = null;
        
        // Input Flags
        this.transformMode = 'move'; 
        this.zoomLevel = 1; 
        this.isHoldingZ = false;
        this.isHoldingX = false;
        
        this.enabled = false;
        this.triggerLabelCheck = null;

        // LLM Config
        this.llmConfig = {
            provider: 'openrouter', 
            baseUrl: 'https://openrouter.ai/api/v1',
            apiKey: '',
            model: 'google/gemini-2.0-flash-exp:free'
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
        
        if (this.marqueeBox) this.marqueeBox.remove();
        
        const splitGuide = document.getElementById('editor-split-guide');
        if (splitGuide) splitGuide.remove();

        this.setZoom(1);

        this.removeEventListeners();
        document.querySelectorAll('.item-zone, .info-zone').forEach(el => {
            el.classList.remove('editable', 'editor-selected');
        });
        console.log('✏️ Editor disabled');
    }
}

// ==================== APPLY MIXINS ====================

// 1. Utilities (Must be applied first)
Object.assign(CYOAEditor.prototype, EditorHelpersMixin);
Object.assign(CYOAEditor.prototype, EditorGeometryMixin);

// 2. IO
Object.assign(CYOAEditor.prototype, EditorIOMixin);

// 3. Actions (6 modules)
Object.assign(CYOAEditor.prototype, CRUDMixin);
Object.assign(CYOAEditor.prototype, MovementMixin);
Object.assign(CYOAEditor.prototype, AlignmentMixin);
Object.assign(CYOAEditor.prototype, SplittingMixin);
Object.assign(CYOAEditor.prototype, ClipboardMixin);
Object.assign(CYOAEditor.prototype, NavigationMixin);

// 4. Input
Object.assign(CYOAEditor.prototype, EditorInputMixin);

// 5. UI (6 modules)
Object.assign(CYOAEditor.prototype, SidebarMixin);
Object.assign(CYOAEditor.prototype, ChoicePanelMixin);
Object.assign(CYOAEditor.prototype, GroupPanelMixin);
Object.assign(CYOAEditor.prototype, SettingsPanelMixin);
Object.assign(CYOAEditor.prototype, ListenersMixin);
Object.assign(CYOAEditor.prototype, SelectionMixin);

// 6. Integrations
Object.assign(CYOAEditor.prototype, LLMCoreMixin);
Object.assign(CYOAEditor.prototype, ManualModeMixin);
Object.assign(CYOAEditor.prototype, ResponseHandlerMixin);
Object.assign(CYOAEditor.prototype, LLMListenersMixin);
Object.assign(CYOAEditor.prototype, SAMCoreMixin);
Object.assign(CYOAEditor.prototype, SAMListenersMixin);

// 7. Menus
Object.assign(CYOAEditor.prototype, EditorMenusMixin);