/**
 * src/ui/help-manager.js
 * Manages the Help/Info modal with cheatsheets and AI tips
 */

export class HelpManager {
    constructor() {
        this.modalId = 'help-modal';
        this.createModal();
    }

    createModal() {
        if (document.getElementById(this.modalId)) return;

        const html = `
            <div id="${this.modalId}" class="modal-overlay" style="display:none; z-index: 99999;">
                <div class="modal-content help-modal-content">
                    
                    <!-- Header -->
                    <div class="help-header">
                        <h3>Help & Tips</h3>
                        <button onclick="document.getElementById('${this.modalId}').style.display='none'" class="close-btn">✕</button>
                    </div>

                    <!-- Body -->
                    <div class="help-body">
                        
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