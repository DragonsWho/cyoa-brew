/**
 * src/editor/ui/editor-preferences.js
 * Editor Preferences: Theme, Sidebar Position, Frame Colors
 */

import { ICONS } from './icons.js';

export const FRAME_COLOR_PRESETS = {
    'red': { 
        name: 'Red (Default)', 
        item: 'rgba(255, 0, 0, 0.8)', 
        itemBg: 'rgba(255, 0, 0, 0.15)',
        group: 'rgba(255, 165, 0, 0.6)', 
        groupBg: 'rgba(255, 165, 0, 0.1)',
        label: 'red',
        width: '2px'
    },
    'blue': { 
        name: 'Blue', 
        item: 'rgba(0, 120, 255, 0.8)', 
        itemBg: 'rgba(0, 120, 255, 0.15)',
        group: 'rgba(0, 200, 255, 0.6)', 
        groupBg: 'rgba(0, 200, 255, 0.1)',
        label: '#0078ff',
        width: '2px'
    },
    'green': { 
        name: 'Green', 
        item: 'rgba(0, 255, 0, 0.8)', 
        itemBg: 'rgba(0, 255, 0, 0.15)',
        group: 'rgba(100, 255, 100, 0.6)', 
        groupBg: 'rgba(100, 255, 100, 0.1)',
        label: '#00cc00',
        width: '2px'
    },
    'yellow': { 
        name: 'Yellow', 
        item: 'rgba(255, 215, 0, 0.8)', 
        itemBg: 'rgba(255, 215, 0, 0.15)',
        group: 'rgba(255, 140, 0, 0.6)', 
        groupBg: 'rgba(255, 140, 0, 0.1)',
        label: '#aaaa00',
        width: '2px'
    },
    'high-contrast': { 
        name: 'High Contrast (Accessibility)', 
        item: '#00FFFF',                 /* Cyan solid */
        itemBg: 'rgba(0, 0, 0, 0.7)',    /* Dark background to read text */
        group: '#FF00FF',                /* Magenta solid */
        groupBg: 'rgba(255, 255, 255, 0.1)',
        label: '#00008B',                /* Dark Blue label background */
        width: '4px'                     /* Thick borders */
    },
    'white': { 
        name: 'White', 
        item: 'rgba(255, 255, 255, 0.9)', 
        itemBg: 'rgba(255, 255, 255, 0.1)',
        group: 'rgba(200, 200, 200, 0.5)', 
        groupBg: 'rgba(200, 200, 200, 0.05)',
        label: '#666',
        width: '2px'
    }
};

export function createEditorPreferencesHTML() {
    const options = Object.entries(FRAME_COLOR_PRESETS).map(([key, val]) => 
        `<option value="${key}">${val.name}</option>`
    ).join('');

    return `
        <div class="editor-section">
            <div class="accordion-header collapsed" onclick="CYOA.editor.toggleAccordion(this)">
                <span style="display:flex; align-items:center; gap:6px;">${ICONS.settings} Editor Preferences</span>
            </div>
            <div class="accordion-content collapsed">
                <div style="font-size:0.8rem; color:#888; margin-bottom:8px;">Customise the editor interface.</div>
                
                <!-- Frame Color -->
                <div class="input-group">
                    <select id="editor-pref-color" onchange="CYOA.editor.setFrameColor(this.value)" class="pref-select">
                        ${options}
                    </select>
                    <span class="input-label">Frame Color</span>
                </div>

                <div class="row-2" style="margin-top:10px;">
                    <!-- Sidebar Position -->
                    <div style="display:flex; flex-direction:column; gap:4px;">
                        <span style="font-size:0.75rem; color:#888;">Sidebar Side</span>
                        <div class="row-buttons">
                            <button class="action-btn pref-btn" onclick="CYOA.editor.setSidebarPosition('left')">Left</button>
                            <button class="action-btn pref-btn" onclick="CYOA.editor.setSidebarPosition('right')">Right</button>
                        </div>
                    </div>

                    <!-- Theme -->
                    <div style="display:flex; flex-direction:column; gap:4px;">
                        <span style="font-size:0.75rem; color:#888;">Theme</span>
                        <div class="row-buttons">
                            <button class="action-btn pref-btn" onclick="CYOA.editor.setEditorTheme('dark')">Dark</button>
                            <button class="action-btn pref-btn" onclick="CYOA.editor.setEditorTheme('light')">Day</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

export const EditorPreferencesMixin = {
    initPreferences() {
        // Load from storage or default
        const theme = localStorage.getItem('cyoa-editor-theme') || 'dark';
        const side = localStorage.getItem('cyoa-editor-side') || 'right';
        const color = localStorage.getItem('cyoa-editor-color') || 'red';

        this.setEditorTheme(theme, false);
        this.setSidebarPosition(side, false);
        this.setFrameColor(color, false);
        
        // Update UI inputs if they exist (delayed)
        setTimeout(() => {
            const colorSel = document.getElementById('editor-pref-color');
            if(colorSel) colorSel.value = color;
        }, 500);
    },

    setFrameColor(key, save = true) {
        const preset = FRAME_COLOR_PRESETS[key] || FRAME_COLOR_PRESETS['red'];
        const root = document.documentElement;
        
        root.style.setProperty('--editor-item-border', preset.item);
        root.style.setProperty('--editor-item-bg', preset.itemBg);
        root.style.setProperty('--editor-item-label-bg', preset.label);
        
        root.style.setProperty('--editor-group-border', preset.group);
        root.style.setProperty('--editor-group-bg', preset.groupBg);
        
        root.style.setProperty('--editor-frame-width', preset.width || '2px');
        
        if(save) localStorage.setItem('cyoa-editor-color', key);
    },

    setSidebarPosition(side, save = true) {
        document.body.classList.remove('editor-sidebar-left', 'editor-sidebar-right');
        document.body.classList.add(`editor-sidebar-${side}`);
        if(save) localStorage.setItem('cyoa-editor-side', side);
    },

    setEditorTheme(theme, save = true) {
        document.body.classList.remove('editor-theme-dark', 'editor-theme-light');
        document.body.classList.add(`editor-theme-${theme}`);
        if(save) localStorage.setItem('cyoa-editor-theme', theme);
    }
};