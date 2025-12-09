/**
 * src/editor/data/style-presets.js
 * Massive Library of Styles for CYOA Engine
 */

// =============================================================================
// 1. STANDARD ACTIVE (TRANSPARENT) - ~30 Items
// Focus: Basic borders, shadows, and tints. Clean and usable.
// =============================================================================
export const STANDARD_PRESETS = [
    { name: "Classic Green (Default)", data: { borderColor: "#00ff00", borderWidth: 3, bodyColor: "#00ff00", bodyOpacity: 0.1, shadowColor: "#00ff00", shadowWidth: 15, insetShadowColor: "rgba(0, 255, 0, 0.2)", insetShadowWidth: 20, radius: 12, css: "" } },
    { name: "Clean White", data: { borderColor: "#ffffff", borderWidth: 2, bodyColor: "#ffffff", bodyOpacity: 0.1, shadowColor: "#ffffff", shadowWidth: 10, insetShadowColor: "transparent", insetShadowWidth: 0, radius: 8, css: "" } },
    { name: "Ocean Blue", data: { borderColor: "#00bfff", borderWidth: 3, bodyColor: "#00bfff", bodyOpacity: 0.15, shadowColor: "#00bfff", shadowWidth: 12, insetShadowColor: "rgba(0, 191, 255, 0.2)", insetShadowWidth: 20, radius: 12, css: "" } },
    { name: "Crimson Alert", data: { borderColor: "#ff3333", borderWidth: 3, bodyColor: "#ff0000", bodyOpacity: 0.1, shadowColor: "#ff0000", shadowWidth: 15, insetShadowColor: "rgba(255, 0, 0, 0.3)", insetShadowWidth: 25, radius: 4, css: "" } },
    { name: "Golden Legend", data: { borderColor: "#ffd700", borderWidth: 3, bodyColor: "#ffd700", bodyOpacity: 0.1, shadowColor: "#ffd700", shadowWidth: 20, insetShadowColor: "rgba(255, 215, 0, 0.2)", insetShadowWidth: 30, radius: 15, css: "" } },
    { name: "Royal Purple", data: { borderColor: "#9932cc", borderWidth: 3, bodyColor: "#9932cc", bodyOpacity: 0.15, shadowColor: "#ba55d3", shadowWidth: 15, insetShadowColor: "rgba(153, 50, 204, 0.2)", insetShadowWidth: 20, radius: 12, css: "" } },
    { name: "Stealth Gray", data: { borderColor: "#888888", borderWidth: 2, bodyColor: "#000000", bodyOpacity: 0.4, shadowColor: "#ffffff", shadowWidth: 5, insetShadowColor: "rgba(255, 255, 255, 0.1)", insetShadowWidth: 10, radius: 2, css: "" } },
    { name: "Hot Pink", data: { borderColor: "#ff69b4", borderWidth: 3, bodyColor: "#ff1493", bodyOpacity: 0.1, shadowColor: "#ff69b4", shadowWidth: 15, insetShadowColor: "rgba(255, 105, 180, 0.2)", insetShadowWidth: 20, radius: 20, css: "" } },
    { name: "Toxic Sludge", data: { borderColor: "#adff2f", borderWidth: 4, bodyColor: "#adff2f", bodyOpacity: 0.2, shadowColor: "#adff2f", shadowWidth: 10, insetShadowColor: "rgba(173, 255, 47, 0.3)", insetShadowWidth: 15, radius: 10, css: "" } },
    { name: "Deep Void", data: { borderColor: "#000000", borderWidth: 4, bodyColor: "#000000", bodyOpacity: 0.6, shadowColor: "#ffffff", shadowWidth: 2, insetShadowColor: "#000000", insetShadowWidth: 30, radius: 0, css: "" } },
    { name: "Soft Peach", data: { borderColor: "#ffdab9", borderWidth: 2, bodyColor: "#ffdab9", bodyOpacity: 0.15, shadowColor: "#ffdab9", shadowWidth: 8, insetShadowColor: "rgba(255, 218, 185, 0.2)", insetShadowWidth: 10, radius: 15, css: "" } },
    { name: "Mint Fresh", data: { borderColor: "#98ff98", borderWidth: 2, bodyColor: "#98ff98", bodyOpacity: 0.1, shadowColor: "#98ff98", shadowWidth: 8, insetShadowColor: "rgba(152, 255, 152, 0.2)", insetShadowWidth: 10, radius: 8, css: "" } },
    { name: "Ice Cold", data: { borderColor: "#a5f2f3", borderWidth: 2, bodyColor: "#e0ffff", bodyOpacity: 0.2, shadowColor: "#a5f2f3", shadowWidth: 15, insetShadowColor: "rgba(224, 255, 255, 0.3)", insetShadowWidth: 20, radius: 4, css: "" } },
    { name: "Burnt Orange", data: { borderColor: "#ff4500", borderWidth: 3, bodyColor: "#ff8c00", bodyOpacity: 0.15, shadowColor: "#ff4500", shadowWidth: 12, insetShadowColor: "rgba(255, 69, 0, 0.2)", insetShadowWidth: 15, radius: 6, css: "" } },
    { name: "Lavender Dream", data: { borderColor: "#e6e6fa", borderWidth: 2, bodyColor: "#e6e6fa", bodyOpacity: 0.1, shadowColor: "#fff0f5", shadowWidth: 10, insetShadowColor: "rgba(230, 230, 250, 0.2)", insetShadowWidth: 15, radius: 18, css: "" } },
    { name: "Military Olive", data: { borderColor: "#556b2f", borderWidth: 3, bodyColor: "#6b8e23", bodyOpacity: 0.3, shadowColor: "#000000", shadowWidth: 5, insetShadowColor: "rgba(85, 107, 47, 0.4)", insetShadowWidth: 20, radius: 2, css: "" } },
    { name: "Chocolate", data: { borderColor: "#d2691e", borderWidth: 3, bodyColor: "#8b4513", bodyOpacity: 0.2, shadowColor: "#cd853f", shadowWidth: 8, insetShadowColor: "rgba(139, 69, 19, 0.3)", insetShadowWidth: 15, radius: 8, css: "" } },
    { name: "Steel Industrial", data: { borderColor: "#b0c4de", borderWidth: 4, bodyColor: "#778899", bodyOpacity: 0.3, shadowColor: "#000000", shadowWidth: 5, insetShadowColor: "rgba(119, 136, 153, 0.3)", insetShadowWidth: 10, radius: 0, css: "" } },
    { name: "Night Vision", data: { borderColor: "#00ff00", borderWidth: 1, bodyColor: "#003300", bodyOpacity: 0.4, shadowColor: "#00ff00", shadowWidth: 5, insetShadowColor: "#00ff00", insetShadowWidth: 5, radius: 0, css: "" } },
    { name: "Retro Amber", data: { borderColor: "#ffb000", borderWidth: 2, bodyColor: "#ffb000", bodyOpacity: 0.1, shadowColor: "#ffb000", shadowWidth: 8, insetShadowColor: "rgba(255, 176, 0, 0.2)", insetShadowWidth: 15, radius: 4, css: "" } },
    { name: "Minimal Thin", data: { borderColor: "#ffffff", borderWidth: 1, bodyColor: "#ffffff", bodyOpacity: 0.05, shadowColor: "#000000", shadowWidth: 2, insetShadowColor: "transparent", insetShadowWidth: 0, radius: 0, css: "" } },
    { name: "Heavy Outline", data: { borderColor: "#000000", borderWidth: 6, bodyColor: "#ffffff", bodyOpacity: 0.1, shadowColor: "#000000", shadowWidth: 0, insetShadowColor: "transparent", insetShadowWidth: 0, radius: 12, css: "" } },
    { name: "Subtle Glow", data: { borderColor: "transparent", borderWidth: 0, bodyColor: "#ffffff", bodyOpacity: 0.05, shadowColor: "#ffffff", shadowWidth: 30, insetShadowColor: "rgba(255,255,255,0.1)", insetShadowWidth: 50, radius: 20, css: "" } },
    { name: "Cyber Teal", data: { borderColor: "#008080", borderWidth: 2, bodyColor: "#20b2aa", bodyOpacity: 0.2, shadowColor: "#00ffff", shadowWidth: 10, insetShadowColor: "rgba(32, 178, 170, 0.3)", insetShadowWidth: 15, radius: 0, css: "" } },
    { name: "Rose Gold", data: { borderColor: "#b76e79", borderWidth: 2, bodyColor: "#b76e79", bodyOpacity: 0.1, shadowColor: "#e6c2c6", shadowWidth: 10, insetShadowColor: "rgba(183, 110, 121, 0.2)", insetShadowWidth: 15, radius: 10, css: "" } },
    { name: "Vampire Red", data: { borderColor: "#800000", borderWidth: 3, bodyColor: "#300000", bodyOpacity: 0.6, shadowColor: "#ff0000", shadowWidth: 8, insetShadowColor: "#500000", insetShadowWidth: 30, radius: 6, css: "" } },
    { name: "Electric Violet", data: { borderColor: "#8a2be2", borderWidth: 3, bodyColor: "#9400d3", bodyOpacity: 0.15, shadowColor: "#8a2be2", shadowWidth: 15, insetShadowColor: "rgba(148, 0, 211, 0.2)", insetShadowWidth: 20, radius: 14, css: "" } },
    { name: "Solar Flare", data: { borderColor: "#ffca28", borderWidth: 3, bodyColor: "#ff6f00", bodyOpacity: 0.2, shadowColor: "#ffca28", shadowWidth: 15, insetShadowColor: "rgba(255, 111, 0, 0.2)", insetShadowWidth: 25, radius: 50, css: "" } },
    { name: "Invisible Touch", data: { borderColor: "transparent", borderWidth: 0, bodyColor: "#ffffff", bodyOpacity: 0.01, shadowColor: "transparent", shadowWidth: 0, insetShadowColor: "rgba(255,255,255,0.3)", insetShadowWidth: 100, radius: 10, css: "" } },
    { name: "Hard Border", data: { borderColor: "#ffffff", borderWidth: 4, bodyColor: "transparent", bodyOpacity: 0, shadowColor: "transparent", shadowWidth: 0, insetShadowColor: "#ffffff", insetShadowWidth: 4, radius: 0, css: "" } }
];

// =============================================================================
// 2. FANCY ACTIVE (TRANSPARENT + CSS) - ~30 Items
// Focus: Animations, Gradients, Textures, Blurs.
// =============================================================================
export const FANCY_PRESETS = [
    { name: "Neon Glow Pulse", data: { borderColor: "#00ffff", borderWidth: 2, bodyColor: "#00ffff", bodyOpacity: 0.05, shadowColor: "#00ffff", shadowWidth: 10, radius: 8, insetShadowColor: "transparent", insetShadowWidth: 0, css: "box-shadow: 0 0 5px #00ffff, 0 0 10px #00ffff, 0 0 20px #00ffff, inset 0 0 20px rgba(0,255,255,0.2); animation: pulse 2s infinite;" } },
    { name: "Rainbow RGB", data: { borderColor: "transparent", borderWidth: 4, bodyColor: "#ffffff", bodyOpacity: 0.1, shadowColor: "#ffffff", shadowWidth: 0, radius: 0, insetShadowColor: "transparent", insetShadowWidth: 0, css: "border-image: linear-gradient(45deg, red, orange, yellow, green, blue, indigo, violet) 1; box-shadow: 0 0 15px rgba(255,255,255,0.3);" } },
{ 
  name: "Cyber Glitch", 
  data: { 
    borderColor: "#ff00ff", 
    borderWidth: 2, 
    bodyColor: "#00ffff", 
    bodyOpacity: 0.1, 
    shadowColor: "#ff00ff", 
    shadowWidth: 5, 
    radius: 0, 
    insetShadowColor: "rgba(0, 255, 255, 0.1)", 
    insetShadowWidth: 10, 
    css: "box-shadow: -3px 0 #00ffff, 3px 0 #ff00ff; border-style: solid; clip-path: polygon(15% 0%, 100% 0%, 100% 90%, 90% 100%, 0% 100%, 0% 8%);" 
  } 
},
 
{ 
  name: "Dotted Notepad", 
  data: { 
    borderColor: "#333", 
    borderWidth: 3, 
    bodyColor: "#fff", 
    bodyOpacity: 0.2, 
    shadowColor: "#000", 
    shadowWidth: 5, 
    radius: 2, 
    insetShadowColor: "transparent", 
    insetShadowWidth: 0, 
    css: "border-style: dashed; background-image: radial-gradient(rgba(0, 0, 0, 0.15) 1px, transparent 1px); background-size: 10px 10px;" 
  } 
},
    { name: "Metallic Ridge", data: { borderColor: "#c0c0c0", borderWidth: 5, bodyColor: "#000", bodyOpacity: 0.2, shadowColor: "#000", shadowWidth: 10, radius: 8, insetShadowColor: "rgba(0,0,0,0.5)", insetShadowWidth: 15, css: "border-style: ridge; border-color: #e0e0e0 #505050 #505050 #e0e0e0; box-shadow: inset 2px 2px 5px rgba(0,0,0,0.8);" } },
    { name: "RPG Scroll", data: { borderColor: "#8b4513", borderWidth: 3, bodyColor: "#f4e4bc", bodyOpacity: 0.5, shadowColor: "#3e2723", shadowWidth: 15, radius: 4, insetShadowColor: "rgba(139,69,19,0.5)", insetShadowWidth: 30, css: "box-shadow: 0 5px 15px rgba(0,0,0,0.5), inset 0 0 30px rgba(139,69,19,0.5); border-style: double;" } },
    { name: "Hologram Scan", data: { borderColor: "rgba(0,255,255,0.5)", borderWidth: 1, bodyColor: "#00ffff", bodyOpacity: 0.1, shadowColor: "#00ffff", shadowWidth: 10, radius: 0, insetShadowColor: "transparent", insetShadowWidth: 0, css: "background: linear-gradient(180deg, rgba(0,255,255,0) 0%, rgba(0,255,255,0.2) 50%, rgba(0,255,255,0) 100%); background-size: 100% 20px; animation: scrollDown 2s linear infinite;" } },
    { name: "Vignette Horror", data: { borderColor: "#300", borderWidth: 1, bodyColor: "#300", bodyOpacity: 0.3, shadowColor: "#000", shadowWidth: 30, radius: 50, insetShadowColor: "#000000", insetShadowWidth: 50, css: "box-shadow: inset 0 0 50px #000; border: none;" } },
    { name: "Blueprint Grid", data: { borderColor: "#ffffff", borderWidth: 2, bodyColor: "#0055aa", bodyOpacity: 0.8, shadowColor: "#000", shadowWidth: 5, radius: 0, insetShadowColor: "transparent", insetShadowWidth: 0, css: "background-image: linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px); background-size: 20px 20px; background-position: center center;" } },
    { name: "Golden Glow", data: { borderColor: "#ffd700", borderWidth: 2, bodyColor: "#ffd700", bodyOpacity: 0.1, shadowColor: "#ffd700", shadowWidth: 20, radius: 100, insetShadowColor: "#ffd700", insetShadowWidth: 10, css: "box-shadow: 0 0 10px #ffd700, 0 0 20px #ffd700, inset 0 0 20px #ffd700;" } }, 
    { name: "Double Border", data: { borderColor: "#fff", borderWidth: 4, bodyColor: "#000", bodyOpacity: 0.4, shadowColor: "#000", shadowWidth: 5, radius: 0, insetShadowColor: "transparent", insetShadowWidth: 0, css: "outline: 4px solid #000; outline-offset: -10px;" } },
    { name: "Soft Cloud", data: { borderColor: "transparent", borderWidth: 0, bodyColor: "#fff", bodyOpacity: 0.2, shadowColor: "#fff", shadowWidth: 30, radius: 30, insetShadowColor: "#fff", insetShadowWidth: 30, css: "filter: blur(2px);" } },
    { name: "Candy Stripe", data: { borderColor: "#ff0055", borderWidth: 4, bodyColor: "#fff", bodyOpacity: 0.2, shadowColor: "#ff0055", shadowWidth: 5, radius: 12, insetShadowColor: "transparent", insetShadowWidth: 0, css: "background: repeating-linear-gradient(-45deg, rgba(255,0,85,0.2), rgba(255,0,85,0.2) 10px, transparent 10px, transparent 20px);" } },
    { name: "Steampunk Brass", data: { borderColor: "#b87333", borderWidth: 6, bodyColor: "#2a1a0a", bodyOpacity: 0.6, shadowColor: "#000", shadowWidth: 10, radius: 4, insetShadowColor: "#b87333", insetShadowWidth: 20, css: "border-style: ridge; background-image: radial-gradient(circle, rgba(184,115,51,0.2) 0%, transparent 80%);" } },
    { name: "Hexagon Net", data: { borderColor: "#0ff", borderWidth: 2, bodyColor: "#000", bodyOpacity: 0.4, shadowColor: "#0ff", shadowWidth: 10, radius: 0, insetShadowColor: "#0ff", insetShadowWidth: 10, css: "background-image: radial-gradient(circle, #0ff 2px, transparent 2.5px); background-size: 20px 20px;" } },
    { name: "Divine Light", data: { borderColor: "#fff", borderWidth: 2, bodyColor: "#fff", bodyOpacity: 0.1, shadowColor: "#fff", shadowWidth: 40, radius: 100, insetShadowColor: "#fff", insetShadowWidth: 20, css: "box-shadow: 0 0 50px #fff, inset 0 0 50px #fff;" } },
    { name: "Biohazard", data: { borderColor: "#ffeb3b", borderWidth: 4, bodyColor: "#000", bodyOpacity: 0.5, shadowColor: "#ffeb3b", shadowWidth: 10, radius: 4, insetShadowColor: "#ffeb3b", insetShadowWidth: 5, css: "border-style: dashed; background: repeating-linear-gradient(45deg, rgba(255,235,59,0.1), rgba(255,235,59,0.1) 10px, rgba(0,0,0,0.5) 10px, rgba(0,0,0,0.5) 20px);" } },
    { name: "Underline Only", data: { borderColor: "transparent", borderWidth: 0, bodyColor: "transparent", bodyOpacity: 0, shadowColor: "transparent", shadowWidth: 0, radius: 0, insetShadowColor: "transparent", insetShadowWidth: 0, css: "border-bottom: 3px solid #00ff00; background: linear-gradient(to top, rgba(0,255,0,0.2) 0%, transparent 50%);" } },
    { name: "Left Bar Marker", data: { borderColor: "transparent", borderWidth: 0, bodyColor: "transparent", bodyOpacity: 0, shadowColor: "transparent", shadowWidth: 0, radius: 0, insetShadowColor: "transparent", insetShadowWidth: 0, css: "border-left: 6px solid #ff0055; background: linear-gradient(to right, rgba(255,0,85,0.2) 0%, transparent 50%);" } },
    { name: "Circular Target", data: { borderColor: "#ff0000", borderWidth: 2, bodyColor: "transparent", bodyOpacity: 0, shadowColor: "#ff0000", shadowWidth: 10, radius: 100, insetShadowColor: "#ff0000", insetShadowWidth: 10, css: "border-style: dotted;" } },
    { name: "Sketchy", data: { borderColor: "#fff", borderWidth: 2, bodyColor: "transparent", bodyOpacity: 0, shadowColor: "transparent", shadowWidth: 0, radius: 2, insetShadowColor: "rgba(255,255,255,0.1)", insetShadowWidth: 20, css: "border-style: solid; border-radius: 255px 15px 225px 15px / 15px 225px 15px 255px;" } },
    { name: "TV Noise", data: { borderColor: "#aaa", borderWidth: 2, bodyColor: "#000", bodyOpacity: 0.3, shadowColor: "#fff", shadowWidth: 5, radius: 4, insetShadowColor: "#fff", insetShadowWidth: 5, css: "background-image: repeating-radial-gradient(circle, #333 0, #333 1px, transparent 1px, transparent 100%); background-size: 5px 5px;" } },
{ 
  name: "Gradient Border", 
  data: { 
    borderColor: "transparent", 
    borderWidth: 0, 
    bodyColor: "transparent", 
    bodyOpacity: 0, 
    shadowColor: "transparent", 
    shadowWidth: 0, 
    radius: 10, 
    insetShadowColor: "transparent", 
    insetShadowWidth: 0, 
    css: "background: linear-gradient(135deg, darkorchid, darkblue, darkorchid); border-radius: 10px; padding: 4px; -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0); -webkit-mask-composite: xor; mask-composite: exclude;" 
  } 
},
    { name: "Fizzy Pop", data: { borderColor: "#ff9900", borderWidth: 3, bodyColor: "#ff9900", bodyOpacity: 0.1, shadowColor: "#ff9900", shadowWidth: 10, radius: 20, insetShadowColor: "#ff9900", insetShadowWidth: 10, css: "border-style: dashed; animation: pulse 1s infinite alternate;" } }
];

// =============================================================================
// 3. VISUAL CARD STANDARD (OPAQUE) - ~30 Items
// Focus: Flat colors, simple borders, card-like appearance.
// =============================================================================
export const VISUAL_STANDARD_PRESETS = [
    { name: "Flat Dark (Default)", data: { visualBgColor: "#222222", visualTitleColor: "#ffffff", visualTextColor: "#cccccc", visualBorderColor: "#444444", visualBorderWidth: 1, visualRadius: 8 } }, 
    { name: "White Card", data: { visualBgColor: "#ffffff", visualTitleColor: "#000000", visualTextColor: "#444444", visualBorderColor: "#000000", visualBorderWidth: 2, visualRadius: 12 } },
    { name: "Night Mode Blue", data: { visualBgColor: "#1a237e", visualTitleColor: "#ffffff", visualTextColor: "#c5cae9", visualBorderColor: "#3949ab", visualBorderWidth: 1, visualRadius: 6 } },
    { name: "Forest Card", data: { visualBgColor: "#1b5e20", visualTitleColor: "#a5d6a7", visualTextColor: "#e8f5e9", visualBorderColor: "#2e7d32", visualBorderWidth: 2, visualRadius: 4 } },
    { name: "Ruby Card", data: { visualBgColor: "#b71c1c", visualTitleColor: "#ffcdd2", visualTextColor: "#ffebee", visualBorderColor: "#d32f2f", visualBorderWidth: 1, visualRadius: 8 } },
    { name: "Solar Card", data: { visualBgColor: "#f57f17", visualTitleColor: "#fffde7", visualTextColor: "#ffffff", visualBorderColor: "#fbc02d", visualBorderWidth: 0, visualRadius: 4 } },
    { name: "Royal Purple", data: { visualBgColor: "#4a148c", visualTitleColor: "#e1bee7", visualTextColor: "#f3e5f5", visualBorderColor: "#7b1fa2", visualBorderWidth: 2, visualRadius: 10 } },
    { name: "Charcoal", data: { visualBgColor: "#333333", visualTitleColor: "#dddddd", visualTextColor: "#aaaaaa", visualBorderColor: "#555555", visualBorderWidth: 1, visualRadius: 2 } },
    { name: "Cream Paper", data: { visualBgColor: "#fff8e1", visualTitleColor: "#3e2723", visualTextColor: "#5d4037", visualBorderColor: "#d7ccc8", visualBorderWidth: 1, visualRadius: 2 } },
    { name: "Slate Blue", data: { visualBgColor: "#37474f", visualTitleColor: "#cfd8dc", visualTextColor: "#b0bec5", visualBorderColor: "#546e7a", visualBorderWidth: 1, visualRadius: 6 } },
    { name: "Coffee", data: { visualBgColor: "#3e2723", visualTitleColor: "#d7ccc8", visualTextColor: "#bcaaa4", visualBorderColor: "#5d4037", visualBorderWidth: 2, visualRadius: 4 } },
    { name: "Minty", data: { visualBgColor: "#e0f2f1", visualTitleColor: "#004d40", visualTextColor: "#00695c", visualBorderColor: "#80cbc4", visualBorderWidth: 1, visualRadius: 12 } },
    { name: "Lavender", data: { visualBgColor: "#f3e5f5", visualTitleColor: "#4a148c", visualTextColor: "#6a1b9a", visualBorderColor: "#ce93d8", visualBorderWidth: 1, visualRadius: 12 } },
    { name: "Steel Box", data: { visualBgColor: "#607d8b", visualTitleColor: "#ffffff", visualTextColor: "#eceff1", visualBorderColor: "#455a64", visualBorderWidth: 3, visualRadius: 0 } },
    { name: "Terminal", data: { visualBgColor: "#000000", visualTitleColor: "#00ff00", visualTextColor: "#00cc00", visualBorderColor: "#003300", visualBorderWidth: 1, visualRadius: 0 } },
    { name: "Hot Red", data: { visualBgColor: "#ff0000", visualTitleColor: "#ffffff", visualTextColor: "#ffffff", visualBorderColor: "#880000", visualBorderWidth: 0, visualRadius: 0 } },
    { name: "Deep Sea", data: { visualBgColor: "#006064", visualTitleColor: "#b2ebf2", visualTextColor: "#e0f7fa", visualBorderColor: "#00838f", visualBorderWidth: 1, visualRadius: 16 } },
    { name: "Peach", data: { visualBgColor: "#ffe0b2", visualTitleColor: "#e65100", visualTextColor: "#ef6c00", visualBorderColor: "#ffcc80", visualBorderWidth: 1, visualRadius: 20 } },
    { name: "Luxury Black", data: { visualBgColor: "#111111", visualTitleColor: "#d4af37", visualTextColor: "#999999", visualBorderColor: "#333333", visualBorderWidth: 1, visualRadius: 4 } },
    { name: "Old Book", data: { visualBgColor: "#d7ccc8", visualTitleColor: "#3e2723", visualTextColor: "#4e342e", visualBorderColor: "#8d6e63", visualBorderWidth: 2, visualRadius: 2 } },
    { name: "Info Panel", data: { visualBgColor: "#e3f2fd", visualTitleColor: "#0d47a1", visualTextColor: "#1565c0", visualBorderColor: "#90caf9", visualBorderWidth: 1, visualRadius: 4 } },
    { name: "Success Green", data: { visualBgColor: "#e8f5e9", visualTitleColor: "#1b5e20", visualTextColor: "#2e7d32", visualBorderColor: "#a5d6a7", visualBorderWidth: 1, visualRadius: 4 } },
    { name: "Warning Yellow", data: { visualBgColor: "#fffde7", visualTitleColor: "#f57f17", visualTextColor: "#f9a825", visualBorderColor: "#fff59d", visualBorderWidth: 1, visualRadius: 4 } },
    { name: "Error Red", data: { visualBgColor: "#ffebee", visualTitleColor: "#b71c1c", visualTextColor: "#c62828", visualBorderColor: "#ef9a9a", visualBorderWidth: 1, visualRadius: 4 } },
    { name: "High Contrast", data: { visualBgColor: "#ffffff", visualTitleColor: "#000000", visualTextColor: "#000000", visualBorderColor: "#000000", visualBorderWidth: 4, visualRadius: 0 } },
    { name: "Subtle Grey", data: { visualBgColor: "#eeeeee", visualTitleColor: "#616161", visualTextColor: "#757575", visualBorderColor: "#e0e0e0", visualBorderWidth: 1, visualRadius: 8 } },
    { name: "Pink Note", data: { visualBgColor: "#fce4ec", visualTitleColor: "#880e4f", visualTextColor: "#ad1457", visualBorderColor: "#f48fb1", visualBorderWidth: 0, visualRadius: 0 } },
    { name: "Tech Blue", data: { visualBgColor: "#102027", visualTitleColor: "#4fc3f7", visualTextColor: "#29b6f6", visualBorderColor: "#0277bd", visualBorderWidth: 2, visualRadius: 0 } },
    { name: "Gothic", data: { visualBgColor: "#212121", visualTitleColor: "#bdbdbd", visualTextColor: "#757575", visualBorderColor: "#424242", visualBorderWidth: 3, visualRadius: 20 } }
];

// =============================================================================
// 4. VISUAL CARD FANCY (OPAQUE + BOLD STYLES) - ~30 Items
// Focus: High Contrast, Rarity Tiers, Neon Borders, Unique Combinations.
// Note: These rely on colors/borders since we don't have CSS field for Visual cards.
// =============================================================================
export const VISUAL_FANCY_PRESETS = [
    { name: "Cyberpunk Yellow", data: { visualBgColor: "#fcee0a", visualTitleColor: "#000000", visualTextColor: "#222222", visualBorderColor: "#000000", visualBorderWidth: 4, visualRadius: 0 } },
    { name: "Rarity: Common (Grey)", data: { visualBgColor: "#2d2d2d", visualTitleColor: "#ffffff", visualTextColor: "#aaaaaa", visualBorderColor: "#9e9e9e", visualBorderWidth: 2, visualRadius: 8 } },
    { name: "Rarity: Uncommon (Green)", data: { visualBgColor: "#1b2e1b", visualTitleColor: "#4caf50", visualTextColor: "#a5d6a7", visualBorderColor: "#4caf50", visualBorderWidth: 2, visualRadius: 8 } },
    { name: "Rarity: Rare (Blue)", data: { visualBgColor: "#1a237e", visualTitleColor: "#448aff", visualTextColor: "#82b1ff", visualBorderColor: "#2979ff", visualBorderWidth: 2, visualRadius: 8 } },
    { name: "Rarity: Epic (Purple)", data: { visualBgColor: "#311b92", visualTitleColor: "#d500f9", visualTextColor: "#ea80fc", visualBorderColor: "#aa00ff", visualBorderWidth: 3, visualRadius: 8 } },
    { name: "Rarity: Legendary (Orange)", data: { visualBgColor: "#3e2723", visualTitleColor: "#ff6d00", visualTextColor: "#ff9e80", visualBorderColor: "#ff6d00", visualBorderWidth: 3, visualRadius: 8 } },
    { name: "Rarity: Mythic (Cyan)", data: { visualBgColor: "#006064", visualTitleColor: "#00e5ff", visualTextColor: "#84ffff", visualBorderColor: "#18ffff", visualBorderWidth: 4, visualRadius: 12 } },
    { name: "Rarity: Godly (Gold)", data: { visualBgColor: "#2a1a00", visualTitleColor: "#ffd700", visualTextColor: "#fff8e1", visualBorderColor: "#ffd700", visualBorderWidth: 4, visualRadius: 16 } },
    { name: "Rarity: Cursed (Red/Black)", data: { visualBgColor: "#000000", visualTitleColor: "#ff0000", visualTextColor: "#b71c1c", visualBorderColor: "#ff0000", visualBorderWidth: 2, visualRadius: 0 } },
    { name: "Neon Pink Dark", data: { visualBgColor: "#000000", visualTitleColor: "#ff00ff", visualTextColor: "#ff80ff", visualBorderColor: "#ff00ff", visualBorderWidth: 3, visualRadius: 12 } },
    { name: "Neon Green Dark", data: { visualBgColor: "#000000", visualTitleColor: "#00ff00", visualTextColor: "#66ff66", visualBorderColor: "#00ff00", visualBorderWidth: 3, visualRadius: 12 } },
    { name: "Blueprint Inverted", data: { visualBgColor: "#0d47a1", visualTitleColor: "#ffffff", visualTextColor: "#bbdefb", visualBorderColor: "#ffffff", visualBorderWidth: 2, visualRadius: 0 } },
       { name: "GameBoy Green", data: { visualBgColor: "#8bac0f", visualTitleColor: "#0f380f", visualTextColor: "#306230", visualBorderColor: "#0f380f", visualBorderWidth: 4, visualRadius: 4 } },
    { name: "Vaporwave", data: { visualBgColor: "#ff71ce", visualTitleColor: "#01cdfe", visualTextColor: "#fffb96", visualBorderColor: "#fffb96", visualBorderWidth: 3, visualRadius: 0 } },
    { name: "Dracula", data: { visualBgColor: "#282a36", visualTitleColor: "#ff79c6", visualTextColor: "#f8f8f2", visualBorderColor: "#bd93f9", visualBorderWidth: 2, visualRadius: 6 } },
    { name: "Monokai", data: { visualBgColor: "#272822", visualTitleColor: "#a6e22e", visualTextColor: "#f8f8f2", visualBorderColor: "#f92672", visualBorderWidth: 2, visualRadius: 6 } },
    { name: "Solarized Light", data: { visualBgColor: "#fdf6e3", visualTitleColor: "#b58900", visualTextColor: "#657b83", visualBorderColor: "#cb4b16", visualBorderWidth: 1, visualRadius: 4 } },
    { name: "Solarized Dark", data: { visualBgColor: "#002b36", visualTitleColor: "#268bd2", visualTextColor: "#839496", visualBorderColor: "#859900", visualBorderWidth: 1, visualRadius: 4 } },
    { name: "Gruvbox", data: { visualBgColor: "#282828", visualTitleColor: "#fb4934", visualTextColor: "#ebdbb2", visualBorderColor: "#d79921", visualBorderWidth: 2, visualRadius: 4 } },
    { name: "Nord", data: { visualBgColor: "#2e3440", visualTitleColor: "#88c0d0", visualTextColor: "#d8dee9", visualBorderColor: "#81a1c1", visualBorderWidth: 1, visualRadius: 6 } },
   { name: "Stop Sign", data: { visualBgColor: "#d50000", visualTitleColor: "#ffffff", visualTextColor: "#ffcdd2", visualBorderColor: "#ffffff", visualBorderWidth: 4, visualRadius: 50 } },
    { name: "Gold Plated", data: { visualBgColor: "#fff176", visualTitleColor: "#f57f17", visualTextColor: "#f9a825", visualBorderColor: "#f9a825", visualBorderWidth: 6, visualRadius: 12 } },
    { name: "Obsidian", data: { visualBgColor: "#121212", visualTitleColor: "#e0e0e0", visualTextColor: "#b0b0b0", visualBorderColor: "#3c3c3c", visualBorderWidth: 1, visualRadius: 0 } }, 
   { name: "Pastel Goth", data: { visualBgColor: "#000000", visualTitleColor: "#ffc1e3", visualTextColor: "#e1bee7", visualBorderColor: "#b2ebf2", visualBorderWidth: 2, visualRadius: 15 } },
    { name: "Toxic Waste", data: { visualBgColor: "#2e3b0b", visualTitleColor: "#ccff00", visualTextColor: "#adff2f", visualBorderColor: "#76ff03", visualBorderWidth: 3, visualRadius: 10 } },
    { name: "Safety Orange", data: { visualBgColor: "#ff5722", visualTitleColor: "#ffffff", visualTextColor: "#ffccbc", visualBorderColor: "#bf360c", visualBorderWidth: 3, visualRadius: 5 } }
];

// =============================================================================
// 5. DISABLED PRESETS (MIXED SIMPLE/COMPLEX) - ~50 Items
// Focus: "No", "Locked", "Hidden", "Destroyed".
// =============================================================================
export const DISABLED_PRESETS = [
    // Standard Grays
    { name: "Standard Gray 50%", data: { borderColor: "#555", borderWidth: 0, bodyColor: "#000", bodyOpacity: 0.5, shadowColor: "#000", shadowWidth: 0, radius: 12, css: "" } },
    { name: "Standard Gray 80%", data: { borderColor: "#333", borderWidth: 0, bodyColor: "#000", bodyOpacity: 0.8, shadowColor: "#000", shadowWidth: 0, radius: 12, css: "" } },
    { name: "Pitch Black", data: { borderColor: "#000", borderWidth: 0, bodyColor: "#000", bodyOpacity: 1.0, shadowColor: "#000", shadowWidth: 0, radius: 12, css: "" } },
    { name: "Light Gray Tint", data: { borderColor: "#aaa", borderWidth: 0, bodyColor: "#fff", bodyOpacity: 0.5, shadowColor: "#000", shadowWidth: 0, radius: 12, css: "" } },
    
    // Colored Tints
    { name: "Red Tint (Incorrect)", data: { borderColor: "#500", borderWidth: 2, bodyColor: "#500", bodyOpacity: 0.4, shadowColor: "#000", shadowWidth: 0, radius: 8, css: "" } },
 
    // Borders
    { name: "Dashed Outline", data: { borderColor: "#555", borderWidth: 2, bodyColor: "#000", bodyOpacity: 0.5, shadowColor: "#000", shadowWidth: 0, radius: 8, css: "border-style: dashed;" } },
    { name: "Dotted Outline", data: { borderColor: "#555", borderWidth: 4, bodyColor: "#000", bodyOpacity: 0.5, shadowColor: "#000", shadowWidth: 0, radius: 8, css: "border-style: dotted;" } },
    { name: "Double Outline", data: { borderColor: "#555", borderWidth: 6, bodyColor: "#000", bodyOpacity: 0.5, shadowColor: "#000", shadowWidth: 0, radius: 8, css: "border-style: double;" } },
    { name: "Red Border", data: { borderColor: "#f00", borderWidth: 4, bodyColor: "#000", bodyOpacity: 0.5, shadowColor: "#000", shadowWidth: 0, radius: 0, css: "" } },

    // Patterns (Stripes)
    { name: "Stripes: Diagonal Gray", data: { borderColor: "#555", borderWidth: 1, bodyColor: "#000", bodyOpacity: 0.5, shadowColor: "#000", shadowWidth: 0, radius: 12, css: "background-image: repeating-linear-gradient(45deg, rgba(0,0,0,0.4), rgba(0,0,0,0.4) 10px, rgba(50,50,50,0.6) 10px, rgba(50,50,50,0.6) 20px);" } },
    { name: "Stripes: Diagonal Red", data: { borderColor: "#500", borderWidth: 1, bodyColor: "#300", bodyOpacity: 0.5, shadowColor: "#000", shadowWidth: 0, radius: 12, css: "background-image: repeating-linear-gradient(45deg, rgba(50,0,0,0.4), rgba(50,0,0,0.4) 10px, rgba(100,0,0,0.6) 10px, rgba(100,0,0,0.6) 20px);" } },
 
    // Patterns (Checks/Grids)
    { name: "Checkerboard", data: { borderColor: "#555", borderWidth: 1, bodyColor: "#000", bodyOpacity: 0.5, shadowColor: "#000", shadowWidth: 0, radius: 8, css: "background-image: linear-gradient(45deg, #333 25%, transparent 25%), linear-gradient(-45deg, #333 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #333 75%), linear-gradient(-45deg, transparent 75%, #333 75%); background-size: 20px 20px; background-position: 0 0, 0 10px, 10px -10px, -10px 0px;" } },
    { name: "Grid Mesh", data: { borderColor: "#555", borderWidth: 1, bodyColor: "#000", bodyOpacity: 0.5, shadowColor: "#000", shadowWidth: 0, radius: 0, css: "background-image: linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px); background-size: 10px 10px;" } },
    { name: "Dots", data: { borderColor: "#555", borderWidth: 1, bodyColor: "#000", bodyOpacity: 0.5, shadowColor: "#000", shadowWidth: 0, radius: 0, css: "background-image: radial-gradient(#555 1px, transparent 1px); background-size: 10px 10px;" } },

    // Crosses & Symbols
    { name: "Big Red X", data: { borderColor: "#500", borderWidth: 2, bodyColor: "#220000", bodyOpacity: 0.6, shadowColor: "#000", shadowWidth: 0, radius: 8, css: "background: linear-gradient(to top right, transparent calc(50% - 2px), red, transparent calc(50% + 2px)), linear-gradient(to bottom right, transparent calc(50% - 2px), red, transparent calc(50% + 2px)); background-color: rgba(0,0,0,0.6);" } },
    { name: "Big White X", data: { borderColor: "#555", borderWidth: 1, bodyColor: "#000", bodyOpacity: 0.6, shadowColor: "#000", shadowWidth: 0, radius: 8, css: "background: linear-gradient(to top right, transparent calc(50% - 1px), white, transparent calc(50% + 1px)), linear-gradient(to bottom right, transparent calc(50% - 1px), white, transparent calc(50% + 1px)); background-color: rgba(0,0,0,0.6);" } },
    { name: "Circle Slash (Banned)", data: { borderColor: "#f00", borderWidth: 4, bodyColor: "#000", bodyOpacity: 0.5, shadowColor: "#000", shadowWidth: 0, radius: 50, css: "background: linear-gradient(to bottom right, transparent calc(50% - 2px), red, transparent calc(50% + 2px));" } },

    // Filters & Blurs
    { name: "Blurred Out", data: { borderColor: "transparent", borderWidth: 0, bodyColor: "#fff", bodyOpacity: 0.3, shadowColor: "#000", shadowWidth: 0, radius: 12, css: "backdrop-filter: blur(4px) grayscale(100%);" } },
    { name: "Grayscale Only", data: { borderColor: "#555", borderWidth: 1, bodyColor: "transparent", bodyOpacity: 0, shadowColor: "#000", shadowWidth: 0, radius: 8, css: "backdrop-filter: grayscale(100%);" } },
    { name: "Sepia Old", data: { borderColor: "#5d4037", borderWidth: 1, bodyColor: "#3e2723", bodyOpacity: 0.6, shadowColor: "#000", shadowWidth: 0, radius: 4, css: "filter: sepia(100%) grayscale(50%);" } },
  { name: "High Contrast Dark", data: { borderColor: "#fff", borderWidth: 2, bodyColor: "#000", bodyOpacity: 0.9, shadowColor: "#000", shadowWidth: 0, radius: 0, css: "filter: contrast(150%);" } },
    { name: "Dimmed Heavily", data: { borderColor: "transparent", borderWidth: 0, bodyColor: "#000", bodyOpacity: 0.8, shadowColor: "#000", shadowWidth: 0, radius: 0, css: "filter: brightness(30%);" } },

    // Special Effects
        { name: "Frosted Glass", data: { borderColor: "rgba(255,255,255,0.5)", borderWidth: 1, bodyColor: "#ffffff", bodyOpacity: 0.05, shadowColor: "rgba(0,0,0,0.2)", shadowWidth: 10, radius: 16, insetShadowColor: "rgba(255,255,255,0.1)", insetShadowWidth: 20, css: "backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border-top: 1px solid rgba(255,255,255,0.8); border-left: 1px solid rgba(255,255,255,0.8);" } },
    { name: "Frozen Ice", data: { borderColor: "#a0e0ff", borderWidth: 1, bodyColor: "#a0e0ff", bodyOpacity: 0.4, shadowColor: "#fff", shadowWidth: 5, radius: 12, css: "backdrop-filter: blur(2px);" } },
    { name: "Broken Glass", data: { borderColor: "#aaa", borderWidth: 1, bodyColor: "#000", bodyOpacity: 0.4, shadowColor: "#000", shadowWidth: 0, radius: 0, css: "background-image: linear-gradient(135deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 51%);" } },
    { name: "Locked Chain", data: { borderColor: "#333", borderWidth: 4, bodyColor: "#000", bodyOpacity: 0.8, shadowColor: "#000", shadowWidth: 0, radius: 8, css: "border-style: dotted;" } },
    { name: "Burnt Paper", data: { borderColor: "#000", borderWidth: 0, bodyColor: "#221100", bodyOpacity: 0.7, shadowColor: "#000", shadowWidth: 10, radius: 50, css: "box-shadow: inset 0 0 20px #000;" } },
    { name: "Ghostly", data: { borderColor: "#fff", borderWidth: 0, bodyColor: "#fff", bodyOpacity: 0.1, shadowColor: "#fff", shadowWidth: 0, radius: 50, css: "opacity: 0.5;" } },
    { name: "Static Noise", data: { borderColor: "#555", borderWidth: 1, bodyColor: "#000", bodyOpacity: 0.5, shadowColor: "#000", shadowWidth: 0, radius: 0, css: "background-image: repeating-radial-gradient(circle, #333 0, #333 1px, transparent 1px, transparent 100%); background-size: 3px 3px;" } },
      { name: "Blured", data: { borderColor: "#555", borderWidth: 2, bodyColor: "#000", bodyOpacity: 0.6, shadowColor: "#000", shadowWidth: 0, radius: 0, css: "image-rendering: pixelated; backdrop-filter: blur(5px);" } },
    { name: "Censored", data: { borderColor: "#000", borderWidth: 0, bodyColor: "#000", bodyOpacity: 1.0, shadowColor: "#000", shadowWidth: 0, radius: 0, css: "border: 2px solid white;" } },
    { name: "Faded Memory", data: { borderColor: "transparent", borderWidth: 0, bodyColor: "#fff", bodyOpacity: 0.8, shadowColor: "#fff", shadowWidth: 20, radius: 30, css: "filter: blur(5px) grayscale(100%);" } },
       { name: "Under Construction", data: { borderColor: "#ff0", borderWidth: 4, bodyColor: "#000", bodyOpacity: 0.7, shadowColor: "#000", shadowWidth: 0, radius: 0, css: "border-style: groove;" } },
    { name: "Void", data: { borderColor: "transparent", borderWidth: 0, bodyColor: "#000", bodyOpacity: 1.0, shadowColor: "#000", shadowWidth: 50, radius: 100, css: "" } },

 
    // --- GEOMETRIC SHAPES (CLIP-PATH) ---
    { name: "Geo: Octagon Block", data: { borderColor: "transparent", borderWidth: 0, bodyColor: "#333", bodyOpacity: 0.9, shadowColor: "#000", shadowWidth: 0, radius: 0, css: "clip-path: polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%); border: 4px solid #555;" } },
    { name: "Geo: Slashed", data: { borderColor: "transparent", borderWidth: 0, bodyColor: "#500", bodyOpacity: 0.6, shadowColor: "#000", shadowWidth: 0, radius: 0, css: "clip-path: polygon(0 0, 100% 0, 80% 100%, 20% 100%); transform: skewX(-10deg); border-left: 5px solid #f00; border-right: 5px solid #f00;" } },
    { name: "Geo: Fragmented", data: { borderColor: "transparent", borderWidth: 0, bodyColor: "#000", bodyOpacity: 0.7, shadowColor: "#000", shadowWidth: 0, radius: 0, css: "clip-path: polygon(0% 15%, 15% 15%, 15% 0%, 85% 0%, 85% 15%, 100% 15%, 100% 85%, 85% 85%, 85% 100%, 15% 100%, 15% 85%, 0% 85%); border: 2px dashed #777;" } },
 
    // --- PRISON & TECH ---
    { name: "Jail Bars", data: { borderColor: "#555", borderWidth: 4, bodyColor: "transparent", bodyOpacity: 0, shadowColor: "#000", shadowWidth: 0, radius: 4, css: "background-image: linear-gradient(90deg, transparent 50%, #333 50%); background-size: 20px 100%; box-shadow: inset 0 0 20px #000;" } },
    { name: "Laser Grid (Red)", data: { borderColor: "#f00", borderWidth: 2, bodyColor: "#200", bodyOpacity: 0.4, shadowColor: "#f00", shadowWidth: 5, radius: 0, css: "background-image: linear-gradient(#f00 1px, transparent 1px), linear-gradient(90deg, #f00 1px, transparent 1px); background-size: 30px 30px;" } },
    { name: "System Failure", data: { borderColor: "#0f0", borderWidth: 1, bodyColor: "#000", bodyOpacity: 0.9, shadowColor: "#0f0", shadowWidth: 0, radius: 0, css: "border-style: dotted; font-family: monospace; background: repeating-linear-gradient(0deg, transparent, transparent 2px, #0f0 2px, #0f0 4px); opacity: 0.6;" } },
    
    // --- DESTRUCTION ---
    { name: "Burnt & Charred", data: { borderColor: "transparent", borderWidth: 0, bodyColor: "#000", bodyOpacity: 0.6, shadowColor: "#000", shadowWidth: 0, radius: 50, css: "box-shadow: inset 0 0 40px #000, 0 0 20px #000; border: 1px solid #333;" } },
    { name: "Eroded Stone", data: { borderColor: "#555", borderWidth: 0, bodyColor: "#333", bodyOpacity: 0.8, shadowColor: "#fff", shadowWidth: 1, radius: 2, css: "filter: sepia(0%) grayscale(100%) contrast(150%) noise(0.5); border: 4px ridge #555;" } },
    { name: "Shattered Glass", data: { borderColor: "#aad", borderWidth: 1, bodyColor: "#000", bodyOpacity: 0.3, shadowColor: "#aad", shadowWidth: 0, radius: 0, css: "background: linear-gradient(125deg, transparent 40%, rgba(255,255,255,0.4) 41%, transparent 42%), linear-gradient(65deg, transparent 60%, rgba(255,255,255,0.2) 61%, transparent 62%);" } },

    // --- TEXTURES & PATTERNS ---
    { name: "Police Line", data: { borderColor: "#fd0", borderWidth: 0, bodyColor: "#000", bodyOpacity: 0.5, shadowColor: "#000", shadowWidth: 0, radius: 0, css: "border-top: 5px solid #fd0; border-bottom: 5px solid #fd0; background: repeating-linear-gradient(45deg, #fd0, #fd0 10px, #000 10px, #000 20px);" } },
    { name: "Redacted (Censored)", data: { borderColor: "#000", borderWidth: 0, bodyColor: "#000", bodyOpacity: 1.0, shadowColor: "#000", shadowWidth: 0, radius: 2, css: "background: repeating-linear-gradient(180deg, #000, #000 15px, #222 15px, #222 17px);" } },
    { name: "Static Noise", data: { borderColor: "#fff", borderWidth: 0, bodyColor: "#000", bodyOpacity: 0.5, shadowColor: "#000", shadowWidth: 0, radius: 0, css: "background-image: repeating-radial-gradient(circle, #fff 0, #000 2px); background-size: 4px 4px; opacity: 0.3;" } },
    
    // --- STYLIZED ---
    { name: "Access Denied", data: { borderColor: "#f00", borderWidth: 4, bodyColor: "#300", bodyOpacity: 0.7, shadowColor: "#f00", shadowWidth: 10, radius: 8, css: "box-shadow: inset 0 0 20px #f00; animation: pulse 1s infinite;" } },
    
    // --- CLASSIC MARKERS ---
    { name: "Big Red X", data: { borderColor: "#500", borderWidth: 2, bodyColor: "#200", bodyOpacity: 0.6, shadowColor: "#000", shadowWidth: 0, radius: 8, css: "background: linear-gradient(to top right, transparent calc(50% - 2px), red, transparent calc(50% + 2px)), linear-gradient(to bottom right, transparent calc(50% - 2px), red, transparent calc(50% + 2px));" } },
    { name: "Crossed Out", data: { borderColor: "#000", borderWidth: 1, bodyColor: "#000", bodyOpacity: 0.4, shadowColor: "#000", shadowWidth: 0, radius: 4, css: "text-decoration: line-through; background-image: linear-gradient(to bottom right, transparent 48%, #000 50%, transparent 52%);" } },
    { name: "Out of Stock", data: { borderColor: "#aaa", borderWidth: 1, bodyColor: "#ddd", bodyOpacity: 0.8, shadowColor: "#000", shadowWidth: 0, radius: 0, css: "filter: grayscale(100%) blur(2px); opacity: 0.6;" } }
 

];