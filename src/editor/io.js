/**
 * src/ui/editor/io.js
 * Editor IO Mixin
 * Handles File Export (JSON/ZIP), New Project, and Debug Image generation.
 */

import { ProjectStorage } from '../utils/storage.js';
import { CoordHelper } from '../utils/coords.js';

export const EditorIOMixin = {
    
    newProject() {
        if (!confirm("Create new project? All unsaved changes will be lost.")) return;
        
        // Reset configuration to default empty state
        // ИСПРАВЛЕНИЕ: Добавлен объект style с дефолтными значениями
        this.engine.config = {
            pages: [],
            points: [
                { id: "points", name: "Points", start: 10 }
            ],
            notes: "",
            style: {
                // Стандартные настройки (Зеленый стиль)
                borderColor: "#00ff00",
                borderWidth: 3,
                radiusTL: 12,
                radiusTR: 12,
                radiusBR: 12,
                radiusBL: 12,
                shadowColor: "#00ff00",
                shadowWidth: 15,
                insetShadowColor: "rgba(0, 255, 0, 0.2)",
                insetShadowWidth: 20,
                bodyColor: "#00ff00",
                bodyOpacity: 0.1,
                bodyImage: "",
                customCss: "",
                
                // Настройки Visual Card
                visualBgColor: "#222222",
                visualTitleColor: "#ffffff",
                visualTextColor: "#cccccc",
                visualBorderColor: "#444444",
                visualBorderWidth: 1,
                visualRadius: 8,

                // Настройки Disabled
                disabledBorderColor: "#555555",
                disabledBorderWidth: 0,
                disabledRadiusTL: 12,
                disabledRadiusTR: 12,
                disabledRadiusBR: 12,
                disabledRadiusBL: 12,
                disabledShadowColor: "#000000",
                disabledShadowWidth: 0,
                disabledBodyColor: "#000000",
                disabledBodyOpacity: 0.5,
                disabledBodyImage: "",
                disabledCustomCss: ""
            }
        };

        this.activePageIndex = 0;
        this.selectedItem = null;
        this.selectedItems = [];
        this.selectedGroup = null;

        // Rebuild and Render
        this.engine.buildMaps();
        this.engine.state.resetCurrencies();
        
        // Принудительно применяем стили после сброса
        if (this.renderer.applyGlobalStyles) {
            this.renderer.applyGlobalStyles();
        }

        this.renderer.renderAll();
        
        // Update Editor UI
        this.renderPagesList();
        this.renderPointsList();
        
        // Обновляем инпуты настроек, чтобы в панели стилей появились значения
        if (this.updateSettingsInputs) this.updateSettingsInputs();
        
        this.switchTab('settings'); // Switch to settings so user can add a page
    },

    exportConfig() {
        this.sortAllLayouts();
        ProjectStorage.save(this.engine.config);
    },

    async exportZip() {
        try {
            this.sortAllLayouts();
            await ProjectStorage.saveZip(this.engine.config);
        } catch (e) {
            alert(e.message);
        }
    },
    
    async copyDebugImageToClipboard() {
        const page = this.getCurrentPage();
        if (!page || !page.image) { alert("No image on this page."); return; }
        
        const btn = document.getElementById('btn-copy-debug-img');
        if(btn) { 
            btn.disabled = true; 
            btn.textContent = "⏳ Generating..."; 
            btn.style.opacity = "0.7"; 
        }
        
        try {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            await new Promise((resolve, reject) => { 
                img.onload = resolve; 
                img.onerror = reject; 
                img.src = page.image; 
            });
            
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            
            // --- НАСТРОЙКИ ОТРИСОВКИ ---
            const fontSize = Math.max(12, Math.min(28, Math.floor(canvas.width / 100)));
            const lineWidth = Math.max(2, Math.floor(fontSize / 6));
            
            const drawBox = (obj, isGroup) => {
                if (!obj.coords) return;
                const c = CoordHelper.toPixels(obj.coords, { w: canvas.width, h: canvas.height });
                
                ctx.lineWidth = lineWidth;
                ctx.strokeStyle = isGroup ? '#FFD700' : '#00FF00'; 
                ctx.strokeRect(c.x, c.y, c.w, c.h);
                
                ctx.font = `bold ${fontSize}px monospace`; 
                let text = obj.id;
                if (isGroup) text = `[G] ${text}`;
                
                const tm = ctx.measureText(text);
                const padding = fontSize * 0.4;
                const bgW = tm.width + (padding * 2);
                const bgH = fontSize * 1.2;

                const tx = c.x + (c.w / 2);
                const ty = c.y; 
                
                ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
                ctx.fillRect(tx - (bgW / 2), ty - (bgH / 2), bgW, bgH);
                
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle'; 
                ctx.fillStyle = isGroup ? '#FFD700' : '#00FF00'; 
                ctx.fillText(text, tx, ty);
            };
            
            const groupsToDraw = [];
            const itemsToDraw = [];
            
            const traverse = (list) => {
                list.forEach(el => {
                    if (el.type === 'group') { 
                        groupsToDraw.push(el); 
                        if (el.items) traverse(el.items); 
                    } else { 
                        itemsToDraw.push(el); 
                    }
                });
            };
            
            traverse(page.layout);
            groupsToDraw.forEach(g => drawBox(g, true));
            itemsToDraw.forEach(i => drawBox(i, false));
            
            canvas.toBlob(async (blob) => {
                if (!blob) throw new Error("Canvas failed to blob");
                try {
                    const item = new ClipboardItem({ "image/png": blob });
                    await navigator.clipboard.write([item]);
                    if(btn) { 
                        btn.textContent = "✅ Copied!"; 
                        setTimeout(() => { 
                            btn.disabled = false; 
                            btn.textContent = "📸 Copy Layout Image (For LLM)"; 
                            btn.style.opacity = "1"; 
                        }, 2000);
                    }
                } catch (err) {
                    console.error("Clipboard Error:", err);
                    alert("Failed to copy image to clipboard.\nNote: This feature requires HTTPS or localhost.");
                    if(btn) { 
                        btn.disabled = false; 
                        btn.textContent = "📸 Copy Layout Image (For LLM)"; 
                        btn.style.opacity = "1"; 
                    }
                }
            }, 'image/png');
            
        } catch (e) {
            console.error("Image Gen Error:", e);
            alert("Error generating debug image: " + e.message);
            if(btn) { 
                btn.disabled = false; 
                btn.textContent = "📸 Copy Layout Image (For LLM)"; 
                btn.style.opacity = "1"; 
            }
        }
    },
};