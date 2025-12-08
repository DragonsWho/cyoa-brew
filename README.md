 # CYOA Brew

**CYOA Brew** is a lightweight, web-based engine and editor designed to convert static "Choose Your Own Adventure" (CYOA) images into fully interactive applications. It features a robust rule engine, a visual WYSIWYG editor, and AI integrations to automate the creation process.

---

## For Users & Creators

If you just want to play a game or create one using the visual editor without touching the code, follow these steps.

### How to Play / Host
1.  **Download:** Get the latest release (the built files).
2.  **Make your game** and save it. For publication, it is better to save images separately (save as zip) - the game will load faster. Later, you can save the game again as a single json file if necessary. 
3.  **Host:**
    *   Upload the entire folder (containing `index.html`, `images/`, `project.json`) to a static host like **Neocities**. 
4.  **Play:** Open the link provided by your host.

### How to Edit
1.  Open the application in your browser.
2.  Click the **Edit Mode** button (Pencil icon) in the bottom-right footer.
3.  You can drag and drop items, resize boxes, and configure rules.
4.  Or use AI to do everything for you while you give it commands in the chat. 
5.  **Need Help?** A comprehensive **Help Page** is included in the project. Click the **Help/Info icon** in the footer to read about rule logic, shortcuts, and AI tools.

---

## For Developers

If you want to modify the engine, add features, or build the project from source.

### Installation & Setup

This project uses **Vite**. Ensure you have [Node.js](https://nodejs.org/) installed.

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/DragonsWho/cyoabrew.git
    cd cyoa-brew
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Run Development Server:**
    ```bash
    npm run dev
    ```
    *   This starts a local server (usually at `http://localhost:5173`).
    *   Changes to source files will hot-reload.

4.  **Build for Production:**
    ```bash
    npm run build
    ```
    *   Compiles assets into the `dist/` folder.
    *   This `dist` folder is what you distribute to users.

### Project Structure

The project is organized into core logic, the visual editor, and the UI renderer.

Directory Structure:

```
└── ./
    ├── docs/                                   # Documentation and help files.
    │   └── Help.md                             # The "Help" content displayed inside the app modal.
    ├── generate_test_image.html                # Canvas tool to generate dummy images for testing layout logic.
    ├── index.html                              # HTML Entry point. Contains the DOM structure (#app) and loads src/main.js.
    ├── package.json                            # Project dependencies (Vite, JSZip) and build scripts.
    ├── vite.config.js                          # Vite build configuration (ports, paths, plugins).
    ├── public/
    │   └── project.json                        # Default game configuration file (pages, items, point systems).
    ├── src/
    │   ├── constants.js                        # Global constants (App Name, Version, Save Compatibility).
    │   ├── main.js                             # App Bootstrapper. Loads config, initializes Engine, Renderer, and Controls.
    │   ├── core/                               # --- GAME LOGIC (Client-side Backend) ---
    │   │   ├── effects.js                      # Active effects processor (cost modifiers, dice rolls, limit changes).
    │   │   ├── engine.js                       # Main GameEngine. Manages state, loading, and recalculation cycles.
    │   │   ├── rules.js                        # Rule Evaluator: checks requirements, formulas, and calculates costs.
    │   │   └── state.js                        # State Manager (GameState): stores selections, current currencies, and budgets.
    │   ├── editor/                             # --- VISUAL EDITOR (WYSIWYG) ---
    │   │   ├── core.js                         # Main Editor class. Manages edit mode state.
    │   │   ├── actions/                        # specific editing logic (CRUD, Movement, Alignment, Clipboard).
    │   │   ├── integrations/                   # AI Integrations.
    │   │   │   ├── llm/                        # Large Language Model integration (OCR, config generation, auditing).
    │   │   │   └── sam/                        # Segment Anything Model (Roboflow) for auto-detecting items in images.
    │   │   └── ui/                             # Editor Sidebar panels (Settings, Styles, Groups).
    │   ├── ui/                                 # --- PLAYER INTERFACE (Frontend) ---
    │   │   ├── build-manager.js                # "Current Build" modal logic (Save/Load IDs).
    │   │   ├── controls.js                     # Footer controls (Edit Toggle, Text Mode).
    │   │   ├── renderer.js                     # DOM Renderer. Draws pages, interactive zones, and updates visuals.
    │   │   └── tooltip.js                      # Logic for hover tooltips (showing costs/reqs).
    │   └── utils/                              # --- HELPERS ---
    │       ├── coords.js                       # Math for converting between pixels and percentages.
    │       └── storage.js                      # Project I/O: Save/Load JSON and Export ZIP.
    └── styles/                                 # CSS Files (Main theme, Editor styles).
```

### Contributing
1.  Fork the repository.
2.  Create a feature branch (`git checkout -b feature/AmazingFeature`).
3.  Commit your changes.
4.  Open a Pull Request.

 
Or even better - subscribe to my [Boosty](https://boosty.to/dragonswhore) or [Patreon](https://www.patreon.com/DragonsWhore) so that I can continue to spend my time creating and maintaining these CYOA projects.

--- 

### License

This project is licensed under the **LGPL-3.0 License**.

This means:
*   ✅ You can use it for free, even in commercial projects.
*   ✅ You can modify it.
*   ✅ You can distribute it.
*   🔒 **If you integrate it** into a closed-source project (like a game wrapper or a website), you can keep your project's code closed, as long as the engine is linked dynamically (e.g., as a separate file).
*   🔄 **However**, if you modify the **engine code itself**, you must release those modifications under the same license.

If you find a bug or make an improvement, please consider opening a Pull Request so everyone can benefit!