/**
 * src/ui/build-manager.js
 * Handles the "Build" overview and "Load Game" functionality.
 */

export class BuildManager {
    constructor(engine, renderer) {
        this.engine = engine;
        this.renderer = renderer;
        this.modalId = 'build-modal';
        this.createModal();
    }

    createModal() {
        if (document.getElementById(this.modalId)) return;

        const html = `
            <div id="${this.modalId}" class="modal-overlay" style="display:none; z-index: 9999;">
                <div class="modal-content" style="width: 600px; max-width: 95%; max-height: 90vh; display:flex; flex-direction:column; background: #1a1a1a; border: 1px solid #444; color: #eee; padding: 0;">
                    
                    <!-- Header -->
                    <div style="padding: 15px; background: #222; border-bottom: 1px solid #333; display:flex; justify-content:space-between; align-items:center;">
                        <h3 style="margin:0; color:#fff;">📋 Current Build & Save/Load</h3>
                        <button onclick="document.getElementById('${this.modalId}').style.display='none'" style="background:transparent; border:none; color:#888; font-size:20px; cursor:pointer;">✕</button>
                    </div>

                    <!-- Body -->
                    <div style="padding: 20px; overflow-y: auto; flex: 1;">
                        
                        <!-- ID List (Copy/Paste) -->
                        <div style="margin-bottom: 20px;">
                            <label style="display:block; color:#4CAF50; font-weight:bold; margin-bottom:5px;">Save/Load IDs</label>
                            <div style="font-size: 0.8em; color: #888; margin-bottom: 5px;">Copy these IDs to save, or paste a list here to load.</div>
                            <textarea id="build-id-list" class="code-editor" style="height: 100px; width: 100%; font-family: monospace; font-size: 0.85rem; padding: 10px;"></textarea>
                            <div style="display:flex; justify-content:flex-end; gap: 10px; margin-top: 5px;">
                                <button id="btn-copy-ids" style="padding: 6px 12px; cursor:pointer; background:#333; color:#fff; border:1px solid #444; border-radius:4px;">📋 Copy</button>
                                <button id="btn-load-ids" style="padding: 6px 12px; cursor:pointer; background:#2e7d32; color:#fff; border:1px solid #444; border-radius:4px;">📥 Load from Text</button>
                            </div>
                        </div>

                        <!-- Readable List -->
                        <div>
                            <label style="display:block; color:#4CAF50; font-weight:bold; margin-bottom:5px;">Activated Cards</label>
                            <div id="build-names-list" style="background: #111; border: 1px solid #333; padding: 10px; max-height: 300px; overflow-y: auto; font-size: 0.9rem;">
                                <!-- List items injected here -->
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', html);

        // Bind events
        document.getElementById('btn-copy-ids').addEventListener('click', () => this.copyIds());
        document.getElementById('btn-load-ids').addEventListener('click', () => this.loadFromInput());
    }

    open() {
        this.refreshData();
        document.getElementById(this.modalId).style.display = 'flex';
    }

    refreshData() {
        const selectedIds = Array.from(this.engine.state.selected.keys());
        const idArea = document.getElementById('build-id-list');
        const nameList = document.getElementById('build-names-list');

        // 1. Populate IDs
        idArea.value = selectedIds.join(', ');

        // 2. Populate Names
        if (selectedIds.length === 0) {
            nameList.innerHTML = '<div style="color:#666; font-style:italic;">No cards selected.</div>';
        } else {
            const html = selectedIds.map(id => {
                const item = this.engine.findItem(id);
                const name = item ? (item.title || item.id) : id;
                const qty = this.engine.state.selected.get(id);
                const qtyStr = qty > 1 ? `<span style="color:#FFD700;">(x${qty})</span>` : '';
                return `<div style="padding: 4px 0; border-bottom: 1px solid #222;">${name} ${qtyStr} <span style="float:right; color:#555; font-size:0.8em;">${id}</span></div>`;
            }).join('');
            nameList.innerHTML = html;
        }
    }

    copyIds() {
        const idArea = document.getElementById('build-id-list');
        idArea.select();
        document.execCommand('copy');
        
        const btn = document.getElementById('btn-copy-ids');
        const originalText = btn.textContent;
        btn.textContent = "✅ Copied!";
        setTimeout(() => btn.textContent = originalText, 1500);
    }

loadFromInput() {
        const idArea = document.getElementById('build-id-list');
        const rawText = idArea.value;
        
        // УБРАЛИ ПРОВЕРКУ: if (!rawText.trim()) return; 
        // Теперь мы продолжаем выполнение, даже если текст пустой.

        // Разбиваем строку. Если она пустая, ids будет просто пустым массивом [].
        const ids = rawText.split(/[\s,]+/).map(s => s.trim()).filter(s => s);
        
        // УБРАЛИ ПРОВЕРКУ: if (ids.length === 0) return;
        // Нам нужно, чтобы код шел дальше и очистил стейт.

        // 1. Reset current selection (Сбрасываем состояние ВСЕГДА)
        this.engine.state.selected.clear();
        this.engine.restoreDefaults(); // Clear active effects

        // 2. Add new selection (Цикл просто не запустится, если массив ids пуст)
        let loadedCount = 0;
        ids.forEach(id => {
            const item = this.engine.findItem(id);
            if (item) {
                const current = this.engine.state.selected.get(id) || 0;
                this.engine.state.selected.set(id, current + 1);
                loadedCount++;
            }
        });

        // 3. Recalculate logic (Пересчитываем пустое состояние)
        this.engine.recalculate();
        
        // 4. Force Visual Update
        // IMPORTANT: Clear the cache so updateUI re-applies classes
        if (this.renderer.clearStateCache) {
            this.renderer.clearStateCache();
        }
        this.renderer.updateUI();

        // 5. Refresh the modal list to show what loaded
        this.refreshData();

        // Небольшой UX бонус: визуальное подтверждение на кнопке
        const btn = document.getElementById('btn-load-ids');
        const originalText = "📥 Load from Text"; // Или то, что там было
        // Если загрузили 0, пишем "Cleared", иначе кол-во
        btn.textContent = ids.length === 0 ? "✅ Cleared!" : `✅ Loaded (${loadedCount})`;
        setTimeout(() => btn.textContent = originalText, 1500);
    }
}