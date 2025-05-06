import { useState, useEffect, useRef } from 'react';
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
    type: "FeatureCollection";
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
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        // Load demo outbreaks data from CSV file in public data folder
        fetch('/data/outbreaks.csv')
            .then(response => response.json())
            .then(csvData => {
                // Parse CSV data
                const parsedOutbreaks = csvData as OutbreakData[];
                setOutbreaks(parsedOutbreaks);
            })
            .catch((err: Error) => {
                console.error('Error loading outbreaks data:', err);
                setError(err.message);
            });
    }, []);

    const loadNutsData = () => {
        setLoading(true);
        setError(null);

        // Load CSV data from file
        fetch('/data/nutsRegions.csv')
            .then(response => response.text())
            .then(csvData => {
                processCSVData(csvData);
                setLoading(false);
            })
            .catch((err: Error) => {
                console.error('Error loading NUTS data:', err);
                setError(err.message);
                setLoading(false);
            });
    };

    // Function to process uploaded CSV file
    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setLoading(true);
        setError(null);

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const csvData = e.target?.result as string;
                processCSVData(csvData);
            } catch (err: any) {
                console.error('Error processing uploaded file:', err);
                setError(err.message);
                setLoading(false);
            }
        };
        reader.onerror = (err) => {
            console.error('File reading error:', err);
            setError('Error reading file');
            setLoading(false);
        };
        reader.readAsText(file);
    };

    // Common function to process CSV data from any source
    const processCSVData = (csvData: string) => {
        try {
            const nutsMapper = new NutsMapperV5();
            const geoJSON = nutsMapper.parseNutsCSV(csvData);
            setNutsGeoJSON(geoJSON as NutsGeoJSON);
            setStats(nutsMapper.getStats());
        } catch (err: any) {
            console.error('Error processing CSV data:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Trigger file input click
    const handleUploadClick = () => {
        fileInputRef.current?.click();
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
            'West Nile': '#d32f2f',       // Dark red
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

                <div className="button-group">
                    <button
                        onClick={loadNutsData}
                        disabled={loading}
                        className="load-button"
                    >
                        {loading ? 'Loading...' : 'Generate with CSV'}
                    </button>

                    <button
                        onClick={handleUploadClick}
                        disabled={loading}
                        className="upload-button"
                    >
                        Upload CSV
                    </button>

                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept=".csv"
                        style={{ display: 'none' }}
                    />
                </div>

                {error && (
                    <div className="error-message">
                        <p>Error (or no data present... meaning you need to upload): {error}</p>
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

                    {outbreaks.map(outbreak => (
                        <CircleMarker
                            radius={10}
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
            <div className="controls">
                <div className="legend">
                    <h3>Temperature</h3>
                    <div><span style={{ backgroundColor: getColor(30) }}></span> &gt; 25°C</div>
                    <div><span style={{ backgroundColor: getColor(23) }}></span> 20-25°C</div>
                    <div><span style={{ backgroundColor: getColor(18) }}></span> 15-20°C</div>
                    <div><span style={{ backgroundColor: getColor(13) }}></span> 10-15°C</div>
                    <div><span style={{ backgroundColor: getColor(8) }}></span> 5-10°C</div>
                    <div><span style={{ backgroundColor: getColor(3) }}></span> 0-5°C</div>
                    <div><span style={{ backgroundColor: getColor(-3) }}></span> -5-0°C</div>
                    <div><span style={{ backgroundColor: getColor(-8) }}></span> -10--5°C</div>
                    <div><span style={{ backgroundColor: getColor(-13) }}></span> -15--10°C</div>
                    <div><span style={{ backgroundColor: getColor(-18) }}></span> &lt; -15°C</div>
                </div>
            </div>

            <style>{`
                .nuts-map-container {
                    padding: 20px;
                    font-family: Arial, sans-serif;
                }
                
                .controls {
                    padding: 10px;
                    margin: 10px;
                    border: 1px solid grey;
                    margin-bottom: 20px;
                    border-radius: 10px
                    padding-right: 20px;
                }
                
                
                .button-group {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    margin-bottom: 15px;
                }
                
                .load-button, .upload-button {
                    padding: 8px 16px;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                }
                
                .load-button {
                    background-color: #4CAF50;
                }
                
                .upload-button {
                    background-color: #2196f3;
                }
                
                .load-button:disabled, .upload-button:disabled {
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
                    text-align: left;
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