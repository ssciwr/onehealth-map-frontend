import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import NutsMapperV4 from './nuts_mapper_v4';
import 'leaflet/dist/leaflet.css';

export default ({ nutsLevel = '2' }) => {
  const [nutsGeoJSON, setNutsGeoJSON] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchNutsData = async () => {
      try {
        setLoading(true);
        
        // Fetch pre-processed NUTS data from our API endpoint
        const response = await fetch(`/data/nutsRegions.csv`);
        console.log("Fetching NUTS data from CSV file");
        
        if (!response.ok) {
          throw new Error(`Failed to fetch NUTS data: ${response.status} ${response.statusText}`);
        }
        
        const csvData = await response.text();
        
        // Parse the CSV data into GeoJSON using our simplified mapper
        const mapper = new NutsMapperV4();
        const geoJSON = mapper.parseNutsCSV(csvData);
        
        console.log(`Loaded ${geoJSON.features.length} NUTS regions`);
        
        // Sample the first feature to verify data
        if (geoJSON.features.length > 0) {
          const sample = geoJSON.features[0];
          console.log('Sample NUTS region:', {
            id: sample.properties.NUTS_ID,
            intensity: sample.properties.intensity,
            coordinates: 'Available'
          });
        }
        
        setNutsGeoJSON(geoJSON);
        setLoading(false);
      } catch (err) {
        console.error('Error loading NUTS data:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    fetchNutsData();
  }, [nutsLevel]);

  // Function to determine color based on intensity
  const getColor = (intensity) => {
    if (intensity === null || intensity === undefined) return '#CCCCCC'; // Gray for no data

    return intensity > 9 ? '#800026' :
           intensity > 8 ? '#BD0026' :
           intensity > 7 ? '#E31A1C' :
           intensity > 6 ? '#FC4E2A' :
           intensity > 5 ? '#FD8D3C' :
           intensity > 4 ? '#FEB24C' :
           intensity > 3 ? '#FED976' : '#FFEDA0';
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
    if (nutsGeoJSON) {
      e.target.setStyle(style(e.target.feature));
    }
  };

  // Function to add interactivity to each feature
  const onEachFeature = (feature, layer) => {
    const nutsId = feature.properties.NUTS_ID;
    const intensity = feature.properties.intensity;
    
    layer.bindPopup(`
      <strong>NUTS ID: ${nutsId}</strong><br/>
      Temperature: ${intensity !== null && intensity !== undefined ? intensity.toFixed(2) + '°C' : 'No data'}
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
        {nutsGeoJSON && (
          <GeoJSON 
            data={nutsGeoJSON} 
            style={style}
            onEachFeature={onEachFeature}
          />
        )}
      </MapContainer>
      
      <div style={{ marginTop: '10px' }}>
        <h3>Temperature Legend (°C)</h3>
        <div style={{ display: 'flex', flexDirection: 'row' }}>
          {[3, 4, 5, 6, 7, 8, 9].map((threshold, i) => (
            <div key={i} style={{ 
              backgroundColor: getColor(threshold + 0.1), 
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
