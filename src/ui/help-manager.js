/**
 * src/ui/help-manager.js
 * Manages the Help/Info modal with cheatsheets and AI tips
 */

import { APP_VERSION } from '../constants.js';

export class HelpManager {
    constructor() {
        this.modalId = 'help-modal';
        this.createModal();
    }

    createModal() {
        if (document.getElementById(this.modalId)) return;

        const styles = `
            <style>
                /* Стили для Intro Box (Шапка) */
                .intro-box {
                    background: linear-gradient(to right, rgba(20, 20, 20, 1), rgba(30, 30, 30, 1));
                    border: 1px solid #333;
                    /* border-left удален для чистоты дизайна */
                    padding: 25px 20px;
                    border-radius: 6px;
                    margin-bottom: 25px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    text-align: center;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.3);
                }

                .intro-title {
                    margin: 0 0 5px 0;
                    width: 100%;
                    display: flex;
                    justify-content: center; /* Центрируем содержимое по горизонтали */
                }

                /* Обертка для текста заголовка, чтобы к ней привязать версию */
                .title-wrapper {
                    position: relative;
                    font-size: 28px;
                    font-weight: 700;
                    color: #fff;
                    letter-spacing: 1px;
                }

                /* Версия висит абсолютно справа от текста и не влияет на центрирование */
                .version-tag {
                    position: absolute;
                    left: 100%;
                    bottom: 4px; /* Выравнивание по базовой линии */
                    margin-left: 10px;
                    font-size: 14px;
                    color: #555;
                    font-weight: 400;
                    white-space: nowrap;
                    opacity: 0.8;
                }

                .intro-subtitle {
                    font-size: 14px;
                    color: #888;
                    margin-bottom: 15px;
                }
                
                .author-name {
                    color: #ff5252;
                    font-weight: 600;
                }

                /* Ссылки (Github, Video) */
                .intro-links {
                    display: flex;
                    gap: 20px;
                    font-size: 13px;
                    margin-bottom: 25px;
                }
                .intro-links a {
                    color: #aaa;
                    text-decoration: none;
                    border-bottom: 1px dotted #555;
                    transition: 0.2s;
                    display: flex; align-items: center; gap: 5px;
                }
                .intro-links a:hover {
                    color: #fff;
                    border-bottom-color: #fff;
                }

                /* Блок донатов */
                .support-wrapper {
                    display: flex;
                    align-items: center;
                    gap: 15px;
                    background: rgba(255,255,255,0.03);
                    padding: 10px 20px;
                    border-radius: 50px;
                    border: 1px solid #333;
                }
                
                .support-label {
                    font-size: 11px;
                    color: #555;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    font-weight: 600;
                    margin-right: 5px;
                }

                /* Кнопки */
                .brand-btn {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    text-decoration: none;
                    border-radius: 4px;
                    transition: transform 0.1s, opacity 0.2s;
                    height: 40px;
                    padding: 0 15px;
                    box-sizing: border-box;
                }
                .brand-btn:hover {
                    opacity: 0.9;
                    transform: translateY(-1px);
                }
                
                .brand-btn svg { fill: #FFFFFF; }

                /* Boosty Specifics */
                .btn-boosty {
                    background-color: #da552f;
                    overflow: hidden;
                }
                .boosty-svg {
                    width: 100px;
                    height: auto;
                    margin-left: -8px;
                }

                /* Patreon Specifics */
                .btn-patreon {
                    background-color: #FF424D;
                    border-radius: 20px;
                    gap: 0;
                }
                .patreon-logo {
                    width: 20px; 
                    height: auto;
                }
                .patreon-text {
                    width: 90px;
                    height: auto;
                    margin-left: -2px;
                }

            </style>
        `;

        const html = `
            <div id="${this.modalId}" class="modal-overlay" style="display:none; z-index: 99999;">
                <div class="modal-content help-modal-content">
                    ${styles}
                    
                    <!-- Header -->
                    <div class="help-header">
                        <h3>Help & Tips</h3>
                        <button onclick="document.getElementById('${this.modalId}').style.display='none'" class="close-btn">✕</button>
                    </div>

                    <!-- Body -->
                    <div class="help-body">
                        
                        <!-- ================================================= -->
                        <!-- HEADER / INTRO -->
                        <!-- ================================================= -->
                        <div class="intro-box">
                            <div class="intro-title">
                                <span class="title-wrapper">
                                    CYOA Brew 
                                    <span class="version-tag">v${APP_VERSION}</span>
                                </span>
                            </div>
                            <div class="intro-subtitle">
                                Made by <span class="author-name">Dragons Whore</span>
                            </div>

                            <div class="intro-links">
                                <a href="https://github.com/DragonsWho/cyoa-brew/releases/latest" target="_blank">Latest Version (Github)</a>
                                <a href="https://www.youtube.com/watch?v=dQw4w9WgXcQ" target="_blank">Video Tutorial</a>
                            </div>
                            
                            <!-- Support Buttons Container -->
                            <div class="support-wrapper">
                                <span class="support-label">Support me</span>
                                
                                <!-- BOOSTY BUTTON -->
                                <a href="https://boosty.to/dragonswhore" target="_blank" class="brand-btn btn-boosty">
                                    <svg viewBox="0 0 715.8 317.4" class="boosty-svg">
                                        <path d="M632.8,138.6l-23.1,35.9l-2.3-35.9h-19.3h-6h-7.9c3.1-10.5,5.5-19,5.5-19l1.3-4.2h-25.5l-1.2,4.2l-5.5,19h-21.7c-3.6,0-5.4,0-5.4,0c-22.3,0-34.8,6.4-40,18.4c-3-11-12.9-18.4-28.2-18.4c-13.2,0-24.9,4.9-33.6,12.7c-4.5-7.8-13.4-12.7-25.8-12.7c-14.2,0-26.5,5.7-35.5,14.4c-4.1-8.7-13.4-14.4-26.7-14.4c-4.6,0-8.9,0.6-13,1.7l2-6.9c0-0.1,0.1-0.2,0.1-0.3l5.1-17.7h-25.4l-16.2,55.8c-0.4,1.1-0.8,2.2-1.1,3.4c-0.7,2.6-1.2,5.1-1.4,7.5c-2.1,15.6,4.7,27.3,23.6,28.1c1.7,0.2,3.5,0.3,5.5,0.3c13.4,0,25.9-5.7,35.1-14.4c3.9,8.7,13,14.4,27.1,14.4c12.5,0,24.3-4.9,33.2-12.7c4.3,7.8,13.1,12.7,26.2,12.7c28.4,0,49.6,0,63.6,0c19.7,0,30.8-3.9,36.6-12.3c0,8.1,4.6,12.3,16.2,12.3c9.4,0,22-2.1,39.3-6.3L563.3,240h25.4l69.5-101.4H632.8z M334.3,174.5c-2.4,8.2-10,14.8-17,14.8c-7,0-10.8-6.6-8.4-14.8c2.4-8.2,10-14.8,17-14.8C332.9,159.7,336.7,166.3,334.3,174.5z M396.4,174.5c-2.4,8.2-10,14.8-17,14.8s-10.8-6.6-8.4-14.8s10-14.8,17-14.8S398.8,166.3,396.4,174.5z M430.5,174.5c2.4-8.2,10-14.8,17-14.8s10.8,6.6,8.4,14.8c-2.3,8.1-9.8,14.6-16.7,14.8c-0.2,0-0.4,0-0.6,0C431.8,189.1,428.2,182.6,430.5,174.5z M512.2,186.7c-1.3,3-11.3,2.5-13.8,2.6c0,0-6.6,0-24.6,0c3.3-4.5,5.9-9.5,7.4-14.8c0.2-0.5,0.3-1.1,0.4-1.6c2.7,3.8,8.3,7.2,19.2,9.4C511.2,184.3,513.1,183.7,512.2,186.7z M537.3,178.6c-2.2-8.4-11.5-11.8-24.6-13.4c-5.5-0.7-8.6-0.9-7.9-3.3c0.5-1.8,3.3-2.2,9.2-2.2c3.7,0,8.1,0,13.2,0h15.6L537.3,178.6z M562.6,178.7c0-0.2,2.5-8.6,5.5-19h16.1l2.6,26.9C560.3,192.3,559.7,190.8,562.6,178.7z"></path>
                                        <path d="M87.5,163.9L120.2,51h50.1l-10.1,35c-0.1,0.2-0.2,0.4-0.3,0.6L133.3,179h24.8c-10.4,25.9-18.5,46.2-24.3,60.9c-45.8-0.5-58.6-33.3-47.4-72.1 M133.9,240l60.4-86.9h-25.6l22.3-55.7c38.2,4,56.2,34.1,45.6,70.5C225.3,207,179.4,240,134.8,240C134.5,240,134.2,240,133.9,240z"></path>
                                    </svg>
                                </a>

                                <!-- PATREON BUTTON -->
                                <a href="https://www.patreon.com/DragonsWhore" target="_blank" class="brand-btn btn-patreon">
                                    <svg viewBox="0 0 1080 1080" class="patreon-logo">
                                        <path d="M1033.05,324.45c-0.19-137.9-107.59-250.92-233.6-291.7c-156.48-50.64-362.86-43.3-512.28,27.2C106.07,145.41,49.18,332.61,47.06,519.31c-1.74,153.5,13.58,557.79,241.62,560.67c169.44,2.15,194.67-216.18,273.07-321.33c55.78-74.81,127.6-95.94,216.01-117.82C929.71,603.22,1033.27,483.3,1033.05,324.45z"/>
                                    </svg>
                                    <svg viewBox="0 0 1826.3 619.9" class="patreon-text">
                                        <path d="M202.5,226c0-10,7.4-16.8,19-16.8h55.5c50.3,0,84.5,27.7,84.5,68.4c0,40-33.9,69.7-84.5,69.7h-7.7 c-19.4,0-29.4,10-29.4,26.1V419c0,12.9-7.4,21-18.7,21c-11.3,0-18.7-8.1-18.7-21V226z M239.9,283.8c0,20.3,10.3,30,30,30h4.8 c27.7,0,48.1-11.3,48.1-36.1s-20.3-36.1-48.1-36.1H270c-19.7,0-30,9.7-30,30V283.8z M361.6,422.2c0,10.6,7.4,17.7,18.7,17.7 c7.4,0,14.2-4.8,18.1-14.8l6.8-18.1c5.5-14.5,15.2-21.3,25.8-21.3h61.3c10.6,0,20.3,6.8,25.8,21.3l6.8,18.1 c3.9,10,10.6,14.8,18.1,14.8c11.3,0,18.7-7.1,18.7-17.7c0-2.9-0.6-6.5-1.9-10l-73.2-190.4c-4.5-11.6-14.8-17.4-24.8-17.4 s-20.3,5.8-24.8,17.4l-73.2,190.4C362.2,415.8,361.6,419.3,361.6,422.2z M432.9,335.7c0-3.5,1-6.8,2.6-11.6l13.9-38.4 c2.6-7.4,7.1-11,12.3-11s9.7,3.5,12.3,11l13.9,38.4c1.6,4.8,2.6,8.1,2.6,11.6c0,9.7-5.5,16.5-20,16.5h-17.4 C438.4,352.2,432.9,345.4,432.9,335.7z M549.4,226.7c0-10.3,7.4-17.4,19.4-17.4h148.4c11.9,0,19.4,7.1,19.4,17.4 s-7.4,17.4-19.4,17.4h-24.8c-19.7,0-30.3,10-30.3,32.9v141.7c0,13.2-7.4,21.3-19,21.3c-11.6,0-19-8.1-19-21.3V277 c0-22.9-10.6-32.9-30.3-32.9h-24.8C556.8,244.1,549.4,237,549.4,226.7z M771.4,419c0,12.9,7.4,21,18.7,21s18.7-8.1,18.7-21v-51.3 c0-14.5,8.4-20.7,18.7-20.7h2.6c6.8,0,13.6,4.2,17.7,10.3l49,72c4.5,6.8,10.3,10.6,17.7,10.6c9.7,0,17.4-8.1,17.4-17.7 c0-3.9-1.3-8.1-4.2-12.3l-32.6-45.8c-3.9-5.5-5.5-10-5.5-13.9c0-8.1,7.1-13.9,15.5-20c15.2-11.3,31.6-26.1,31.6-54.5 c0-39.7-31-66.5-82-66.5h-64.9c-11.6,0-18.7,6.8-18.7,16.8V419z M808.8,280.9v-9.7c0-21,11-29.7,27.7-29.7h16.1 c27.7,0,45.5,10.3,45.5,34.2s-18.7,34.8-46.5,34.8h-15.2C819.8,310.6,808.8,301.9,808.8,280.9z M984.7,418.3V226 c0-10,7.1-16.8,18.7-16.8h122c11.6,0,18.7,6.8,18.7,16.8s-7.1,16.8-18.7,16.8h-77.1c-15.2,0-26.1,9-26.1,26.1v7.1 c0,17.1,11,26.1,26.1,26.1h59.7c11.6,0,18.7,6.8,18.7,16.8s-7.1,16.8-18.7,16.8h-57.4c-15.2,0-28.4,9.4-28.4,28.4v9 c0,19,13.2,28.4,28.4,28.4h74.9c11.6,0,18.7,6.8,18.7,16.8s-7.1,16.8-18.7,16.8h-122C991.8,435.1,984.7,428.3,984.7,418.3z M1166.3,322.2c0-69.7,52.3-117.8,113.6-117.8c61.3,0,113.6,48.1,113.6,117.8S1341.2,440,1279.9,440 C1218.6,440,1166.3,391.9,1166.3,322.2z M1208.9,322.2c0,49,29,80.3,71,80.3c41.9,0,71-31.3,71-80.3c0-49.4-29-80.3-71-80.3 C1238,241.8,1208.9,272.8,1208.9,322.2z M1438.3,419c0,12.9,7.4,21,18.7,21s18.7-8.1,18.7-21v-98.7c0-11.9,7.1-17.7,14.5-17.7 c5.8,0,10.6,3.2,14.2,9l61.9,103.6c8.4,14.2,16.1,24.8,31.9,24.8c15.2,0,26.1-11,26.1-28.7V225.4c0-12.9-7.4-21-18.7-21 c-11.3,0-18.7,8.1-18.7,21v98.7c0,11.9-7.1,17.7-14.5,17.7c-5.8,0-10.7-3.2-14.2-9l-61.9-103.6c-8.4-14.2-16.1-24.8-31.9-24.8 c-15.2,0-26.1,11-26.1,28.7V419z"/></svg>
                                </a>
                            </div>
                        </div>

                        <!-- ================================================= -->
                        <!-- 1. HOTKEYS SECTION -->
                        <!-- ================================================= -->
                        <div class="help-section">
                            <h4>Hotkeys</h4>
                            
                            <!-- Creation -->
                            <div class="help-item">
                                <div class="help-row" onclick="CYOA.helpManager.toggleDesc(this)">
                                    <span class="cmd">Z / X (Hold + Drag)</span>
                                    <span class="desc">Drawing (Item / Group)</span>
                                    <button class="expand-btn">?</button>
                                </div>
                                <div class="full-desc" style="display:none;">
                                    <strong>Creation "on the fly":</strong><br>
                                    1. Hold <strong>Z</strong> and select an area with the mouse -> <strong>Item</strong>.<br>
                                    2. Hold <strong>X</strong> and select an area -> <strong>Group</strong>.<br>
                                    <em>Clicking while holding the key creates an element of standard size.</em>
                                </div>
                            </div>

                            <!-- Movement -->
                            <div class="help-item">
                                <div class="help-row" onclick="CYOA.helpManager.toggleDesc(this)">
                                    <span class="cmd">WASD</span>
                                    <span class="desc">Move / Resize</span>
                                    <button class="expand-btn">?</button>
                                </div>
                                <div class="full-desc" style="display:none;">
                                    <strong>WASD</strong> (or arrows): Move the element.<br>
                                    <strong>Shift + WASD</strong>: Fast movement (10px step).<br>
                                    The action depends on the <strong>E</strong> mode.
                                </div>
                            </div>

                            <!-- Mode Cycle -->
                            <div class="help-item">
                                <div class="help-row" onclick="CYOA.helpManager.toggleDesc(this)">
                                    <span class="cmd">E</span>
                                    <span class="desc">Mode (Move / Shrink / Grow)</span>
                                    <button class="expand-btn">?</button>
                                </div>
                                <div class="full-desc" style="display:none;">
                                    Toggles the action of WASD keys:<br>
                                    1. <strong>Move</strong>: Move the element.<br>
                                    2. <strong>Shrink</strong>: Decrease size.<br>
                                    3. <strong>Grow</strong>: Increase size.
                                </div>
                            </div>

                            <!-- Split Tools -->
                            <div class="help-item">
                                <div class="help-row" onclick="CYOA.helpManager.toggleDesc(this)">
                                    <span class="cmd">R / T</span>
                                    <span class="desc">Split Tools</span>
                                    <button class="expand-btn">?</button>
                                </div>
                                <div class="full-desc" style="display:none;">
                                    <strong>R (Horizontal)</strong>: Press R, move the line (WASD), press R again to cut.<br>
                                    <strong>T (Vertical)</strong>: Press T, move the line, press <strong>R</strong> to cut.<br>
                                    <em>(R is used to confirm both actions for hand convenience).</em>
                                </div>
                            </div>

                            <!-- Actions -->
                            <div class="help-item">
                                <div class="help-row" onclick="CYOA.helpManager.toggleDesc(this)">
                                    <span class="cmd">Q / Del</span>
                                    <span class="desc">Duplicate / Delete</span>
                                    <button class="expand-btn">?</button>
                                </div>
                                <div class="full-desc" style="display:none;">
                                    <strong>Q</strong>: Create a copy of the selected element nearby.<br>
                                    <strong>Delete / Backspace</strong>: Delete the selected element.
                                </div>
                            </div>

                            <!-- View -->
                            <div class="help-item">
                                <div class="help-row" onclick="CYOA.helpManager.toggleDesc(this)">
                                    <span class="cmd">F / Tab</span>
                                    <span class="desc">Zoom & Selection</span>
                                    <button class="expand-btn">?</button>
                                </div>
                                <div class="full-desc" style="display:none;">
                                    <strong>F</strong>: Cycle zoom (x1 -> x2 -> x3 -> x4) focused on selection.<br>
                                    <strong>Tab / Shift+Tab</strong>: Next / Previous item.<br>
                                    <strong>Shift + Click</strong>: Multi-selection (for alignment).
                                </div>
                            </div>
                        </div>

                        <!-- ================================================= -->
                        <!-- 2. AI TOOLS WORKFLOW -->
                        <!-- ================================================= -->
                        <div class="help-section">
                            <h4>AI Tools & API Keys</h4>

                            <div class="ai-tip-box">
                                <h5>SAM (Auto-Detect)</h5>
                                <p>
                                    For automatic object detection (SAM), <strong>Roboflow</strong> is used.
                                    You will need a <strong>Private API Key</strong>.
                                </p>
                                <ul>
                                    <li>You can get a key at <a href="https://app.roboflow.com/" target="_blank">app.roboflow.com</a>.</li>
                                    <li>It is <strong>free</strong> for personal use.</li>
                                    <li>The limit is enough for about <strong>1500 processed pages</strong> per month.</li>
                                </ul>
                            </div>

                            <div class="ai-tip-box">
                                <h5>OCR and Audit (Gemini / LLM)</h5>
                                <p>
                                    OCR (text recognition) and Config Audit functions were tested with the <strong>Gemini 3 Pro</strong> model.
                                </p>
                                <p>
                                    It perfectly recognizes the structure of a whole page, extracts text, prices, and requirements.
                                </p>
                                <p style="margin-top:8px;">
                                    <strong>Free Method:</strong><br>
                                    If you don't have a paid API key, select the AI provider <strong>"Manual (Copy/Paste)"</strong> in settings.
                                    Copy the generated prompt from the app into <a href="https://aistudio.google.com/" target="_blank">Google AI Studio</a>.
                                    It has very generous free limits that refresh daily.
                                </p>
                            </div>


                        </div>
                        <div class="help-section">
                            <h4>Workflow:</h4>
                            <!-- Step 1 -->
                            <div class="help-item">
                                <div class="help-row" onclick="CYOA.helpManager.toggleDesc(this)">
                                    <span class="cmd">1. SAM</span>
                                    <span class="desc">Auto-Detect</span>
                                    <button class="expand-btn">?</button>
                                </div>
                                <div class="full-desc" style="display:none;">
                                    Uses a neural network to find objects on the image.<br>
                                    <strong>Prompt</strong> field: list what to search for (comma separated).<br>
                                    <em>Example: "game card, text block, rectangle option, red button".</em><br>
                                    Different CYOAs have different styles, experiment with the description.
                                </div>
                            </div>

                            <!-- Step 2 -->
                            <div class="help-item">
                                <div class="help-row" onclick="CYOA.helpManager.toggleDesc(this)">
                                    <span class="cmd">2. Manual</span>
                                    <span class="desc">Manual Adjustment (Important!)</span>
                                    <button class="expand-btn">?</button>
                                </div>
                                <div class="full-desc" style="display:none;">
                                    Mark or fix cards manually (Z/X).<br>
                                    <strong>Rule:</strong> All cards must be inside Groups.<br>
                                    One section = One group.<br>
                                    <strong>Page splitting:</strong> If a group continues on the next page, create a group there with the <strong>same ID</strong>. Rules (limits) will be shared.
                                </div>
                            </div>

                            <!-- Step 3 -->
                            <div class="help-item">
                                <div class="help-row" onclick="CYOA.helpManager.toggleDesc(this)">
                                    <span class="cmd">3. Refine</span>
                                    <span class="desc">Refine Layout</span>
                                    <button class="expand-btn">?</button>
                                </div>
                                <div class="full-desc" style="display:none;">
                                    Sends the image and coordinates to the LLM.<br>
                                    It will try to align coordinates, assign names, and group elements.<br>
                                    <em>Does not work perfectly, but helps save time.</em>
                                </div>
                            </div>

                            <!-- Step 4 -->
                            <div class="help-item">
                                <div class="help-row" onclick="CYOA.helpManager.toggleDesc(this)">
                                    <span class="cmd">4. OCR & Fill</span>
                                    <span class="desc">Text Recognition</span>
                                    <button class="expand-btn">?</button>
                                </div>
                                <div class="full-desc" style="display:none;">
                                    Sends the image and *finished layout* to the LLM.<br>
                                    The neural network will read text from images, fill Title/Description, determine prices and requirements.<br>
                                    <strong>Use only when the layout (boxes) is already placed correctly!</strong>
                                </div>
                            </div>

                            <!-- Step 5 -->
                            <div class="help-item">
                                <div class="help-row" onclick="CYOA.helpManager.toggleDesc(this)">
                                    <span class="cmd">5. Audit</span>
                                    <span class="desc">Audit Errors (Chat)</span>
                                    <button class="expand-btn">?</button>
                                </div>
                                <div class="full-desc" style="display:none;">
                                    Sends the <strong>full JSON</strong> (without images) to the LLM.<br>
                                    Looks for broken links, typos, logic holes. Opens a <strong>Chat</strong> where you can ask the AI to fix specific things.<br>
                                    <em>Saves tokens, as it returns only edits (diff), not the whole file.</em>
                                </div>
                            </div>
                        </div>

                        <!-- ================================================= -->
                        <!-- 3. JSON COMMANDS & LOGIC REFERENCE -->
                        <!-- ================================================= -->
                        <div class="help-section">
                            <h4>JSON & Logic</h4>
                            
                            <!-- Visual Cards & HTML -->
                            <div class="help-item" style="border-left: 3px solid #FFD700;">
                                <div class="help-row" onclick="CYOA.helpManager.toggleDesc(this)">
                                    <span class="cmd">Visual Card / HTML</span>
                                    <span class="desc">Card Styling</span>
                                    <button class="expand-btn">?</button>
                                </div>
                                <div class="full-desc" style="display:none;">
                                    <strong>Visual Card:</strong> This is a full game card (like in DLC), not a transparent button. It has its own background, border, and displays text. Enabled via checkbox in the editor.<br>
                                    <strong>HTML:</strong> You can use HTML tags in Title and Description fields.<br>
                                    Example: <code>&lt;b&gt;Bold&lt;/b&gt;</code>, <code>&lt;span style="color:red"&gt;Color&lt;/span&gt;</code>.
                                </div>
                            </div>

                            <!-- Requirements -->
                            <div class="help-item">
                                <div class="help-row" onclick="CYOA.helpManager.toggleDesc(this)">
                                    <span class="cmd">Requirements</span>
                                    <span class="desc">Selection Conditions</span>
                                    <button class="expand-btn">?</button>
                                </div>
                                <div class="full-desc" style="display:none;">
                                    <code>id_item</code>: Requires presence of item.<br>
                                    <code>!id_item</code>: Requires absence of item.<br>
                                    <code>count.tag('magic') >= 2</code>: Requires min. 2 items with 'magic' tag.<br>
                                    <code>qty('potion') > 5</code>: Requires more than 5 of a specific item.<br>
                                    <code>currency.gold >= 100</code>: Currency check.<br>
                                    <strong>Logic:</strong> <code>(has('A') || has('B')) && !has('C')</code>
                                </div>
                            </div>

                            <!-- Group Rules -->
                            <div class="help-item">
                                <div class="help-row" onclick="CYOA.helpManager.toggleDesc(this)">
                                    <span class="cmd">Group Rules</span>
                                    <span class="desc">Section Rules</span>
                                    <button class="expand-btn">?</button>
                                </div>
                                <div class="full-desc" style="display:none;">
                                    <code>max_choices: 1</code> — Radio buttons (only one choice).<br>
                                    <code>max_choices: 3</code> — Maximum 3 choices.<br>
                                    <strong>Budget (Free Points):</strong><br>
                                    <code>"budget": { "currency": "pts", "amount": 20 }</code> — The first 20 points in this group are not spent from the general pool.
                                </div>
                            </div>

                            <!-- Costs -->
                            <div class="help-item">
                                <div class="help-row" onclick="CYOA.helpManager.toggleDesc(this)">
                                    <span class="cmd">Cost</span>
                                    <span class="desc">Currencies and Formulas</span>
                                    <button class="expand-btn">?</button>
                                </div>
                                <div class="full-desc" style="display:none;">
                                    <strong>Value:</strong> Negative = Price (-10), Positive = Reward (+5).<br>
                                    <strong>Formula:</strong> You can set a dynamic price.<br>
                                    Example: <code>-10 * count.tag('extra')</code> (price grows with quantity).
                                </div>
                            </div>

                            <!-- Effects -->
                            <div class="help-item">
                                <div class="help-row" onclick="CYOA.helpManager.toggleDesc(this)">
                                    <span class="cmd">Effects</span>
                                    <span class="desc">Effects on Selection</span>
                                    <button class="expand-btn">?</button>
                                </div>
                                <div class="full-desc" style="display:none;">
                                    <code>modify_cost</code>: Discount/Markup. (<code>mode: 'multiply'</code> for %, <code>'add'</code> for fixed). Can be by tag or group.<br>
                                    <code>modify_group_limit</code>: Increase selection limit in another group (+1 slot).<br>
                                    <code>force_selection</code>: Automatically select another item.<br>
                                    <code>set_value</code>: Set currency to a specific number.<br>
                                    <code>roll_dice</code>: Roll a die and add result to currency (saved).<br>
                                    
                                </div>
                            </div>

                            <!-- Quantity -->
                            <div class="help-item">
                                <div class="help-row" onclick="CYOA.helpManager.toggleDesc(this)">
                                    <span class="cmd">Min / Max Qty</span>
                                    <span class="desc">Multi-Select</span>
                                    <button class="expand-btn">?</button>
                                </div>
                                <div class="full-desc" style="display:none;">
                                    <code>max_quantity: 5</code> — Item can be taken 5 times ( +/- buttons appear).<br>
                                    <code>min_quantity: -2</code> — Item can be "sold" (go negative), gaining points back.<br>
                                    <code>min_quantity: 1</code> — Item is mandatory (cannot be removed after taking).
                                </div>
                            </div>

                        </div>

                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', html);
    }

    open() {
        document.getElementById(this.modalId).style.display = 'flex';
    }

    toggleDesc(row) {
        // 'row' is passed directly via `this` from the click event
        const desc = row.nextElementSibling;
        const btn = row.querySelector('.expand-btn');
        
        if (desc.style.display === 'none') {
            desc.style.display = 'block';
            btn.textContent = '▲';
            btn.style.background = '#4CAF50';
            btn.style.color = 'white';
        } else {
            desc.style.display = 'none';
            btn.textContent = '?';
            btn.style.background = '#333';
            btn.style.color = '#888';
        }
    }
}