/**
 * src\ui\editor\geometry.js
 * Editor Geometry Mixin - Provides geometric calculations for the editor
 * Cleaned up: Removed unused collision detection logic
 */

export const EditorGeometryMixin = {
    // ==================== HELPER: Check if point is inside rect ====================
    // Used for clicking groups and drag-and-drop grouping logic
    isInsideRect(point, rect) {
        if (!rect) return false;
        return (
            point.x >= rect.x &&
            point.x <= rect.x + rect.w &&
            point.y >= rect.y &&
            point.y <= rect.y + rect.h
        );
    },
    
    // ==================== HELPER: Get bounding box of multiple items ====================
    // Used when calculating group selections
    getMultiSelectionBounds(items) {
        if (!items || items.length === 0) return null;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        
        items.forEach(item => {
            if (!item.coords) return;
            minX = Math.min(minX, item.coords.x);
            minY = Math.min(minY, item.coords.y);
            maxX = Math.max(maxX, item.coords.x + (item.coords.w || 0));
            maxY = Math.max(maxY, item.coords.y + (item.coords.h || 0));
        });

        if (minX === Infinity) return null;
        return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
    },

    // ==================== HELPER: Get item center ====================
    // Used for determining which group an item is dropped into
    getItemCenter(item) {
        if (!item.coords) return { x: 0, y: 0 };
        return {
            x: item.coords.x + (item.coords.w || 0) / 2,
            y: item.coords.y + (item.coords.h || 0) / 2
        };
    },

    // ==================== HELPER: Resize Detection ====================
    // Determines if mouse is hovering over a resize handle
    getResizeHandle(x, y, rect) {
        const hs = this.handleSize;
        const dist = (x1, y1, x2, y2) => Math.sqrt((x2-x1)**2 + (y2-y1)**2);

        // Top-Left
        if (dist(x, y, rect.left, rect.top) < hs) return 'tl';
        // Top-Right
        if (dist(x, y, rect.right, rect.top) < hs) return 'tr';
        // Bottom-Left
        if (dist(x, y, rect.left, rect.bottom) < hs) return 'bl';
        // Bottom-Right
        if (dist(x, y, rect.right, rect.bottom) < hs) return 'br';

        return null;
    },

    // ==================== HELPER: Smart Coordinates ====================
    // Calculates position relative to the scaled image/page
    getSmartCoords(objWidth, objHeight, mouseEvent = null) {
        const pageIndex = this.activePageIndex;
        const pageEl = document.getElementById(`page-${pageIndex}`);
        
        if (!pageEl) return { x: 0, y: 0 }; 
        
        const rect = pageEl.getBoundingClientRect(); 
        const imgDim = this.renderer.pageDimensions[pageIndex];
        
        if (!imgDim) return { x: 50, y: 50 }; 

        let clientX, clientY;

        if (mouseEvent) {
            clientX = mouseEvent.x;
            clientY = mouseEvent.y;
        } else {
            clientX = window.innerWidth / 2;
            clientY = window.innerHeight / 2;
        }

        const relX = clientX - rect.left;
        const relY = clientY - rect.top;

        const scaleX = imgDim.w / rect.width;
        const scaleY = imgDim.h / rect.height;

        let finalX = (relX * scaleX) - (objWidth / 2);
        let finalY = (relY * scaleY) - (objHeight / 2);

        finalX = Math.max(0, Math.min(finalX, imgDim.w - objWidth));
        finalY = Math.max(0, Math.min(finalY, imgDim.h - objHeight));

        return { x: Math.round(finalX), y: Math.round(finalY) };
    }
};