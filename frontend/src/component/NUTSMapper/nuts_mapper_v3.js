import axios from 'axios';
import * as turf from '@turf/turf';
import * as topojson from 'topojson-client';

/**
 * Class to handle mapping points to NUTS regions
 */
class NutsMapper {
    constructor() {
        this.nutsData = null;
        this.nutsLevel = null;
        this.coordinateSystem = null;
    }

    /**
     * Load NUTS GeoJSON data from a URL or local file
     * @param {string} source - URL or path to GeoJSON file
     * @param {string} level - NUTS level ('0', '1', '2' or '3')
     * @returns {Promise<Object>} - The loaded GeoJSON data
     */
    async loadNutsData(source, level) {
        try {
            let data;

            // Determine the coordinate system from the URL
            if (source.includes('3035')) {
                this.coordinateSystem = 'EPSG:3035'; // European LAEA
            } else if (source.includes('3857')) {
                this.coordinateSystem = 'EPSG:3857'; // Web Mercator
            } else if (source.includes('4326')) {
                this.coordinateSystem = 'EPSG:4326'; // WGS84
            } else {
                this.coordinateSystem = 'Unknown';
            }

            console.log(`Loading NUTS data with coordinate system: ${this.coordinateSystem}`);

            if (source.startsWith('http')) {
                const response = await axios.get(source);
                data = response.data;
            } else {
                // Assuming you're using webpack or a similar bundler that can import JSON
                data = require(source);
            }

            // Handle both TopoJSON and GeoJSON formats
            if (data.type === 'Topology' && data.objects) {
                // Process TopoJSON (convert to GeoJSON)
                const objectName = Object.keys(data.objects)[0];
                if (!objectName) {
                    throw new Error('Invalid TopoJSON: No objects found');
                }

                // Check if topojson-client is available
                if (typeof topojson !== 'undefined' && topojson.feature) {
                    // Convert TopoJSON to GeoJSON using topojson-client
                    data = topojson.feature(data, data.objects[objectName]);
                } else {
                    console.warn('topojson-client not available. TopoJSON should be converted to GeoJSON on the server.');
                    // Fallback if topojson-client is not available
                    throw new Error('Unable to process TopoJSON: topojson-client library not available');
                }
            }

            // Filter features by NUTS level if specified
            if (level && data.features) {
                let levelCode;
                try {
                    levelCode = parseInt(level);
                } catch (e) {
                    levelCode = level;
                }

                data = {
                    ...data,
                    features: data.features.filter(feature => {
                        // Support both integer and string level codes
                        const featureLevel = feature.properties.LEVL_CODE;
                        return featureLevel === levelCode ||
                            featureLevel === level ||
                            feature.properties.NUTS_LEVEL === levelCode ||
                            feature.properties.NUTS_LEVEL === level;
                    })
                };
            }

            console.log(`Loaded ${data.features.length} NUTS regions at level ${level}`);

            this.nutsData = data;
            this.nutsLevel = level;
            return data;
        } catch (error) {
            console.error('Error loading NUTS data:', error);
            throw new Error(`Failed to load NUTS data: ${error.message}`);
        }
    }

    /**
     * Determine which NUTS region a point belongs to
     * @param {Array} point - [longitude, latitude] coordinates in WGS84 (EPSG:4326)
     * @returns {string|null} - NUTS code of the region containing the point, or null if not found
     */
    findRegionForPoint(point) {
        if (!this.nutsData) {
            throw new Error('NUTS data not loaded. Call loadNutsData first.');
        }

        // Check if we need to transform coordinates based on coordinate system
        let transformedPoint = [...point];

        // Transform point coordinates based on the coordinate system
        if (this.coordinateSystem === 'EPSG:3035') {
            // Convert WGS84 to European LAEA (EPSG:3035)
            // Note: This is a simplified approximation. For precise transformation,
            // a proper projection library like proj4js would be needed
            console.warn('Approximating WGS84 to LAEA transformation');
            // This is a very rough approximation and should be replaced with proj4js
            const lon = point[0];
            const lat = point[1];

            // Simple linear approximation (not accurate, for demonstration only)
            const x = 4321000 + lon * 85000;
            const y = 3210000 + lat * 110000;

            transformedPoint = [x, y];
        } else if (this.coordinateSystem === 'EPSG:3857') {
            // Convert WGS84 (EPSG:4326) to Web Mercator (EPSG:3857)
            // Formula from: https://wiki.openstreetmap.org/wiki/Mercator
            const lon = point[0];
            const lat = point[1];

            // Convert longitude/latitude to Web Mercator
            const x = lon * 20037508.34 / 180;
            let y = Math.log(Math.tan((90 + lat) * Math.PI / 360)) / (Math.PI / 180);
            y = y * 20037508.34 / 180;

            transformedPoint = [x, y];
        }
        // For EPSG:4326, no transformation is needed

        const pointFeature = turf.point(transformedPoint);

        // First try to find exact match
        for (const feature of this.nutsData.features) {
            try {
                if (turf.booleanPointInPolygon(pointFeature, feature.geometry)) {
                    return feature.properties.NUTS_ID;
                }
            } catch (error) {
                continue;
            }
        }

        // If no exact match found, try to find the closest region within a reasonable distance
        // This helps with points that fall slightly outside polygon boundaries due to precision issues
        try {
            const MAX_DISTANCE = 0.01; // Maximum distance in degrees (for WGS84) or appropriate units
            let closestRegion = null;
            let minDistance = Infinity;

            for (const feature of this.nutsData.features) {
                try {
                    // Calculate distance to polygon boundary
                    const distance = turf.pointToPolygon(pointFeature, feature.geometry);
                    if (distance < minDistance && distance < MAX_DISTANCE) {
                        minDistance = distance;
                        closestRegion = feature.properties.NUTS_ID;
                    }
                } catch (error) {
                    continue;
                }
            }

            return closestRegion;
        } catch (error) {
            // If the distance calculation fails, return null
            return null;
        }
    }

    /**
     * Map an array of points with intensity values to NUTS regions
     * @param {Array} points - Array of objects with lat, lng, and intensity properties
     * @returns {Object} - Object mapping NUTS codes to arrays of intensity values
     */
    mapPointsToRegions(points) {
        if (!this.nutsData) {
            throw new Error('NUTS data not loaded. Call loadNutsData first.');
        }

        const regionIntensities = {};

        // Initialize all regions with empty arrays
        this.nutsData.features.forEach(feature => {
            regionIntensities[feature.properties.NUTS_ID] = [];
        });

        let mappedCount = 0;
        let unmappedCount = 0;

        // Assign points to regions
        points.forEach(point => {
            if (!point || typeof point.lat !== 'number' || typeof point.lng !== 'number') {
                console.warn('Invalid point data:', point);
                unmappedCount++;
                return;
            }

            const region = this.findRegionForPoint([point.lng, point.lat]);
            if (region && regionIntensities[region]) {
                regionIntensities[region].push(point.intensity);
                mappedCount++;
            } else {
                unmappedCount++;
            }
        });

        console.log(`Mapped ${mappedCount} points to regions. ${unmappedCount} points could not be mapped.`);

        return regionIntensities;
    }

    /**
     * Calculate median intensity for each region
     * @param {Object} regionIntensities - Object mapping NUTS codes to arrays of intensity values
     * @returns {Object} - Object mapping NUTS codes to median intensity values
     */
    calculateMedianIntensities(regionIntensities) {
        const medians = {};

        Object.entries(regionIntensities).forEach(([region, intensities]) => {
            if (!intensities || intensities.length === 0) {
                medians[region] = null;
            } else {
                // Sort intensities to calculate median
                const sorted = [...intensities].sort((a, b) => a - b);
                const mid = Math.floor(sorted.length / 2);

                if (sorted.length % 2 === 0) {
                    medians[region] = (sorted[mid - 1] + sorted[mid]) / 2;
                } else {
                    medians[region] = sorted[mid];
                }
            }
        });

        return medians;
    }

    /**
     * Get GeoJSON with median intensity values added to properties
     * @param {Object} medianIntensities - Object mapping NUTS codes to median intensity values
     * @returns {Object} - GeoJSON with intensity properties added
     */
    getEnrichedGeoJSON(medianIntensities) {
        if (!this.nutsData) {
            throw new Error('NUTS data not loaded. Call loadNutsData first.');
        }

        const enrichedGeoJSON = JSON.parse(JSON.stringify(this.nutsData));

        enrichedGeoJSON.features.forEach(feature => {
            const nutsId = feature.properties.NUTS_ID;
            feature.properties.intensity = medianIntensities[nutsId] !== undefined
                ? medianIntensities[nutsId]
                : null;
        });

        return enrichedGeoJSON;
    }

    /**
     * Convert coordinates from the current coordinate system to WGS84 (EPSG:4326)
     * for proper display in Leaflet maps
     * @param {Object} geoJSON - GeoJSON object with coordinates to convert
     * @returns {Object} - GeoJSON with coordinates in WGS84
     */
    convertCoordinates(geoJSON) {
        if (!geoJSON || !geoJSON.features) {
            console.error('Invalid GeoJSON for coordinate conversion');
            return geoJSON;
        }

        console.log(`Converting coordinates from ${this.coordinateSystem} to WGS84 (EPSG:4326)...`);

        // Clone the GeoJSON to avoid modifying the original
        const convertedGeoJSON = JSON.parse(JSON.stringify(geoJSON));

        // Set conversion factors based on the coordinate system
        let longitudeFactor, latitudeFactor;

        if (this.coordinateSystem === 'EPSG:3857') {
            // Web Mercator to WGS84
            longitudeFactor = 180 / 20037508.34;
            latitudeFactor = 1; // Special formula needed for latitude
        } else if (this.coordinateSystem === 'EPSG:3035') {
            // European LAEA to WGS84 (very simplified approximation)
            longitudeFactor = 1 / 85000;
            latitudeFactor = 1 / 110000;
        } else {
            // For EPSG:4326 or unknown systems, use minimal conversion
            longitudeFactor = 1;
            latitudeFactor = 1;
        }

        // Function to convert a single coordinate pair
        const convertCoordinate = (coord) => {
            if (!coord || coord.length < 2) return coord;

            if (this.coordinateSystem === 'EPSG:3857') {
                // Convert Web Mercator (EPSG:3857) to WGS84 (EPSG:4326)
                const x = coord[0];
                const y = coord[1];

                // Convert x/y to lon/lat
                const lon = (x * 180) / 20037508.34;
                let lat = (y * 180) / 20037508.34;
                lat = (180 / Math.PI) * (2 * Math.atan(Math.exp(lat * Math.PI / 180)) - Math.PI / 2);

                return [lon, lat];
            } else if (this.coordinateSystem === 'EPSG:3035') {
                // Convert European LAEA (EPSG:3035) to WGS84 (rough approximation)
                const x = coord[0];
                const y = coord[1];

                // Simplified conversion (this should be replaced with proj4js for accuracy)
                const lon = (x - 4321000) * longitudeFactor;
                const lat = (y - 3210000) * latitudeFactor;

                return [lon, lat];
            } else {
                // For EPSG:4326 or unknown, return with minor adjustments if needed
                return [
                    parseFloat((coord[0] * longitudeFactor).toFixed(6)),
                    parseFloat((coord[1] * latitudeFactor).toFixed(6))
                ];
            }
        };

        // Function to recursively process coordinates
        const processCoordinates = (coords) => {
            if (!coords) return coords;

            // Single coordinate pair
            if (coords.length === 2 && typeof coords[0] === 'number' && typeof coords[1] === 'number') {
                return convertCoordinate(coords);
            }

            // Array of coordinates or multi-dimensional structure
            return coords.map(c => processCoordinates(c));
        };

        // Process each feature's geometry
        convertedGeoJSON.features.forEach(feature => {
            if (feature.geometry && feature.geometry.coordinates) {
                feature.geometry.coordinates = processCoordinates(feature.geometry.coordinates);
            }
        });

        // Verify a sample of the converted coordinates
        if (convertedGeoJSON.features.length > 0) {
            const sampleFeature = convertedGeoJSON.features[0];
            if (sampleFeature.geometry &&
                sampleFeature.geometry.coordinates &&
                sampleFeature.geometry.coordinates.length > 0) {
                // Get a sample coordinate (different geometry types have different structures)
                let sampleCoord;
                if (sampleFeature.geometry.type === 'Polygon') {
                    sampleCoord = sampleFeature.geometry.coordinates[0][0];
                } else if (sampleFeature.geometry.type === 'MultiPolygon') {
                    sampleCoord = sampleFeature.geometry.coordinates[0][0][0];
                } else {
                    sampleCoord = sampleFeature.geometry.coordinates[0];
                }

                if (sampleCoord) {
                    console.log('Sample converted coordinate:', sampleCoord);
                    // Check if coordinates are in WGS84 range
                    if (Math.abs(sampleCoord[0]) > 180 || Math.abs(sampleCoord[1]) > 90) {
                        console.warn('Coordinates may not be properly converted to WGS84.');
                    }
                }
            }
        }

        return convertedGeoJSON;
    }
}

export default NutsMapper;