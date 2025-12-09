/**
 * src/editor/ui/style-panel.js
 * Style Settings Panel
 */

import { STANDARD_PRESETS, FANCY_PRESETS, VISUAL_STANDARD_PRESETS, VISUAL_FANCY_PRESETS, DISABLED_PRESETS } from '../data/style-presets.js';

export function createStylePanelHTML() {
    const createOptions = (list) => list.map((p, i) => `<option value="${i}">${p.name}</option>`).join('');
    
    // Генерируем опции для 5 категорий
    const stdActiveOpts = `<option value="">-- Standard Active (Transparent) --</option>` + createOptions(STANDARD_PRESETS);
    const fancyActiveOpts = `<option value="">-- Fancy Active (CSS Effects) --</option>` + createOptions(FANCY_PRESETS);
    const visStdOpts = `<option value="">-- Visual Cards (Standard) --</option>` + createOptions(VISUAL_STANDARD_PRESETS);
    const visFancyOpts = `<option value="">-- Visual Cards (Fancy/Bold) --</option>` + createOptions(VISUAL_FANCY_PRESETS);
    const disOpts = `<option value="">-- Disabled Style --</option>` + createOptions(DISABLED_PRESETS);
    
    const isPreviewActive = document.body.classList.contains('editor-preview-active');
    const checkedAttr = isPreviewActive ? 'checked' : '';

    return `
        <div class="editor-section" style="padding:0; border-bottom:1px solid #222;">
            <div class="accordion-header collapsed" onclick="CYOA.editor.toggleAccordion(this)" style="padding: 10px;">
                <span>🎨 Card Styles & Presets</span>
            </div>
            
            <div class="accordion-content collapsed" style="padding: 0;">
                
                <!-- PREVIEW TOGGLE -->
                <div style="background: #252525; padding: 8px 10px; border-bottom: 1px solid #333; display:flex; align-items:center; justify-content:space-between;">
                    <span style="color:#aaa; font-size:0.8rem;">Test interactions:</span>
                    <div style="display:flex; align-items:center; gap:6px;">
                        <input type="checkbox" id="style-preview-mode" onchange="CYOA.editor.togglePreviewMode(this.checked)" style="cursor:pointer;" ${checkedAttr}>
                        <label for="style-preview-mode" style="cursor:pointer; font-size:0.85rem; color:#fff;">Preview Mode</label>
                    </div>
                </div>

                <!-- PRESETS SECTION -->
                <div class="editor-section" style="border-bottom: 1px solid #333; padding: 10px; background:#1e1e1e;">
                    <div style="font-size: 0.8rem; color: #888; margin-bottom: 5px;">⚡ Quick Presets</div>
                    
                    <div class="compact-list">
                        <!-- 1. ACTIVE TRANSPARENT -->
                        <select id="preset-sel-std" class="style-input" style="width:100%; text-align:left; margin-bottom:4px;" onchange="CYOA.editor.applyPreset('std_active', this)">
                            ${stdActiveOpts}
                        </select>
                        <select id="preset-sel-fancy" class="style-input" style="width:100%; text-align:left; margin-bottom:8px; border-color:#888;" onchange="CYOA.editor.applyPreset('fancy_active', this)">
                            ${fancyActiveOpts}
                        </select>
                        
                        <!-- 2. VISUAL CARDS -->
                        <select id="preset-sel-vis-std" class="style-input" style="width:100%; text-align:left; margin-bottom:4px; border-color:#2e7d32;" onchange="CYOA.editor.applyPreset('visual_std', this)">
                            ${visStdOpts}
                        </select>
                        <select id="preset-sel-vis-fancy" class="style-input" style="width:100%; text-align:left; margin-bottom:8px; border-color:#4CAF50;" onchange="CYOA.editor.applyPreset('visual_fancy', this)">
                            ${visFancyOpts}
                        </select>

                        <!-- 3. DISABLED -->
                        <select id="preset-sel-disabled" class="style-input" style="width:100%; text-align:left; border-color:#d32f2f;" onchange="CYOA.editor.applyPreset('disabled', this)">
                            ${disOpts}
                        </select>
                    </div>
                </div>

                <!-- ACTIVE STYLE EDITOR -->
                <div class="editor-section" style="border-bottom: 1px solid #333; padding-left: 5px;">
                    <div class="accordion-header collapsed" onclick="CYOA.editor.toggleAccordion(this)" style="font-size: 0.85rem; color: #ccc;">
                        ✏️ Transparent Card Settings
                    </div>
                    <div class="accordion-content collapsed">
                        <div class="style-row">
                            <label class="style-label">Frame</label>
                            <input type="color" id="style-border-color" class="style-input square-input" title="Frame Color">
                            <input type="number" id="style-border-width" class="style-input square-input thick-border" min="0" max="20" title="Frame Thickness">
                            <div style="display:flex; gap:2px; margin-left: auto;">
                                <input type="number" id="style-radius-tl" class="style-input square-input input-corner-tl" min="0" max="100">
                                <input type="number" id="style-radius-tr" class="style-input square-input input-corner-tr" min="0" max="100">
                                <input type="number" id="style-radius-bl" class="style-input square-input input-corner-bl" min="0" max="100">
                                <input type="number" id="style-radius-br" class="style-input square-input input-corner-br" min="0" max="100">
                            </div>
                        </div>
                        <div class="style-row">
                            <label class="style-label">Shadow</label>
                            <input type="color" id="style-shadow-color" class="style-input square-input">
                            <input type="number" id="style-shadow-width" class="style-input square-input thick-border" min="0" max="100">
                        </div>
                        <div class="style-row">
                            <label class="style-label">In.Glow</label>
                            <input type="color" id="style-inset-color" class="style-input square-input">
                            <input type="number" id="style-inset-width" class="style-input square-input thick-border" min="0" max="100">
                        </div>
                        <div class="style-row">
                            <label class="style-label">Body</label>
                            <input type="color" id="style-body-color" class="style-input square-input">
                            <input type="number" id="style-body-opacity" class="style-input square-input" style="width: 40px;" min="0" max="1" step="0.1">
                            <button class="style-input square-input" onclick="document.getElementById('style-bg-image-input').click()">🖼️</button>
                            <input type="file" id="style-bg-image-input" accept="image/*" style="display:none;">
                            <input type="text" id="style-custom-css" class="style-input thick-border" placeholder="css..." style="flex: 1;">
                        </div>
                    </div>
                </div>

                <!-- SPECIAL CARD STYLE EDITOR -->
                <div class="editor-section" style="border-bottom: 1px solid #333; padding-left: 5px;">
                    <div class="accordion-header collapsed" onclick="CYOA.editor.toggleAccordion(this)" style="font-size: 0.85rem; color: #4CAF50; font-weight:bold;">
                        🎴 Visual / Opaque Settings
                    </div>
                    <div class="accordion-content collapsed">
                        <div class="info-text" style="font-size:0.75rem; padding:5px; margin:5px 0;">
                            Overrides for cards marked as "Visual Card".
                        </div>
                         <div class="style-row">
                            <label class="style-label">Colors</label>
                            <input type="color" id="style-vis-bg-color" class="style-input square-input" title="Card Background">
                            <input type="color" id="style-vis-title-color" class="style-input square-input" title="Title Color">
                            <input type="color" id="style-vis-text-color" class="style-input square-input" title="Text Color">
                        </div>
                        <div class="style-row">
                            <label class="style-label">Frame</label>
                            <input type="color" id="style-vis-border-color" class="style-input square-input" title="Border Color">
                            <input type="number" id="style-vis-border-width" class="style-input square-input thick-border" min="0" max="10" title="Border Width">
                            <input type="number" id="style-vis-radius" class="style-input square-input thick-border" min="0" max="30" title="Corner Radius">
                        </div>
                    </div>
                </div>

                <!-- DISABLED STYLE EDITOR -->
                <div class="editor-section" style="border-bottom: 1px solid #333; padding-left: 5px;">
                    <div class="accordion-header collapsed" onclick="CYOA.editor.toggleAccordion(this)" style="font-size: 0.85rem; color: #ccc;">
                        🚫 Disabled Settings
                    </div>
                    <div class="accordion-content collapsed">
                        <div class="style-row">
                            <label class="style-label">Frame</label>
                            <input type="color" id="style-disabled-border-color" class="style-input square-input">
                            <input type="number" id="style-disabled-border-width" class="style-input square-input thick-border" min="0" max="20">
                            <div style="display:flex; gap:2px; margin-left: auto;">
                                <input type="number" id="style-disabled-radius-tl" class="style-input square-input input-corner-tl" min="0" max="100">
                                <input type="number" id="style-disabled-radius-tr" class="style-input square-input input-corner-tr" min="0" max="100">
                                <input type="number" id="style-disabled-radius-bl" class="style-input square-input input-corner-bl" min="0" max="100">
                                <input type="number" id="style-disabled-radius-br" class="style-input square-input input-corner-br" min="0" max="100">
                            </div>
                        </div>
                        <!-- Additional fields can be added here -->
                    </div>
                </div>
            </div>
        </div>
    `;
}

export const StyleSettingsMixin = {
    togglePreviewMode(active) {
        document.body.classList.toggle('editor-preview-active', active);
        if (active) {
            this.deselectChoice();
            this.selectedGroup = null;
            document.querySelectorAll('.editor-selected').forEach(el => el.classList.remove('editor-selected'));
            console.log("👁️ Preview Mode: ON");
        } else {
            console.log("👁️ Preview Mode: OFF");
        }
    },

    // ОБНОВЛЕННАЯ ФУНКЦИЯ: Теперь обрабатывает 5 списков и корректно сбрасывает остальные
    applyPreset(type, selectElement) {
        const index = selectElement.value;
        if (index === "") return;
        
        const idx = parseInt(index);
        let preset = null;
        let category = 'active'; // active, visual, disabled

        if (type === 'std_active') {
            preset = STANDARD_PRESETS[idx];
        } else if (type === 'fancy_active') {
            preset = FANCY_PRESETS[idx];
        } else if (type === 'visual_std') {
            preset = VISUAL_STANDARD_PRESETS[idx];
            category = 'visual';
        } else if (type === 'visual_fancy') {
            preset = VISUAL_FANCY_PRESETS[idx];
            category = 'visual';
        } else if (type === 'disabled') {
            preset = DISABLED_PRESETS[idx];
            category = 'disabled';
        }

        if (!preset) return;

        // СБРОС ОСТАЛЬНЫХ СПИСКОВ В ТОЙ ЖЕ КАТЕГОРИИ
        if (category === 'active') {
            if (type !== 'std_active') document.getElementById('preset-sel-std').value = "";
            if (type !== 'fancy_active') document.getElementById('preset-sel-fancy').value = "";
        } else if (category === 'visual') {
            if (type !== 'visual_std') document.getElementById('preset-sel-vis-std').value = "";
            if (type !== 'visual_fancy') document.getElementById('preset-sel-vis-fancy').value = "";
        }
        
        // Применяем данные к конфигу
        const s = this.engine.config.style;
        const d = preset.data;

        if (category === 'visual') {
            s.visualBgColor = d.visualBgColor;
            s.visualTitleColor = d.visualTitleColor;
            s.visualTextColor = d.visualTextColor;
            s.visualBorderColor = d.visualBorderColor;
            s.visualBorderWidth = d.visualBorderWidth;
            s.visualRadius = d.visualRadius;
        } 
        else if (category === 'disabled') {
            s.disabledBorderColor = d.borderColor;
            s.disabledBorderWidth = d.borderWidth;
            s.disabledRadiusTL = d.radius; s.disabledRadiusTR = d.radius; s.disabledRadiusBR = d.radius; s.disabledRadiusBL = d.radius;
            s.disabledShadowColor = d.shadowColor;
            s.disabledShadowWidth = d.shadowWidth;
            s.disabledBodyColor = d.bodyColor;
            s.disabledBodyOpacity = d.bodyOpacity;
            s.disabledCustomCss = d.css;
        } 
        else {
            // Standard / Fancy Active
            s.borderColor = d.borderColor;
            s.borderWidth = d.borderWidth;
            s.radiusTL = d.radius; s.radiusTR = d.radius; s.radiusBR = d.radius; s.radiusBL = d.radius;
            s.shadowColor = d.shadowColor;
            s.shadowWidth = d.shadowWidth;
            s.insetShadowColor = d.insetShadowColor || 'transparent';
            s.insetShadowWidth = d.insetShadowWidth || 0;
            s.bodyColor = d.bodyColor;
            s.bodyOpacity = d.bodyOpacity;
            s.customCss = d.css;
        }

        this.renderer.applyGlobalStyles();
        this.loadStyleSettings();
    },

    updateStyle(key, value) {
        if (!this.engine.config.style) {
            this.engine.config.style = {};
        }

        if (key.includes('Width') || key.includes('Radius') || key.includes('radius')) {
            value = parseInt(value) || 0;
        }
        if (key.includes('Opacity')) {
            value = parseFloat(value);
            if (isNaN(value)) value = 0.5;
        }

        this.engine.config.style[key] = value;
        this.renderer.applyGlobalStyles();
    },

    loadStyleSettings() {
        const style = this.engine.config.style || {};
        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.value = val;
        };

        // Standard Active
        setVal('style-border-color', style.borderColor || '#00ff00');
        setVal('style-border-width', style.borderWidth !== undefined ? style.borderWidth : 3);
        setVal('style-radius-tl', style.radiusTL !== undefined ? style.radiusTL : 12);
        setVal('style-radius-tr', style.radiusTR !== undefined ? style.radiusTR : 12);
        setVal('style-radius-bl', style.radiusBL !== undefined ? style.radiusBL : 12);
        setVal('style-radius-br', style.radiusBR !== undefined ? style.radiusBR : 12);

        setVal('style-shadow-color', style.shadowColor || '#00ff00');
        setVal('style-shadow-width', style.shadowWidth !== undefined ? style.shadowWidth : 15);
        setVal('style-inset-color', style.insetShadowColor || '#00ff00');
        setVal('style-inset-width', style.insetShadowWidth !== undefined ? style.insetShadowWidth : 20);
        setVal('style-body-color', style.bodyColor || '#00ff00');
        setVal('style-body-opacity', style.bodyOpacity !== undefined ? style.bodyOpacity : 0.1);
        setVal('style-custom-css', style.customCss || '');

        // Visual Cards
        setVal('style-vis-bg-color', style.visualBgColor || '#222222');
        setVal('style-vis-title-color', style.visualTitleColor || '#ffffff');
        setVal('style-vis-text-color', style.visualTextColor || '#cccccc');
        setVal('style-vis-border-color', style.visualBorderColor || '#444444');
        setVal('style-vis-border-width', style.visualBorderWidth !== undefined ? style.visualBorderWidth : 1);
        setVal('style-vis-radius', style.visualRadius !== undefined ? style.visualRadius : 8);

        // Disabled styles
        setVal('style-disabled-border-color', style.disabledBorderColor || '#555555');
        setVal('style-disabled-border-width', style.disabledBorderWidth !== undefined ? style.disabledBorderWidth : 0);
        setVal('style-disabled-radius-tl', style.disabledRadiusTL !== undefined ? style.disabledRadiusTL : 12);
        // ... (остальные поля для disabled можно добавить по аналогии, если нужно в UI)
    }
};