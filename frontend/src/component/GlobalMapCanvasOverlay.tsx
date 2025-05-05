/*
 * Implementation 1: Grid Map with Canvas Overlay
 * This approach uses a custom Canvas overlay to render grid squares directly on the map
 * It's more performant than using many individual markers or rectangles
 */

import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import { useState, useEffect, useRef } from 'react';
import L from 'leaflet';

// Custom component to render grid cells on canvas
const GridCanvasOverlay = ({ points, colorScale }) => {
    const map = useMap();
    const canvasRef = useRef(null);
    const canvasOverlayRef = useRef(null);

    // Temperature to color conversion
    const getColor = (value) => {
        // Create a color scale similar to the Python plot
        if (value > 30) return '#fff000'; // Yellow for high temps
        if (value > 20) return '#a0ff00'; // Yellow-green
        if (value > 10) return '#00ff80'; // Green
        if (value > 0) return '#00ffff';  // Cyan
        if (value > -10) return '#0080ff'; // Light blue
        if (value > -20) return '#0000ff'; // Blue
        return '#800080';                 // Purple for very cold
    };

    useEffect(() => {
        if (!map || !points || points.length === 0) return;

        // Create canvas overlay if it doesn't exist
        if (!canvasOverlayRef.current) {
            // Create canvas element
            const canvas = document.createElement('canvas');
            canvas.style.position = 'absolute';
            canvas.style.top = '0';
            canvas.style.left = '0';
            canvas.style.pointerEvents = 'none';
            canvasRef.current = canvas;

            // Create custom overlay
            const CanvasOverlay = L.Layer.extend({
                onAdd: function(map) {
                    map._panes.overlayPane.appendChild(canvas);
                    map.on('moveend', this._reset, this);
                    map.on('resize', this._resize, this);
                    this._reset();
                },
                onRemove: function(map) {
                    map.getPanes().overlayPane.removeChild(canvas);
                    map.off('moveend', this._reset, this);
                    map.off('resize', this._resize, this);
                },
                _resize: function() {
                    const size = map.getSize();
                    canvas.width = size.x;
                    canvas.height = size.y;
                    this._reset();
                },
                _reset: function() {
                    const size = map.getSize();
                    canvas.width = size.x;
                    canvas.height = size.y;

                    const bounds = map.getBounds();
                    const topLeft = map.latLngToLayerPoint(bounds.getNorthWest());
                    canvas.style.transform = `translate(${topLeft.x}px, ${topLeft.y}px)`;

                    this._draw();
                },
                _draw: function() {
                    if (!canvasRef.current) return;

                    const ctx = canvas.getContext('2d');
                    ctx.clearRect(0, 0, canvas.width, canvas.height);

                    // Find the approximate grid cell size
                    // Assuming a regular grid based on the data
                    let gridSizeX = 0.1; // Default grid size (degrees)
                    let gridSizeY = 0.1;

                    // Try to detect grid size from data if possible
                    if (points.length > 1) {
                        // Find the minimum difference between longitudes and latitudes
                        const longitudes = points.map(p => p[2]).sort((a, b) => a - b);
                        const latitudes = points.map(p => p[1]).sort((a, b) => a - b);

                        for (let i = 1; i < longitudes.length; i++) {
                            const diff = Math.abs(longitudes[i] - longitudes[i-1]);
                            if (diff > 0 && (gridSizeX === 0.1 || diff < gridSizeX)) {
                                gridSizeX = diff;
                            }
                        }

                        for (let i = 1; i < latitudes.length; i++) {
                            const diff = Math.abs(latitudes[i] - latitudes[i-1]);
                            if (diff > 0 && (gridSizeY === 0.1 || diff < gridSizeY)) {
                                gridSizeY = diff;
                            }
                        }
                    }

                    // Draw each point as a square
                    points.forEach(point => {
                        const lat = point[1];
                        const lng = point[2];
                        const value = point[3];

                        // Skip points outside the current view
                        const bounds = map.getBounds();
                        if (lat < bounds.getSouth() || lat > bounds.getNorth() ||
                            lng < bounds.getWest() || lng > bounds.getEast()) {
                            return;
                        }

                        // Calculate the corners of the grid cell
                        const sw = map.latLngToContainerPoint([lat - gridSizeY/2, lng - gridSizeX/2]);
                        const ne = map.latLngToContainerPoint([lat + gridSizeY/2, lng + gridSizeX/2]);

                        // Draw the rectangle
                        ctx.fillStyle = getColor(value);
                        ctx.fillRect(
                            sw.x - topLeft.x,
                            ne.y - topLeft.y,
                            ne.x - sw.x,
                            sw.y - ne.y
                        );
                    });
                }
            });

            canvasOverlayRef.current = new CanvasOverlay();
            canvasOverlayRef.current.addTo(map);
        }

        // Update the canvas when points change
        canvasOverlayRef.current._draw();

        return () => {
            if (canvasOverlayRef.current) {
                canvasOverlayRef.current.onRemove(map);
                canvasOverlayRef.current = null;
            }
        };
    }, [map, points]);

    return null;
};

// Legend component
const Legend = () => {
    return (
        <div className="legend" style={{
        position: 'absolute',
            bottom: '20px',
            right: '20px',
            backgroundColor: 'rgba(0,0,0,0.7)',
            padding: '10px',
            borderRadius: '5px',
            zIndex: 1000,
            color: 'white'
    }}>
    <div style={{ marginBottom: '5px', fontWeight: 'bold' }}>Temperature (°C)</div>
    {[
        { color: '#fff000', label: '> 30' },
        { color: '#a0ff00', label: '20 - 30' },
        { color: '#00ff80', label: '10 - 20' },
        { color: '#00ffff', label: '0 - 10' },
        { color: '#0080ff', label: '-10 - 0' },
        { color: '#0000ff', label: '-20 - -10' },
        { color: '#800080', label: '< -20' },
    ].map((item, index) => (
        <div key={index} style={{ display: 'flex', alignItems: 'center', marginTop: '2px' }}>
        <div style={{
        width: '20px',
            height: '20px',
            backgroundColor: item.color,
            marginRight: '5px'
    }}></div>
    <span>{item.label}</span>
    </div>
    ))}
    </div>
);
};

export default () => {
    const [addressPoints, setAddressPoints] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const csvFileToArray = string => {
        const csvHeader = string.slice(0, string.indexOf("\n")).split(",");
        const csvRows = string.slice(string.indexOf("\n") + 1).split("\n"); // ignore header.
        console.log('First CSV row: ', csvRows[0]);

        // Filter out empty rows and properly parse values
        const array = csvRows
            .filter(row => row.trim() !== '') // Filter out empty rows
            .map(dataRow => {
                const values = dataRow.split(",");
                // Make sure we have valid numbers for lat/long
                return [
                    parseFloat(values[0]) || 0,   // valid_time/year - column 0
                    parseFloat(values[1]) || 0,   // latitude - column 1
                    parseFloat(values[2]) || 0,   // longitude - column 2
                    parseFloat(values[3]) || 0    // t2m (temperature) - column 3
                ];
            })
            .filter(row => !isNaN(row[1]) && !isNaN(row[2])); // Filter out rows with invalid lat/long

        console.log('Our array is now: ', array);
        setAddressPoints(array);
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch("era5_data_2024_01_02_monthly_area_celsius_january.csv");
                const text = await response.text();
                csvFileToArray(text);
                setIsLoading(false);
            } catch (err) {
                console.error('Failed to load CSV data:', err);
                setError('Failed to load map data');
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    if (isLoading) {
        return <div>Loading map data...</div>;
    }

    if (error) {
        return <div>Error: {error}</div>;
    }

    // Make sure we have valid data before rendering the map
    if (!addressPoints || addressPoints.length === 0) {
        return <div>No valid data points available for the map</div>;
    }

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
    <MapContainer
        className="full-height-map"
    center={[0, 0]} // Center on equator
    zoom={2}
    minZoom={1}
    maxZoom={19}
    maxBounds={[[-90, -180], [90, 180]]}
    scrollWheelZoom={true}
    style={{ height: '100%', width: '100%' }}
>
    <TileLayer
        attribution='&copy; <a href="https://stadiamaps.com/" target="_blank">Stadia Maps</a>, &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>'
    url="https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png"
    />
    <GridCanvasOverlay points={addressPoints} />
    </MapContainer>
    <Legend />
    </div>
);
};