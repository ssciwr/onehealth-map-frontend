import { useCallback, useEffect, useRef, useState } from "react";
import { Popup, Rectangle } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type L from "leaflet";
import type { DataExtremes, GridCell, ViewportBounds } from "./types";
import { getColorFromGradient } from "./utilities/gradientUtilities";

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
}

// Helper function to calculate the derived interval size from dataPoints
const calculateDerivedIntervalSize = (dataPoints: DataPoint[]): number => {
	if (!dataPoints || dataPoints.length < 2) return 0.1; // default fallback

	const first = dataPoints[0];
	const second = dataPoints[1];
	console.log("Calculated interval size...", first, " vs ", second);

	// Check lat difference first
	const latDiff = Math.abs(second.lat - first.lat);
	if (latDiff > 0) {
		return Math.min(latDiff, 3);
	}

	// If lat is same, check lng difference
	const lngDiff = Math.abs(second.lng - first.lng);
	if (lngDiff > 0) {
		return Math.min(lngDiff, 3);
	}

	// If both are same, return default // higher than 0.1 because going too low creates ugly gaps, too high creates OK crossovers.
	return 0.5;
};

const AdaptiveGridLayer = ({
	dataPoints,
	viewport,
	resolutionLevel,
	extremes,
}: AdaptiveGridLayerProps) => {
	const [gridCells, setGridCells] = useState<GridCell[]>([]);
	const prevViewportRef = useRef<ViewportBounds | null>(null);
	const prevResolutionRef = useRef<number>(resolutionLevel);
	const prevFirstDatapointTemperature = useRef<number>(
		dataPoints[0]?.temperature,
	);

	const generateAdaptiveGridCells = useCallback(() => {
		if (!viewport || !dataPoints || dataPoints.length === 0) return [];

		const { north, south, east, west, zoom } = viewport;
		const derivedIntervalSize = calculateDerivedIntervalSize(dataPoints);

		let gridSize = derivedIntervalSize;

		if (zoom < 3) gridSize = derivedIntervalSize * 2.5;
		else if (zoom < 4) gridSize = derivedIntervalSize * 1.75;
		else if (zoom < 5.5) gridSize = derivedIntervalSize * 1.25;
		else if (zoom < 7) gridSize = derivedIntervalSize;
		else if (zoom < 9) gridSize = derivedIntervalSize * 0.5;

		const cellMap = new Map<
			string,
			{ sum: number; count: number; bounds: L.LatLngBoundsExpression }
		>();
		const buffer = gridSize * 2;
		const filteredData = dataPoints.filter(
			(point: DataPoint) =>
				point.lat >= south - buffer &&
				point.lat <= north + buffer &&
				point.lng >= west - buffer &&
				point.lng <= east + buffer,
		);

		for (const point of filteredData) {
			const cellLat = Math.floor(point.lat / gridSize) * gridSize;
			const cellLng = Math.floor(point.lng / gridSize) * gridSize;
			const cellId = `${cellLat.toFixed(4)}_${cellLng.toFixed(4)}`;

			const bounds: L.LatLngBoundsExpression = [
				[cellLat, cellLng],
				[cellLat + gridSize, cellLng + gridSize],
			];

			if (cellMap.has(cellId)) {
				const cell = cellMap.get(cellId);
				if (cell) {
					cell.sum += point.temperature;
					cell.count += 1;
				}
			} else {
				cellMap.set(cellId, {
					sum: point.temperature,
					count: 1,
					bounds,
				});
			}
		}

		const newGridCells: GridCell[] = [];
		for (const [id, cell] of cellMap) {
			newGridCells.push({
				bounds: cell.bounds,
				temperature: cell.sum / cell.count,
				id,
			});
		}

		return newGridCells;
	}, [dataPoints, viewport]);

	useEffect(() => {
		const hasViewportChanged =
			!prevViewportRef.current ||
			(viewport &&
				(Math.abs(viewport.zoom - prevViewportRef.current.zoom) > 0.1 ||
					Math.abs(viewport.north - prevViewportRef.current.north) > 0.1 ||
					Math.abs(viewport.south - prevViewportRef.current.south) > 0.1 ||
					Math.abs(viewport.east - prevViewportRef.current.east) > 0.1 ||
					Math.abs(viewport.west - prevViewportRef.current.west) > 0.1));

		const hasResolutionChanged = resolutionLevel !== prevResolutionRef.current;

		const hasDataPointsChanged =
			prevFirstDatapointTemperature.current !== dataPoints[0]?.temperature;

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
						color: "transparent",
						fillColor: getColorFromGradient(
							cell.temperature,
							extremes,
							"#000080",
							"#FFDE21",
						),
						fillOpacity: 0.7,
						weight: 0,
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
