/**
 * src/editor/ui/style-panel.js
 * Style Settings Panel - Controls the visual appearance of selected cards
 * Updated: Flatter layout, Preview inside, Corners swapped (BL <-> BR)
 * Updated: Synchronize Checkbox state with body class
 * Updated: Added Inner Glow Controls
 */

import { STANDARD_PRESETS, FANCY_PRESETS, DISABLED_PRESETS } from '../data/style-presets.js';

export function createStylePanelHTML() {
    // Generate Options
    const createOptions = (list) => list.map((p, i) => `<option value="${i}">${p.name}</option>`).join('');
    
    const stdActiveOpts = `<option value="">-- Standard Active --</option>` + createOptions(STANDARD_PRESETS);
    const fancyActiveOpts = `<option value="">-- Fancy Active --</option>` + createOptions(FANCY_PRESETS);
    const disOpts = `<option value="">-- Disabled Style --</option>` + createOptions(DISABLED_PRESETS);

    // Sync initial checkbox state with current body class
    const isPreviewActive = document.body.classList.contains('editor-preview-active');
    const checkedAttr = isPreviewActive ? 'checked' : '';

    return `
        <div class="editor-section" style="padding:0; border-bottom:1px solid #222;">
            <div class="accordion-header collapsed" onclick="CYOA.editor.toggleAccordion(this)" style="padding: 10px;">
                <span>🎨 Card Styles</span>
            </div>
            
            <div class="accordion-content collapsed" style="padding: 0;">
                
                <!-- PREVIEW TOGGLE (Inside) -->
                <div style="background: #252525; padding: 8px 10px; border-bottom: 1px solid #333; display:flex; align-items:center; justify-content:space-between;">
                    <span style="color:#aaa; font-size:0.8rem;">Test interactions:</span>
                    <div style="display:flex; align-items:center; gap:6px;">
                        <input type="checkbox" id="style-preview-mode" onchange="CYOA.editor.togglePreviewMode(this.checked)" style="cursor:pointer;" ${checkedAttr}>
                        <label for="style-preview-mode" style="cursor:pointer; font-size:0.85rem; color:#fff;">Preview Mode</label>
                    </div>
                </div>

                <!-- ACTIVE CARD STYLE -->
                <div class="editor-section" style="border-bottom: 1px solid #333; padding-left: 5px;">
                    <div class="accordion-header collapsed" onclick="CYOA.editor.toggleAccordion(this)" style="font-size: 0.85rem; color: #ccc;">
                        ✏️ Active Style
                    </div>
                    <div class="accordion-content collapsed">
                        
                        <div class="style-row">
                            <label class="style-label">Frame</label>
                            <input type="color" id="style-border-color" class="style-input square-input" title="Frame Color">
                            <input type="number" id="style-border-width" class="style-input square-input thick-border" min="0" max="20" title="Frame Thickness">
                            <div style="display:flex; gap:2px; margin-left: auto;">
                                <input type="number" id="style-radius-tl" class="style-input square-input input-corner-tl" min="0" max="100" title="Top-Left Radius">
                                <input type="number" id="style-radius-tr" class="style-input square-input input-corner-tr" min="0" max="100" title="Top-Right Radius">
                                <!-- Swapped BL and BR order -->
                                <input type="number" id="style-radius-bl" class="style-input square-input input-corner-bl" min="0" max="100" title="Bottom-Left Radius">
                                <input type="number" id="style-radius-br" class="style-input square-input input-corner-br" min="0" max="100" title="Bottom-Right Radius">
                            </div>
                        </div>

                        <div class="style-row">
                            <label class="style-label">Shadow</label>
                            <input type="color" id="style-shadow-color" class="style-input square-input" title="Shadow Color">
                            <input type="number" id="style-shadow-width" class="style-input square-input thick-border" min="0" max="100" title="Shadow Radius">
                        </div>

                        <div class="style-row">
                            <label class="style-label">In.Glow</label>
                            <input type="color" id="style-inset-color" class="style-input square-input" title="Inner Glow Color">
                            <input type="number" id="style-inset-width" class="style-input square-input thick-border" min="0" max="100" title="Inner Glow Width">
                        </div>

                        <div class="style-row">
                            <label class="style-label">Body</label>
                            <input type="color" id="style-body-color" class="style-input square-input" title="Body Color">
                            <input type="number" id="style-body-opacity" class="style-input square-input" style="width: 40px;" min="0" max="1" step="0.1" title="Opacity (0.0 - 1.0)">
                            <button class="style-input square-input" onclick="document.getElementById('style-bg-image-input').click()" title="Overlay Texture Image" style="cursor:pointer; display:flex; align-items:center; justify-content:center; padding:0;">🖼️</button>
                            <input type="file" id="style-bg-image-input" accept="image/*" style="display:none;">
                            <input type="text" id="style-custom-css" class="style-input thick-border" placeholder="css..." title="Custom CSS" style="flex: 1; min-width: 0; text-align: left; padding-left: 5px;">
                        </div>

                    </div>
                </div>

                <!-- DISABLED CARD STYLE -->
                <div class="editor-section" style="border-bottom: 1px solid #333; padding-left: 5px;">
                    <div class="accordion-header collapsed" onclick="CYOA.editor.toggleAccordion(this)" style="font-size: 0.85rem; color: #ccc;">
                        🚫 Disabled Style
                    </div>
                    <div class="accordion-content collapsed">
                        
                        <div class="style-row">
                            <label class="style-label">Frame</label>
                            <input type="color" id="style-disabled-border-color" class="style-input square-input" title="Frame Color">
                            <input type="number" id="style-disabled-border-width" class="style-input square-input thick-border" min="0" max="20" title="Frame Thickness">
                            <div style="display:flex; gap:2px; margin-left: auto;">
                                <input type="number" id="style-disabled-radius-tl" class="style-input square-input input-corner-tl" min="0" max="100" title="Top-Left Radius">
                                <input type="number" id="style-disabled-radius-tr" class="style-input square-input input-corner-tr" min="0" max="100" title="Top-Right Radius">
                                <!-- Swapped BL and BR order -->
                                <input type="number" id="style-disabled-radius-bl" class="style-input square-input input-corner-bl" min="0" max="100" title="Bottom-Left Radius">
                                <input type="number" id="style-disabled-radius-br" class="style-input square-input input-corner-br" min="0" max="100" title="Bottom-Right Radius">
                            </div>
                        </div>

                        <div class="style-row">
                            <label class="style-label">Shadow</label>
                            <input type="color" id="style-disabled-shadow-color" class="style-input square-input" title="Shadow Color">
                            <input type="number" id="style-disabled-shadow-width" class="style-input square-input thick-border" min="0" max="100" title="Shadow Radius">
                        </div>

                        <div class="style-row">
                            <label class="style-label">Body</label>
                            <input type="color" id="style-disabled-body-color" class="style-input square-input" title="Body Color">
                            <input type="number" id="style-disabled-body-opacity" class="style-input square-input" style="width: 40px;" min="0" max="1" step="0.1" title="Opacity (0.0 - 1.0)">
                            <button class="style-input square-input" onclick="document.getElementById('style-disabled-bg-image-input').click()" title="Overlay Texture Image" style="cursor:pointer; display:flex; align-items:center; justify-content:center; padding:0;">🖼️</button>
                            <input type="file" id="style-disabled-bg-image-input" accept="image/*" style="display:none;">
                            <input type="text" id="style-disabled-custom-css" class="style-input thick-border" placeholder="css..." title="Custom CSS" style="flex: 1; min-width: 0; text-align: left; padding-left: 5px;">
                        </div>

                    </div>
                </div>

                <!-- PRESETS ACCORDION -->
                <div class="editor-section" style="border-bottom: none; padding-left: 5px;">
                    <div class="accordion-header collapsed" onclick="CYOA.editor.toggleAccordion(this)" style="font-size: 0.85rem; color: #ccc;">
                        🎨 Presets
                    </div>
                    <div class="accordion-content collapsed">
                        <div class="style-row">
                            <label class="style-label" style="width:50px;">Active</label>
                            <select class="style-input" style="flex:1; width:auto;" onchange="CYOA.editor.applyPreset('std_active', this.value); this.value='';">
                                ${stdActiveOpts}
                            </select>
                            <select class="style-input" style="flex:1; width:auto;" onchange="CYOA.editor.applyPreset('fancy_active', this.value); this.value='';">
                                ${fancyActiveOpts}
                            </select>
                        </div>
                        <div class="style-row">
                            <label class="style-label" style="width:50px;">Disabled</label>
                            <select class="style-input" style="flex:1; width:auto;" onchange="CYOA.editor.applyPreset('disabled', this.value); this.value='';">
                                ${disOpts}
                            </select>
                        </div>
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
            // Deselect everything when entering preview mode so selection borders don't persist
            this.deselectChoice();
            this.selectedGroup = null;
            document.querySelectorAll('.editor-selected').forEach(el => el.classList.remove('editor-selected'));
            console.log("👁️ Preview Mode: ON");
        } else {
            console.log("👁️ Preview Mode: OFF");
        }
    },

    applyPreset(type, index) {
        if (index === "") return;
        const idx = parseInt(index);
        let preset = null;
        let isDisabled = false;

        if (type === 'std_active') preset = STANDARD_PRESETS[idx];
        else if (type === 'fancy_active') preset = FANCY_PRESETS[idx];
        else if (type === 'disabled') {
            preset = DISABLED_PRESETS[idx];
            isDisabled = true;
        }

        if (!preset) return;

        const s = this.engine.config.style;
        const d = preset.data;

        if (!isDisabled) {
            s.borderColor = d.borderColor;
            s.borderWidth = d.borderWidth;
            s.radiusTL = d.radius; s.radiusTR = d.radius; s.radiusBR = d.radius; s.radiusBL = d.radius;
            s.shadowColor = d.shadowColor;
            s.shadowWidth = d.shadowWidth;
            
            // New Inner Shadow
            s.insetShadowColor = d.insetShadowColor !== undefined ? d.insetShadowColor : 'transparent';
            s.insetShadowWidth = d.insetShadowWidth !== undefined ? d.insetShadowWidth : 0;

            s.bodyColor = d.bodyColor;
            s.bodyOpacity = d.bodyOpacity;
            s.customCss = d.css;
        } else {
            s.disabledBorderColor = d.borderColor;
            s.disabledBorderWidth = d.borderWidth;
            s.disabledRadiusTL = d.radius; s.disabledRadiusTR = d.radius; s.disabledRadiusBR = d.radius; s.disabledRadiusBL = d.radius;
            s.disabledShadowColor = d.shadowColor;
            s.disabledShadowWidth = d.shadowWidth;
            s.disabledBodyColor = d.bodyColor;
            s.disabledBodyOpacity = d.bodyOpacity;
            s.disabledCustomCss = d.css;
        }

        this.renderer.applyGlobalStyles();
        this.loadStyleSettings(); // Refresh inputs
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

        // --- Active ---
        setVal('style-border-color', style.borderColor || '#00ff00');
        setVal('style-border-width', style.borderWidth !== undefined ? style.borderWidth : 3);
        setVal('style-radius-tl', style.radiusTL !== undefined ? style.radiusTL : 12);
        setVal('style-radius-tr', style.radiusTR !== undefined ? style.radiusTR : 12);
        setVal('style-radius-br', style.radiusBR !== undefined ? style.radiusBR : 12);
        setVal('style-radius-bl', style.radiusBL !== undefined ? style.radiusBL : 12);
        setVal('style-shadow-color', style.shadowColor || '#00ff00');
        setVal('style-shadow-width', style.shadowWidth !== undefined ? style.shadowWidth : 15);
        setVal('style-body-color', style.bodyColor || '#00ff00');
        setVal('style-body-opacity', style.bodyOpacity !== undefined ? style.bodyOpacity : 0.1);
        setVal('style-custom-css', style.customCss || '');
        
        // Inner Glow Controls
        setVal('style-inset-color', style.insetShadowColor || '#00ff00');
        setVal('style-inset-width', style.insetShadowWidth !== undefined ? style.insetShadowWidth : 20);

        // --- Disabled ---
        setVal('style-disabled-border-color', style.disabledBorderColor || '#333333');
        setVal('style-disabled-border-width', style.disabledBorderWidth !== undefined ? style.disabledBorderWidth : 0);
        setVal('style-disabled-radius-tl', style.disabledRadiusTL !== undefined ? style.disabledRadiusTL : 12);
        setVal('style-disabled-radius-tr', style.disabledRadiusTR !== undefined ? style.disabledRadiusTR : 12);
        setVal('style-disabled-radius-br', style.disabledRadiusBR !== undefined ? style.disabledRadiusBR : 12);
        setVal('style-disabled-radius-bl', style.disabledRadiusBL !== undefined ? style.disabledRadiusBL : 12);
        setVal('style-disabled-shadow-color', style.disabledShadowColor || '#000000');
        setVal('style-disabled-shadow-width', style.disabledShadowWidth !== undefined ? style.disabledShadowWidth : 0);
        setVal('style-disabled-body-color', style.disabledBodyColor || '#000000');
        setVal('style-disabled-body-opacity', style.disabledBodyOpacity !== undefined ? style.disabledBodyOpacity : 0.5);
        setVal('style-disabled-custom-css', style.disabledCustomCss || '');
    }
};