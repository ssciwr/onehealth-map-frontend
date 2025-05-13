/*
A map component that we will design from the start to mainly show Lat/Long data with values at only the covered points
(e.g. only Land).

The map component will accept a second data input, which will be outbreak observations (coordinate markers) without
further detail.

Initially the map will be a heatmap, later it may use the political regions data to be a Choropleth Map (almost
certainly as a prop option which enables converting the raw data into the Choropleth regions then rendering them).
 */

import 'leaflet/dist/leaflet.css'
import { MapContainer, TileLayer } from 'react-leaflet'
import L from 'leaflet'
import { HeatmapLayer } from "react-leaflet-heatmap-layer-v3/lib"
import { useState, useEffect } from 'react'
import {loadCsv} from "../actions/loadCsvAction.ts";



export default () => {
    const [addressPoints, setAddressPoints] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState(null)

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
                    parseFloat(values[0]), // year
                    parseFloat(values[1]), // latitude
                    parseFloat(values[2]), // longitude
                    parseFloat(values[3])  // value
                ].map(val => isNaN(val) ? 0 : val); // Replace NaN with default values
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
        <MapContainer
            className="full-height-map"
            style={{minWidth:"100vw", minHeight:"100vh"}}
            center={[38, 139.69222]}
            zoom={6}
            minZoom={3}
            maxZoom={19}
            maxBounds={[[-85.06, -180], [85.06, 180]]}
            scrollWheelZoom={true}>
            <HeatmapLayer
                fitBoundsOnLoad
                fitBoundsOnUpdate
                points={addressPoints}
                blur={5}
                longitudeExtractor={row => row[2]}
                latitudeExtractor={row => row[1]}
                intensityExtractor={row => row[3]} />
            <TileLayer
                attribution='&copy; <a href="https://stadiamaps.com/" target="_blank">Stadia Maps</a>, &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>'
                url="https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png"
            />
        </MapContainer>
    );
}