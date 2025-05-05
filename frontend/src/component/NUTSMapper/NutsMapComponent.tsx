import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import NutsMapper from './nuts_mapper';
import 'leaflet/dist/leaflet.css';
import {getReadyCSVData} from "../utils.js";

export default ({ nutsLevel = '3', nutsDataUrl }) => {
  const [enrichedGeoJSON, setEnrichedGeoJSON] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // fix this points stuff.
  useEffect(() => {
    const runAsync = async () => {
      const processData = async (points) => {
        try {
          setLoading(true);

          const mapper = new NutsMapper();
          await mapper.loadNutsData(nutsDataUrl, nutsLevel);

          const regionIntensities = mapper.mapPointsToRegions(points);
          const medianIntensities = mapper.calculateMedianIntensities(regionIntensities);
          console.log('Median Intesnitiies: ', medianIntensities);
          const geoJSON = mapper.getEnrichedGeoJSON(medianIntensities);
          console.log("ENriched geo", geoJSON);
          setEnrichedGeoJSON(geoJSON);
          setLoading(false);
        } catch (err) {
          console.error('Error processing NUTS data:', err);
          setError(err.message);
          setLoading(false);
        }
      };

      if (nutsDataUrl) {
        const points = await getReadyCSVData(true);
        processData(points);
      }
    }
    runAsync();
  }, [nutsLevel, nutsDataUrl]);

  // Function to determine color based on intensity
  const getColor = (intensity) => {
    if (intensity === null) return '#CCCCCC'; // Gray for no data

    return intensity > 80 ? '#800026' :
           intensity > 60 ? '#BD0026' :
           intensity > 40 ? '#E31A1C' :
           intensity > 20 ? '#FC4E2A' :
           intensity > 10 ? '#FD8D3C' :
           intensity > 5 ? '#FEB24C' :
           intensity > 0 ? '#FED976' : '#FFEDA0';
  };

  // Style function for GeoJSON
  const style = (feature) => {
    return {
      fillColor: getColor(feature.properties.intensity),
      weight: 1,
      opacity: 1,
      color: 'white',
      dashArray: '3',
      fillOpacity: 0.7
    };
  };

  // Function to handle mouseover events
  const highlightFeature = (e) => {
    const layer = e.target;
    
    layer.setStyle({
      weight: 3,
      color: '#666',
      dashArray: '',
      fillOpacity: 0.7
    });
    
    layer.bringToFront();
  };

  // Function to reset highlight on mouseout
  const resetHighlight = (e) => {
    if (enrichedGeoJSON) {
      e.target.setStyle(style(e.target.feature));
    }
  };

  // Function to add interactivity to each feature
  const onEachFeature = (feature, layer) => {
    const nutsId = feature.properties.NUTS_ID;
    const intensity = feature.properties.intensity;
    const name = feature.properties.NAME_LATN || feature.properties.NAME || nutsId;
    
    layer.bindPopup(`
      <strong>${name}</strong><br/>
      NUTS ID: ${nutsId}<br/>
      Intensity: ${intensity !== null ? intensity.toFixed(2) : 'No data'}
    `);
    
    layer.on({
      mouseover: highlightFeature,
      mouseout: resetHighlight
    });
  };

  if (loading) {
    return <div>Loading NUTS data...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div style={{ height: '600px', width: '100%' }}>
      <MapContainer 
        center={[50, 10]} 
        zoom={4} 
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {enrichedGeoJSON && (
          <GeoJSON 
            data={enrichedGeoJSON} 
            style={style}
            onEachFeature={onEachFeature}
          />
        )}
      </MapContainer>
      
      <div style={{ marginTop: '10px' }}>
        <h3>Intensity Legend</h3>
        <div style={{ display: 'flex', flexDirection: 'row' }}>
          {[-5, 0, 5, 10, 20, 40, 60, 80].map((threshold, i) => (
            <div key={i} style={{ 
              backgroundColor: getColor(threshold + 1), 
              width: '50px', 
              height: '20px',
              textAlign: 'center',
              color: i > 3 ? 'white' : 'black',
              fontSize: '12px'
            }}>
              {threshold}+
            </div>
          ))}
          <div style={{ 
            backgroundColor: '#CCCCCC', 
            width: '50px', 
            height: '20px',
            textAlign: 'center',
            fontSize: '12px'
          }}>
            None
          </div>
        </div>
      </div>
    </div>
  );
};