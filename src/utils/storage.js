/**
 * src\utils\storage.js
 * Project Storage - Handles Saving, Loading, and Validation
 */

import { APP_NAME, APP_VERSION, MIN_COMPATIBLE_VERSION } from '../constants.js';

export class ProjectStorage {
    
    /**
     * Load and validate a project file
     */
    static async load(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const json = JSON.parse(e.target.result);
                    
                    if (!json.meta || (json.meta.app !== APP_NAME && json.meta.app_id !== "cyoa_brew")) {
                        if (json.groups && Array.isArray(json.groups)) {
                             const confirmLegacy = confirm("⚠️ This file is missing the 'Cyoa Brew' signature. It might be corrupted or from a different tool.\n\nTry to open anyway?");
                             if (!confirmLegacy) {
                                 reject(new Error("Cancelled by user (Invalid Signature)."));
                                 return;
                             }
                        } else {
                            reject(new Error("This is not a valid Cyoa Brew project file! Missing signature and structure."));
                            return;
                        }
                    }

                    const fileVer = json.meta.app_version;
                    let warning = null;

                    if (!fileVer) {
                        warning = "⚠️ Warning: This project has no version number.";
                    } else {
                        const currentParts = APP_VERSION.split('.').map(Number);
                        const fileParts = fileVer.split('.').map(Number);

                        if (this.isNewer(fileParts, currentParts)) {
                            warning = `⚠️ Warning: This project is from a NEWER version (v${fileVer}).\nSome features might be missing or broken.`;
                        } else if (this.isOlder(fileParts, currentParts)) {
                            const minParts = MIN_COMPATIBLE_VERSION.split('.').map(Number);
                            if (this.isOlder(fileParts, minParts)) {
                                warning = `⚠️ Warning: This save is from a very old version (v${fileVer}).\nIt might not load correctly.`;
                            }
                        }
                    }

                    resolve({ config: json, warning });

                } catch (err) {
                    reject(new Error("Failed to parse JSON. Details: " + err.message));
                }
            };

            reader.onerror = () => reject(new Error("Error reading file system."));
            reader.readAsText(file);
        });
    }

    /**
     * Save project to JSON (Single File)
     */
    static save(config) {
        const configToSave = this.prepareConfigForSave(config);
        const blob = new Blob([JSON.stringify(configToSave, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const filename = (config.meta?.title || 'cyoa_project').replace(/[^a-z0-9]/gi, '_').toLowerCase();
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    /**
     * Save project as ZIP (JSON + Images folder)
     * Handles Pages and Visual Cards separately.
     */
    static async saveZip(config) {
        console.log("📦 Starting Smart ZIP export...");
        let JSZip;
        try {
            const module = await import('jszip');
            JSZip = module.default || module;
        } catch (e) {
            throw new Error("JSZip library not available. Is it installed? (npm i jszip)");
        }

        const zip = new JSZip();
        
        // Клонируем конфиг
        const configToSave = this.prepareConfigForSave(JSON.parse(JSON.stringify(config)));
        const pages = configToSave.pages || [];

        // Вспомогательная функция для обработки одной картинки
        const processImage = async (imgSource, folderName, baseName) => {
            if (!imgSource) return null;

            try {
                let blob = null;
                let ext = 'png';

                // 1. BASE64
                if (imgSource.startsWith('data:')) {
                    const parts = imgSource.split(',');
                    const meta = parts[0];
                    const rawData = parts[1];
                    
                    if (meta.includes('jpeg') || meta.includes('jpg')) ext = 'jpg';
                    else if (meta.includes('webp')) ext = 'webp';
                    else if (meta.includes('avif')) ext = 'avif';
                    else if (meta.includes('gif')) ext = 'gif';

                    const binaryString = atob(rawData);
                    const len = binaryString.length;
                    const bytes = new Uint8Array(len);
                    for (let k = 0; k < len; k++) bytes[k] = binaryString.charCodeAt(k);
                    blob = new Blob([bytes]);
                } 
                // 2. URL (Http, Blob, Relative Path)
                else {
                    // Пытаемся скачать, даже если это локальный путь типа "images/old.png"
                    // Если браузер его отображает, значит fetch его достанет
                    const response = await fetch(imgSource);
                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    blob = await response.blob();
                    
                    // Определяем тип
                    const mime = blob.type;
                    if (mime.includes('jpeg')) ext = 'jpg';
                    else if (mime.includes('webp')) ext = 'webp';
                    else if (mime.includes('avif')) ext = 'avif';
                    else if (mime.includes('gif')) ext = 'gif';
                    
                    // Если MIME не помог, смотрим на расширение файла
                    if (ext === 'png') { 
                        const urlExt = imgSource.split('.').pop().split(/[\?\#]/)[0].toLowerCase();
                        if (['jpg','jpeg','webp','avif','gif'].includes(urlExt)) ext = urlExt;
                    }
                }

                const filename = `${baseName}.${ext}`;
                const zipPath = `images/${folderName}/${filename}`;
                
                // Кладем в архив
                zip.file(zipPath, blob);
                console.log(`✅ Archived: ${zipPath}`);
                
                return zipPath; // Возвращаем новый путь для JSON

            } catch (e) {
                console.warn(`⚠️ Failed to archive image: ${baseName}`, e);
                return null; // Возвращаем null, чтобы оставить старый путь
            }
        };

        // === PHASE 1: PROCESS PAGE BACKGROUNDS ===
        for (let i = 0; i < pages.length; i++) {
            const page = pages[i];
            if (page.image) {
                const safeName = (page.id || `page_${i + 1}`).replace(/[^a-zA-Z0-9_-]/g, '_');
                const newPath = await processImage(page.image, 'pages', safeName);
                if (newPath) page.image = newPath;
            }

            // === PHASE 2: PROCESS LAYOUT ITEMS (Visual Cards) ===
            // Рекурсивная функция для обхода групп и предметов
            const traverseLayout = async (items) => {
                if (!items || !Array.isArray(items)) return;
                
                for (let j = 0; j < items.length; j++) {
                    const el = items[j];
                    
                    // Если это Группа -> заходим внутрь
                    if (el.type === 'group' && el.items) {
                        await traverseLayout(el.items);
                    } 
                    // Если это Предмет и у него есть картинка
                    else if (el.type === 'item' && el.cardImage) {
                        const cardName = (el.id || `card_${j}`).replace(/[^a-zA-Z0-9_-]/g, '_');
                        const newCardPath = await processImage(el.cardImage, 'cards', cardName);
                        if (newCardPath) el.cardImage = newCardPath;
                    }
                }
            };

            if (page.layout) {
                await traverseLayout(page.layout);
            }
        }

        // 3. Сохраняем JSON
        zip.file("project.json", JSON.stringify(configToSave, null, 2));

        // 4. Генерируем ZIP
        console.log("📦 Generating output ZIP...");
        try {
            const content = await zip.generateAsync({ type: "blob" });
            const url = URL.createObjectURL(content);

            const title = (configToSave.meta?.title || "cyoa_project")
                .replace(/[^a-z0-9]/gi, '_')
                .toLowerCase();

            const a = document.createElement('a');
            a.href = url;
            a.download = `${title}.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            URL.revokeObjectURL(url);
            console.log("🚀 ZIP downloaded successfully!");
        } catch (err) {
            console.error("ZIP generation failed:", err);
            throw new Error("Failed to generate ZIP: " + err.message);
        }
    }

    // --- Helpers ---

    static prepareConfigForSave(config) {
        const copy = JSON.parse(JSON.stringify(config));
        if (!copy.meta) copy.meta = {};
        
        copy.meta.app = APP_NAME;
        copy.meta.app_id = "cyoa_brew";
        copy.meta.app_version = APP_VERSION;
        copy.meta.saved_at = new Date().toISOString();
        
        return copy;
    }

    static isNewer(remote, current) {
        for (let i = 0; i < 3; i++) {
            if (remote[i] > current[i]) return true;
            if (remote[i] < current[i]) return false;
        }
        return false;
    }

    static isOlder(remote, current) {
        for (let i = 0; i < 3; i++) {
            if (remote[i] < current[i]) return true;
            if (remote[i] > current[i]) return false;
        }
        return false;
    }
}