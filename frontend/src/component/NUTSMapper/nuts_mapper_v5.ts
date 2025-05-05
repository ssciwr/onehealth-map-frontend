/**
 * Enhanced NUTS Mapper that works with pre-processed NUTS data
 * Improved error handling and WKT parsing for problematic geometries
 */

// Define TypeScript interfaces for GeoJSON structures
interface GeoJSONFeature {
    type: 'Feature';
    properties: {
        NUTS_ID: string;
        intensity: number | null;
    };
    geometry: GeoJSONGeometry;
}

interface GeoJSONFeatureCollection {
    type: 'FeatureCollection';
    features: GeoJSONFeature[];
}

interface GeoJSONGeometry {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: any[];
}

// Type aliases for clarity
type Coordinate = [number, number]; // [x, y] coordinate
type Ring = Coordinate[]; // A closed ring of coordinates
type Polygon = Ring[]; // Array of rings (first is exterior, rest are holes)
type MultiPolygon = Polygon[]; // Array of polygons

// Possible return types from parsing functions
type GeometryResult = Polygon | { type: 'MultiPolygon'; coordinates: MultiPolygon } | null;

class NutsMapperV5 {
    private nutsData: GeoJSONFeatureCollection | null;
    private errorCount: number;
    private processedCount: number;
    private skippedRegions: string[];

    constructor() {
        this.nutsData = null;
        this.errorCount = 0;
        this.processedCount = 0;
        this.skippedRegions = [];
    }

    /**
     * Parse CSV data containing NUTS regions with geometry and intensity values
     * @param {string} csvData - CSV string with NUTS_ID, geometry (WKT), and intensity columns
     * @param {boolean} skipInvalid - Whether to skip invalid geometries (default: true)
     * @returns {GeoJSONFeatureCollection} - GeoJSON object with NUTS regions
     */
    parseNutsCSV(csvData: string, skipInvalid: boolean = true): GeoJSONFeatureCollection {
        if (!csvData) {
            throw new Error('No CSV data provided');
        }

        console.log("Starting to parse NUTS CSV data...");
        this.errorCount = 0;
        this.processedCount = 0;
        this.skippedRegions = [];

        // Split CSV into lines
        const lines: string[] = csvData.trim().split('\n');
        console.log(`Found ${lines.length - 1} data lines to process`);

        // Parse header to find column indices
        const header: string[] = lines[0].split(',');
        const nutsIdIndex: number = header.indexOf('NUTS_ID');
        const geometryIndex: number = header.indexOf('geometry');
        const intensityIndex: number = header.indexOf('t2m');

        if (nutsIdIndex === -1 || geometryIndex === -1 || intensityIndex === -1) {
            throw new Error(`CSV must contain NUTS_ID, geometry, and t2m columns. Found columns: ${header.join(', ')}`);
        }

        // Create GeoJSON structure
        const features: GeoJSONFeature[] = [];

        // Process each line (skip header)
        for (let i = 1; i < lines.length; i++) {
            const line: string = lines[i];
            if (!line.trim()) continue; // Skip empty lines

            try {
                // Split by comma, but respect quoted values
                const columns: string[] = this.parseCSVLine(line);

                if (columns.length <= Math.max(nutsIdIndex, geometryIndex, intensityIndex)) {
                    console.warn(`Skipping invalid line ${i}: Not enough columns`);
                    continue;
                }

                const nutsId: string = columns[nutsIdIndex];
                // Skip whole-countries NUTS regions (these ones overlap the other fields)
                if (["FR", "IT", "DE", "NL"].indexOf(nutsId) !== -1) {
                    continue;
                }
                const wktGeometry: string = columns[geometryIndex];
                const intensity: number = parseFloat(columns[intensityIndex]);

                // Process the geometry data
                let coordinates: GeometryResult = null;
                try {
                    // Handle different WKT formats and try to recover from some errors
                    coordinates = this.parseWKTGeometry(wktGeometry, nutsId);

                    if (!coordinates) {
                        if (skipInvalid) {
                            this.skippedRegions.push(nutsId);
                            continue;
                        } else {
                            throw new Error("Failed to parse WKT geometry");
                        }
                    }
                } catch (geometryError) {
                    this.errorCount++;
                    console.warn(`Error parsing geometry for region ${nutsId}: ${(geometryError as Error).message}`);

                    if (skipInvalid) {
                        this.skippedRegions.push(nutsId);
                        continue;
                    } else {
                        throw geometryError;
                    }
                }

                // Validate coordinates before adding the feature
                if (this.validateCoordinates(coordinates)) {
                    features.push({
                        type: 'Feature',
                        properties: {
                            NUTS_ID: nutsId,
                            intensity: isNaN(intensity) ? null : intensity
                        },
                        geometry: {
                            type: 'coordinates' in coordinates ? coordinates.type : 'Polygon',
                            coordinates: 'coordinates' in coordinates ? coordinates.coordinates : coordinates
                        }
                    });
                    this.processedCount++;
                } else {
                    console.warn(`Skipping region ${nutsId} due to invalid coordinates`);
                    this.skippedRegions.push(nutsId);
                }
            } catch (err) {
                this.errorCount++;
                console.warn(`Error processing line ${i}: ${(err as Error).message}`);
            }
        }

        console.log(`Successfully processed ${this.processedCount} NUTS regions`);
        console.log(`Encountered ${this.errorCount} errors during processing`);
        console.log(`Skipped ${this.skippedRegions.length} regions due to invalid geometries`);

        if (this.skippedRegions.length > 0) {
            console.log(`First few skipped regions: ${this.skippedRegions.slice(0, 5).join(', ')}${this.skippedRegions.length > 5 ? '...' : ''}`);
        }

        this.nutsData = {
            type: 'FeatureCollection',
            features: features
        };

        return this.nutsData;
    }

    /**
     * Parse a CSV line respecting quoted values
     * @param {string} line - CSV line
     * @returns {string[]} - Array of column values
     */
    private parseCSVLine(line: string): string[] {
        const result: string[] = [];
        let current: string = '';
        let inQuotes: boolean = false;
        let escapeNext: boolean = false;

        for (let i = 0; i < line.length; i++) {
            const char: string = line[i];

            if (escapeNext) {
                current += char;
                escapeNext = false;
                continue;
            }

            if (char === '\\') {
                escapeNext = true;
                continue;
            }

            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }

        // Add the last column
        result.push(current);

        return result;
    }

    /**
     * Main WKT geometry parser that tries multiple formats
     * @param {string} wkt - WKT geometry string
     * @param {string} nutsId - NUTS region ID (for logging)
     * @returns {GeometryResult} - GeoJSON coordinates or null if parsing failed
     */
    private parseWKTGeometry(wkt: string, nutsId: string): GeometryResult {
        if (!wkt || typeof wkt !== 'string') {
            console.warn(`Invalid WKT string for ${nutsId}: ${wkt}`);
            return null;
        }

        // Clean up and normalize the WKT string
        const cleanWkt: string = wkt.trim().replace(/\s+/g, ' ');

        // Try to determine the geometry type
        const upperWkt: string = cleanWkt.toUpperCase();

        try {
            if (upperWkt.startsWith('POLYGON')) {
                return this.parseWKTPolygon(cleanWkt, nutsId);
            } else if (upperWkt.startsWith('MULTIPOLYGON')) {
                return this.parseWKTMultiPolygon(cleanWkt, nutsId);
            } else {
                console.warn(`Unsupported WKT format for ${nutsId}: ${cleanWkt.substring(0, 20)}...`);
                return null;
            }
        } catch (error) {
            // If standard parsing fails, try the recovery methods
            console.warn(`Standard parsing failed for ${nutsId}, trying recovery methods: ${(error as Error).message}`);

            try {
                return this.recoverWKTGeometry(cleanWkt, nutsId);
            } catch (recoveryError) {
                console.error(`Recovery failed for ${nutsId}: ${(recoveryError as Error).message}`);
                return null;
            }
        }
    }

    /**
     * Recovery method for problematic WKT geometries
     * @param {string} wkt - WKT geometry string
     * @param {string} nutsId - NUTS region ID (for logging)
     * @returns {Polygon} - GeoJSON coordinates or null if recovery failed
     */
    private recoverWKTGeometry(wkt: string, nutsId: string): Polygon {
        // Try to extract any coordinate pairs we can find
        const coordRegex = /(-?\d+\.?\d*)\s+(-?\d+\.?\d*)/g;
        const matches = [...wkt.matchAll(coordRegex)];

        if (matches.length < 4) {
            throw new Error(`Not enough valid coordinate pairs found: ${matches.length}`);
        }

        // Convert matches to coordinate pairs
        const coordinates: Coordinate[] = matches.map(match => {
            const x = parseFloat(match[1]);
            const y = parseFloat(match[2]);

            // Quick validation of coordinates
            if (isNaN(x) || isNaN(y) || Math.abs(y) > 90 || Math.abs(x) > 180) {
                throw new Error(`Invalid coordinate values: ${match[0]}`);
            }

            return [x, y];
        });

        // Ensure the polygon is closed
        const firstPoint = coordinates[0];
        const lastPoint = coordinates[coordinates.length - 1];

        if (firstPoint[0] !== lastPoint[0] || firstPoint[1] !== lastPoint[1]) {
            coordinates.push([...firstPoint]); // Close the ring
        }

        console.log(`Recovered ${coordinates.length} points for ${nutsId} using regex method`);

        return [coordinates]; // Return as a GeoJSON polygon ring
    }

    /**
     * Parse WKT polygon string to GeoJSON coordinates
     * @param {string} wkt - WKT polygon string
     * @param {string} nutsId - NUTS region ID (for logging)
     * @returns {Polygon} - GeoJSON coordinates array
     */
    private parseWKTPolygon(wkt: string, nutsId: string): Polygon {
        try {
            // Extract coordinates part - anything between the outermost parentheses
            const coordsMatch = wkt.match(/\(\s*\((.*)\)\s*\)/);
            if (!coordsMatch || !coordsMatch[1]) {
                throw new Error('Invalid POLYGON format');
            }

            const coordsText = coordsMatch[1];

            // Split by comma and parse each coordinate pair
            const ring: Coordinate[] = coordsText.split(',').map(pair => {
                const trimmedPair = pair.trim();
                const coords = trimmedPair.split(' ');

                // We need at least two values for x and y
                if (coords.length < 2) {
                    throw new Error(`Invalid coordinate pair: ${trimmedPair}`);
                }

                const x = parseFloat(coords[0]);
                const y = parseFloat(coords[1]);

                // Check for valid numbers
                if (isNaN(x) || isNaN(y)) {
                    throw new Error(`Invalid coordinate values: ${trimmedPair}`);
                }

                // Check if coordinates are within valid range for lat/lng
                if (Math.abs(y) > 90 || Math.abs(x) > 180) {
                    throw new Error(`Coordinate values out of range: ${x}, ${y}`);
                }

                // GeoJSON uses [longitude, latitude] order
                return [x, y] as Coordinate;
            });

            // GeoJSON polygons must have at least 4 points with the last point equal to the first
            if (ring.length < 4) {
                throw new Error(`Polygon must have at least 4 points, got ${ring.length}`);
            }

            // Ensure the polygon is closed (first point equals last point)
            const firstPoint = ring[0];
            const lastPoint = ring[ring.length - 1];

            if (firstPoint[0] !== lastPoint[0] || firstPoint[1] !== lastPoint[1]) {
                ring.push([...firstPoint]); // Close the ring by adding the first point at the end
            }

            // Return as an array of rings (for GeoJSON, even a simple polygon needs to be in this format)
            return [ring];
        } catch (error) {
            console.error(`Error parsing WKT polygon for ${nutsId}:`, error);
            throw error;
        }
    }

    /**
     * Parse WKT MultiPolygon string to GeoJSON coordinates
     * @param {string} wkt - WKT multipolygon string
     * @param {string} nutsId - NUTS region ID (for logging)
     * @returns {Object} - GeoJSON type and coordinates
     */
    private parseWKTMultiPolygon(wkt: string, nutsId: string): { type: 'MultiPolygon'; coordinates: MultiPolygon } {
        try {
            // Extract the content between the outermost parentheses
            const outerMatch = wkt.match(/MULTIPOLYGON\s*\(\s*(.*)\s*\)/i);
            if (!outerMatch || !outerMatch[1]) {
                throw new Error('Invalid MULTIPOLYGON format');
            }

            // MultiPolygon is a collection of Polygons
            const multiContent = outerMatch[1];

            // Split the individual polygons - this is tricky, need to match balanced parentheses
            const polygons = this.extractPolygons(multiContent);

            if (polygons.length === 0) {
                throw new Error('No valid polygons found in MultiPolygon');
            }

            // Parse each polygon
            const parsedPolygons: Ring[] = polygons.map(polygon => {
                // Create a temporary POLYGON WKT string and parse it
                const polygonWkt = `POLYGON ${polygon}`;
                const coords = this.parseWKTPolygon(polygonWkt, `${nutsId}[multi]`);
                return coords ? coords[0] : null;
            }).filter((poly): poly is Ring => poly !== null);

            if (parsedPolygons.length === 0) {
                throw new Error('No valid polygons could be parsed');
            }

            return {
                type: 'MultiPolygon',
                coordinates: parsedPolygons.map(poly => [poly]) // MultiPolygon structure: [[polygon1], [polygon2], ...]
            };
        } catch (error) {
            console.error(`Error parsing WKT MultiPolygon for ${nutsId}:`, error);
            throw error;
        }
    }

    /**
     * Helper method to extract individual polygons from MultiPolygon WKT
     * @param {string} content - MultiPolygon content
     * @returns {string[]} - Array of polygon WKT strings
     */
    private extractPolygons(content: string): string[] {
        const polygons: string[] = [];
        let depth = 0;
        let start = 0;
        let inPolygon = false;

        for (let i = 0; i < content.length; i++) {
            const char = content[i];

            if (char === '(') {
                if (depth === 0) {
                    start = i;
                    inPolygon = true;
                }
                depth++;
            } else if (char === ')') {
                depth--;
                if (depth === 0 && inPolygon) {
                    polygons.push(content.substring(start, i + 1));
                    inPolygon = false;
                }
            }
        }

        return polygons;
    }

    /**
     * Validate coordinates to ensure they are all valid numbers and form proper geometries
     * @param {GeometryResult} geometryData - GeoJSON coordinates array or geometry object
     * @returns {boolean} - Whether coordinates are valid
     */
    private validateCoordinates(geometryData: GeometryResult): boolean {
        if (!geometryData) return false;

        // If we have a geometry object with type and coordinates
        const coordinates = 'coordinates' in geometryData ? geometryData.coordinates : geometryData;
        const geometryType = 'type' in geometryData ? geometryData.type : 'Polygon';

        if (!Array.isArray(coordinates) || coordinates.length === 0) {
            return false;
        }

        try {
            if (geometryType === 'Polygon') {
                // For each ring in the polygon
                for (const ring of coordinates as Ring[]) {
                    if (!this.validateRing(ring)) return false;
                }
            } else if (geometryType === 'MultiPolygon') {
                // For each polygon in the multipolygon
                for (const polygon of coordinates as Polygon[]) {
                    if (!Array.isArray(polygon)) return false;

                    // For each ring in this polygon
                    for (const ring of polygon) {
                        if (!this.validateRing(ring)) return false;
                    }
                }
            } else {
                console.warn(`Unsupported geometry type: ${geometryType}`);
                return false;
            }

            return true;
        } catch (error) {
            console.error('Error validating coordinates:', error);
            return false;
        }
    }

    /**
     * Validate a single ring of coordinates
     * @param {Ring} ring - Ring of coordinates
     * @returns {boolean} - Whether the ring is valid
     */
    private validateRing(ring: Ring): boolean {
        if (!Array.isArray(ring) || ring.length < 4) {
            return false;
        }

        // Check each point in the ring
        for (const point of ring) {
            if (!Array.isArray(point) || point.length < 2) {
                return false;
            }

            const [x, y] = point;

            // Check if x and y are valid numbers
            if (typeof x !== 'number' || isNaN(x) ||
                typeof y !== 'number' || isNaN(y)) {
                return false;
            }

            // Check if coordinates are within valid range for lat/lng
            if (Math.abs(y) > 90 || Math.abs(x) > 180) {
                return false;
            }
        }

        // Check if the ring is closed (first point equals last point)
        const firstPoint = ring[0];
        const lastPoint = ring[ring.length - 1];

        return firstPoint[0] === lastPoint[0] && firstPoint[1] === lastPoint[1];
    }

    /**
     * Get the GeoJSON data
     * @returns {GeoJSONFeatureCollection | null} - GeoJSON object with NUTS regions
     */
    getGeoJSON(): GeoJSONFeatureCollection | null {
        return this.nutsData;
    }

    /**
     * Get processing statistics
     * @returns {Object} - Statistics about the processing
     */
    getStats(): { processed: number; errors: number; skipped: number; skippedRegions: string[] } {
        return {
            processed: this.processedCount,
            errors: this.errorCount,
            skipped: this.skippedRegions.length,
            skippedRegions: this.skippedRegions
        };
    }
}

export default NutsMapperV5;