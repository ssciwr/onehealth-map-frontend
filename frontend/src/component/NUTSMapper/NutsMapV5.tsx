import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, GeoJSON, Popup, CircleMarker } from 'react-leaflet';
import NutsMapperV5 from './nuts_mapper_v5';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Define types for our data structures
interface NutsProperties {
    NUTS_ID: string;
    intensity: number | null;
}

interface NutsGeometry {
    type: string;
    coordinates: any[][];
}

interface NutsFeature {
    type: string;
    properties: NutsProperties;
    geometry: NutsGeometry;
}

interface NutsGeoJSON {
    type: string;
    features: NutsFeature[];
}

interface OutbreakData {
    id: string;
    category: string;
    location: string;
    latitude: number;
    longitude: number;
    date: string;
    cases: number;
    notes?: string;
}

interface ProcessingStats {
    processed: number;
    skipped: number;
    errors: number;
    skippedRegions?: string[];
}

const NutsMapV5: React.FC = () => {
    const [nutsGeoJSON, setNutsGeoJSON] = useState<NutsGeoJSON | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [stats, setStats] = useState<ProcessingStats>({ processed: 0, skipped: 0, errors: 0 });
    const [outbreaks, setOutbreaks] = useState<OutbreakData[]>([]);

    useEffect(() => {
        // Load demo outbreaks data
        fetch('/api/outbreaks')
            .then(response => response.json())
            .then(data => {
                const parsedOutbreaks = data as OutbreakData[];
                setOutbreaks(parsedOutbreaks);
            })
            .catch((err: Error) => {
                console.error('Error loading outbreaks data:', err);
                setError(err.message);
            });
    }, []);

    // Function to load and process NUTS data
    const loadNutsData = () => {
        setLoading(true);
        setError(null);

        // Load CSV data
        fetch('/api/nuts-data')
            .then(response => response.text())
            .then(csvData => {
                const nutsMapper = new NutsMapperV5();
                const geoJSON = nutsMapper.parseNutsCSV(csvData);
                setNutsGeoJSON(geoJSON as NutsGeoJSON);
                setStats(nutsMapper.getStats());
                setLoading(false);
            })
            .catch((err: Error) => {
                console.error('Error loading NUTS data:', err);
                setError(err.message);
                setLoading(false);
            });
    };

    // Function to get color based on intensity
    const getColor = (intensity: number | null): string => {
        if (intensity === null) return '#cccccc'; // Default gray for null values

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

    // Function to get color for outbreak markers
    const getOutbreakColor = (category: string): string => {
        const colorMap: { [key: string]: string } = {
            'Zika virus': '#ff9800',  // Orange
            'Dengue': '#f44336',      // Red
            'Malaria': '#9c27b0',     // Purple
            'Ebola': '#d32f2f',       // Dark red
            'COVID-19': '#2196f3'     // Blue
        };

        return colorMap[category] || '#8A2BE2'; // Default to purple
    };

    // Style function for GeoJSON features
    const style = (feature: any) => {
        return {
            fillColor: getColor(feature.properties.intensity),
            weight: 1,
            opacity: 1,
            color: 'white',
            dashArray: '3',
            fillOpacity: 0.7
        };
    };

    // Highlight feature on mouseover
    const highlightFeature = (e: any) => {
        const layer = e.target;

        layer.setStyle({
            weight: 3,
            color: '#666',
            dashArray: '',
            fillOpacity: 0.9
        });

        if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
            layer.bringToFront();
        }
    };

    // Reset highlight on mouseout
    const resetHighlight = (e: any) => {
        if (nutsGeoJSON) {
            const geoJSONLayer = e.target;
            geoJSONLayer.setStyle(style(e.target.feature));
        }
    };

    // Set up event listeners for each feature
    const onEachFeature = (feature: any, layer: any) => {
        layer.on({
            mouseover: highlightFeature,
            mouseout: resetHighlight
        });

        // Add popup with region info
        if (feature.properties) {
            const { NUTS_ID, intensity } = feature.properties;
            const popupContent = `
                <div>
                    <h4>NUTS Region: ${NUTS_ID}</h4>
                    <p>Temperature: ${intensity !== null ? `${intensity.toFixed(1)}°C` : 'N/A'}</p>
                </div>
            `;
            layer.bindPopup(popupContent);
        }
    };

    return (
        <div className="nuts-map-container">
            <div className="controls">
                <h2>NUTS Mapper V5</h2>
                <p>Enhanced NUTS mapping with improved error handling</p>

                <button
                    onClick={loadNutsData}
                    disabled={loading}
                    className="load-button"
                >
                    {loading ? 'Loading...' : 'Load NUTS Data'}
                </button>

                {error && (
                    <div className="error-message">
                        <p>Error: {error}</p>
                    </div>
                )}

                {stats.processed > 0 && (
                    <div className="stats">
                        <h3>Processing Stats</h3>
                        <p>Regions processed: {stats.processed}</p>
                        <p>Regions skipped: {stats.skipped}</p>
                        <p>Errors encountered: {stats.errors}</p>
                    </div>
                )}

                <div className="legend">
                    <h3>Temperature</h3>
                    <div><span style={{ backgroundColor: getColor(30) }}></span> &gt; 25°C</div>
                    <div><span style={{ backgroundColor: getColor(23) }}></span> 20-25°C</div>
                    <div><span style={{ backgroundColor: getColor(18) }}></span> 15-20°C</div>
                    <div><span style={{ backgroundColor: getColor(13) }}></span> 10-15°C</div>
                    <div><span style={{ backgroundColor: getColor(8) }}></span> 5-10°C</div>
                    <div><span style={{ backgroundColor: getColor(0) }}></span> &lt; 5°C</div>
                </div>
            </div>

            <div className="map-wrapper">
                <MapContainer
                    className="map"
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

                    {outbreaks.map(outbreak => (
                        <CircleMarker
                            key={outbreak.id}
                            center={[outbreak.latitude, outbreak.longitude]}
                            pathOptions={{
                                fillColor: getOutbreakColor(outbreak.category),
                                color: '#000',
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

            <style>{`
                .nuts-map-container {
                    display: flex;
                    flex-direction: row;
                    padding: 20px;
                    font-family: Arial, sans-serif;
                }
                
                .controls {
                    width: 250px;
                    padding-right: 20px;
                }
                
                .map-wrapper {
                    flex: 1;
                }
                
                .load-button {
                    margin-bottom: 15px;
                    padding: 8px 16px;
                    background-color: #4CAF50;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                }
                
                .load-button:disabled {
                    background-color: #cccccc;
                    cursor: not-allowed;
                }
                
                .error-message {
                    color: #d32f2f;
                    margin-bottom: 15px;
                    padding: 10px;
                    border: 1px solid #d32f2f;
                    border-radius: 4px;
                    background-color: #ffebee;
                }
                
                .stats {
                    margin-bottom: 15px;
                    padding: 10px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                }
                
                .legend {
                    margin-bottom: 15px;
                    padding: 10px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                }
                
                .legend span {
                    display: inline-block;
                    width: 20px;
                    height: 20px;
                    margin-right: 10px;
                    border-radius: 3px;
                }
                
                .outbreak-popup h3 {
                    margin-top: 0;
                }
            `}</style>
        </div>
    );
};

export default NutsMapV5;