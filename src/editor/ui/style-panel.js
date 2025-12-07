/**
 * src/editor/ui/style-panel.js
 * Style Settings Panel - Controls the visual appearance of selected cards
 */

export function createStylePanelHTML() {
    return `
        <div class="editor-section">
            <div class="accordion-header collapsed" onclick="CYOA.editor.toggleAccordion(this)">🎨 Active Card Style</div>
            <div class="accordion-content collapsed">
                
                <div class="row-2" style="margin-bottom:8px;">
                    <div class="input-group">
                        <input type="color" id="style-border-color" value="#00ff00" style="padding:0; height:30px;">
                        <span class="input-label" style="top:50%; transform:translateY(-50%); right:30px;">Border</span>
                    </div>
                     <div class="input-group">
                        <input type="number" id="style-border-width" value="3" min="0" max="20">
                        <span class="input-label">Width (px)</span>
                    </div>
                </div>

                <div class="input-group" style="margin-bottom:8px;">
                     <input type="range" id="style-border-radius" min="0" max="50" value="12" style="width:100%;">
                     <div style="display:flex; justify-content:space-between; font-size:0.75rem; color:#888; padding:0 4px;">
                        <span>Radius</span>
                        <span id="style-radius-val">12px</span>
                     </div>
                </div>

                <div class="row-2" style="margin-bottom:8px;">
                    <div class="input-group">
                        <input type="color" id="style-shadow-color" value="#00ff00" style="padding:0; height:30px;">
                        <span class="input-label" style="top:50%; transform:translateY(-50%); right:30px;">Shadow</span>
                    </div>
                    <div class="input-group">
                        <input type="number" id="style-shadow-width" value="15" min="0" max="100">
                        <span class="input-label">Size (px)</span>
                    </div>
                </div>

            </div>
        </div>
    `;
}

export const StyleSettingsMixin = {
    updateStyle(key, value) {
        if (!this.engine.config.style) {
            this.engine.config.style = {};
        }

        // Parse numbers
        if (['borderWidth', 'borderRadius', 'shadowWidth'].includes(key)) {
            value = parseInt(value) || 0;
        }

        this.engine.config.style[key] = value;
        
        // Update visual display values in UI
        if (key === 'borderRadius') {
            const display = document.getElementById('style-radius-val');
            if (display) display.textContent = value + 'px';
        }

        // Apply changes globally
        this.renderer.applyGlobalStyles();
    },

    loadStyleSettings() {
        const style = this.engine.config.style || {};
        
        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.value = val;
        };

        setVal('style-border-color', style.borderColor || '#00ff00');
        setVal('style-border-width', style.borderWidth !== undefined ? style.borderWidth : 3);
        setVal('style-border-radius', style.borderRadius !== undefined ? style.borderRadius : 12);
        setVal('style-shadow-color', style.shadowColor || '#00ff00');
        setVal('style-shadow-width', style.shadowWidth !== undefined ? style.shadowWidth : 15);

        const radDisplay = document.getElementById('style-radius-val');
        if (radDisplay) radDisplay.textContent = (style.borderRadius !== undefined ? style.borderRadius : 12) + 'px';
    }
};