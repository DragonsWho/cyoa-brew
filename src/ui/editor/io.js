/**
 * src/ui/editor/io.js
 * Editor IO Mixin
 * Handles File Export (JSON/ZIP) and Debug Image generation.
 */

import { ProjectStorage } from '../../utils/storage.js';
import { CoordHelper } from '../../utils/coords.js';

export const EditorIOMixin = {
    
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
            
            // Draw boxes logic
            const fontSize = Math.max(16, Math.min(48, Math.floor(canvas.width / 60)));
            const lineWidth = Math.max(3, Math.floor(fontSize / 5));
            
            const drawBox = (obj, isGroup) => {
                if (!obj.coords) return;
                const c = CoordHelper.toPixels(obj.coords, { w: canvas.width, h: canvas.height });
                
                ctx.lineWidth = lineWidth;
                ctx.strokeStyle = isGroup ? '#FFD700' : '#00FF00'; 
                ctx.strokeRect(c.x, c.y, c.w, c.h);
                
                ctx.font = `bold ${fontSize}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'top'; 
                
                let text = obj.id;
                if (isGroup) text = `[Group] ${text}`;
                if (text.length > 30) text = text.substring(0, 27) + '...';
                
                const tx = c.x + c.w / 2;
                const ty = c.y + lineWidth + 5; 
                
                ctx.lineJoin = 'round';
                ctx.lineWidth = lineWidth + 2;
                ctx.strokeStyle = '#000000';
                ctx.strokeText(text, tx, ty);
                ctx.fillStyle = isGroup ? '#FFD700' : '#FFFFFF';
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