/**
 * src/editor/ui/listeners.js
 * Event Listener Setup for All UI Elements
 */
import { ProjectStorage } from '../../utils/storage.js';

export const ListenersMixin = {
    // ==================== MASTER SETUP ====================
    
    setupAllListeners() {
        this.setupChoiceListeners();
        this.setupGroupListeners();
        this.setupJsonListeners();
        this.setupLabelAutoHiding();
        this.setupSamListeners();
        this.setupLlmListeners(); 
        this.setupLoadListener();
        this.setupAddPageListener();
        this.setupSettingsListeners();
        this.setupStyleListeners();
    },

    // ==================== STYLE SETTINGS ====================

    setupStyleListeners() {
        const attachStyleListener = (id, prop) => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', (e) => {
                    this.updateStyle(prop, e.target.value);
                });
            }
        };

        // --- Active Style ---
        attachStyleListener('style-border-color', 'borderColor');
        attachStyleListener('style-border-width', 'borderWidth');
        attachStyleListener('style-radius-tl', 'radiusTL');
        attachStyleListener('style-radius-tr', 'radiusTR');
        attachStyleListener('style-radius-br', 'radiusBR');
        attachStyleListener('style-radius-bl', 'radiusBL');
        attachStyleListener('style-shadow-color', 'shadowColor');
        attachStyleListener('style-shadow-width', 'shadowWidth');
        attachStyleListener('style-inset-color', 'insetShadowColor');
        attachStyleListener('style-inset-width', 'insetShadowWidth');
        attachStyleListener('style-body-color', 'bodyColor');
        attachStyleListener('style-body-opacity', 'bodyOpacity');
        attachStyleListener('style-custom-css', 'customCss');

        // --- Visual Card Style (NEW) ---
        attachStyleListener('style-vis-bg-color', 'visualBgColor');
        attachStyleListener('style-vis-title-color', 'visualTitleColor');
        attachStyleListener('style-vis-text-color', 'visualTextColor');
        attachStyleListener('style-vis-border-color', 'visualBorderColor');
        attachStyleListener('style-vis-border-width', 'visualBorderWidth');
        attachStyleListener('style-vis-radius', 'visualRadius');

        // --- Disabled Style ---
        attachStyleListener('style-disabled-border-color', 'disabledBorderColor');
        attachStyleListener('style-disabled-border-width', 'disabledBorderWidth');
        // ... other disabled listeners ...
        
        // Image Upload (Active)
        const imgInput = document.getElementById('style-bg-image-input');
        if (imgInput) {
            imgInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (evt) => {
                    this.updateStyle('bodyImage', evt.target.result);
                };
                reader.readAsDataURL(file);
                imgInput.value = ''; 
            });
        }
    },

    // ==================== CHOICE PANEL ====================

    setupChoiceListeners() {
        // Selectable Checkbox Handler
        const selCheck = document.getElementById('edit-selectable');
        if (selCheck) {
            selCheck.addEventListener('change', (e) => {
                if (!this.selectedItem) return;
                if (e.target.checked) this.selectedItem.selectable = false;
                else delete this.selectedItem.selectable;
                this.renderer.renderLayout(); 
                this.updateCodePreview();
            });
        }

        // Visual Card Checkbox Handler (NEW)
        const vcCheck = document.getElementById('edit-visual-card');
        if (vcCheck) {
            vcCheck.addEventListener('change', (e) => {
                if (!this.selectedItem) return;
                if (e.target.checked) {
                    this.selectedItem.isVisualCard = true;
                    document.getElementById('visual-card-options').style.display = 'block';
                } else {
                    delete this.selectedItem.isVisualCard;
                    document.getElementById('visual-card-options').style.display = 'none';
                }
                this.renderer.renderLayout();
                this.updateCodePreview();
            });
        }

        // Visual Card Image Upload (NEW)
        const vcUpload = document.getElementById('vc-image-upload');
        if (vcUpload) {
            vcUpload.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file || !this.selectedItem) return;
                
                // Use the image cropper util
                this.imageCropper.open(file, (dataUrl) => {
                    this.selectedItem.cardImage = dataUrl;
                    document.getElementById('vc-img-preview').style.backgroundImage = `url('${dataUrl}')`;
                    this.renderer.renderLayout();
                    this.updateCodePreview();
                });
                
                vcUpload.value = ''; // Reset input
            });
        }

        const update = (key, val, isNum) => {
            if (!this.selectedItem) return;
            if (isNum) val = parseInt(val) || 0;
            
            // ... (quantity logic kept same) ...
            if (['x','y','w','h'].includes(key)) { 
                if (!this.selectedItem.coords) this.selectedItem.coords = {}; 
                this.selectedItem.coords[key] = val; 
            } else if (key === 'tags') { 
                this.selectedItem.tags = val.split(',').map(t => t.trim()).filter(t => t); 
            } else { 
                this.selectedItem[key] = val; 
            }

            this.renderer.renderLayout();
            this.refreshSelectionVisuals();
            this.updateCodePreview();
        };

        const inputs = ['edit-id', 'edit-title', 'edit-description', 'edit-tags', 'edit-x', 'edit-y', 'edit-w', 'edit-h', 'edit-max_quantity', 'edit-min_quantity'];
        inputs.forEach(id => {
            const el = document.getElementById(id); 
            if (!el) return;
            const key = id.split('-').pop(); 
            const realKey = (id === 'edit-description') ? 'description' : key; 
            const isNum = ['x','y','w','h', 'max_quantity', 'min_quantity'].includes(key); 
            el.addEventListener('input', (e) => update(realKey, e.target.value, isNum));
        });
    },

    // ... (Other setup functions remain same) ...
    setupSettingsListeners() {
        const notes = document.getElementById('project-notes');
        if (notes) {
            notes.addEventListener('input', (e) => {
                this.engine.config.notes = e.target.value;
            });
        }
    },
    
    setupGroupListeners() {
        const update = (key, val, isNum) => {
            if (!this.selectedGroup) return;
            if (isNum) val = parseInt(val) || 0;
            if (['x','y','w','h'].includes(key)) { 
                if (!this.selectedGroup.coords) this.selectedGroup.coords = {}; 
                this.selectedGroup.coords[key] = val; 
            } else { 
                this.selectedGroup[key] = val; 
            }
            this.renderer.renderLayout();
            const el = document.getElementById(`group-${this.selectedGroup.id}`);
            if(el) {
                el.classList.add('editor-selected');
                el.setAttribute('data-editor-title', this.selectedGroup.title || this.selectedGroup.id);
            }
            this.updateCodePreview();
        };
        const inputs = ['group-id', 'group-title', 'group-description', 'group-x', 'group-y', 'group-w', 'group-h'];
        inputs.forEach(id => {
            const el = document.getElementById(id); 
            if (!el) return;
            const key = id.split('-').pop(); 
            const realKey = (id === 'group-description') ? 'description' : key; 
            const isNum = ['x','y','w','h'].includes(key);
            el.addEventListener('input', (e) => update(realKey, e.target.value, isNum));
        });
    },

    setupJsonListeners() {
        const choiceJson = document.getElementById('edit-raw-json');
        if (choiceJson) {
            choiceJson.addEventListener('change', (e) => {
                try { 
                    const data = JSON.parse(e.target.value); 
                    if (this.selectedItem) { 
                        Object.assign(this.selectedItem, data); 
                        this.engine.buildMaps();
                        this.renderer.renderLayout(); 
                        this.updateChoiceInputs(); 
                        this.ruleBuilder.loadItem(this.selectedItem, this.selectedGroup); 
                        this.refreshSelectionVisuals();
                    } 
                } catch(err) { console.error("JSON Error", err); }
            });
        }
        const rulesJson = document.getElementById('group-rules-json');
        if (rulesJson) {
            rulesJson.addEventListener('change', (e) => {
                try { 
                    const data = JSON.parse(e.target.value); 
                    if (this.selectedGroup) { 
                        this.selectedGroup.rules = data; 
                        this.renderer.renderLayout(); 
                        this.engine.recalculate(); 
                        const el = document.getElementById(`group-${this.selectedGroup.id}`);
                        if(el) this.selectGroup(this.selectedGroup);
                    } 
                } catch(err) { console.error("Rules JSON Error", err); }
            });
        }
    },

    setupAddPageListener() {
        const input = document.getElementById('add-page-image-input');
        if (!input) return;

        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (evt) => {
                const dataUrl = evt.target.result;
                if (!this.engine.config.pages) this.engine.config.pages = [];
                
                const newPageIndex = this.engine.config.pages.length;
                const newPage = {
                    id: `page_${newPageIndex}`,
                    image: dataUrl,
                    layout: []
                };
                
                this.engine.config.pages.push(newPage);
                this.activePageIndex = newPageIndex;
                
                if (!this.engine.config.points || this.engine.config.points.length === 0) {
                    this.engine.config.points = [{ id: "points", name: "Points", start: 0 }];
                }
                
                this.engine.buildMaps();
                this.engine.state.resetCurrencies();
                this.renderer.renderAll().then(() => {
                    this.renderPagesList();
                });
            };
            reader.readAsDataURL(file);
            input.value = ''; 
        });
    },

    setupLoadListener() {
        const input = document.getElementById('load-config-input');
        if (!input) return;

        input.addEventListener('change', async (e) => {
            if (e.target.files.length === 0) return;
            const file = e.target.files[0];

            try {
                if (!this.engine.isTestConfig) {
                    if (!confirm("Are you sure? Loading a new project will discard current changes.")) {
                        input.value = '';
                        return;
                    }
                }
                const { config, warning } = await ProjectStorage.load(file);
                if (warning) alert(warning);
                this.engine.loadConfig(config);
                
                this.deselectChoice();
                this.selectedGroup = null;
                this.activePageIndex = 0;
                
                this.updateSettingsInputs(); 
                
            } catch (err) {
                alert(`Error loading project: ${err.message}`);
            } finally {
                input.value = '';
            }
        });
    },

    setupLabelAutoHiding() {
        const checkCollision = (input) => {
            const label = input.nextElementSibling;
            if (!label || !label.classList.contains('input-label')) return;
            if (input.value.length > 0) label.classList.add('label-hidden');
            else label.classList.remove('label-hidden');
        };
        const attach = () => {
             const inputs = document.querySelectorAll('#editor-sidebar input[type="text"], #editor-sidebar input[type="number"], #editor-sidebar input[type="password"], #editor-sidebar textarea:not(.code-editor)');
             inputs.forEach(input => {
                input.removeEventListener('input', input._labelHandler);
                input._labelHandler = () => checkCollision(input);
                input.addEventListener('input', input._labelHandler);
                checkCollision(input);
             });
        };
        this.triggerLabelCheck = attach;
        setTimeout(attach, 500); 
    },

    updateCodePreview() {
        if (this.selectedItem && this.selectedItems.length <= 1) {
            const el = document.getElementById('edit-raw-json');
            if (el && document.activeElement !== el) el.value = JSON.stringify(this.selectedItem, null, 2);
        }
        if (this.selectedGroup) {
            const rulesEl = document.getElementById('group-rules-json');
            if (rulesEl && document.activeElement !== rulesEl) rulesEl.value = JSON.stringify(this.selectedGroup.rules || {}, null, 2);
        }
    }
};