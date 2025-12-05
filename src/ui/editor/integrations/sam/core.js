/**
 * src/ui/editor/integrations/sam/core.js
 * SAM Auto-Detection Logic (moved from integrations.js)
 */

export const SAMCoreMixin = {
    async runSamDetection() {
        const apiKeyEl = document.getElementById('roboflow-api-key');
        const workspaceEl = document.getElementById('roboflow-workspace');
        const workflowEl = document.getElementById('roboflow-workflow');
        const promptEl = document.getElementById('sam-prompt');
        const shaveEl = document.getElementById('sam-shave');
        const debugIndexEl = document.getElementById('sam-debug-index');

        const apiKey = apiKeyEl ? apiKeyEl.value : '';
        const workspace = workspaceEl ? workspaceEl.value : '1-wnpqj';
        const workflowId = workflowEl ? workflowEl.value : 'sam3-with-prompts';
        const prompt = promptEl ? promptEl.value : 'game card';
        const shaveRatio = shaveEl ? parseFloat(shaveEl.value) : 0.02;
        const debugIndexRaw = debugIndexEl ? debugIndexEl.value : '-1';
        
        const debugIdx = debugIndexRaw ? parseInt(debugIndexRaw) : -1;

        const statusEl = document.getElementById('sam-status');
        const galleryEl = document.getElementById('sam-debug-gallery');

        const page = this.getCurrentPage();
        if (!page || !page.image) return alert("Please add a page with an image first!"); 
        if (!apiKey) return alert("Please enter your Roboflow API Key!"); 

        const btn = document.getElementById('btn-run-sam');
        if(btn) {
            btn.disabled = true;
            btn.style.opacity = 0.5;
        }
        if(galleryEl) galleryEl.innerHTML = '';
        if(statusEl) statusEl.textContent = "🚀 Starting...";

        this.autoDetector.statusCallback = (msg) => { if(statusEl) statusEl.textContent = msg; };
        this.autoDetector.debugCallback = (title, dataUrl) => {
            if(!galleryEl) return;
            const wrapper = document.createElement('div');
            wrapper.style.marginBottom = "15px";
            wrapper.style.borderBottom = "1px solid #333";
            wrapper.style.paddingBottom = "10px";
            
            const label = document.createElement('div');
            label.textContent = title;
            label.style.color = "#4CAF50";
            label.style.fontSize = "0.75rem";
            label.style.marginBottom = "5px";
            
            const img = document.createElement('img');
            img.src = dataUrl;
            img.style.maxWidth = "100%";
            img.style.border = "1px solid #444";
            
            wrapper.appendChild(label);
            wrapper.appendChild(img);
            galleryEl.appendChild(wrapper);
        };

        try {
            const imgRes = await fetch(page.image);
            const blob = await imgRes.blob();
            const file = new File([blob], "page_image.png", { type: blob.type });

            const detectedItems = await this.autoDetector.processImage(
                file, 
                prompt, 
                shaveRatio, 
                { apiKey, workspace, workflowId },
                debugIdx
            );

            if (detectedItems.length > 0) {
                for (const item of detectedItems) {
                    item.type = 'item';
                    page.layout.push(item);
                }
                
                this.engine.buildMaps();
                this.engine.recalculate();
                this.renderer.renderLayout();
                if(statusEl) statusEl.textContent = `✅ Done! Added ${detectedItems.length} items.`;
                this.renderPagesList();
            } else {
                if(statusEl) statusEl.textContent = "⚠️ No items found.";
            }

        } catch (e) {
            if(statusEl) statusEl.textContent = `❌ Error: ${e.message}`;
            console.error('SAM Error:', e);
        } finally {
            if(btn) {
                btn.disabled = false;
                btn.style.opacity = 1;
            }
        }
    }
};