/**
 * src/ui/editor/integrations/llm/response-handler.js
 * Apply LLM Changes to Config
 */

export const ResponseHandlerMixin = {
    applyLlmChanges() {
        if (!this.pendingLlmResult) return;
        const { mode, data } = this.pendingLlmResult;
        try {
            if (mode === 'refine') this.applyRefineResult(data);
            else if (mode === 'fill') this.applyFillResult(data);
            else if (mode === 'audit') this.applyAuditResult(data);

            this.engine.buildMaps();
            this.engine.reset();
            this.engine.recalculate();
            this.renderer.renderAll();
            this.renderPagesList();
            this.deselectChoice();
            document.getElementById('llm-preview-modal').style.display = 'none';
            this.pendingLlmResult = null;
            alert("✅ Changes applied successfully!");
        } catch (e) {
            alert(`Error applying changes: ${e.message}`);
        }
    },

    applyRefineResult(data) {
        const page = this.getCurrentPage();
        const newLayout = Array.isArray(data) ? data : (data.layout || []);
        if (newLayout.length === 0) { console.warn("LLM returned empty layout"); return; }
        page.layout = newLayout;
    },

    applyFillResult(data) {
        const page = this.getCurrentPage();
        const newLayout = data.layout || (Array.isArray(data) ? data : []);
        if (!newLayout.length) throw new Error("No layout data in response");
        page.layout = newLayout.map(item => ({ type: item.type || 'item', ...item }));
        if (data.inferred_currencies) {
            const existingIds = new Set((this.engine.config.points || []).map(p => p.id));
            data.inferred_currencies.forEach(c => {
                if (!existingIds.has(c.id)) {
                    this.engine.config.points = this.engine.config.points || [];
                    this.engine.config.points.push(c);
                }
            });
        }
    },

    applyAuditResult(data) {
        const newConfig = data.fixed_config || data;
        if (newConfig.pages) {
            newConfig.pages.forEach((p, i) => {
                const orig = this.engine.config.pages?.[i];
                if (orig?.image && (!p.image || p.image.includes('PLACEHOLDER'))) p.image = orig.image;
            });
        }
        this.engine.config = newConfig;
    }
};