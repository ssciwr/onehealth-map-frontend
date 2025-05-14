/*
 * Implementation 3: Country-Based Temperature Map
 * This approach aggregates temperature data by country and displays it as colored polygons
 * Much more efficient than rendering individual grid cells
 */

import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import { useState, useEffect, useMemo, useCallback } from 'react';
import L from 'leaflet';

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
            const response = await fetch("era5_data_2024_01_02_monthly_area_celsius_january.csv");
            const text = await response.text();

            // Parse CSV
            const rows = text.split('\n').slice(1).filter(row => row.trim() !== '');
            const countryTemperatures = {};

            // Process each row and map to countries
            rows.forEach(row => {
                const values = row.split(',');
                if (values.length >= 4) {
                    const temperature = parseFloat(values[3]) || 0;
                    const lat = parseFloat(values[1]) || 0;
                    const lng = parseFloat(values[2]) || 0;

                    // Map coordinates to country
                    const countryCode = getCountryCode(lat, lng);

                    if (countryCode) {
                        if (!countryTemperatures[countryCode]) {
                            countryTemperatures[countryCode] = [];
                        }
                        countryTemperatures[countryCode].push(temperature);
                    }
                }
            });

            console.log("Country Temperatures full array:", countryTemperatures)

            // Calculate average temperature per country
            const avgTemperatures = {};
            Object.keys(countryTemperatures).forEach(code => {
                const temps = countryTemperatures[code];
                avgTemperatures[code] = temps.reduce((a, b) => a + b, 0) / temps.length;
            });

            setTemperatureData(avgTemperatures);
            console.log('Temperature data processed:', Object.keys(avgTemperatures).length, 'countries');
            console.log('Sample data:', Object.entries(avgTemperatures).slice(0, 5));
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
            console.log('Countries GeoJSON loaded');
        } catch (err) {
            console.error('Failed to load countries GeoJSON:', err);
            setError('Failed to load countries map data');
        }
    };

    // Map coordinates to country using a rough approximation for now.
    const getCountryCode = (lat, lng) => {
        const countryBounds = {
            'USA': { minLat: 25, maxLat: 49, minLng: -125, maxLng: -66 },
            'CAN': { minLat: 41, maxLat: 83, minLng: -141, maxLng: -52 },
            'MEX': { minLat: 14, maxLat: 32, minLng: -118, maxLng: -86 },
            'BRA': { minLat: -34, maxLat: 5, minLng: -74, maxLng: -34 },
            'ARG': { minLat: -55, maxLat: -22, minLng: -73, maxLng: -53 },
            'RUS': { minLat: 41, maxLat: 82, minLng: 19, maxLng: 180 },
            'CHN': { minLat: 18, maxLat: 54, minLng: 73, maxLng: 135 },
            'IND': { minLat: 8, maxLat: 37, minLng: 68, maxLng: 97 },
            'AUS': { minLat: -44, maxLat: -10, minLng: 112, maxLng: 154 },
            'FRA': { minLat: 41, maxLat: 51, minLng: -5, maxLng: 9 },
            'GBR': { minLat: 49, maxLat: 61, minLng: -8, maxLng: 2 },
            'DEU': { minLat: 47, maxLat: 55, minLng: 6, maxLng: 15 },
            'ESP': { minLat: 36, maxLat: 44, minLng: -9, maxLng: 4 },
            'ITA': { minLat: 36, maxLat: 47, minLng: 6, maxLng: 19 },
            'JPN': { minLat: 24, maxLat: 46, minLng: 123, maxLng: 146 },
            'ZAF': { minLat: -35, maxLat: -22, minLng: 16, maxLng: 33 },
            'EGY': { minLat: 22, maxLat: 32, minLng: 25, maxLng: 36 },
            'NGA': { minLat: 4, maxLat: 14, minLng: 3, maxLng: 15 },
            'SAU': { minLat: 16, maxLat: 32, minLng: 34, maxLng: 56 },
        };

        // Check if the point falls within any country's bounding box
        for (const [code, bounds] of Object.entries(countryBounds)) {
            if (lat >= bounds.minLat && lat <= bounds.maxLat &&
                lng >= bounds.minLng && lng <= bounds.maxLng) {
                return code;
            }
        }

        // Fallback to continental regions if no specific country matches
        if (lat > 45 && lng > -10 && lng < 40) return 'EUR';
        if (lat < -10 && lng > -20 && lng < 50) return 'AFR';
        if (lat > 20 && lng > 60 && lng < 150) return 'ASI';
        if (lat > -60 && lat < 15 && lng > -90 && lng < -30) return 'SAM';
        if (lat > 15 && lat < 80 && lng > -170 && lng < -50) return 'NAM';
        if (lat < -10 && lng > 110 && lng < 180) return 'OCE';

        return null;
    };

    // Style function for GeoJSON features
    const geoJsonStyle = useCallback((feature) => {
        const countryCode = feature.properties['ISO3166-1-Alpha-3'] ||
            feature.properties['ISO3166-1-Alpha-2'] ||
            feature.properties.code ||
            feature.properties.id;

        const temperature = temperatureData[countryCode];

        return {
            fillColor: temperature !== undefined ? getColorForTemperature(temperature) : '#CCCCCC',
            weight: 1,
            opacity: 1,
            color: 'white',
            fillOpacity: 0.7
        };
    }, [temperatureData]);

    // Event handlers for features
    const onEachFeature = useCallback((feature, layer) => {
        const countryName = feature.properties.name || feature.properties.NAME || 'Unknown';
        const countryCode = feature.properties['ISO3166-1-Alpha-3'] ||
            feature.properties['ISO3166-1-Alpha-2'] ||
            feature.properties.code ||
            feature.properties.id;

        const temperature = temperatureData[countryCode];

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
            await Promise.all([
                loadTemperatureData(),
                loadCountriesGeoJson()
            ]);
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
        </div>
    );
};