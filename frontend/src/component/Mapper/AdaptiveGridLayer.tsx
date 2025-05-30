import { useState, useEffect, useRef, useCallback } from 'react';
import { Popup, Rectangle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { GridCell, ViewportBounds, DataExtremes } from "./types";
import { getColorFromGradient } from "./gradientUtilities";

interface DataPoint {
    lat: number;
    lng: number;
    temperature: number;
}

interface AdaptiveGridLayerProps {
    dataPoints: DataPoint[];
    viewport: ViewportBounds;
    resolutionLevel: number;
    extremes: DataExtremes;
    dataType: string;
}

const AdaptiveGridLayer = ({ dataPoints, viewport, resolutionLevel, extremes, dataType }: AdaptiveGridLayerProps) => {
    const [gridCells, setGridCells] = useState<GridCell[]>([]);
    const prevViewportRef = useRef<ViewportBounds | null>(null);
    const prevResolutionRef = useRef<number>(resolutionLevel);
    const prevFirstDatapointTemperature = useRef<number>(dataPoints[0]?.temperature);

    console.log("Adaptive Grid Layer debug, dataType source:", dataType)

    const generateAdaptiveGridCells = useCallback(() => {
        if (!viewport || !dataPoints || dataPoints.length === 0) return [];

        const { north, south, east, west, zoom } = viewport;
        let gridSize = 0.1;

        if (zoom < 3) gridSize = 2;
        else if (zoom < 5) gridSize = 1;
        else if (zoom < 7) gridSize = 0.5;
        else if (zoom < 9) gridSize = 0.3;
        else gridSize = 0.1;

        const cellMap = new Map<string, { sum: number; count: number; bounds: L.LatLngBoundsExpression }>();
        const buffer = gridSize * 2;
        const filteredData = dataPoints.filter((point: DataPoint) =>
            point.lat >= south - buffer &&
            point.lat <= north + buffer &&
            point.lng >= west - buffer &&
            point.lng <= east + buffer
        );

        filteredData.forEach((point: DataPoint) => {
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

        const newGridCells: GridCell[] = [];
        cellMap.forEach((cell, id) => {
            newGridCells.push({
                bounds: cell.bounds,
                temperature: cell.sum / cell.count,
                id
            });
        });

        return newGridCells;
    }, [dataPoints, viewport]);

    useEffect(() => {
        const hasViewportChanged = !prevViewportRef.current ||
            (viewport && (
                Math.abs(viewport.zoom - prevViewportRef.current.zoom) > 0.1 ||
                Math.abs(viewport.north - prevViewportRef.current.north) > 0.1 ||
                Math.abs(viewport.south - prevViewportRef.current.south) > 0.1 ||
                Math.abs(viewport.east - prevViewportRef.current.east) > 0.1 ||
                Math.abs(viewport.west - prevViewportRef.current.west) > 0.1
            ));

        const hasResolutionChanged = resolutionLevel !== prevResolutionRef.current;

        const hasDataPointsChanged = prevFirstDatapointTemperature.current !== dataPoints[0]?.temperature;

        if (hasViewportChanged || hasResolutionChanged || hasDataPointsChanged) {
            const newGridCells = generateAdaptiveGridCells();
            setGridCells(newGridCells);
            prevViewportRef.current = viewport;
            prevResolutionRef.current = resolutionLevel;
            prevFirstDatapointTemperature.current = dataPoints[0]?.temperature;
        }
    }, [viewport, resolutionLevel, generateAdaptiveGridCells, dataPoints]);

    return (
        <>
            {gridCells.map((cell) => (
                <Rectangle
                    key={cell.id}
                    bounds={cell.bounds}
                    pathOptions={{
                        color: 'transparent',
                        fillColor: getColorFromGradient(cell.temperature, extremes),
                        fillOpacity: 0.7,
                        weight: 0
                    }}
                >
                    <Popup>
                        <div className="grid-popup">
                            <h4>Grid Cell</h4>
                            <p>Temperature: {cell.temperature.toFixed(1)}°C</p>
                        </div>
                    </Popup>
                </Rectangle>
            ))}
        </>
    );
};

export default AdaptiveGridLayer;