/**
 * src\ui\editor\geometry.js
 * Editor Geometry Mixin - Provides geometric calculations for the editor
 */

import { CoordHelper } from '../../utils/coords.js';

export const EditorGeometryMixin = {
    // ==================== HELPER: Check if point is inside rect ====================
    isInsideRect(point, rect) {
        if (!rect) return false;
        return (
            point.x >= rect.x &&
            point.x <= rect.x + rect.w &&
            point.y >= rect.y &&
            point.y <= rect.y + rect.h
        );
    },
    
    // Check intersection of two rectangles
    checkRectIntersection(r1, r2) {
        return !(r2.x >= r1.x + r1.w || 
                 r2.x + r2.w <= r1.x || 
                 r2.y >= r1.y + r1.h || 
                 r2.y + r2.h <= r1.y);
    },

    // Get bounding box of multiple items
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

    // Find all groups colliding with a rect (for dragging/resizing logic)
    getCollidingGroups(rect, ignoreId, pageIndex) {
        const page = this.getPageByIndex(pageIndex);
        if (!page || !page.layout) return [];
        
        const collisions = [];
        for (const element of page.layout) {
            if (element.type === 'group' && element.id !== ignoreId) {
                if (this.checkRectIntersection(rect, element.coords)) {
                    collisions.push(element);
                }
            }
        }
        return collisions;
    },

    // ==================== HELPER: Get item center ====================
    getItemCenter(item) {
        if (!item.coords) return { x: 0, y: 0 };
        return {
            x: item.coords.x + (item.coords.w || 0) / 2,
            y: item.coords.y + (item.coords.h || 0) / 2
        };
    },

    // ==================== HELPER: Resize Detection ====================
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

    // ==================== HELPER: Smart Coordinates (Center or Mouse) ====================
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