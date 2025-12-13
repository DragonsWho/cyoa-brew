import Panzoom from '@panzoom/panzoom';

export class PanzoomManager {
    constructor(engine) {
        this.engine = engine;
        this.element = document.getElementById('game-wrapper');
        this.container = document.body;
        this.instance = null;
        
        // 1. ЖЕЛЕЗОБЕТОННАЯ ПРОВЕРКА ПРИ СТАРТЕ
        // Проверяем UserAgent (самый надежный способ отличить именно тип устройства, а не просто ширину)
        // Если это Android, iPhone, iPad - считаем мобилкой.
        this.isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        // Дополнительная страховка: если экран очень узкий при старте (даже на ПК),
        // можно считать мобилкой, но для ПК лучше оставить false.
        // Сейчас настроено строго на мобильные ОС.

        this.enabled = false;

        if (this.isMobileDevice) {
            console.log('📱 Mobile device detected. Initializing Panzoom...');
            this.init();
            this.enable(); // На мобилках включаем сразу
        } else {
            console.log('💻 PC detected. Panzoom disabled entirely.');
        }
    }

    init() {
        if (!this.element) return;

        // Создаем инстанс ТОЛЬКО на мобилках
        this.instance = Panzoom(this.element, {
            maxScale: 5,        
            minScale: 0.1,      
            startScale: 1,      
            contain: 'outside', 
            noBind: true 
        });

        // Сохраняем ссылки на функции для add/removeEventListener
        this.wheelHandler = this.onWheel.bind(this);
        this.pointerDownHandler = this.handlePointerDown.bind(this);
        this.pointerMoveHandler = this.handlePointerMove.bind(this);
        this.pointerUpHandler = this.handlePointerUp.bind(this);
    }

    // --- ОБРАБОТЧИКИ СОБЫТИЙ ---

    onWheel(e) {
        if (!this.enabled || !this.instance) return;
        e.preventDefault(); 
        this.instance.zoomWithWheel(e);
    }

    handlePointerDown(e) {
        if (!this.enabled || !this.instance) return;
        // Игнор интерфейса
        if (e.target.closest('#points-bar') || e.target.closest('.bottom-tools') || e.target.closest('.modal-content')) {
            return;
        }
        this.instance.handleDown(e);
    }

    handlePointerMove(e) {
        if (!this.enabled || !this.instance) return;
        this.instance.handleMove(e);
    }

    handlePointerUp(e) {
        if (!this.enabled || !this.instance) return;
        this.instance.handleUp(e);
    }

    // --- УПРАВЛЕНИЕ СОСТОЯНИЕМ ---

    enable() {
        // !!! ГЛАВНОЕ ИЗМЕНЕНИЕ !!!
        // Если это ПК - мы просто игнорируем команду включения.
        if (!this.isMobileDevice) return; 

        if (this.enabled) return;
        this.enabled = true;
        
        document.body.classList.add('mobile-panzoom-active');

        // Вешаем слушатели
        this.container.addEventListener('wheel', this.wheelHandler, { passive: false });
        this.container.addEventListener('pointerdown', this.pointerDownHandler);
        this.container.addEventListener('pointermove', this.pointerMoveHandler);
        this.container.addEventListener('pointerup', this.pointerUpHandler);
        this.container.addEventListener('pointerleave', this.pointerUpHandler);
    }

    disable() {
        // На ПК disable тоже ничего не делает, так как enable не сработал.
        // Но для чистоты логики оставим проверку.
        if (!this.isMobileDevice) return;

        if (!this.enabled) return;
        this.enabled = false;

        document.body.classList.remove('mobile-panzoom-active');
        
        // Сброс позиций
        if (this.instance) {
            this.instance.reset(); 
        }
        if (this.element) {
            this.element.style.transform = '';
        }

        // Снимаем слушатели
        this.container.removeEventListener('wheel', this.wheelHandler);
        this.container.removeEventListener('pointerdown', this.pointerDownHandler);
        this.container.removeEventListener('pointermove', this.pointerMoveHandler);
        this.container.removeEventListener('pointerup', this.pointerUpHandler);
        this.container.removeEventListener('pointerleave', this.pointerUpHandler);
    }
}