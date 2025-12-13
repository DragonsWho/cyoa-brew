/** 
 * src\ui\controls.js
 * Control Panel - Handles UI controls (buttons, settings)
 */

export class ControlPanel {
    constructor(engine, renderer) {
        this.engine = engine;
        this.renderer = renderer;
        this.editor = null; 

        this.setupControls();
        console.log('🎮 Controls initialized');
    }

    setupControls() {
        const textBtn = document.getElementById('text-toggle');
        if (textBtn) {
            textBtn.addEventListener('click', () => this.toggleText());
        }

        const editBtn = document.getElementById('edit-toggle');
        if (editBtn) {
            editBtn.addEventListener('click', () => this.toggleEditMode());
        }
    }

    toggleText() {
        document.body.classList.toggle('text-mode');
        const btn = document.getElementById('text-toggle');
        if (btn) {
            btn.classList.toggle('active');
        }
    }

    async toggleEditMode() {
        const btn = document.getElementById('edit-toggle');

        if (!this.editor) {
            if (btn) {
                btn.style.cursor = "wait";
                btn.disabled = true;
                btn.style.opacity = "0.5";
            }

            try {
                console.log('📦 Downloading Editor module...');
                const module = await import('../editor/index.js');
                const CYOAEditor = module.CYOAEditor;
                this.editor = new CYOAEditor(this.engine, this.renderer);
                console.log('📦 Editor module loaded!');
            } catch (e) {
                console.error("Failed to load editor:", e);
                alert("Could not load editor module.");
                return;
            } finally {
                if (btn) {
                    btn.style.cursor = "";
                    btn.disabled = false;
                    btn.style.opacity = "";
                }
            }
        }

        document.body.classList.toggle('edit-mode-active');

        if (btn) btn.classList.toggle('active');

        const isActive = document.body.classList.contains('edit-mode-active');
        const pz = window.panzoomManager;

        if (isActive) {
            // === РЕЖИМ РЕДАКТОРА ВКЛЮЧЕН ===
            this.editor.enable();
            document.body.classList.add('show-zones');

            // Отключаем Panzoom (только если он вообще используется)
            pz?.disable();

            // Важно: чистим возможные inline-стили, чтобы ПК-скролл не "залипал"
            document.body.style.overflow = '';
            document.documentElement.style.overflow = '';
            document.body.style.touchAction = '';

            // На всякий случай сбрасываем transform
            const wrapper = document.getElementById('game-wrapper');
            if (wrapper) wrapper.style.transform = '';

        } else {
            // === РЕЖИМ РЕДАКТОРА ВЫКЛЮЧЕН ===
            this.editor.disable();
            document.body.classList.remove('show-zones', 'edit-mode-choice', 'edit-mode-group');

            // Возвращаем дефолтный скролл (ПК) через сброс inline
            document.body.style.overflow = '';
            document.documentElement.style.overflow = '';
            document.body.style.touchAction = '';

            // Включаем Panzoom только на мобилках (внутри enable() уже есть guard)
            pz?.enable();
        }

        console.log(isActive ? '✏️ Edit mode ON' : '✏️ Edit mode OFF');
    }
}