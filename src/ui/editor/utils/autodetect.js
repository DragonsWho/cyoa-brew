/**
 * src\utils\autodetect.js
 * AutoDetect - Roboflow Integration logic
 * Optimized: Smart Downscaling + Sliding Window Morphology + Roboflow Points Conversion
 */

export class AutoDetector {
    constructor() {
        this.statusCallback = null;
        this.debugCallback = null;
        
        // Лимит для оптимизации морфологии
        this.MAX_PROCESSING_SIZE = 2000;
        // Лимит для отправки в API (для экономии трафика/скорости)
        this.API_UPLOAD_SIZE = 1024;
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
     * Main function to process image using Roboflow
     */
    async processImage(imageFile, prompt, shaveRatio, roboflowConfig, targetDebugIndex = -1) {
        const { apiKey, workspace, workflowId } = roboflowConfig;
        
        if (!apiKey || !workspace || !workflowId) {
            this.setStatus("Missing Roboflow credentials");
            return [];
        }

        try {
            // 1. Prepare Image for API (Resize & Base64)
            this.setStatus("Preparing image...");
            const base64 = await this.resizeAndToBase64(imageFile, this.API_UPLOAD_SIZE);

            // 2. Prepare Prompts
            const promptsArray = prompt.split(',').map(s => s.trim()).filter(s => s);

            this.setStatus("Sending to Roboflow...");
            
            // 3. API Call
            const url = `https://serverless.roboflow.com/${workspace}/workflows/${workflowId}`;
            const payload = {
                api_key: apiKey,
                inputs: {
                    image: { type: "base64", value: base64 },
                    prompts: promptsArray
                }
            };

            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            
            if (result.error) throw new Error(JSON.stringify(result.error));
            if (!result.outputs || !result.outputs[0]) throw new Error("No output data from API");

            // 4. Extract Predictions
            const outputBlock = result.outputs[0];
            let rawPreds = [];
            
            // Try standard key 'sam_1', else search
            if (outputBlock.sam_1 && outputBlock.sam_1.predictions) {
                rawPreds = outputBlock.sam_1.predictions;
            } else {
                for (let key in outputBlock) {
                    if (outputBlock[key]?.predictions) {
                        rawPreds = outputBlock[key].predictions;
                        break;
                    }
                }
            }

            if (!rawPreds || rawPreds.length === 0) {
                this.setStatus("No elements found.");
                return [];
            }

            // 5. Setup Morphology Processing
            // We need original dimensions to map back correctly
            const imgBitmap = await createImageBitmap(imageFile);
            const originalW = imgBitmap.width;
            const originalH = imgBitmap.height;

            // Roboflow returns coords relative to the *sent* image size (API_UPLOAD_SIZE)
            // But we want to process morphology on a decent size (MAX_PROCESSING_SIZE)
            const sentW = Math.min(originalW, this.API_UPLOAD_SIZE);
            const sentH = Math.round(originalH * (sentW / originalW));
            
            // Morphology Scale Calculation
            const morphScale = this.calculateScale(originalW, originalH);
            const processW = Math.round(originalW * morphScale);
            const processH = Math.round(originalH * morphScale);

            this.setStatus(`Processing ${rawPreds.length} masks. Morph Scale: ${morphScale.toFixed(3)} (${processW}x${processH})`);

            const detectedItems = [];

            for (let i = 0; i < rawPreds.length; i++) {
                const pred = rawPreds[i];
                if (!pred.points || pred.points.length === 0) continue;

                this.setStatus(`Processing mask ${i+1}/${rawPreds.length}...`);
                const isDebugItem = (targetDebugIndex >= 0 && (i === targetDebugIndex || i === targetDebugIndex - 1)); // -1 offset fix in UI

                // UI Yield
                if (i > 0 && i % 3 === 0) await this.yieldToMain();

                // 6. Convert Points (Polygon) to Mask Image (DataURL)
                // Roboflow sends points relative to `sentW/sentH`. 
                // We create a mask of that size.
                const maskUrl = await this.pointsToDataURL(pred.points, sentW, sentH);

                // 7. Run Morphology ("Shaving")
                // Note: The morph function expects the maskUrl to be resized to processW/processH internally
                const bbox = await this.processMaskMorphologyOptimized(
                    maskUrl, 
                    originalW, originalH,
                    processW, processH,
                    morphScale,
                    shaveRatio, 
                    isDebugItem ? `Item ${i+1} (${pred.class})` : null
                );
                
                if (bbox) {
                    // Temporary ID, will be fixed in step 8
                    detectedItems.push({
                        id: `temp_${i}`, 
                        title: pred.class || `Item ${i + 1}`,
                        coords: bbox,
                        confidence: pred.confidence
                    });
                }
            }

            // 8. Sort & Renumber
            const ROW_TOLERANCE = 50;
            detectedItems.sort((a, b) => {
                const rowA = Math.floor(a.coords.y / ROW_TOLERANCE);
                const rowB = Math.floor(b.coords.y / ROW_TOLERANCE);
                if (rowA !== rowB) return rowA - rowB;
                return a.coords.x - b.coords.x;
            });

            // FIXED: Use Timestamp + Index to guarantee global uniqueness across pages
            const batchId = Date.now(); 
            detectedItems.forEach((item, idx) => {
                item.id = `item_${batchId}_${idx + 1}`;
                
                // Keep class name if available, otherwise generic
                if (item.title.startsWith("Item ")) item.title = `Item ${idx + 1}`;
            });

            this.setStatus("Done!");
            return detectedItems;

        } catch (e) {
            console.error(e);
            this.setStatus(`Error: ${e.message}`);
            return [];
        }
    }

    // --- Helpers ---

    resizeAndToBase64(file, maxWidth) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (e) => {
                const img = new Image();
                img.src = e.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let w = img.width;
                    let h = img.height;
                    if (w > maxWidth) {
                        h = Math.round(h * (maxWidth / w));
                        w = maxWidth;
                    }
                    canvas.width = w;
                    canvas.height = h;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, w, h);
                    const data = canvas.toDataURL('image/jpeg', 0.85); 
                    resolve(data.split(',')[1]);
                };
            };
            reader.onerror = reject;
        });
    }

    pointsToDataURL(points, w, h) {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            
            // Black background
            ctx.fillStyle = "black";
            ctx.fillRect(0, 0, w, h);
            
            // White Polygon
            if (points.length > 0) {
                ctx.beginPath();
                ctx.moveTo(points[0].x, points[0].y);
                for (let i = 1; i < points.length; i++) {
                    ctx.lineTo(points[i].x, points[i].y);
                }
                ctx.closePath();
                ctx.fillStyle = "white";
                ctx.fill();
            }
            
            resolve(canvas.toDataURL('image/png'));
        });
    }

    calculateScale(w, h) {
        const maxDim = Math.max(w, h);
        if (maxDim <= this.MAX_PROCESSING_SIZE) {
            return 1; 
        }
        return this.MAX_PROCESSING_SIZE / maxDim;
    }

    yieldToMain() {
        return new Promise(resolve => {
            if ('scheduler' in window && 'yield' in window.scheduler) {
                window.scheduler.yield().then(resolve);
            } else {
                setTimeout(resolve, 0);
            }
        });
    }

    // --- Morphology Logic (Restored from your file) ---

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
                
                // Рисуем маску, масштабируя её под размер обработки
                ctx.drawImage(img, 0, 0, processW, processH);

                if (debugName) {
                    this.sendDebugImage(`${debugName} - 1. Original (Scaled to ${processW}×${processH})`, canvas);
                }

                // 2. Получаем пиксели
                const imgData = ctx.getImageData(0, 0, processW, processH);
                let binary = new Uint8Array(processW * processH);
                
                const data = imgData.data;
                const len = binary.length;
                for (let k = 0; k < len; k++) {
                    // Простой порог, так как у нас ч/б маска
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

    morphErodeOptimized(input, w, h, kSize) {
        const r = kSize >> 1; 
        const temp = new Uint8Array(w * h);
        const output = new Uint8Array(w * h);

        // Pass 1: Horizontal
        for (let y = 0; y < h; y++) {
            const rowStart = y * w;
            let count = 0;
            for (let x = 0; x < r; x++) count += input[rowStart + x];
            for (let x = 0; x < w; x++) {
                if (x + r < w) count += input[rowStart + x + r];
                const left = x - r;
                const right = Math.min(x + r, w - 1);
                const windowSize = right - Math.max(0, left) + 1;
                temp[rowStart + x] = (count === windowSize) ? 1 : 0;
                if (left >= 0) count -= input[rowStart + left];
            }
        }

        // Pass 2: Vertical
        for (let x = 0; x < w; x++) {
            let count = 0;
            for (let y = 0; y < r; y++) count += temp[y * w + x];
            for (let y = 0; y < h; y++) {
                if (y + r < h) count += temp[(y + r) * w + x];
                const top = y - r;
                const bottom = Math.min(y + r, h - 1);
                const windowSize = bottom - Math.max(0, top) + 1;
                output[y * w + x] = (count === windowSize) ? 1 : 0;
                if (top >= 0) count -= temp[top * w + x];
            }
        }
        return output;
    }

    morphDilateOptimized(input, w, h, kSize) {
        const r = kSize >> 1;
        const temp = new Uint8Array(w * h);
        const output = new Uint8Array(w * h);

        // Pass 1: Horizontal
        for (let y = 0; y < h; y++) {
            const rowStart = y * w;
            let count = 0;
            for (let x = 0; x < r; x++) count += input[rowStart + x];
            for (let x = 0; x < w; x++) {
                if (x + r < w) count += input[rowStart + x + r];
                temp[rowStart + x] = (count > 0) ? 1 : 0;
                const left = x - r;
                if (left >= 0) count -= input[rowStart + left];
            }
        }

        // Pass 2: Vertical
        for (let x = 0; x < w; x++) {
            let count = 0;
            for (let y = 0; y < r; y++) count += temp[y * w + x];
            for (let y = 0; y < h; y++) {
                if (y + r < h) count += temp[(y + r) * w + x];
                output[y * w + x] = (count > 0) ? 1 : 0;
                const top = y - r;
                if (top >= 0) count -= temp[top * w + x];
            }
        }
        return output;
    }
}