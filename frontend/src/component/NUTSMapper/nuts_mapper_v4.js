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
      
      // Convert WKT polygon to GeoJSON coordinates
      const coordinates = this.parseWKTPolygon(wktGeometry);
      
      if (coordinates) {
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
    // Basic WKT POLYGON parsing
    // Example: POLYGON ((x1 y1, x2 y2, ...))
    try {
      // Extract coordinates part
      const match = wkt.match(/POLYGON\s*\(\((.*)\)\)/i);
      if (!match || !match[1]) return null;
      
      const coordsText = match[1];
      
      // Split into coordinate pairs and parse
      const rings = coordsText.split('),(').map(ring => {
        return ring.split(',').map(pair => {
          const [x, y] = pair.trim().split(/\s+/);
          return [parseFloat(x), parseFloat(y)];
        });
      });
      
      return rings;
    } catch (error) {
      console.error('Error parsing WKT polygon:', error);
      return null;
    }
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
