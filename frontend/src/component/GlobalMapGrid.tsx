/*
 * Implementation 2: Grid Map with GeoJSON Layer
 * This approach uses GeoJSON rectangles to render grid cells
 * It's more declarative and allows for easier interaction with grid cells
 */

import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import { useState, useEffect, useMemo, useCallback } from 'react';
import L from 'leaflet';

// Component to optimize map bounds
const FitBounds = ({ points }) => {
    const map = useMap();

    useEffect(() => {
        if (points && points.length > 0) {
            // Calculate bounds from points
            const lats = points.map(p => p[1]);
            const lngs = points.map(p => p[2]);

            const south = Math.min(...lats);
            const north = Math.max(...lats);
            const west = Math.min(...lngs);
            const east = Math.max(...lngs);

            map.fitBounds([
                [south, west],
                [north, east]
            ]);
        }
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
                { color: '#FF0000', label: '> 30' },
                { color: '#FFAA00', label: '20 - 30' },
                { color: '#FFFF00', label: '10 - 20' },
                { color: '#00FF00', label: '0 - 10' },
                { color: '#00FFFF', label: '-10 - 0' },
                { color: '#0000FF', label: '-20 - -10' },
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
    const [geoJsonData, setGeoJsonData] = useState(null);
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
                    values[0],                    // valid_time as string
                    parseFloat(values[1]) || 0,   // latitude
                    parseFloat(values[2]) || 0,   // longitude
                    parseFloat(values[3]) || 0    // t2m (temperature)
                ];
            })
            .filter(row => !isNaN(row[1]) && !isNaN(row[2])); // Filter out rows with invalid lat/long

        console.log('Our array is now: ', array);
        setAddressPoints(array);
    };

    // Convert array points to GeoJSON features
    useEffect(() => {
        if (!addressPoints || addressPoints.length === 0) return;

        // Try to determine grid size from data
        const detectGridSize = () => {
            // Sort latitudes and longitudes
            const latitudes = [...new Set(addressPoints.map(p => p[1]))].sort((a, b) => a - b);
            const longitudes = [...new Set(addressPoints.map(p => p[2]))].sort((a, b) => a - b);

            // Calculate the minimum difference between consecutive values
            let latDiff = 0.1, lngDiff = 0.1;

            for (let i = 1; i < latitudes.length; i++) {
                const diff = Math.abs(latitudes[i] - latitudes[i-1]);
                if (diff > 0 && (latDiff === 0.1 || diff < latDiff)) {
                    latDiff = diff;
                }
            }

            for (let i = 1; i < longitudes.length; i++) {
                const diff = Math.abs(longitudes[i] - longitudes[i-1]);
                if (diff > 0 && (lngDiff === 0.1 || diff < lngDiff)) {
                    lngDiff = diff;
                }
            }

            return { latSize: latDiff, lngSize: lngDiff };
        };

        const { latSize, lngSize } = detectGridSize();
        console.log(`Detected grid cell size: ${latSize}° lat x ${lngSize}° lng`);

        // Create GeoJSON from points
        // This is too slow - hence filtering to onyl include 2% of the points; it's already laggy for me at that amount.
        const features = addressPoints.filter(i => Math.random() > 0.98).map(point => {
            const lat = point[1];
            const lng = point[2];
            const temperature = point[3];

            // Create a grid cell (rectangle) centered at the point
            const southWest = [lat - latSize/2, lng - lngSize/2];
            const northEast = [lat + latSize/2, lng + lngSize/2];

            return {
                type: 'Feature',
                properties: {
                    temperature,
                    color: getColorForTemperature(temperature),
                    date: point[0]
                },
                geometry: {
                    type: 'Polygon',
                    coordinates: [[
                        [southWest[1], southWest[0]],
                        [northEast[1], southWest[0]],
                        [northEast[1], northEast[0]],
                        [southWest[1], northEast[0]],
                        [southWest[1], southWest[0]] // Close the polygon
                    ]]
                }
            };
        });

        setGeoJsonData({
            type: 'FeatureCollection',
            features
        });
    }, [addressPoints]);

    // Temperature to color function
    const getColorForTemperature = (temp) => {
        if (temp > 30) return '#FF0000';      // Red (hot)
        if (temp > 20) return '#FFAA00';      // Orange
        if (temp > 10) return '#FFFF00';      // Yellow
        if (temp > 0) return '#00FF00';       // Green
        if (temp > -10) return '#00FFFF';     // Cyan
        if (temp > -20) return '#0000FF';     // Blue
        return '#800080';                     // Purple (cold)
    };

    const geoJsonStyle = useCallback((feature) => {
        return {
            fillColor: feature.properties.color,
            weight: 0,         // No border
            opacity: 1,
            color: 'white',    // Border color
            fillOpacity: 0.7
        };
    }, []);

    // Memoize the event handlers for better performance
    const onEachFeature = useCallback((feature, layer) => {
        // Add tooltip with temperature information
        layer.bindTooltip(
            `Temperature: ${feature.properties.temperature.toFixed(1)}°C<br>
       Date: ${feature.properties.date}<br>
       Location: ${feature.geometry.coordinates[0][0][1].toFixed(2)}°, ${feature.geometry.coordinates[0][0][0].toFixed(2)}°`,
            { sticky: true }
        );
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch("era5_data_2024_01_02_monthly_area_celsius_january.csv");
                const text = await response.text();
                console.log('Have the CSV data:', text)
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
    if (!addressPoints || addressPoints.length === 0 || !geoJsonData) {
        return <div>No valid data points available for the map {addressPoints.length}</div>;
    }

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <MapContainer
                className="full-height-map"
                center={[0, 0]}
                zoom={2}
                minZoom={1}
                maxZoom={12}
                maxBounds={[[-90, -180], [90, 180]]}
                scrollWheelZoom={true}
                style={{ height: '100%', width: '100%' }}
            >

                <GeoJSON
                    data={geoJsonData}
                    style={geoJsonStyle}
                    onEachFeature={onEachFeature}
                />
                <TileLayer
                    attribution='&copy; <a href="https://stadiamaps.com/" target="_blank">Stadia Maps</a>, &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>'
                    url="https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png"
                />
            </MapContainer>
            <Legend />
        </div>
    );
};