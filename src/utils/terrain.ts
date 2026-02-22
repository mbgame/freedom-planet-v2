/**
 * Shared terrain height logic to ensure consistency between 3D rendering
 * and structure placement logic.
 */

const TERRAIN_SIZE = 60;
const TERRAIN_SCALE = 3.5;

/**
 * Procedural height function based on sine sums.
 * This is the raw height before falloff and scaling.
 */
export function getBaseHeight(x: number, z: number): number {
    const scale1 = 0.08, scale2 = 0.2, scale3 = 0.5;
    const h1 = Math.sin(x * scale1 + 1.3) * Math.cos(z * scale1 + 0.7) * 0.5;
    const h2 = Math.sin(x * scale2 + 3.1) * Math.cos(z * scale2 + 2.4) * 0.2;
    const h3 = Math.sin(x * scale3 + 0.5) * Math.cos(z * scale3 + 4.2) * 0.08;
    return h1 + h2 + h3;
}

/**
 * Calculates the final world Y height for a given X, Z coordinate.
 */
export function getTerrainWorldHeight(x: number, z: number): number {
    const halfSize = TERRAIN_SIZE / 2;
    const dist = Math.sqrt(x * x + z * z) / halfSize;
    const falloff = Math.max(0, 1 - dist * dist);
    return getBaseHeight(x, z) * falloff * TERRAIN_SCALE;
}

/**
 * Checks if a location is relatively "flat" and suitable for a structure.
 * Returns a score: lower is flatter (closer to 0 height deviation).
 * Standardized score: values below 0.1 are very flat, above 0.5 are steep.
 */
export function getFlatnessScore(x: number, z: number): number {
    const centerH = getTerrainWorldHeight(x, z);

    // Sample 4 points around the center to calculate slope
    const sampleDist = 0.5;
    const h1 = getTerrainWorldHeight(x + sampleDist, z);
    const h2 = getTerrainWorldHeight(x - sampleDist, z);
    const h3 = getTerrainWorldHeight(x, z + sampleDist);
    const h4 = getTerrainWorldHeight(x, z - sampleDist);

    // Calculate max height difference (proxy for slope)
    const diff = Math.max(
        Math.abs(h1 - centerH),
        Math.abs(h2 - centerH),
        Math.abs(h3 - centerH),
        Math.abs(h4 - centerH)
    );

    return diff;
}
