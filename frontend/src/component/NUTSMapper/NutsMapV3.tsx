import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';

import NutsMapper from './nuts_mapper_v3';
import 'leaflet/dist/leaflet.css';
import { getReadyCSVData } from "../utils.js";

export default ({ nutsLevel = '2', nutsDataUrl }) => {
    const [enrichedGeoJSON, setEnrichedGeoJSON] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [mapCenter, setMapCenter] = useState([50, 10]); // Default to center of Europe

    useEffect(() => {
        const runAsync = async () => {
            try {
                setLoading(true);

                // Fetch points data
                const points = await getReadyCSVData(true);
                if (!points || points.length === 0) {
                    throw new Error("No point data available");
                }

                console.log("Points data loaded:", points.length, "points");

                // Initialize and load NUTS mapper
                const mapper = new NutsMapper();
                await mapper.loadNutsData(nutsDataUrl, nutsLevel);
                console.log("NUTS data loaded successfully");

                // Determine map center based on data extent (if available)
                if (mapper.nutsData && mapper.nutsData.features && mapper.nutsData.features.length > 0) {
                    // This is a simple approach - for a more precise center, you could compute the actual centroid
                    const firstFeature = mapper.nutsData.features[0];
                    if (firstFeature.geometry?.coordinates) {
                        // For polygon geometries, try to find a reasonable center point
                        if (firstFeature.geometry.type === 'Polygon' && firstFeature.geometry.coordinates[0]) {
                            // Use the first coordinate as an approximation
                            const coord = firstFeature.geometry.coordinates[0][0];
                            if (coord && coord.length >= 2) {
                                // Check if coordinates appear to be in lat/long format
                                if (Math.abs(coord[0]) <= 180 && Math.abs(coord[1]) <= 90) {
                                    setMapCenter([coord[1], coord[0]]); // Leaflet expects [lat, lng]
                                }
                            }
                        }
                    }
                }

                // Map points to regions and calculate intensities
                const regionIntensities = mapper.mapPointsToRegions(points);
                console.log("Region intensities mapped");

                const medianIntensities = mapper.calculateMedianIntensities(regionIntensities);
                console.log('Median intensities calculated');

                // Get enriched GeoJSON
                let geoJSON = mapper.getEnrichedGeoJSON(medianIntensities);

                // No need for conversion if we're using proper GeoJSON from nuts2json
                // The nuts2json data should already be in the correct format
                if (nutsDataUrl.includes('3857') || nutsDataUrl.includes('EPSG:3857')) {
                    // Only convert if using Web Mercator projection
                    geoJSON = mapper.convertCoordinates(geoJSON);
                    console.log("Coordinates converted from Web Mercator to WGS84");
                }

                setEnrichedGeoJSON(geoJSON);
                setLoading(false);
            } catch (err) {
                console.error('Error processing NUTS data:', err);
                setError(err.message);
                setLoading(false);
            }
        };

        if (nutsDataUrl) {
            runAsync();
        }
    }, [nutsLevel, nutsDataUrl]);

    // Function to determine color based on intensity
    const getColor = (intensity) => {
        if (intensity === undefined || intensity === null) return '#CCCCCC'; // Gray for no data

        return intensity > 80 ? '#800026' :
            intensity > 60 ? '#BD0026' :
                intensity > 40 ? '#E31A1C' :
                    intensity > 20 ? '#FC4E2A' :
                        intensity > 10 ? '#FD8D3C' :
                            intensity > 5 ? '#FEB24C' :
                                intensity > 0 ? '#FED976' : '#FFEDA0';
    };

    // Style function for GeoJSON
    const style = (feature) => {
        return {
            fillColor: getColor(feature.properties?.intensity),
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
        if (enrichedGeoJSON) {
            e.target.setStyle(style(e.target.feature));
        }
    };

    // Function to add interactivity to each feature
    const onEachFeature = (feature, layer) => {
        const nutsId = feature.properties.NUTS_ID;
        const intensity = feature.properties.intensity;
        const name = feature.properties.NAME_LATN || feature.properties.NAME || nutsId;

        layer.bindPopup(`
            <strong>${name}</strong><br/>
            NUTS ID: ${nutsId}<br/>
            Intensity: ${intensity !== null && intensity !== undefined ? intensity.toFixed(2) : 'No data'}
        `);

        layer.on({
            mouseover: highlightFeature,
            mouseout: resetHighlight
        });
    };

    if (loading) {
        return <div>Loading NUTS data from {nutsDataUrl}...</div>;
    }

    if (error) {
        return (
            <div>
                <p>Error: {error}</p>
                <p>Failed to load NUTS data from: {nutsDataUrl}</p>
                <p>Please check that the URL follows the proper format from nuts2json documentation.</p>
            </div>
        );
    }

    return (
        <div style={{ height: '600px', width: '100%' }}>
            <MapContainer
                center={mapCenter}
                zoom={4}
                style={{ height: '100%', width: '100%' }}
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | NUTS data from <a href="https://github.com/eurostat/Nuts2json">Nuts2json</a>'
                />
                {enrichedGeoJSON && (
                    <GeoJSON
                        data={enrichedGeoJSON}
                        style={style}
                        onEachFeature={onEachFeature}
                    />
                )}
            </MapContainer>

            <div style={{ marginTop: '10px' }}>
                <h3>Intensity Legend</h3>
                <div style={{ display: 'flex', flexDirection: 'row' }}>
                    {[-5, 0, 5, 10, 20, 40, 60, 80].map((threshold, i) => (
                        <div key={i} style={{
                            backgroundColor: getColor(threshold + 1),
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

            <div style={{ marginTop: '10px' }}>
                <p>
                    Displaying NUTS Level {nutsLevel} regions |
                    Data Source: <code>{nutsDataUrl}</code>
                </p>
            </div>
        </div>
    );
};