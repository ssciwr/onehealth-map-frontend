/**
 * Simplified NUTS Mapper that works with pre-processed NUTS data
 */
class NutsMapperV4 {
  constructor() {
    this.nutsData = null;
  }

  /**
   * Parse CSV data containing NUTS regions with geometry and intensity values
   * @param {string} csvData - CSV string with NUTS_ID, geometry (WKT), and intensity columns
   * @returns {Object} - GeoJSON object with NUTS regions
   */
  parseNutsCSV(csvData) {
    if (!csvData) {
      throw new Error('No CSV data provided');
    }

    // Split CSV into lines
    const lines = csvData.trim().split('\n');

    // Parse header to find column indices
    const header = lines[0].split(',');
    const nutsIdIndex = header.indexOf('NUTS_ID');
    const geometryIndex = header.indexOf('geometry');
    const intensityIndex = header.indexOf('t2m');

    if (nutsIdIndex === -1 || geometryIndex === -1 || intensityIndex === -1) {
      throw new Error('CSV must contain NUTS_ID, geometry, and t2m columns');
    }

    // Create GeoJSON structure
    const features = [];

    // Process each line (skip header)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue; // Skip empty lines

      // Split by comma, but respect quoted values
      const columns = this.parseCSVLine(line);

      if (columns.length <= Math.max(nutsIdIndex, geometryIndex, intensityIndex)) {
        console.warn(`Skipping invalid line: ${line}`);
        continue;
      }

      const nutsId = columns[nutsIdIndex];
      const wktGeometry = columns[geometryIndex];
      const intensity = parseFloat(columns[intensityIndex]);

      try {
        // Convert WKT polygon to GeoJSON coordinates
        const coordinates = this.parseWKTPolygon(wktGeometry);

        if (coordinates) {
          // Validate coordinates before adding the feature
          if (this.validateCoordinates(coordinates)) {
            features.push({
              type: 'Feature',
              properties: {
                NUTS_ID: nutsId,
                intensity: isNaN(intensity) ? null : intensity
              },
              geometry: {
                type: 'Polygon',
                coordinates: coordinates
              }
            });
          } else {
            console.warn(`Skipping region ${nutsId} due to invalid coordinates`);
          }
        }
      } catch (err) {
        console.warn(`Error processing region ${nutsId}: ${err.message}`);
      }
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
   * @returns {Array} - Array of column values
   */
  parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"' && (i === 0 || line[i-1] !== '\\')) {
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
   * Parse WKT polygon string to GeoJSON coordinates
   * @param {string} wkt - WKT polygon string
   * @returns {Array} - GeoJSON coordinates array
   */
  parseWKTPolygon(wkt) {
    if (!wkt || typeof wkt !== 'string') {
      throw new Error('Invalid WKT string');
    }

    try {
      // Clean up and normalize the WKT string
      const cleanWkt = wkt.trim().replace(/\s+/g, ' ');

      // Check if it's a POLYGON
      if (!cleanWkt.toUpperCase().startsWith('POLYGON')) {
        throw new Error('Only POLYGON WKT format is supported');
      }

      // Extract coordinates part - anything between the outermost parentheses
      const coordsMatch = cleanWkt.match(/\(\s*\((.*)\)\s*\)/);
      if (!coordsMatch || !coordsMatch[1]) {
        throw new Error('Invalid POLYGON format');
      }

      const coordsText = coordsMatch[1];

      // For simple polygons (no holes), we have one ring of coordinates
      // Split by comma and parse each coordinate pair
      const ring = coordsText.split(',').map(pair => {
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

        // GeoJSON uses [longitude, latitude] order
        return [x, y];
      });

      // GeoJSON polygons must have at least 4 points with the last point equal to the first
      if (ring.length < 4) {
        throw new Error('Polygon must have at least 4 points');
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
      console.error('Error parsing WKT polygon:', error);
      return null;
    }
  }

  /**
   * Validate coordinates to ensure they are all valid numbers
   * @param {Array} coordinates - GeoJSON coordinates array
   * @returns {boolean} - Whether coordinates are valid
   */
  validateCoordinates(coordinates) {
    if (!Array.isArray(coordinates) || coordinates.length === 0) {
      return false;
    }

    // For each ring in the polygon
    for (const ring of coordinates) {
      if (!Array.isArray(ring) || ring.length < 4) {
        return false;
      }

      // For each point in the ring
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
    }

    return true;
  }

  /**
   * Get the GeoJSON data
   * @returns {Object} - GeoJSON object with NUTS regions
   */
  getGeoJSON() {
    return this.nutsData;
  }
}

export default NutsMapperV4;