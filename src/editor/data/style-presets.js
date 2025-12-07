/**
 * src/editor/data/style-presets.js
 * Library of visual styles for Active and Disabled cards.
 * Updated: Include 'insetShadowColor' and 'insetShadowWidth'
 */

export const STANDARD_PRESETS = [
    {
        name: "Classic Green (Default)",
        data: { 
            borderColor: "#00ff00", borderWidth: 3, bodyColor: "#00ff00", bodyOpacity: 0.1, 
            shadowColor: "#00ff00", shadowWidth: 15, 
            insetShadowColor: "rgba(0, 255, 0, 0.2)", insetShadowWidth: 20,
            radius: 12, css: "" 
        }
    },
    {
        name: "Clean White",
        data: { 
            borderColor: "#ffffff", borderWidth: 2, bodyColor: "#ffffff", bodyOpacity: 0.1, 
            shadowColor: "#ffffff", shadowWidth: 10, 
            insetShadowColor: "transparent", insetShadowWidth: 0,
            radius: 8, css: "" 
        }
    },
    {
        name: "Ocean Blue",
        data: { 
            borderColor: "#00bfff", borderWidth: 3, bodyColor: "#00bfff", bodyOpacity: 0.15, 
            shadowColor: "#00bfff", shadowWidth: 12, 
            insetShadowColor: "rgba(0, 191, 255, 0.2)", insetShadowWidth: 20,
            radius: 12, css: "" 
        }
    },
    {
        name: "Crimson Alert",
        data: { 
            borderColor: "#ff3333", borderWidth: 3, bodyColor: "#ff0000", bodyOpacity: 0.1, 
            shadowColor: "#ff0000", shadowWidth: 15, 
            insetShadowColor: "rgba(255, 0, 0, 0.3)", insetShadowWidth: 25,
            radius: 4, css: "" 
        }
    },
    {
        name: "Golden Legend",
        data: { 
            borderColor: "#ffd700", borderWidth: 3, bodyColor: "#ffd700", bodyOpacity: 0.1, 
            shadowColor: "#ffd700", shadowWidth: 20, 
            insetShadowColor: "rgba(255, 215, 0, 0.2)", insetShadowWidth: 30,
            radius: 15, css: "" 
        }
    },
    {
        name: "Royal Purple",
        data: { 
            borderColor: "#9932cc", borderWidth: 3, bodyColor: "#9932cc", bodyOpacity: 0.15, 
            shadowColor: "#ba55d3", shadowWidth: 15, 
            insetShadowColor: "rgba(153, 50, 204, 0.2)", insetShadowWidth: 20,
            radius: 12, css: "" 
        }
    },
    {
        name: "Stealth Gray",
        data: { 
            borderColor: "#888888", borderWidth: 2, bodyColor: "#000000", bodyOpacity: 0.4, 
            shadowColor: "#ffffff", shadowWidth: 5, 
            insetShadowColor: "rgba(255, 255, 255, 0.1)", insetShadowWidth: 10,
            radius: 2, css: "" 
        }
    },
    {
        name: "Hot Pink",
        data: { 
            borderColor: "#ff69b4", borderWidth: 3, bodyColor: "#ff1493", bodyOpacity: 0.1, 
            shadowColor: "#ff69b4", shadowWidth: 15, 
            insetShadowColor: "rgba(255, 105, 180, 0.2)", insetShadowWidth: 20,
            radius: 20, css: "" 
        }
    },
    {
        name: "Toxic Sludge",
        data: { 
            borderColor: "#adff2f", borderWidth: 4, bodyColor: "#adff2f", bodyOpacity: 0.2, 
            shadowColor: "#adff2f", shadowWidth: 10, 
            insetShadowColor: "rgba(173, 255, 47, 0.3)", insetShadowWidth: 15,
            radius: 10, css: "" 
        }
    },
    {
        name: "Deep Void",
        data: { 
            borderColor: "#000000", borderWidth: 4, bodyColor: "#000000", bodyOpacity: 0.6, 
            shadowColor: "#ffffff", shadowWidth: 2, 
            insetShadowColor: "#000000", insetShadowWidth: 30,
            radius: 0, css: "" 
        }
    }
];

export const FANCY_PRESETS = [
    {
        name: "Neon Glow",
        data: { 
            borderColor: "#00ffff", borderWidth: 2, bodyColor: "#00ffff", bodyOpacity: 0.05, shadowColor: "#00ffff", shadowWidth: 10, radius: 8,
            insetShadowColor: "transparent", insetShadowWidth: 0,
            css: "box-shadow: 0 0 5px #00ffff, 0 0 10px #00ffff, 0 0 20px #00ffff, inset 0 0 20px rgba(0,255,255,0.2); animation: pulse 2s infinite;"
        }
    },
    {
        name: "Rainbow Gradient",
        data: {
            borderColor: "transparent", borderWidth: 4, bodyColor: "#ffffff", bodyOpacity: 0.1, shadowColor: "#ffffff", shadowWidth: 0, radius: 12,
            insetShadowColor: "transparent", insetShadowWidth: 0,
            css: "border-image: linear-gradient(45deg, red, orange, yellow, green, blue, indigo, violet) 1; box-shadow: 0 0 15px rgba(255,255,255,0.3);"
        }
    },
    {
        name: "Cyberpunk Glitch",
        data: {
            borderColor: "#ff00ff", borderWidth: 2, bodyColor: "#00ffff", bodyOpacity: 0.1, shadowColor: "#ff00ff", shadowWidth: 5, radius: 0,
            insetShadowColor: "rgba(0, 255, 255, 0.1)", insetShadowWidth: 10,
            css: "box-shadow: -3px 0 #00ffff, 3px 0 #ff00ff; border-style: solid;"
        }
    },
    {
        name: "Caution Tape",
        data: {
            borderColor: "#000000", borderWidth: 4, bodyColor: "#ffd700", bodyOpacity: 0.1, shadowColor: "#000000", shadowWidth: 5, radius: 4,
            insetShadowColor: "transparent", insetShadowWidth: 0,
            css: "background-image: repeating-linear-gradient(45deg, rgba(255,215,0,0.2), rgba(255,215,0,0.2) 10px, rgba(0,0,0,0.2) 10px, rgba(0,0,0,0.2) 20px);"
        }
    },
    {
        name: "Glassmorphism",
        data: {
            borderColor: "rgba(255,255,255,0.5)", borderWidth: 1, bodyColor: "#ffffff", bodyOpacity: 0.1, shadowColor: "rgba(0,0,0,0.2)", shadowWidth: 10, radius: 16,
            insetShadowColor: "rgba(255,255,255,0.2)", insetShadowWidth: 20,
            css: "backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border-top: 1px solid rgba(255,255,255,0.8); border-left: 1px solid rgba(255,255,255,0.8);"
        }
    },
    {
        name: "Dotted Notepad",
        data: {
            borderColor: "#333", borderWidth: 3, bodyColor: "#fff", bodyOpacity: 0.8, shadowColor: "#000", shadowWidth: 5, radius: 2,
            insetShadowColor: "transparent", insetShadowWidth: 0,
            css: "border-style: dashed; background-image: radial-gradient(#aaa 1px, transparent 1px); background-size: 10px 10px; color: #333;"
        }
    },
    {
        name: "Metallic Frame",
        data: {
            borderColor: "#c0c0c0", borderWidth: 5, bodyColor: "#000", bodyOpacity: 0.2, shadowColor: "#000", shadowWidth: 10, radius: 8,
            insetShadowColor: "rgba(0,0,0,0.5)", insetShadowWidth: 15,
            css: "border-style: ridge; border-color: #e0e0e0 #505050 #505050 #e0e0e0; box-shadow: inset 2px 2px 5px rgba(0,0,0,0.8);"
        }
    },
    {
        name: "RPG Scroll",
        data: {
            borderColor: "#8b4513", borderWidth: 3, bodyColor: "#f4e4bc", bodyOpacity: 0.8, shadowColor: "#3e2723", shadowWidth: 15, radius: 4,
            insetShadowColor: "rgba(139,69,19,0.5)", insetShadowWidth: 30,
            css: "box-shadow: 0 5px 15px rgba(0,0,0,0.5), inset 0 0 30px rgba(139,69,19,0.5); border-style: double;"
        }
    },
    {
        name: "Hologram",
        data: {
            borderColor: "rgba(0,255,255,0.5)", borderWidth: 1, bodyColor: "#00ffff", bodyOpacity: 0.1, shadowColor: "#00ffff", shadowWidth: 10, radius: 0,
            insetShadowColor: "transparent", insetShadowWidth: 0,
            css: "background: linear-gradient(180deg, rgba(0,255,255,0) 0%, rgba(0,255,255,0.2) 50%, rgba(0,255,255,0) 100%); background-size: 100% 3px;"
        }
    },
    {
        name: "Vignette Horror",
        data: {
            borderColor: "#300", borderWidth: 1, bodyColor: "#300", bodyOpacity: 0.3, shadowColor: "#000", shadowWidth: 30, radius: 50,
            insetShadowColor: "#000000", insetShadowWidth: 50,
            css: "box-shadow: inset 0 0 50px #000; border: none;"
        }
    }
];

export const DISABLED_PRESETS = [
    {
        name: "Standard Gray",
        data: { borderColor: "#555555", borderWidth: 0, bodyColor: "#000000", bodyOpacity: 0.5, shadowColor: "#000", shadowWidth: 0, radius: 12, css: "" }
    },
    {
        name: "Darkened",
        data: { borderColor: "#000000", borderWidth: 0, bodyColor: "#000000", bodyOpacity: 0.7, shadowColor: "#000", shadowWidth: 0, radius: 12, css: "" }
    },
    {
        name: "Red X (Crossed)",
        data: { borderColor: "#550000", borderWidth: 2, bodyColor: "#220000", bodyOpacity: 0.6, shadowColor: "#000", shadowWidth: 0, radius: 8, css: "background-image: linear-gradient(45deg, transparent 45%, #500 45%, #500 55%, transparent 55%), linear-gradient(-45deg, transparent 45%, #500 45%, #500 55%, transparent 55%);" }
    },
    {
        name: "Striped (Classic)",
        data: { borderColor: "#555", borderWidth: 0, bodyColor: "#000", bodyOpacity: 0.5, shadowColor: "#000", shadowWidth: 0, radius: 12, css: "background-image: repeating-linear-gradient(45deg, rgba(0,0,0,0.4), rgba(0,0,0,0.4) 10px, rgba(50,50,50,0.6) 10px, rgba(50,50,50,0.6) 20px);" }
    },
    {
        name: "Blurred Out",
        data: { borderColor: "transparent", borderWidth: 0, bodyColor: "#fff", bodyOpacity: 0.3, shadowColor: "#000", shadowWidth: 0, radius: 12, css: "backdrop-filter: blur(4px) grayscale(100%);" }
    },
    {
        name: "Sepia Old",
        data: { borderColor: "#5d4037", borderWidth: 1, bodyColor: "#3e2723", bodyOpacity: 0.6, shadowColor: "#000", shadowWidth: 0, radius: 4, css: "filter: sepia(100%) grayscale(50%);" }
    },
    {
        name: "Broken Glass",
        data: { borderColor: "#aaa", borderWidth: 1, bodyColor: "#000", bodyOpacity: 0.4, shadowColor: "#000", shadowWidth: 0, radius: 0, css: "background-image: linear-gradient(135deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 51%);" }
    },
    {
        name: "Frozen",
        data: { borderColor: "#a0e0ff", borderWidth: 1, bodyColor: "#a0e0ff", bodyOpacity: 0.4, shadowColor: "#fff", shadowWidth: 5, radius: 12, css: "backdrop-filter: blur(2px);" }
    },
    {
        name: "Locked Chain",
        data: { borderColor: "#333", borderWidth: 4, bodyColor: "#000", bodyOpacity: 0.8, shadowColor: "#000", shadowWidth: 0, radius: 8, css: "border-style: dotted;" }
    },
    {
        name: "Ghostly",
        data: { borderColor: "#fff", borderWidth: 0, bodyColor: "#fff", bodyOpacity: 0.1, shadowColor: "#fff", shadowWidth: 0, radius: 50, css: "opacity: 0.5;" }
    }
];