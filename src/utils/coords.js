/**
 * src\utils\coords.js
 * Coordinate Helper - Converts between pixels and percentages
 */

export class CoordHelper {
    /**
     * Convert coordinates to percentage
     * @param {Object|Array} coords - {x, y, w, h} or [x, y, w, h]
     * @param {Object} dimensions - {w, h} of image
     * @returns {Object} CSS style object
     */
    static toPercent(coords, dimensions) {
        if (!coords || !dimensions) {
            return { display: 'none' };
        }

        // Normalize to object
        const raw = Array.isArray(coords)
            ? { x: coords[0], y: coords[1], w: coords[2], h: coords[3] }
            : { ...coords };

        // Auto-detect: if any value > 100, assume pixels
        const isPixels = raw.x > 100 || raw.y > 100 || raw.w > 100 || raw.h > 100;

        if (isPixels) {
            return {
                left: (raw.x / dimensions.w * 100) + '%',
                top: (raw.y / dimensions.h * 100) + '%',
                width: (raw.w / dimensions.w * 100) + '%',
                height: (raw.h / dimensions.h * 100) + '%'
            };
        }

        // Already percentages
        return {
            left: raw.x + '%',
            top: raw.y + '%',
            width: raw.w + '%',
            height: raw.h + '%'
        };
    }

    /**
     * Convert coordinates to pixels
     */
    static toPixels(coords, dimensions) {
        const raw = Array.isArray(coords)
            ? { x: coords[0], y: coords[1], w: coords[2], h: coords[3] }
            : { ...coords };

        const isPixels = raw.x > 100 || raw.y > 100 || raw.w > 100 || raw.h > 100;

        if (isPixels) {
            return raw;
        }

        return {
            x: raw.x / 100 * dimensions.w,
            y: raw.y / 100 * dimensions.h,
            w: raw.w / 100 * dimensions.w,
            h: raw.h / 100 * dimensions.h
        };
    }
}