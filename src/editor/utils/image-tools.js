/**
 * src/editor/utils/image-tools.js
 * Image Cropper Tool - Fixed visibility/sizing issues + Original Image support
 */

export class ImageCropper {
    constructor() {
        this.modal = null;
        this.canvas = null;
        this.ctx = null;
        this.image = null;
        this.selection = { x: 0, y: 0, w: 0, h: 0, active: false, dragging: false };
        this.callback = null;
        this.quality = 0.85;
        this.aspectRatio = null;
        this.scale = 1;
    }

    init() {
        if (document.getElementById('image-cropper-modal')) return;

        const html = `
            <div id="image-cropper-modal" class="modal-overlay" style="display:none; z-index: 10000;">
                <div class="modal-content" style="width: 90%; height: 90%; max-width: 1000px; display:flex; flex-direction:column; background: #1a1a1a; padding: 0;">
                    <!-- Header -->
                    <div style="padding: 10px 15px; border-bottom: 1px solid #333; display:flex; justify-content:space-between; align-items:center; background: #222;">
                        <h3 style="margin:0; color:#eee;">✂️ Crop Image</h3>
                        <div style="display:flex; gap:10px; align-items:center;">
                            <select id="cropper-aspect" style="background:#333; color:#fff; border:1px solid #444; padding:4px;">
                                <option value="free">Free</option>
                                <option value="1">1:1 (Square)</option>
                                <option value="1.777">16:9</option>
                                <option value="1.333">4:3</option>
                                <option value="0.666">2:3 (Card)</option>
                            </select>
                            <span style="font-size:0.8rem; color:#888;">Quality:</span>
                            <input type="range" id="cropper-quality" min="0.1" max="1.0" step="0.05" value="0.85" style="width:60px;">
                        </div>
                    </div>

                    <!-- Workspace -->
                    <div id="cropper-workspace" style="flex:1; position:relative; overflow:hidden; background:#111; cursor: crosshair; display:flex; align-items:center; justify-content:center;">
                        <!-- Canvas max-width/height ensures it fits visually without CSS stretching distortion -->
                        <canvas id="cropper-canvas" style="box-shadow: 0 0 20px rgba(0,0,0,0.5); max-width: 100%; max-height: 100%; object-fit: contain;"></canvas>
                    </div>

                    <!-- Footer -->
                    <div style="padding: 15px; border-top: 1px solid #333; display:flex; justify-content:flex-end; gap:10px; background: #222;">
                        <button class="action-btn" onclick="CYOA.editor.imageCropper.close()" style="background:#444; width:auto; padding: 8px 20px;">Cancel</button>
                        
                        <!-- NEW BUTTON: INSERT ORIGINAL -->
                        <button class="action-btn" onclick="CYOA.editor.imageCropper.saveOriginal()" style="background:#3a6ea5; width:auto; padding: 8px 20px;">Insert Original</button>
                        
                        <button class="action-btn primary-btn" onclick="CYOA.editor.imageCropper.save()" style="width:auto; padding: 8px 20px;">✅ Crop & Save WebP</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);

        this.modal = document.getElementById('image-cropper-modal');
        this.canvas = document.getElementById('cropper-canvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Listeners
        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        window.addEventListener('mousemove', (e) => this.onMouseMove(e));
        window.addEventListener('mouseup', (e) => this.onMouseUp(e));

        document.getElementById('cropper-aspect').addEventListener('change', (e) => {
            this.aspectRatio = e.target.value === 'free' ? null : parseFloat(e.target.value);
            this.selection.w = 0; this.selection.h = 0;
            this.draw();
        });

        document.getElementById('cropper-quality').addEventListener('input', (e) => {
            this.quality = parseFloat(e.target.value);
        });
    }

    open(file, callback) {
        this.init();
        this.callback = callback;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            this.image = new Image();
            this.image.onload = () => {
                // IMPORTANT: Show modal BEFORE calculating sizes, otherwise clientWidth is 0
                this.modal.style.display = 'flex';
                
                // Allow a micro-tick for layout render if needed, though usually sync works after display change
                requestAnimationFrame(() => {
                    this.resizeCanvasToFit();
                    this.resetSelection();
                    this.draw();
                });
            };
            this.image.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    close() {
        if (this.modal) this.modal.style.display = 'none';
        this.image = null;
    }

    resizeCanvasToFit() {
        const workspace = document.getElementById('cropper-workspace');
        // Get dimensions ensuring we have space (padding)
        const containerW = workspace.clientWidth - 40;
        const containerH = workspace.clientHeight - 40;

        const imgW = this.image.naturalWidth;
        const imgH = this.image.naturalHeight;

        // Calculate scale to FIT the image inside the workspace
        const scale = Math.min(containerW / imgW, containerH / imgH);
        
        this.scale = scale; 
        
        // Set ACTUAL canvas resolution
        this.canvas.width = Math.floor(imgW * scale);
        this.canvas.height = Math.floor(imgH * scale);
        
        // Reset styles that might interfere
        this.canvas.style.width = `${this.canvas.width}px`;
        this.canvas.style.height = `${this.canvas.height}px`;
    }

    resetSelection() {
        const w = this.canvas.width;
        const h = this.canvas.height;
        const size = Math.min(w, h) * 0.5;
        
        this.selection = { 
            x: (w - size)/2, 
            y: (h - size)/2, 
            w: size, 
            h: this.aspectRatio ? size / this.aspectRatio : size, 
            active: true 
        };
        
        if (this.aspectRatio) {
            // Fix initial aspect if w/h don't match
            if (this.selection.w / this.selection.h !== this.aspectRatio) {
                 this.selection.h = this.selection.w / this.aspectRatio;
            }
        }
    }

    // --- Mouse Events ---

    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        // Calculate scale factor between visual size and internal resolution (should be 1:1 if resizeCanvasToFit works, but safe to check)
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;

        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    }

    onMouseDown(e) {
        if (!this.image) return;
        const pos = this.getMousePos(e);
        this.selection.startX = pos.x;
        this.selection.startY = pos.y;
        this.selection.x = pos.x;
        this.selection.y = pos.y;
        this.selection.w = 0;
        this.selection.h = 0;
        this.selection.dragging = true;
        this.draw();
    }

    onMouseMove(e) {
        if (!this.selection.dragging) return;
        const pos = this.getMousePos(e);
        
        let w = pos.x - this.selection.startX;
        let h = pos.y - this.selection.startY;

        if (this.aspectRatio) {
            // Enforce aspect ratio logic...
            // Simple approach: width dictates height
            if (Math.abs(w) > Math.abs(h)) {
                 const signH = h < 0 ? -1 : 1;
                 // Need to respect the aspect ratio sign logic
                 // If dragging top-left, both w and h are negative
                 h = (Math.abs(w) / this.aspectRatio) * (h < 0 ? -1 : 1);
            } else {
                 w = (Math.abs(h) * this.aspectRatio) * (w < 0 ? -1 : 1);
            }
        }

        this.selection.w = w;
        this.selection.h = h;
        this.draw();
    }

    onMouseUp(e) {
        if (!this.selection.dragging) return;
        this.selection.dragging = false;
        
        // Normalize negatives
        if (this.selection.w < 0) {
            this.selection.x += this.selection.w;
            this.selection.w = Math.abs(this.selection.w);
        }
        if (this.selection.h < 0) {
            this.selection.y += this.selection.h;
            this.selection.h = Math.abs(this.selection.h);
        }
        this.draw();
    }

    draw() {
        if (!this.ctx || !this.image) return;
        const w = this.canvas.width;
        const h = this.canvas.height;

        // 1. Draw Image
        this.ctx.clearRect(0, 0, w, h);
        this.ctx.drawImage(this.image, 0, 0, w, h);

        // 2. Draw Dim Overlay
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        this.ctx.fillRect(0, 0, w, h);

        // 3. Clear Selection (Highlight)
        let { x, y, w: sw, h: sh } = this.selection;
        
        // Handle negative drawing for live dragging
        if (sw < 0) { x += sw; sw = Math.abs(sw); }
        if (sh < 0) { y += sh; sh = Math.abs(sh); }

        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.rect(x, y, sw, sh);
        this.ctx.clip();
        this.ctx.drawImage(this.image, 0, 0, w, h);
        this.ctx.restore();

        // 4. Border
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([6, 4]);
        this.ctx.strokeRect(x, y, sw, sh);
    }

    // === NEW METHOD: Save Original ===
    saveOriginal() {
        if (!this.callback || !this.image) return;
        
        // this.image.src contains the original Base64 data from FileReader (e.g., data:image/png;base64...)
        // Passing this back preserves the original format (PNG/GIF/JPG) and dimensions.
        this.callback(this.image.src);
        this.close();
    }

    save() {
        if (!this.callback) return;

        let { x, y, w, h } = this.selection;
        if (w < 0) { x += w; w = Math.abs(w); }
        if (h < 0) { y += h; h = Math.abs(h); }

        if (w < 2 || h < 2) {
            alert("Selection too small!");
            return;
        }

        // Map back to ORIGINAL natural image coordinates
        const realX = x / this.scale;
        const realY = y / this.scale;
        const realW = w / this.scale;
        const realH = h / this.scale;

        const outputCanvas = document.createElement('canvas');
        outputCanvas.width = realW;
        outputCanvas.height = realH;
        const outCtx = outputCanvas.getContext('2d');

        outCtx.drawImage(
            this.image,
            realX, realY, realW, realH, // Source on original image
            0, 0, realW, realH          // Destination on new canvas
        );

        const webpData = outputCanvas.toDataURL('image/webp', this.quality);
        
        this.callback(webpData);
        this.close();
    }
}

export const imageCropper = new ImageCropper();