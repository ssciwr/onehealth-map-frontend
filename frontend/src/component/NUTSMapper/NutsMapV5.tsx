import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, GeoJSON, Tooltip } from 'react-leaflet';
import NutsMapperV5 from './nuts_mapper_v5';
import 'leaflet/dist/leaflet.css';

export default ({ nutsLevel = '2' }) => {
    const [nutsGeoJSON, setNutsGeoJSON] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [stats, setStats] = useState(null);
    const [debugMode, setDebugMode] = useState(false);

    useEffect(() => {
        const fetchNutsData = async () => {
            try {
                setLoading(true);
                setError(null);

                // Fetch pre-processed NUTS data from our API endpoint
                console.log("Fetching NUTS data from CSV file...");
                const response = await fetch(`/data/nutsRegions.csv`);

                if (!response.ok) {
                    throw new Error(`Failed to fetch NUTS data: ${response.status} ${response.statusText}`);
                }

                const csvData = await response.text();
                console.log("CSV data received, processing with improved mapper...");

                // Parse the CSV data into GeoJSON using our enhanced mapper
                const mapper = new NutsMapperV5();
                const geoJSON = mapper.parseNutsCSV(csvData);
                const processingStats = mapper.getStats();

                setStats(processingStats);
                console.log(`Successfully loaded ${geoJSON.features.length} NUTS regions`);
                console.log(`Processing stats:`, processingStats);

                // Sample the first feature to verify data
                if (geoJSON.features.length > 0) {
                    const sample = geoJSON.features[0];
                    console.log('Sample NUTS region:', {
                        id: sample.properties.NUTS_ID,
                        intensity: sample.properties.intensity,
                        geometryType: sample.geometry.type,
                        coordinates: sample.geometry.coordinates ? 'Available' : 'Missing'
                    });
                }

                if (geoJSON.features.length === 0) {
                    throw new Error('No valid regions were parsed from the CSV data');
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

        // Temperature color scale
        return intensity >= 14 ? '#800026' :  // Dark red
            intensity >= 12 ? '#BD0026' :
                intensity >= 10 ? '#E31A1C' :
                    intensity >= 8 ? '#FC4E2A' :
                        intensity >= 6 ? '#FD8D3C' :
                            intensity >= 4 ? '#FEB24C' :
                                intensity >= 2 ? '#FED976' :
                                    intensity >= 0 ? '#FFEDA0' :     // Neutral yellow/pale
                                        intensity >= -2 ? '#EFF3FF' :
                                            intensity >= -4 ? '#C6DBEF' :
                                                intensity >= -6 ? '#9ECAE1' :
                                                    intensity >= -8 ? '#6BAED6' :
                                                        intensity >= -10 ? '#4292C6' :
                                                            intensity >= -12 ? '#2171B5' :
                                                                intensity >= -14 ? '#08519C' : '#08306B';  // Dark blue
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
        const geometryType = feature.geometry.type;

        layer.bindPopup(`
      <strong>NUTS ID: ${nutsId}</strong><br/>
      Temperature: ${intensity !== null && intensity !== undefined ? intensity.toFixed(2) + '°C' : 'No data'}<br/>
      ${debugMode ? `Geometry Type: ${geometryType}` : ''}
    `);

        layer.on({
            mouseover: highlightFeature,
            mouseout: resetHighlight
        });
    };

    // Debug mode toggle handler
    const toggleDebugMode = () => {
        setDebugMode(prev => !prev);
    };

    if (loading) {
        return <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading NUTS data...</p>
        </div>;
    }

    if (error) {
        return (
            <div className="error-container">
                <div className="error-header">
                    <h3>Error Loading Map Data</h3>
                    <p className="error-message">{error}</p>
                </div>
                <div className="troubleshooting">
                    <h4>Troubleshooting Suggestions:</h4>
                    <ul>
                        <li>Check that your CSV file is correctly formatted with NUTS_ID, geometry, and t2m columns</li>
                        <li>Ensure WKT geometry data is valid</li>
                        <li>Verify the CSV file is accessible at the specified endpoint</li>
                        <li>Check the browser console for detailed error information</li>
                    </ul>
                </div>
            </div>
        );
    }

    return (
        <div className="nuts-map-container">
            <div className="map-controls">
                <label className="debug-toggle">
                    <input
                        type="checkbox"
                        checked={debugMode}
                        onChange={toggleDebugMode}
                    />
                    Debug Mode
                </label>

                {stats && (
                    <div className="stats-panel">
                        <h4>Processing Stats:</h4>
                        <p>Regions processed: {stats.processed}</p>
                        <p>Regions skipped: {stats.skipped}</p>
                        <p>Errors encountered: {stats.errors}</p>
                    </div>
                )}
            </div>

            <div className="map-wrapper">
                <MapContainer
                    className="nuts-map"
                    center={[50, 10]}
                    zoom={4}
                    style={{ height: '600px', width: '100%' }}
                >
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />
                    {nutsGeoJSON && nutsGeoJSON.features && nutsGeoJSON.features.length > 0 && (
                        <GeoJSON
                            data={nutsGeoJSON}
                            style={style}
                            onEachFeature={onEachFeature}
                        />
                    )}
                </MapContainer>
            </div>

            <div className="legend-container">
                <h3>Temperature Legend (°C)</h3>
                <div className="legend-scale">
                    {[-12, -8, -4, 0, 4, 8, 12].map((threshold, i) => (
                        <div key={i} className="legend-item">
                            <div
                                className="color-box"
                                style={{
                                    backgroundColor: getColor(threshold),
                                    color: threshold >= 8 || threshold <= -8 ? 'white' : 'black'
                                }}
                            >
                                {threshold}
                            </div>
                        </div>
                    ))}
                    <div className="legend-item">
                        <div
                            className="color-box"
                            style={{
                                backgroundColor: '#CCCCCC'
                            }}
                        >
                            N/A
                        </div>
                    </div>
                </div>
            </div>

            <style jsx>{`
          .nuts-map-container {
            font-family: Arial, sans-serif;
          }
          
          .map-controls {
            margin-bottom: 10px;
            display: flex;
            justify-content: space-between;
          }
          
          .debug-toggle {
            display: flex;
            align-items: center;
            gap: 5px;
          }
          
          .stats-panel {
            font-size: 0.9em;
            border: 1px solid #ddd;
            padding: 10px;
            background: #f9f9f9;
            border-radius: 4px;
          }
          
          .stats-panel h4 {
            margin-top: 0;
            margin-bottom: 5px;
          }
          
          .stats-panel p {
            margin: 5px 0;
          }
          
          .map-wrapper {
            border: 1px solid #ccc;
            border-radius: 4px;
            overflow: hidden;
          }
          
          .nuts-map {
            height: 600px;
            width: 100%;
          }
          
          .legend-container {
            margin-top: 15px;
          }
          
          .legend-scale {
            display: flex;
            flex-wrap: wrap;
            gap: 5px;
          }
          
          .legend-item {
            text-align: center;
          }
          
          .color-box {
            width: 50px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
          }
          
          .loading-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 20px;
          }
          
          .spinner {
            border: 4px solid rgba(0, 0, 0, 0.1);
            width: 36px;
            height: 36px;
            border-radius: 50%;
            border-left-color: #09f;
            animation: spin 1s linear infinite;
            margin-bottom: 10px;
          }
          
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          .error-container {
            border: 1px solid #f5c6cb;
            background-color: #f8d7da;
            border-radius: 4px;
            padding: 15px;
            margin-bottom: 20px;
          }
          
          .error-header {
            margin-bottom: 10px;
          }
          
          .error-message {
            color: #721c24;
            font-weight: bold;
          }
          
          .troubleshooting h4 {
            margin-top: 0;
            margin-bottom: 10px;
          }
          
          .troubleshooting ul {
            margin-top: 5px;
            padding-left: 20px;
          }
        `}</style>
        </div>
    );
};