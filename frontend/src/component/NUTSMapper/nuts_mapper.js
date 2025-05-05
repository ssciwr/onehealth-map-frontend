import axios from 'axios';
import * as turf from '@turf/turf';

/**
 * Class to handle mapping points to NUTS regions
 */
class NutsMapper {
  constructor() {
    this.nutsData = null;
    this.nutsLevel = null;
  }

  /**
   * Load NUTS GeoJSON data from a URL or local file
   * @param {string} source - URL or path to GeoJSON file
   * @param {string} level - NUTS level ('2' or '3')
   * @returns {Promise<Object>} - The loaded GeoJSON data
   */
  async loadNutsData(source, level) {
    try {
      let data;
      if (source.startsWith('http')) {
        const response = await axios.get(source);
        data = response.data;
      } else {
        // Assuming you're using webpack or a similar bundler that can import JSON
        data = require(source);
      }
      
      // Filter features by NUTS level if specified
      if (level && data.features) {
        data = {
          ...data,
          features: data.features.filter(feature => 
            feature.properties.LEVL_CODE === parseInt(level) ||
            feature.properties.LEVL_CODE === level
          )
        };
      }
      
      console.log(`Loaded ${data.features.length} NUTS regions at level ${level}`);
      console.log(`Coordinate system: ${data.crs ? JSON.stringify(data.crs) : 'Not specified (assuming WGS84)'}`);
      
      this.nutsData = data;
      this.nutsLevel = level;
      return data;
    } catch (error) {
      console.error('Error loading NUTS data:', error);
      throw error;
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

    // Check if we need to transform coordinates based on CRS
    let transformedPoint = [...point];
    
    // If the NUTS data is in EPSG:3857 (Web Mercator), transform the point
    if (this.nutsData.crs && 
        this.nutsData.crs.properties && 
        this.nutsData.crs.properties.name && 
        this.nutsData.crs.properties.name.includes('3857')) {
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

    const pointFeature = turf.point(transformedPoint);
    
    for (const feature of this.nutsData.features) {
      try {
        if (turf.booleanPointInPolygon(pointFeature, feature.geometry)) {
          return feature.properties.NUTS_ID;
        }
      } catch (error) {
        console.warn(`Error checking point in polygon for feature ${feature.properties.NUTS_ID}:`, error);
        continue;
      }
    }
    
    return null;
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

    // Assign points to regions
    points.forEach(point => {
      const region = this.findRegionForPoint([point.lng, point.lat]);
      if (region) {
        regionIntensities[region].push(point.intensity);
      }
    });
    
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
      if (intensities.length === 0) {
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
      feature.properties.intensity = medianIntensities[nutsId] || 0;
    });
    
    return enrichedGeoJSON;
  }
  convertCoordinates = (geoJSON) => {
    if (!geoJSON || !geoJSON.features) {
      console.error('Invalid GeoJSON for coordinate conversion');
      return geoJSON;
    }
    console.log("Converting coordinates...")

    // Clone the GeoJSON to avoid modifying the original
    const convertedGeoJSON = JSON.parse(JSON.stringify(geoJSON));

    // Function to convert a single coordinate pair
    const convertCoordinate = (coord) => {
      // These conversion factors need to be adjusted based on your specific data
      // You might need to analyze your data and adjust these values
      const longitudeFactor = 0.00001; // Example conversion factor
      const latitudeFactor =  0.00001;  // Example conversion factor

      // Standard longitude range: -180 to 180
      // Standard latitude range: -90 to 90
      return [
        parseFloat((coord[0] * longitudeFactor).toFixed(6)),
        parseFloat((coord[1] * latitudeFactor).toFixed(6))
      ];
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
        console.log('Updated coordiantes now to: ', feature.geometry.coordinates);
      }
    });

    return convertedGeoJSON;
  }
}



export default NutsMapper;
