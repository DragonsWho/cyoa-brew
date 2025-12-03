/**
 * src\utils\storage.js
 * Project Storage - Handles Saving, Loading, and Validation
 */

import { APP_NAME, APP_VERSION, MIN_COMPATIBLE_VERSION } from '../constants.js';

export class ProjectStorage {
    
    /**
     * Load and validate a project file
     * @param {File} file 
     * @returns {Promise<{config: Object, warning: string|null}>}
     */
    static async load(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const json = JSON.parse(e.target.result);
                    
                    // 1. Signature Check (Is this our app?)
                    // Проверяем, есть ли метаданные и подписан ли файл нашим приложением
                    if (!json.meta || (json.meta.app !== APP_NAME && json.meta.app_id !== "cyoa_brew")) {
                        // Если подписи нет, но структура похожа, пробуем предупредить, но не блокировать жестко (для совместимости с dev-файлами)
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

                    // 2. Version Check
                    const fileVer = json.meta.app_version;
                    let warning = null;

                    if (!fileVer) {
                        warning = "⚠️ Warning: This project has no version number. Features might behave unexpectedly.";
                    } else {
                        const currentParts = APP_VERSION.split('.').map(Number);
                        const fileParts = fileVer.split('.').map(Number);

                        if (this.isNewer(fileParts, currentParts)) {
                            warning = `⚠️ Warning: This project is from a NEWER version (v${fileVer}).\nI am currently v${APP_VERSION}.\n\nSome features might be missing or broken. Please update the app.`;
                        } else if (this.isOlder(fileParts, currentParts)) {
                            // Проверка на совсем старые версии
                            const minParts = MIN_COMPATIBLE_VERSION.split('.').map(Number);
                            if (this.isOlder(fileParts, minParts)) {
                                warning = `⚠️ Warning: This save is from a very old version (v${fileVer}).\nIt might not load correctly.`;
                            }
                        }
                    }

                    resolve({ config: json, warning });

                } catch (err) {
                    reject(new Error("Failed to parse JSON. The file is corrupted or not a text file.\n\nDetails: " + err.message));
                }
            };

            reader.onerror = () => reject(new Error("Error reading file system."));
            reader.readAsText(file);
        });
    }

    /**
     * Save project to JSON
     * @param {Object} config 
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
     * Save project as ZIP (JSON + Images)
     * @param {Object} config 
     */
    static async saveZip(config) {
        let JSZip;
       try { 
            // Vite автоматически найдет 'jszip' в установленных пакетах
            const module = await import('jszip'); 
            JSZip = module.default; 
        } catch (e) { 
            throw new Error("Could not load JSZip library.");
        }

        const zip = new JSZip();
        
        // Prepare config (clone + inject meta)
        const configToSave = this.prepareConfigForSave(config);
        
        // Handle Image Logic for ZIP
        // We replace the absolute/base64 path in the JSON with a relative "image.png"
        // so the ZIP is portable.
        const dataUrl = config.config?.meta?.pages?.[0] || config.meta?.pages?.[0];
        
        // Update the JSON that goes INTO the zip to point to the local file
        configToSave.meta.pages[0] = "image.png"; 

        zip.file("project.json", JSON.stringify(configToSave, null, 2));

        if (dataUrl && dataUrl.startsWith('data:image')) {
            const resp = await fetch(dataUrl);
            const blob = await resp.blob();
            zip.file("image.png", blob);
        } else if (dataUrl) {
            try {
                const resp = await fetch(dataUrl);
                const blob = await resp.blob();
                zip.file("image.png", blob);
            } catch(e) {
                console.warn("Could not zip linked image:", e);
            }
        }

        const content = await zip.generateAsync({type:"blob"});
        const url = URL.createObjectURL(content);
        
        const filename = (config.meta?.title || 'cyoa_package').replace(/[^a-z0-9]/gi, '_').toLowerCase();

        const a = document.createElement('a'); 
        a.href = url; 
        a.download = `${filename}.zip`; 
        a.click(); 
        URL.revokeObjectURL(url);
    }

    // --- Helpers ---

    /**
     * Adds app signature and version timestamp
     */
    static prepareConfigForSave(config) {
        const copy = JSON.parse(JSON.stringify(config));
        if (!copy.meta) copy.meta = {};
        
        // ✍️ SIGNING THE FILE
        copy.meta.app = APP_NAME;          // Human readable
        copy.meta.app_id = "cyoa_brew";    // Technical ID (stable)
        copy.meta.app_version = APP_VERSION;
        copy.meta.saved_at = new Date().toISOString();
        
        return copy;
    }

    // Returns true if remote > current
    static isNewer(remote, current) {
        for (let i = 0; i < 3; i++) {
            if (remote[i] > current[i]) return true;
            if (remote[i] < current[i]) return false;
        }
        return false;
    }

    // Returns true if remote < current
    static isOlder(remote, current) {
        for (let i = 0; i < 3; i++) {
            if (remote[i] < current[i]) return true;
            if (remote[i] > current[i]) return false;
        }
        return false;
    }
}