/**
 * AutoDetect - SAM3 Integration logic
 * Replicates Python OpenCV Morphology (Erode/Dilate) in JS
 */

import { Client } from "@gradio/client";

export class AutoDetector {
    constructor() {
        this.client = null;
        this.statusCallback = null;
        this.debugCallback = null; // Функция для отправки картинок в UI
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
     * @param {File} imageFile 
     * @param {string} prompt 
     * @param {number} shaveRatio 
     * @param {string} hfToken 
     * @param {number} targetDebugIndex - Index to generate debug images for (-1 for none)
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

            this.setStatus(`Processing ${rawAnnotations.length} masks (Morphology)...`);

            // Подготовка битмапа оригинала для размеров
            const imgBitmap = await createImageBitmap(imageFile);
            const w = imgBitmap.width;
            const h = imgBitmap.height;

            const detectedItems = [];

            for (let i = 0; i < rawAnnotations.length; i++) {
                this.setStatus(`Processing mask ${i+1}/${rawAnnotations.length}...`);
                
                // ЛОГИКА ДЕБАГА
                // Если targetDebugIndex >= 0, показываем только этот элемент. Иначе - ничего.
                const isDebugItem = (targetDebugIndex >= 0 && i === targetDebugIndex);

                const bbox = await this.processMaskMorphology(
                    rawAnnotations[i].image.url, 
                    w, h, 
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

    /**
     * JS реализация cv2.morphologyEx
     */
    async processMaskMorphology(maskUrl, targetW, targetH, shaveRatio, debugName) {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.src = maskUrl;
            
            img.onload = () => {
                // 1. Рисуем маску на Canvas
                const canvas = document.createElement('canvas');
                canvas.width = targetW;
                canvas.height = targetH;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, targetW, targetH);

                if (debugName) this.sendDebugImage(`${debugName} - 1. Original`, canvas);

                // 2. Получаем пиксели
                const imgData = ctx.getImageData(0, 0, targetW, targetH);
                let binary = new Uint8Array(targetW * targetH);
                
                // Threshold (Бинаризация)
                for (let k = 0; k < imgData.data.length; k += 4) {
                    binary[k / 4] = imgData.data[k] > 128 ? 1 : 0;
                }

                // ==========================================
                // STEP 3: MORPH OPEN (Shaving)
                // ERODE -> DILATE
                // ==========================================
                
                let shaveSize = Math.floor(targetW * shaveRatio);
                if (shaveSize < 3) shaveSize = 3;
                if (shaveSize % 2 === 0) shaveSize++; // нечетное

                let eroded = this.morphErode(binary, targetW, targetH, shaveSize);
                let shaved = this.morphDilate(eroded, targetW, targetH, shaveSize);

                if (debugName) {
                    this.drawBinaryToCanvas(shaved, ctx, targetW, targetH);
                    this.sendDebugImage(`${debugName} - 2. Shaved (K=${shaveSize})`, canvas);
                }

                // ==========================================
                // STEP 4: MORPH CLOSE (Closing holes)
                // DILATE -> ERODE
                // ==========================================
                const closeSize = 15; 
                
                let dilated2 = this.morphDilate(shaved, targetW, targetH, closeSize);
                let closed = this.morphErode(dilated2, targetW, targetH, closeSize);

                if (debugName) {
                    this.drawBinaryToCanvas(closed, ctx, targetW, targetH);
                    this.sendDebugImage(`${debugName} - 3. Closed (Final)`, canvas);
                }

                // ==========================================
                // STEP 5: Find BBox
                // ==========================================
                const bbox = this.findBoundingBox(closed, targetW, targetH);
                
                if (bbox) {
                    const area = bbox.w * bbox.h;
                    const minArea = (targetW * targetH) * 0.0005;
                    if (area < minArea) resolve(null);
                    else resolve(bbox);
                } else {
                    resolve(null);
                }
            };
            img.onerror = () => resolve(null);
        });
    }

    // --- Helpers ---

    drawBinaryToCanvas(binary, ctx, w, h) {
        const output = ctx.createImageData(w, h);
        for (let i = 0; i < binary.length; i++) {
            const val = binary[i] === 1 ? 255 : 0;
            output.data[i*4] = val;     // R
            output.data[i*4+1] = val;   // G
            output.data[i*4+2] = val;   // B
            output.data[i*4+3] = 255;   // Alpha
        }
        ctx.putImageData(output, 0, 0);
    }

    findBoundingBox(binary, w, h) {
        let minX = w, minY = h, maxX = 0, maxY = 0;
        let found = false;
        
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                if (binary[y * w + x] === 1) {
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                    found = true;
                }
            }
        }
        if (!found) return null;
        return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
    }

    morphErode(input, w, h, kSize) {
        const output = new Uint8Array(input.length);
        const temp = new Uint8Array(input.length);
        const r = Math.floor(kSize / 2);

        // Pass 1: Horizontal
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                let allOnes = true;
                for (let k = -r; k <= r; k++) {
                    const px = x + k;
                    if (px < 0 || px >= w) { allOnes = false; break; } 
                    if (input[y * w + px] === 0) { allOnes = false; break; }
                }
                temp[y * w + x] = allOnes ? 1 : 0;
            }
        }

        // Pass 2: Vertical
        for (let x = 0; x < w; x++) {
            for (let y = 0; y < h; y++) {
                let allOnes = true;
                for (let k = -r; k <= r; k++) {
                    const py = y + k;
                    if (py < 0 || py >= h) { allOnes = false; break; }
                    if (temp[py * w + x] === 0) { allOnes = false; break; }
                }
                output[y * w + x] = allOnes ? 1 : 0;
            }
        }
        return output;
    }

    morphDilate(input, w, h, kSize) {
        const output = new Uint8Array(input.length);
        const temp = new Uint8Array(input.length);
        const r = Math.floor(kSize / 2);

        // Pass 1: Horizontal
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                let anyOne = false;
                for (let k = -r; k <= r; k++) {
                    const px = x + k;
                    if (px >= 0 && px < w) {
                        if (input[y * w + px] === 1) { anyOne = true; break; }
                    }
                }
                temp[y * w + x] = anyOne ? 1 : 0;
            }
        }

        // Pass 2: Vertical
        for (let x = 0; x < w; x++) {
            for (let y = 0; y < h; y++) {
                let anyOne = false;
                for (let k = -r; k <= r; k++) {
                    const py = y + k;
                    if (py >= 0 && py < h) {
                        if (temp[py * w + x] === 1) { anyOne = true; break; }
                    }
                }
                output[y * w + x] = anyOne ? 1 : 0;
            }
        }
        return output;
    }
}