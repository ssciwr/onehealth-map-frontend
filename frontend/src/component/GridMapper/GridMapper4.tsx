/*
 * Implementation 3: Country-Based Temperature Map
 * This approach aggregates temperature data by country and displays it as colored polygons
 * Uses real geometric coordinates with turf.js for accurate country detection
 */

import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import { useState, useEffect, useMemo, useCallback } from 'react';
import L from 'leaflet';
import * as turf from '@turf/turf';

// Component to optimize map bounds
const FitBounds = ({ bounds }) => {
    const map = useMap();

    useEffect(() => {
        if (bounds) {
            map.fitBounds(bounds);
        }
    }, [map, bounds]);

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
    const [temperatureData, setTemperatureData] = useState({});
    const [countriesGeoJson, setCountriesGeoJson] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [processedDataPoints, setProcessedDataPoints] = useState(0);

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

    // Load and process CSV temperature data
    const loadTemperatureData = async () => {
        try {
            const response = await fetch("era5_data_2024_01_02_monthly_area_celsius_january_05res.csv");
            const text = await response.text();

            // Parse CSV
            const rows = text.split('\n').slice(1).filter(row => row.trim() !== '');

            const sampleSize = Math.ceil(rows.length * 0.5);
            // problem: Sampling 50% of data points takes quite a while (10-15s)
            // and gets almost all countries but not say one-or-two small ones in europe.
            // instead we could reverse engineer it e.g. make a dict/map of lat/long buckets for points
            // iterate each country and select as many points as possible from within it's bounds, up to
            // 50 points, then move on to the next country. To guarantee we have data and processing would be faster.
            // my real thoughts though are that backend could well do this a lot better, as with the NUTS processing.

            // Random sampling for better distribution
            const indices = new Set();
            while (indices.size < sampleSize) {
                indices.add(Math.floor(Math.random() * rows.length));
            }

            // Get sampled data points
            const dataPoints = [];
            let pointCount = 0;

            rows.forEach((row, index) => {
                if (indices.has(index)) {
                    const values = row.split(',');
                    if (values.length >= 4) {
                        const temperature = parseFloat(values[3]) || 0;
                        const lat = parseFloat(values[1]) || 0;
                        const lng = parseFloat(values[2]) || 0;

                        dataPoints.push({
                            point: turf.point([lng, lat]),
                            temperature: temperature,
                            lat: lat,
                            lng: lng
                        });
                        pointCount++;
                    }
                }
            });

            setProcessedDataPoints(pointCount);
            console.log(`Processing ${pointCount} of ${rows.length} data points (${(pointCount/rows.length*100).toFixed(2)}%)`);

            // Wait for countries to be loaded
            if (!countriesGeoJson) {
                console.log("Early return.")
                // Store dataPoints for later processing
                window.temperatureDataPoints = dataPoints;
                return;
            }

            // Aggregate temperatures by country using real geometry
            const countryTemperatures = {};

            // Process each country in the GeoJSON
            countriesGeoJson.features.forEach(feature => {
                const countryCode = feature.properties['ISO3166-1-Alpha-3'] ||
                    feature.properties['ISO3166-1-Alpha-2'] ||
                    feature.properties['ISO3'] ||
                    feature.properties['ISO2'] ||
                    feature.properties.code ||
                    feature.properties.id;

                const countryName = feature.properties.name || feature.properties.NAME || '';

                if (!countryCode && !countryName) return;

                const key = countryCode || countryName;

                console.log('Calculating data for country: ', key)

                // Create polygon for country
                let polygon;
                try {
                    if (feature.geometry.type === 'Polygon') {
                        polygon = turf.polygon(feature.geometry.coordinates);
                    } else if (feature.geometry.type === 'MultiPolygon') {
                        polygon = turf.multiPolygon(feature.geometry.coordinates);
                    } else {
                        return;
                    }
                } catch (e) {
                    console.warn(`Failed to create polygon for ${key}:`, e);
                    return;
                }

                // Find points within this country
                const pointsInCountry = [];
                dataPoints.forEach(dataPoint => {
                    try {
                        if (turf.booleanPointInPolygon(dataPoint.point, polygon)) {
                            pointsInCountry.push(dataPoint.temperature);
                        }
                    } catch (e) {
                        // Skip points that cause errors
                    }
                });

                // Calculate average temperature if we have points
                if (pointsInCountry.length > 0) {
                    const avgTemp = pointsInCountry.reduce((a, b) => a + b, 0) / pointsInCountry.length;
                    countryTemperatures[key] = avgTemp;
                    console.log(`${key}: ${avgTemp.toFixed(1)}°C (${pointsInCountry.length} points)`);
                }
            });

            setTemperatureData(countryTemperatures);
            console.log('Temperature data processed:', Object.keys(countryTemperatures).length, 'countries with data');
        } catch (err) {
            console.error('Failed to load temperature data:', err);
            setError('Failed to load temperature data');
        }
    };

    // Load countries GeoJSON
    const loadCountriesGeoJson = async () => {
        try {
            // Using a public CDN for world countries GeoJSON
            const response = await fetch('https://raw.githubusercontent.com/datasets/geo-countries/main/data/countries.geojson');
            const data = await response.json();
            setCountriesGeoJson(data);
            console.log('Countries GeoJSON loaded, features:', data.features.length);

            // If we have stored temperature data points, process them now
            if (window.temperatureDataPoints) {
                const dataPoints = window.temperatureDataPoints;
                const countryTemperatures = {};

                // Process each country in the GeoJSON - each "feature" is a country
                data.features.forEach(feature => {
                    const countryCode = feature.properties['ISO3166-1-Alpha-3'] ||
                        feature.properties['ISO3166-1-Alpha-2'] ||
                        feature.properties['ISO3'] ||
                        feature.properties['ISO2'] ||
                        feature.properties.code ||
                        feature.properties.id;

                    const countryName = feature.properties.name || feature.properties.NAME || '';

                    if (!countryCode && !countryName) return;

                    const key = countryCode || countryName;

                    // Create polygon for country
                    let polygon;
                    try {
                        if (feature.geometry.type === 'Polygon') {
                            polygon = turf.polygon(feature.geometry.coordinates);
                        } else if (feature.geometry.type === 'MultiPolygon') {
                            polygon = turf.multiPolygon(feature.geometry.coordinates);
                        } else {
                            return;
                        }
                    } catch (e) {
                        console.warn(`Failed to create polygon for ${key}:`, e);
                        return;
                    }

                    // Find points within this country
                    const pointsInCountry = [];
                    dataPoints.forEach(dataPoint => {
                        try {
                            if (turf.booleanPointInPolygon(dataPoint.point, polygon)) {
                                pointsInCountry.push(dataPoint.temperature);
                            }
                        } catch (e) {
                            // Skip points that cause errors
                        }
                    });

                    // Calculate average temperature if we have points
                    if (pointsInCountry.length > 0) {
                        const avgTemp = pointsInCountry.reduce((a, b) => a + b, 0) / pointsInCountry.length;
                        countryTemperatures[key] = avgTemp;
                        console.log(`${key}: ${avgTemp.toFixed(1)}°C (${pointsInCountry.length} points)`);
                    }
                });

                setTemperatureData(countryTemperatures);
                console.log('Temperature data processed:', Object.keys(countryTemperatures).length, 'countries with data');
                delete window.temperatureDataPoints; // Clean up
            }
        } catch (err) {
            console.error('Failed to load countries GeoJSON:', err);
            setError('Failed to load countries map data');
        }
    };

    // Style function for GeoJSON features
    const geoJsonStyle = useCallback((feature) => {
        // Try different property names for country codes
        const countryCode = feature.properties['ISO3166-1-Alpha-3'] ||
            feature.properties['ISO3166-1-Alpha-2'] ||
            feature.properties['ISO3'] ||
            feature.properties['ISO2'] ||
            feature.properties.code ||
            feature.properties.id;

        const countryName = feature.properties.name || feature.properties.NAME || '';
        const key = countryCode || countryName;

        const temperature = temperatureData[key];

        return {
            fillColor: temperature !== undefined ? getColorForTemperature(temperature) : '#CCCCCC',
            weight: 1,
            opacity: 1,
            color: 'white',
            fillOpacity: 0.7,
            zIndex: 1500,
        };
    }, [temperatureData]);

    // Event handlers for features
    const onEachFeature = useCallback((feature, layer) => {
        const countryName = feature.properties.name || feature.properties.NAME || 'Unknown';
        const countryCode = feature.properties['ISO3166-1-Alpha-3'] ||
            feature.properties['ISO3166-1-Alpha-2'] ||
            feature.properties['ISO3'] ||
            feature.properties['ISO2'] ||
            feature.properties.code ||
            feature.properties.id;

        const key = countryCode || countryName;
        const temperature = temperatureData[key];

        // Add popup with temperature information
        layer.bindPopup(
            `<strong>${countryName}</strong><br/>
             ${temperature !== undefined
                ? `Average Temperature: ${temperature.toFixed(1)}°C`
                : 'No temperature data available'}`,
            { sticky: false }
        );
    }, [temperatureData]);

    // Load all data on component mount
    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            await loadCountriesGeoJson()
            await loadTemperatureData()
            setIsLoading(false);
        };

        loadData();
    }, []);

    if (isLoading) {
        return <div>Loading map data...</div>;
    }

    if (error) {
        return <div>Error: {error}</div>;
    }

    if (!countriesGeoJson) {
        return <div>No map data available</div>;
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
                style={{ height: '100vh', width: '100vw' }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://stadiamaps.com/" target="_blank">Stadia Maps</a>, &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>'
                    url="https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png"
                />
                <GeoJSON
                    data={countriesGeoJson}
                    style={geoJsonStyle}
                    onEachFeature={onEachFeature}
                />
            </MapContainer>
            <Legend />
            <div style={{
                position: 'absolute',
                top: '20px',
                left: '20px',
                backgroundColor: 'rgba(0,0,0,0.7)',
                padding: '10px',
                borderRadius: '5px',
                color: 'white',
                fontSize: '12px'
            }}>
                Processing {processedDataPoints} data points
            </div>
        </div>
    );
};