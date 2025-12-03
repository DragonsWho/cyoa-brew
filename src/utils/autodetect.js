/**
 * src\utils\autodetect.js
 * AutoDetect - SAM3 Integration logic
 * Optimized: Smart Downscaling + Sliding Window Morphology
 */

import { Client } from "@gradio/client";

export class AutoDetector {
    constructor() {
        this.client = null;
        this.statusCallback = null;
        this.debugCallback = null;
        
        // Увеличили лимит до 2000px. 
        // Это дает высокую точность, а алгоритм "скользящего окна" 
        // справится с такой скоростью без проблем.
        this.MAX_PROCESSING_SIZE = 2000;
    }

    setStatus(msg) {
        if (this.statusCallback) this.statusCallback(msg);
        console.log(`🤖 AutoDetect: ${msg}`);
    }

    sendDebugImage(title, canvas) {
        if (this.debugCallback) {
            this.debugCallback(title, canvas.toDataURL('image/png'));
        }
    }

    /**
     * Main function to process image
     */
    async processImage(imageFile, prompt, shaveRatio, hfToken, targetDebugIndex = -1) {
        if (!this.client) {
            try {
                this.setStatus("Connecting to SAM3...");
                this.client = await Client.connect("akhaliq/sam3", { hf_token: hfToken });
            } catch (e) {
                this.setStatus(`Connection Failed: ${e.message}`);
                return [];
            }
        }

        this.setStatus("Sending image to SAM3...");
        
        try {
            const result = await this.client.predict("/segment", { 
                image: imageFile, 
                text: prompt,
                threshold: 0.3, 
                mask_threshold: 0.5 
            });

            const rawAnnotations = result.data[0].annotations;
            if (!rawAnnotations || rawAnnotations.length === 0) {
                this.setStatus("No elements found.");
                return [];
            }

            // Подготовка битмапа оригинала для размеров
            const imgBitmap = await createImageBitmap(imageFile);
            const originalW = imgBitmap.width;
            const originalH = imgBitmap.height;

            // Вычисляем масштаб для уменьшения
            const scale = this.calculateScale(originalW, originalH);
            const processW = Math.round(originalW * scale);
            const processH = Math.round(originalH * scale);

            this.setStatus(`Processing ${rawAnnotations.length} masks. Scale: ${scale.toFixed(3)} (${processW}x${processH})`);

            const detectedItems = [];

            for (let i = 0; i < rawAnnotations.length; i++) {
                this.setStatus(`Processing mask ${i+1}/${rawAnnotations.length}...`);
                
                const isDebugItem = (targetDebugIndex >= 0 && i === targetDebugIndex);

                // Даём браузеру "вздохнуть" каждые 3 маски, чтобы интерфейс не фризился
                if (i > 0 && i % 3 === 0) {
                    await this.yieldToMain();
                }

                const bbox = await this.processMaskMorphologyOptimized(
                    rawAnnotations[i].image.url, 
                    originalW, originalH,
                    processW, processH,
                    scale,
                    shaveRatio, 
                    isDebugItem ? `Item ${i+1}` : null
                );
                
                if (bbox) {
                    detectedItems.push({
                        id: `item_${String(i + 1).padStart(3, '0')}`,
                        title: `Item ${i + 1}`,
                        coords: bbox
                    });
                }
            }

            // Сортировка (строки -> колонки)
            const ROW_TOLERANCE = 50;
            detectedItems.sort((a, b) => {
                const rowA = Math.floor(a.coords.y / ROW_TOLERANCE);
                const rowB = Math.floor(b.coords.y / ROW_TOLERANCE);
                if (rowA !== rowB) return rowA - rowB;
                return a.coords.x - b.coords.x;
            });

            // Перенумерация после сортировки
            detectedItems.forEach((item, idx) => {
                item.id = `item_${String(idx + 1).padStart(3, '0')}`;
                item.title = `Item ${idx + 1}`;
            });

            this.setStatus("Done!");
            return detectedItems;

        } catch (e) {
            console.error(e);
            this.setStatus(`Error: ${e.message}`);
            return [];
        }
    }

    calculateScale(w, h) {
        const maxDim = Math.max(w, h);
        if (maxDim <= this.MAX_PROCESSING_SIZE) {
            return 1; // Не нужно уменьшать
        }
        return this.MAX_PROCESSING_SIZE / maxDim;
    }

    /**
     * Позволяет браузеру обработать UI события, чтобы не было фризов
     */
    yieldToMain() {
        return new Promise(resolve => {
            if ('scheduler' in window && 'yield' in window.scheduler) {
                window.scheduler.yield().then(resolve);
            } else {
                setTimeout(resolve, 0);
            }
        });
    }

    async processMaskMorphologyOptimized(maskUrl, originalW, originalH, processW, processH, scale, shaveRatio, debugName) {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.src = maskUrl;
            
            img.onload = () => {
                // 1. Создаём canvas уменьшенного размера для обработки
                const canvas = document.createElement('canvas');
                canvas.width = processW;
                canvas.height = processH;
                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                
                // Рисуем маску
                ctx.drawImage(img, 0, 0, processW, processH);

                if (debugName) {
                    this.sendDebugImage(`${debugName} - 1. Original (${processW}×${processH})`, canvas);
                }

                // 2. Получаем пиксели
                const imgData = ctx.getImageData(0, 0, processW, processH);
                let binary = new Uint8Array(processW * processH);
                
                const data = imgData.data;
                const len = binary.length;
                for (let k = 0; k < len; k++) {
                    binary[k] = data[k << 2] > 128 ? 1 : 0; 
                }

                // ==========================================
                // STEP 3: MORPH OPEN (Shaving)
                // ==========================================
                
                let shaveSize = Math.floor(processW * shaveRatio);
                if (shaveSize < 3) shaveSize = 3;
                if (shaveSize % 2 === 0) shaveSize++;

                let eroded = this.morphErodeOptimized(binary, processW, processH, shaveSize);
                let shaved = this.morphDilateOptimized(eroded, processW, processH, shaveSize);

                if (debugName) {
                    this.drawBinaryToCanvas(shaved, ctx, processW, processH);
                    this.sendDebugImage(`${debugName} - 2. Shaved (K=${shaveSize})`, canvas);
                }

                // ==========================================
                // STEP 4: MORPH CLOSE (Closing holes)
                // ==========================================
                let closeSize = Math.max(3, Math.round(15 * scale)); 
                if (closeSize % 2 === 0) closeSize++;
                
                let dilated2 = this.morphDilateOptimized(shaved, processW, processH, closeSize);
                let closed = this.morphErodeOptimized(dilated2, processW, processH, closeSize);

                if (debugName) {
                    this.drawBinaryToCanvas(closed, ctx, processW, processH);
                    this.sendDebugImage(`${debugName} - 3. Closed (Final)`, canvas);
                }

                // ==========================================
                // STEP 5: Find BBox в уменьшенных координатах
                // ==========================================
                const bboxSmall = this.findBoundingBoxOptimized(closed, processW, processH);
                
                if (bboxSmall) {
                    // Масштабируем координаты обратно к оригинальному размеру
                    const bbox = {
                        x: Math.round(bboxSmall.x / scale),
                        y: Math.round(bboxSmall.y / scale),
                        w: Math.round(bboxSmall.w / scale),
                        h: Math.round(bboxSmall.h / scale)
                    };
                    
                    const area = bbox.w * bbox.h;
                    const minArea = (originalW * originalH) * 0.0005;
                    
                    if (area < minArea) {
                        resolve(null);
                    } else {
                        resolve(bbox);
                    }
                } else {
                    resolve(null);
                }
            };
            img.onerror = () => resolve(null);
        });
    }

    drawBinaryToCanvas(binary, ctx, w, h) {
        const output = ctx.createImageData(w, h);
        const outData = output.data;
        const len = binary.length;
        
        for (let i = 0; i < len; i++) {
            const val = binary[i] === 1 ? 255 : 0;
            const idx = i << 2; 
            outData[idx] = val;
            outData[idx + 1] = val;
            outData[idx + 2] = val;
            outData[idx + 3] = 255;
        }
        ctx.putImageData(output, 0, 0);
    }

    findBoundingBoxOptimized(binary, w, h) {
        let minX = w, minY = h, maxX = -1, maxY = -1;
        
        // Оптимизированный поиск границ
        let foundFirst = false;
        for (let y = 0; y < h && !foundFirst; y++) {
            const rowStart = y * w;
            for (let x = 0; x < w; x++) {
                if (binary[rowStart + x] === 1) {
                    minY = y;
                    foundFirst = true;
                    break;
                }
            }
        }
        
        if (!foundFirst) return null;
        
        for (let y = h - 1; y >= minY; y--) {
            const rowStart = y * w;
            for (let x = 0; x < w; x++) {
                if (binary[rowStart + x] === 1) {
                    maxY = y;
                    break;
                }
            }
            if (maxY !== -1) break;
        }
        
        for (let y = minY; y <= maxY; y++) {
            const rowStart = y * w;
            for (let x = 0; x < w; x++) {
                if (binary[rowStart + x] === 1) {
                    if (x < minX) minX = x;
                    break;
                }
            }
            for (let x = w - 1; x >= 0; x--) {
                if (binary[rowStart + x] === 1) {
                    if (x > maxX) maxX = x;
                    break;
                }
            }
        }
        
        if (maxX < 0) return null;
        return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
    }

    /**
     * Супер-быстрая эрозия (Sliding Window)
     * O(N) вместо O(N*K)
     */
    morphErodeOptimized(input, w, h, kSize) {
        const r = kSize >> 1; 
        const temp = new Uint8Array(w * h);
        const output = new Uint8Array(w * h);

        // Pass 1: Horizontal
        for (let y = 0; y < h; y++) {
            const rowStart = y * w;
            let count = 0;
            
            // Заполняем начальное окно
            for (let x = 0; x < r; x++) {
                count += input[rowStart + x];
            }
            
            for (let x = 0; x < w; x++) {
                if (x + r < w) {
                    count += input[rowStart + x + r];
                }
                
                const left = x - r;
                const right = Math.min(x + r, w - 1);
                const windowSize = right - Math.max(0, left) + 1;
                
                // Если сумма в окне равна размеру окна, значит все пиксели = 1
                temp[rowStart + x] = (count === windowSize) ? 1 : 0;
                
                if (left >= 0) {
                    count -= input[rowStart + left];
                }
            }
        }

        // Pass 2: Vertical
        for (let x = 0; x < w; x++) {
            let count = 0;
            
            for (let y = 0; y < r; y++) {
                count += temp[y * w + x];
            }
            
            for (let y = 0; y < h; y++) {
                if (y + r < h) {
                    count += temp[(y + r) * w + x];
                }
                
                const top = y - r;
                const bottom = Math.min(y + r, h - 1);
                const windowSize = bottom - Math.max(0, top) + 1;
                
                output[y * w + x] = (count === windowSize) ? 1 : 0;
                
                if (top >= 0) {
                    count -= temp[top * w + x];
                }
            }
        }
        return output;
    }

    /**
     * Супер-быстрая дилатация (Sliding Window)
     */
    morphDilateOptimized(input, w, h, kSize) {
        const r = kSize >> 1;
        const temp = new Uint8Array(w * h);
        const output = new Uint8Array(w * h);

        // Pass 1: Horizontal
        for (let y = 0; y < h; y++) {
            const rowStart = y * w;
            let count = 0;
            
            for (let x = 0; x < r; x++) {
                count += input[rowStart + x];
            }
            
            for (let x = 0; x < w; x++) {
                if (x + r < w) {
                    count += input[rowStart + x + r];
                }
                
                // Если сумма > 0, значит хотя бы один пиксель = 1
                temp[rowStart + x] = (count > 0) ? 1 : 0;
                
                const left = x - r;
                if (left >= 0) {
                    count -= input[rowStart + left];
                }
            }
        }

        // Pass 2: Vertical
        for (let x = 0; x < w; x++) {
            let count = 0;
            
            for (let y = 0; y < r; y++) {
                count += temp[y * w + x];
            }
            
            for (let y = 0; y < h; y++) {
                if (y + r < h) {
                    count += temp[(y + r) * w + x];
                }
                
                output[y * w + x] = (count > 0) ? 1 : 0;
                
                const top = y - r;
                if (top >= 0) {
                    count -= temp[top * w + x];
                }
            }
        }
        return output;
    }
}