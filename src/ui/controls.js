/**
 * Control Panel - Handles UI controls (buttons, settings)
 */

export class ControlPanel {
    constructor(engine, renderer) {
        this.engine = engine;
        this.renderer = renderer;
        this.editor = null; // Редактор пока не создан

        this.setupControls();
        console.log('🎮 Controls initialized');
    }

    // ==================== SETUP ====================

    setupControls() {
        // Text toggle
        const textBtn = document.getElementById('text-toggle');
        if (textBtn) {
            textBtn.addEventListener('click', () => this.toggleText());
        }

        // Edit/Debug toggle
        const editBtn = document.getElementById('edit-toggle');
        if (editBtn) {
            // Теперь функция асинхронная (async)
            editBtn.addEventListener('click', () => this.toggleEditMode());
        }

        // Reset button removed
    }

    // ==================== ACTIONS ====================

    toggleText() {
        document.body.classList.toggle('text-mode');
        const btn = document.getElementById('text-toggle');
        if (btn) {
            btn.classList.toggle('active');
        }
    }

    async toggleEditMode() {
        const btn = document.getElementById('edit-toggle');
        
        // 1. ЛЕНИВАЯ ЗАГРУЗКА (Lazy Load)
        if (!this.editor) {
            if (btn) {
                // Не меняем textContent, чтобы не затереть SVG иконку
                btn.style.cursor = "wait"; 
                btn.disabled = true;
                btn.style.opacity = "0.5";
            }

            try {
                console.log('📦 Downloading Editor module...');
                
                // ИЗМЕНЕНИЕ ЗДЕСЬ: Импорт из index.js внутри папки editor
                const module = await import('./editor/index.js');
                
                const CYOAEditor = module.CYOAEditor;
                this.editor = new CYOAEditor(this.engine, this.renderer);
                
                console.log('📦 Editor module loaded!');
            } catch (e) {
                console.error("Failed to load editor:", e);
                alert("Could not load editor module.");
                if (btn) {
                    btn.style.cursor = "";
                    btn.disabled = false;
                    btn.style.opacity = "";
                }
                return;
            } finally {
                if (btn) {
                    btn.style.cursor = "";
                    btn.disabled = false;
                    btn.style.opacity = "";
                }
            }
        }

        // 2. Обычная логика переключения
        document.body.classList.toggle('edit-mode-active');
        
        if (btn) {
            btn.classList.toggle('active');
        }

        const isActive = document.body.classList.contains('edit-mode-active');
        
        if (isActive) {
            this.editor.enable();
            document.body.classList.add('show-zones'); 
        } else {
            this.editor.disable();
            document.body.classList.remove('show-zones');
            document.body.classList.remove('edit-mode-choice');
            document.body.classList.remove('edit-mode-group');
        }
        
        console.log(isActive ? '✏️ Edit mode ON' : '✏️ Edit mode OFF');
    }
}