import { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, GeoJSON, Popup, CircleMarker, Pane, Rectangle } from 'react-leaflet';
import NutsMapperV5 from '../NUTSMapper/nuts_mapper_v5';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import ViewportMonitor from "./ViewportMonitor.tsx";
import * as turf from '@turf/turf';

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

interface GridCell {
    bounds: L.LatLngBoundsExpression;
    temperature: number;
    id: string;
}

interface ViewportBounds {
    north: number;
    south: number;
    east: number;
    west: number;
    zoom: number;
}

// Component to update grid cells based on current viewport
const AdaptiveGridLayer = ({ dataPoints, viewport, resolutionLevel }: {
    dataPoints: any[];
    viewport: ViewportBounds | null;
    resolutionLevel: number;
}) => {
    const [gridCells, setGridCells] = useState<GridCell[]>([]);
    const prevViewportRef = useRef<ViewportBounds | null>(null);
    const prevResolutionRef = useRef<number>(resolutionLevel);

    // Memoize the function to prevent unnecessary recalculations
    const generateAdaptiveGridCells = useCallback(() => {
        if (!viewport || !dataPoints || dataPoints.length === 0) return [];

        const { north, south, east, west, zoom } = viewport;

        // Determine grid resolution based on zoom and resolution level
        // Use fixed grid sizes to ensure consistent grid appearance
        let gridSize = 0.1; // Base resolution of data

        if (zoom < 3) gridSize = 2; // World view
        else if (zoom < 5) gridSize = 1; // Continental view
        else if (zoom < 7) gridSize = 0.5; // Country view
        else if (zoom < 9) gridSize = 0.3; // Regional view
        else gridSize = 0.1; // Local view

        console.log(`Rendering grid at resolution: ${gridSize}° (zoom: ${zoom})`);

        // Create a map to store aggregated temperature values
        const cellMap = new Map<string, { sum: number; count: number; bounds: L.LatLngBoundsExpression }>();

        // Only process data points within the current viewport (with a buffer)
        const buffer = gridSize * 2;
        const filteredData = dataPoints.filter(point =>
            point.lat >= south - buffer &&
            point.lat <= north + buffer &&
            point.lng >= west - buffer &&
            point.lng <= east + buffer
        );

        // Aggregate data points into grid cells
        filteredData.forEach(point => {
            // Calculate grid cell coordinates by rounding to create a proper grid
            // Use Math.floor divided by gridSize then multiplied by gridSize to ensure proper alignment
            const cellLat = Math.floor(point.lat / gridSize) * gridSize;
            const cellLng = Math.floor(point.lng / gridSize) * gridSize;
            const cellId = `${cellLat.toFixed(4)}_${cellLng.toFixed(4)}`;

            const bounds: L.LatLngBoundsExpression = [
                [cellLat, cellLng],
                [cellLat + gridSize, cellLng + gridSize]
            ];

            if (cellMap.has(cellId)) {
                const cell = cellMap.get(cellId)!;
                cell.sum += point.temperature;
                cell.count += 1;
            } else {
                cellMap.set(cellId, {
                    sum: point.temperature,
                    count: 1,
                    bounds
                });
            }
        });

        // Convert aggregated data to grid cells
        const newGridCells: GridCell[] = [];
        cellMap.forEach((cell, id) => {
            newGridCells.push({
                bounds: cell.bounds,
                temperature: cell.sum / cell.count,
                id
            });
        });

        console.log(`Rendered ${newGridCells.length} grid cells from ${filteredData.length} data points`);
        return newGridCells;
    }, [dataPoints, viewport]);

    // Update grid cells only when viewport or resolution level changes significantly
    useEffect(() => {
        // Only update if viewport actually changed
        const hasViewportChanged = !prevViewportRef.current ||
            (viewport && (
                !prevViewportRef.current ||
                Math.abs(viewport.zoom - prevViewportRef.current.zoom) > 0.1 ||
                Math.abs(viewport.north - prevViewportRef.current.north) > 0.1 ||
                Math.abs(viewport.south - prevViewportRef.current.south) > 0.1 ||
                Math.abs(viewport.east - prevViewportRef.current.east) > 0.1 ||
                Math.abs(viewport.west - prevViewportRef.current.west) > 0.1
            ));

        const hasResolutionChanged = resolutionLevel !== prevResolutionRef.current;

        // Only update if something relevant has changed
        if (hasViewportChanged || hasResolutionChanged) {
            const newGridCells = generateAdaptiveGridCells();
            setGridCells(newGridCells);

            // Update refs
            prevViewportRef.current = viewport;
            prevResolutionRef.current = resolutionLevel;
        }
    }, [viewport, resolutionLevel, generateAdaptiveGridCells]);

    // Get color based on temperature
    const getColorForTemperature = useCallback((temp: number): string => {
        if (temp > 30) return '#FF0000';      // Red (hot)
        if (temp > 20) return '#FFAA00';      // Orange
        if (temp > 10) return '#FFFF00';      // Yellow
        if (temp > 0) return '#00FF00';       // Green
        if (temp > -10) return '#00FFFF';     // Cyan
        if (temp > -20) return '#0000FF';     // Blue
        return '#800080';                     // Purple (cold)
    }, []);

    return (
        <>
            {gridCells.map((cell) => (
                <Rectangle
                    key={cell.id}
                    bounds={cell.bounds}
                    pathOptions={{
                        color: 'transparent',
                        fillColor: getColorForTemperature(cell.temperature),
                        fillOpacity: 0.7,
                        weight: 0
                    }}
                >
                    <Popup>
                        <div>
                            <h4>Grid Cell</h4>
                            <p>Temperature: {cell.temperature.toFixed(1)}°C</p>
                        </div>
                    </Popup>
                </Rectangle>
            ))}
        </>
    );
};

const ClimateMap: React.FC = () => {
    const [nutsGeoJSON, setNutsGeoJSON] = useState<NutsGeoJSON | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [stats, setStats] = useState<ProcessingStats>({ processed: 0, skipped: 0, errors: 0 });
    const [outbreaks, setOutbreaks] = useState<OutbreakData[]>([]);
    const [temperatureData, setTemperatureData] = useState<any[]>([]);
    const [viewport, setViewport] = useState<ViewportBounds | null>(null);
    const [resolutionLevel, setResolutionLevel] = useState<number>(1);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Load temperature data from CSV using the approach from Implementation 3
    const loadTemperatureData = useCallback(async () => {
        try {
            // Exact same file and fetch method as in the original code
            // const response = await fetch("era5_data_2024_01_02_monthly_area_celsius_january_03res.csv");
            const response = await fetch("era5_data_2024_01_02_monthly_area_celsius_january.csv");
            const text = await response.text();

            // Parse CSV
            const rows = text.split('\n').slice(1).filter(row => row.trim() !== '');

            // Use only a small percentage of data points for performance
            const sampleRate = 1; // 1% sampling
            const sampleSize = Math.ceil(rows.length * sampleRate);
            const indices = new Set<number>();

            // Random sampling for better distribution
            while (indices.size < sampleSize) {
                indices.add(Math.floor(Math.random() * rows.length));
            }

            // Get sampled data points
            const dataPoints = [];
            let pointCount = 0;

            // Create a stable set of data points
            for (let i = 0; i < rows.length; i++) {
                // Use deterministic sampling instead of random to ensure stability
                if (i % Math.floor(1/sampleRate) === 0) {
                    const row = rows[i];
                    const values = row.split(',');
                    if (values.length >= 4) {
                        const temperature = parseFloat(values[3]) || 0;
                        const lat = parseFloat(values[1]) || 0;
                        const lng = parseFloat(values[2]) || 0;

                        // Only add points with valid coordinates
                        if (!isNaN(lat) && !isNaN(lng) && !isNaN(temperature)) {
                            dataPoints.push({
                                point: turf.point([lng, lat]),  // Keep turf point for compatibility
                                temperature: temperature,
                                lat: lat,
                                lng: lng
                            });
                            pointCount++;
                        }
                    }
                }
            }

            console.log(`Processing ${pointCount} of ${rows.length} data points (${(pointCount/rows.length*100).toFixed(2)}%)`);
            // setProcessedDataPoints(pointCount);
            setTemperatureData(dataPoints);

        } catch (err: any) {
            console.error('Failed to load temperature data:', err);
            setError('Failed to load temperature data: ' + err.message);
        }
    }, []);

    // Load data on component mount
    useEffect(() => {
        loadTemperatureData();
    }, [loadTemperatureData]);

    useEffect(() => {
        // Load demo outbreaks data from CSV file in public data folder
        fetch('/data/outbreaks.csv')
            .then(response => response.text())
            .then(csvData => {
                // Parse CSV data
                console.log("Raw outbreaks CSV:", csvData);
                const parsedOutbreaks = parseCSVToOutbreaks(csvData);
                console.log("Parsed outbreaks:", parsedOutbreaks);
                setOutbreaks(parsedOutbreaks);
            })
            .catch((err: Error) => {
                console.error('Error loading outbreaks data:', err);
                setError(err.message);
            });
    }, []);

    // Function to parse CSV to outbreak data
    const parseCSVToOutbreaks = (csvData: string): OutbreakData[] => {
        const lines = csvData.trim().split('\n');
        const headers = lines[0].split(',');

        return lines.slice(1).map((line, index) => {
            const values = line.split(',');
            const outbreak: any = {};

            headers.forEach((header, i) => {
                let value = values[i];

                // Convert numeric fields
                if (header === 'latitude' || header === 'longitude' || header === 'cases') {
                    outbreak[header] = parseFloat(value);
                } else {
                    outbreak[header] = value;
                }
            });

            // Add a unique ID if not present
            if (!outbreak.id) {
                outbreak.id = `outbreak-${index}`;
            }

            return outbreak as OutbreakData;
        });
    };

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

    // Handle viewport changes from ViewportMonitor
    const handleViewportChange = useCallback((newViewport: any) => {
        // Extract and transform viewport data
        if (newViewport) {
            const bounds = newViewport.bounds;
            const zoom = newViewport.zoom;

            // Only update if changes are significant (reduce unnecessary renders)
            setViewport(prevViewport => {
                if (!prevViewport ||
                    Math.abs(bounds.getNorth() - prevViewport.north) > 0.1 ||
                    Math.abs(bounds.getSouth() - prevViewport.south) > 0.1 ||
                    Math.abs(bounds.getEast() - prevViewport.east) > 0.1 ||
                    Math.abs(bounds.getWest() - prevViewport.west) > 0.1 ||
                    Math.abs(zoom - prevViewport.zoom) > 0.1) {

                    return {
                        north: bounds.getNorth(),
                        south: bounds.getSouth(),
                        east: bounds.getEast(),
                        west: bounds.getWest(),
                        zoom: zoom
                    };
                }
                return prevViewport;
            });

            // Adjust resolution level based on zoom
            let newResolution = 1;

            if (zoom < 2.5) newResolution = 4.5;
            else if (zoom < 4.5) newResolution = 3.5;
            else if (zoom < 6) newResolution = 2.5;
            else if (zoom < 8) newResolution = 1.5;
            else newResolution = 1;

            setResolutionLevel(prevResolution => {
                if (prevResolution !== newResolution) {
                    return newResolution;
                }
                return prevResolution;
            });
        }
    }, []);

    // Function to get color based on intensity for NUTS regions
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
            'Zika virus': '#99ff00',  // Lime green
            'Dengue': '#c592bf',      // Light purple
            'Malaria': '#9c27b0',     // Purple
            'West Nile': '#754910',   // Brown
            'COVID-19': '#95fbd1'     // Light teal
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
                <h2>Enhanced Climate Map</h2>
                <p>Adaptive resolution cartesian grid with NUTS region overlay</p>

                <div className="button-group">
                    <button
                        onClick={loadNutsData}
                        disabled={loading}
                        className="load-button"
                    >
                        {loading ? 'Loading...' : 'Load NUTS Regions'}
                    </button>

                    <button
                        onClick={handleUploadClick}
                        disabled={loading}
                        className="upload-button"
                    >
                        Upload NUTS CSV
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
                        <p>Error: {error}</p>
                    </div>
                )}

                {stats.processed > 0 && (
                    <div className="stats">
                        <h3>NUTS Processing Stats</h3>
                        <p>Regions processed: {stats.processed}</p>
                        <p>Regions skipped: {stats.skipped}</p>
                        <p>Errors encountered: {stats.errors}</p>
                    </div>
                )}

                <div className="stats">
                    <h3>Grid Data</h3>
                    <p>Temperature points: {temperatureData.length}</p>
                    {viewport && (
                        <p>Current resolution: Level {resolutionLevel} (Zoom: {viewport.zoom.toFixed(1)})</p>
                    )}
                </div>
            </div>

            <div className="map-wrapper">
                <MapContainer
                    className="full-height-map"
                    center={[42, 12]} // Centered more on Italy
                    zoom={5}
                    style={{ height: '800px', width: '100%' }}
                >
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />

                    {/* Cartesian Grid Layer (highest z-index - don't change this) */}
                    <Pane name="gridPane" style={{ zIndex: 1550, opacity: 0.5 }}>
                        {temperatureData.length > 0 && viewport && (
                            <AdaptiveGridLayer
                                dataPoints={temperatureData}
                                viewport={viewport}
                                resolutionLevel={resolutionLevel}
                            />
                        )}
                    </Pane>

                    {/* NUTS Regions Layer (middle z-index) */}
                    <Pane name="geoJsonPane" style={{ zIndex: 200 }}>
                        {nutsGeoJSON && nutsGeoJSON.features && nutsGeoJSON.features.length > 0 && (
                            <GeoJSON
                                data={nutsGeoJSON}
                                style={style}
                                onEachFeature={onEachFeature}
                            />
                        )}
                    </Pane>

                    {/* Outbreak Markers Layer (highest z-index) */}
                    <Pane name="markersPane" style={{ zIndex: 500 }}>
                        {outbreaks.map(outbreak => (
                            <CircleMarker
                                key={outbreak.id}
                                center={[outbreak.latitude, outbreak.longitude]}
                                radius={10}
                                pathOptions={{
                                    fillColor: getOutbreakColor(outbreak.category),
                                    color: '#000',
                                    weight: 1,
                                    opacity: 1,
                                    fillOpacity: 0.8
                                }}
                            >
                                <Popup className="custom-popup">
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
                    </Pane>

                    {/* Monitor viewport changes */}
                    <ViewportMonitor onViewportChange={handleViewportChange} />
                </MapContainer>
            </div>

            <div className="controls">
                <div className="legend">
                    <h3>Temperature Legend</h3>
                    <div><span style={{ backgroundColor: getColor(14) }}></span> &gt; 14°C</div>
                    <div><span style={{ backgroundColor: getColor(10) }}></span> 10-14°C</div>
                    <div><span style={{ backgroundColor: getColor(6) }}></span> 6-10°C</div>
                    <div><span style={{ backgroundColor: getColor(2) }}></span> 2-6°C</div>
                    <div><span style={{ backgroundColor: getColor(0) }}></span> 0-2°C</div>
                    <div><span style={{ backgroundColor: getColor(-4) }}></span> -4-0°C</div>
                    <div><span style={{ backgroundColor: getColor(-8) }}></span> -8--4°C</div>
                    <div><span style={{ backgroundColor: getColor(-12) }}></span> -12--8°C</div>
                    <div><span style={{ backgroundColor: getColor(-16) }}></span> &lt; -12°C</div>
                </div>

                <div className="legend">
                    <h3>Outbreak Types</h3>
                    {['Zika virus', 'Dengue', 'Malaria', 'West Nile', 'COVID-19'].map(category => (
                        <div key={category}>
                            <span style={{ backgroundColor: getOutbreakColor(category) }}></span> {category}
                        </div>
                    ))}
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
                    border-radius: 10px;
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
                
                .leaflet-popup {
                    z-index: 1000 !important;
                }
                
                .leaflet-popup-content-wrapper, 
                .leaflet-popup-tip {
                    z-index: 1000 !important;
                }
                
                .map-wrapper {
                    position: relative;
                    height: 800px;
                    width: 100%;
                    border-radius: 8px;
                    overflow: hidden;
                    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
                }
            `}</style>
        </div>
    );
};

export default ClimateMap;