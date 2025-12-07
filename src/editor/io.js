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
        this.engine.config = {
            pages: [],
            points: [
                { id: "points", name: "Points", start: 10 }
            ],
            notes: ""
        };

        this.activePageIndex = 0;
        this.selectedItem = null;
        this.selectedItems = [];
        this.selectedGroup = null;

        // Rebuild and Render
        this.engine.buildMaps();
        this.engine.state.resetCurrencies();
        this.renderer.renderAll();
        
        // Update Editor UI
        this.renderPagesList();
        this.renderPointsList();
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
            // Делаем шрифт меньше (делим ширину на 100 вместо 60)
            const fontSize = Math.max(12, Math.min(28, Math.floor(canvas.width / 100)));
            // Линия чуть тоньше
            const lineWidth = Math.max(2, Math.floor(fontSize / 6));
            
            const drawBox = (obj, isGroup) => {
                if (!obj.coords) return;
                const c = CoordHelper.toPixels(obj.coords, { w: canvas.width, h: canvas.height });
                
                // 1. Рисуем саму рамку
                ctx.lineWidth = lineWidth;
                ctx.strokeStyle = isGroup ? '#FFD700' : '#00FF00'; // Золотой для групп, Зеленый для предметов
                ctx.strokeRect(c.x, c.y, c.w, c.h);
                
                // 2. Подготовка текста ID
                ctx.font = `bold ${fontSize}px monospace`; // Моноширинный шрифт лучше для OCR ID
                let text = obj.id;
                if (isGroup) text = `[G] ${text}`;
                
                // Измеряем текст для фона
                const tm = ctx.measureText(text);
                const padding = fontSize * 0.4;
                const bgW = tm.width + (padding * 2);
                const bgH = fontSize * 1.2;

                // 3. Вычисляем позицию (Центр ВЕРХНЕЙ границы)
                // Текст будет сидеть ровно на линии
                const tx = c.x + (c.w / 2);
                const ty = c.y; 
                
                // 4. Рисуем подложку (Черный фон), чтобы ID не сливался с картинкой
                ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
                // Центрируем прямоугольник фона относительно tx, ty
                ctx.fillRect(tx - (bgW / 2), ty - (bgH / 2), bgW, bgH);
                
                // 5. Рисуем текст
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle'; // Важно: центрирование по вертикали
                ctx.fillStyle = isGroup ? '#FFD700' : '#00FF00'; // Цвет текста совпадает с рамкой
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