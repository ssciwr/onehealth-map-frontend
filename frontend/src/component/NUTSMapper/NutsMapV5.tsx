import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, CircleMarker } from 'react-leaflet';
import NutsMapperV5 from './nuts_mapper_v5';
import 'leaflet/dist/leaflet.css';
import Papa from 'papaparse'; // For CSV parsing

export default ({ nutsLevel = '2' }) => {
    const [nutsGeoJSON, setNutsGeoJSON] = useState(null);
    const [outbreaks, setOutbreaks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [stats, setStats] = useState(null);
    const [debugMode, setDebugMode] = useState(false);
    const [showOutbreaks, setShowOutbreaks] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);

                // Fetch pre-processed NUTS data from our API endpoint
                console.log("Fetching NUTS data from CSV file...");
                const nutsResponse = await fetch(`/data/nutsRegions.csv`);

                if (!nutsResponse.ok) {
                    throw new Error(`Failed to fetch NUTS data: ${nutsResponse.status} ${nutsResponse.statusText}`);
                }

                const csvData = await nutsResponse.text();
                console.log("CSV data received, processing with improved mapper...");

                // Parse the CSV data into GeoJSON using our enhanced mapper
                const mapper = new NutsMapperV5();
                const geoJSON = mapper.parseNutsCSV(csvData);
                const processingStats = mapper.getStats();

                setStats(processingStats);
                console.log(`Successfully loaded ${geoJSON.features.length} NUTS regions`);

                if (geoJSON.features.length === 0) {
                    throw new Error('No valid regions were parsed from the CSV data');
                }

                setNutsGeoJSON(geoJSON);

                // Fetch outbreak data
                console.log("Fetching outbreak data...");
                const outbreakResponse = await fetch(`/data/outbreaks.csv`);

                if (!outbreakResponse.ok) {
                    throw new Error(`Failed to fetch outbreak data: ${outbreakResponse.status} ${outbreakResponse.statusText}`);
                }

                const outbreakCsvData = await outbreakResponse.text();

                // Parse the outbreak CSV data
                const parsedOutbreaks = Papa.parse(outbreakCsvData, {
                    header: true,
                    skipEmptyLines: true,
                    dynamicTyping: true, // Automatically convert numeric values
                    complete: (results) => {
                        if (results.errors.length > 0) {
                            console.error("Errors parsing outbreaks CSV:", results.errors);
                        }
                        return results.data;
                    }
                }).data;

                console.log(`Successfully loaded ${parsedOutbreaks.length} outbreak points`);
                setOutbreaks(parsedOutbreaks);
                setLoading(false);
            } catch (err) {
                console.error('Error loading data:', err);
                setError(err.message);
                setLoading(false);
            }
        };

        fetchData();
    }, [nutsLevel]);

    // Function to determine color based on intensity for regions
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

    // Get color for outbreak category
    const getOutbreakColor = (category) => {
        const colorMap = {
            'Zika virus': '#8A2BE2', // Purple for Zika
            'Dengue': '#FF4500',
            'Malaria': '#006400',
            'Ebola': '#DC143C',
            'COVID-19': '#FF8C00'
        };

        return colorMap[category] || '#8A2BE2'; // Default to purple
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

    // Outbreak visibility toggle handler
    const toggleOutbreaks = () => {
        setShowOutbreaks(prev => !prev);
    };

    if (loading) {
        return <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading map data...</p>
        </div>;
    }

    if (error) {
        return (
            <div className="error-container">
                <div className="error-header">
                    <h3>Error Loading Map Data</h3>
                    <p className="error-message">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="nuts-map-container">
            <div className="map-controls">
                <div className="control-options">
                    <label className="control-toggle">
                        <input
                            type="checkbox"
                            checked={debugMode}
                            onChange={toggleDebugMode}
                        />
                        Debug Mode
                    </label>
                    <label className="control-toggle">
                        <input
                            type="checkbox"
                            checked={showOutbreaks}
                            onChange={toggleOutbreaks}
                        />
                        Show Outbreaks
                    </label>
                </div>

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
                    className="full-height-map"
                    center={[42, 12]} // Centered more on Italy
                    zoom={5}
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
                    {showOutbreaks && outbreaks.map((outbreak, index) => (
                        <CircleMarker
                            key={`outbreak-${index}`}
                            center={[outbreak.latitude, outbreak.longitude]}
                            radius={10}
                            pathOptions={{
                                fillColor: getOutbreakColor(outbreak.category),
                                color: 'white',
                                weight: 1,
                                opacity: 1,
                                fillOpacity: 0.8
                            }}
                        >
                            <Popup>
                                <div className="outbreak-popup">
                                    <h3>{outbreak.category}</h3>
                                    <p><strong>Location:</strong> {outbreak.location}</p>
                                    <p><strong>Date:</strong> {outbreak.date}</p>
                                    <p><strong>Cases:</strong> {outbreak.cases}</p>
                                    {outbreak.notes && <p><strong>Notes:</strong> {outbreak.notes}</p>}
                                </div>
                            </Popup>
                        </CircleMarker>
                    ))}
                </MapContainer>
            </div>

            <div className="legend-container">
                <div className="legend-section">
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

                {showOutbreaks && (
                    <div className="legend-section outbreak-legend">
                        <h3>Outbreaks</h3>
                        <div className="legend-item">
                            <div
                                className="circle-marker"
                                style={{
                                    backgroundColor: '#8A2BE2'
                                }}
                            ></div>
                            <span>Zika virus</span>
                        </div>
                    </div>
                )}
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

                .control-options {
                    display: flex;
                    gap: 20px;
                }

                .control-toggle {
                    display: flex;
                    align-items: center;
                    gap: 5px;
                    cursor: pointer;
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
                    border-radius: 8px;
                    overflow: hidden;
                    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
                }

                .full-height-map {
                    height: 100%;
                    width: 100%;
                }

                .legend-container {
                    margin-top: 15px;
                    display: flex;
                    flex-wrap: wrap;
                    gap: 30px;
                }

                .legend-section {
                    background: #f9f9f9;
                    padding: 10px;
                    border-radius: 5px;
                    border: 1px solid #ddd;
                }

                .legend-section h3 {
                    margin-top: 0;
                    margin-bottom: 10px;
                    font-size: 14px;
                }

                .legend-scale {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 5px;
                }

                .legend-item {
                    text-align: center;
                    display: flex;
                    align-items: center;
                    gap: 5px;
                    margin-bottom: 5px;
                }

                .color-box {
                    width: 50px;
                    height: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 12px;
                }

                .circle-marker {
                    width: 15px;
                    height: 15px;
                    border-radius: 50%;
                    border: 1px solid white;
                    display: inline-block;
                    margin-right: 5px;
                }

                .outbreak-legend {
                    min-width: 150px;
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

                .outbreak-popup h3 {
                    margin-top: 0;
                    color: #8A2BE2;
                    opacity: 0.5;
                    border-bottom: 1px solid #ddd;
                    padding-bottom: 5px;
                }

                .outbreak-popup p {
                    margin: 5px 0;
                }
            `}</style>
        </div>
    );
};