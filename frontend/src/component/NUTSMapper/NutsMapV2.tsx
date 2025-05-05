import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import NutsMapper from './nuts_mapper';
import 'leaflet/dist/leaflet.css';
import { getReadyCSVData } from "../utils.js";

export default ({ nutsLevel = '3', nutsDataUrl }) => {
    const [enrichedGeoJSON, setEnrichedGeoJSON] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

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

                // Map points to regions and calculate intensities
                const regionIntensities = mapper.mapPointsToRegions(points);
                console.log("Region intensities mapped");

                const medianIntensities = mapper.calculateMedianIntensities(regionIntensities);
                console.log('Median intensities calculated');

                // Get enriched GeoJSON
                let geoJSON = mapper.getEnrichedGeoJSON(medianIntensities);

                // Convert coordinates to proper lat/long format
                // This assumes you've added the convertCoordinates method to your NutsMapper class
                if (typeof mapper.convertCoordinates === 'function') {
                    geoJSON = mapper.convertCoordinates(geoJSON);
                    console.log("Coordinates converted to proper lat/long format");
                } else {
                    // If you haven't added the method yet, do the conversion here
                    geoJSON = convertCoordinates(geoJSON);
                    console.log("Coordinates converted to proper lat/long format (inline)");
                }

                // Verify GeoJSON data
                if (geoJSON?.features?.length > 0) {
                    const firstFeature = geoJSON.features[0];
                    console.log("First feature example:", {
                        nutsId: firstFeature.properties?.NUTS_ID,
                        intensity: firstFeature.properties?.intensity,
                        coordinates: firstFeature.geometry?.coordinates ?
                            "Has coordinates (too large to display)" : "No coordinates"
                    });

                    // Check a sample coordinate to ensure it's within valid lat/long ranges
                    if (firstFeature.geometry?.type === 'Polygon' &&
                        firstFeature.geometry?.coordinates?.[0]?.[0]) {
                        const sampleCoord = firstFeature.geometry.coordinates[0][0];
                        console.log("Sample coordinate:", sampleCoord);

                        // Validate if coordinates look like proper lat/long
                        const isValidLongitude = -180 <= sampleCoord[0] && sampleCoord[0] <= 180;
                        const isValidLatitude = -90 <= sampleCoord[1] && sampleCoord[1] <= 90;

                        if (!isValidLongitude || !isValidLatitude) {
                            console.warn(
                                "Coordinates may still not be in proper lat/long format. " +
                                `Sample: [${sampleCoord[0]}, ${sampleCoord[1]}]`
                            );
                        }
                    }
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

    // Inline coordinate conversion function (in case you can't modify NutsMapper)
    const convertCoordinates = (geoJSON) => {
        if (!geoJSON || !geoJSON.features) {
            console.error('Invalid GeoJSON for coordinate conversion');
            return geoJSON;
        }

        // Clone the GeoJSON to avoid modifying the original
        const convertedGeoJSON = JSON.parse(JSON.stringify(geoJSON));

        // Function to convert a single coordinate pair
        const convertCoordinate = (coord) => {
            // These conversion factors need to be adjusted based on your specific data
            // Looking at your data, you need very small factors
            const longitudeFactor = 0.00000001; // Example conversion factor
            const latitudeFactor = 0.00000001;  // Example conversion factor

            return [
                parseFloat((coord[0] * longitudeFactor).toFixed(6)),
                parseFloat((coord[1] * latitudeFactor).toFixed(6))
            ];
        };

        // Function to recursively process coordinates
        const processCoordinates = (coords) => {
            if (!coords) return coords;

            // Single coordinate pair
            if (coords.length === 2 && typeof coords[0] === 'number' && typeof coords[1] === 'number') {
                return convertCoordinate(coords);
            }

            // Array of coordinates or multi-dimensional structure
            return coords.map(c => processCoordinates(c));
        };

        // Process each feature's geometry
        convertedGeoJSON.features.forEach(feature => {
            if (feature.geometry && feature.geometry.coordinates) {
                feature.geometry.coordinates = processCoordinates(feature.geometry.coordinates);
            }
        });

        return convertedGeoJSON;
    };

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
        return <div>Loading NUTS data...</div>;
    }

    if (error) {
        return <div>Error: {error}</div>;
    }

    return (
        <div style={{ height: '600px', width: '100%' }}>
            <MapContainer
                center={[50, 10]}
                zoom={4}
                style={{ height: '100%', width: '100%' }}
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
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
        </div>
    );
};