import type { FeatureCollection, GeoJsonProperties, Geometry } from "geojson";
import type L from "leaflet";
import { useCallback, useRef, useState } from "react";
import type {
	GridCell,
	TemperatureDataPoint,
	ViewportBounds,
} from "../component/Mapper/types";

interface DataPoint {
	lat: number;
	lng: number;
	temperature: number;
}

export interface GridProcessingState {
	gridCells: GridCell[];
	setGridCells: (cells: GridCell[]) => void;
	isProcessingGrid: boolean;
	setIsProcessingGrid: (processing: boolean) => void;
	countriesGeoJSON: FeatureCollection<Geometry, GeoJsonProperties> | null;
	setCountriesGeoJSON: (
		data: FeatureCollection<Geometry, GeoJsonProperties> | null,
	) => void;
	generateGridCellsFromTemperatureData: (
		temperatureData: TemperatureDataPoint[],
		viewport: ViewportBounds | null,
		resolutionLevel: number,
	) => void;
}

const calculateDerivedIntervalSize = (dataPoints: DataPoint[]): number => {
	if (!dataPoints || dataPoints.length < 2) return 0.1;

	const first = dataPoints[0];
	const second = dataPoints[1];

	const latDiff = Math.abs(second.lat - first.lat);
	if (latDiff > 0) {
		return Math.min(latDiff, 3);
	}

	const lngDiff = Math.abs(second.lng - first.lng);
	if (lngDiff > 0) {
		return Math.min(lngDiff, 3);
	}

	return 0.5;
};

export const useGridProcessing = (): GridProcessingState => {
	const [gridCells, setGridCells] = useState<GridCell[]>([]);
	const [isProcessingGrid, setIsProcessingGrid] = useState(false);
	const [countriesGeoJSON, setCountriesGeoJSON] = useState<FeatureCollection<
		Geometry,
		GeoJsonProperties
	> | null>(null);

	const prevViewportRef = useRef<ViewportBounds | null>(null);
	const prevResolutionRef = useRef<number>(0);
	const prevFirstDatapointTemperature = useRef<number | undefined>(undefined);

	const generateAdaptiveGridCells = useCallback(
		(dataPoints: DataPoint[], viewport: ViewportBounds): GridCell[] => {
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

			console.log(`Filtering ${dataPoints.length} points to viewport bounds:`, {
				south,
				north,
				west,
				east,
			});
			console.log(`After filtering: ${filteredData.length} points`);
			console.log("Sample data point:", dataPoints[0]);

			console.log(
				"Grid size:",
				gridSize,
				"Processing",
				filteredData.length,
				"points",
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

			const finalCells = Array.from(cellMap.entries()).map(([id, data]) => ({
				id,
				bounds: data.bounds,
				temperature: data.sum / data.count,
			}));

			console.log(
				"Generated",
				finalCells.length,
				"cells from",
				cellMap.size,
				"unique grid positions",
			);
			return finalCells;
		},
		[],
	);

	const generateGridCellsFromTemperatureData = useCallback(
		(
			temperatureData: TemperatureDataPoint[],
			viewport: ViewportBounds | null,
			resolutionLevel: number,
		) => {
			if (!viewport || !temperatureData.length) {
				setGridCells([]);
				return;
			}

			const currentFirstDatapointTemp = temperatureData[0]?.temperature;
			const hasSignificantViewportChange =
				!prevViewportRef.current ||
				Math.abs(prevViewportRef.current.zoom - viewport.zoom) > 0.5 ||
				Math.abs(prevViewportRef.current.north - viewport.north) > 1 ||
				Math.abs(prevViewportRef.current.south - viewport.south) > 1 ||
				Math.abs(prevViewportRef.current.east - viewport.east) > 1 ||
				Math.abs(prevViewportRef.current.west - viewport.west) > 1;

			const hasResolutionChange =
				Math.abs(prevResolutionRef.current - resolutionLevel) > 0.1;
			const hasDataChange =
				prevFirstDatapointTemperature.current !== currentFirstDatapointTemp;

			if (
				hasSignificantViewportChange ||
				hasResolutionChange ||
				hasDataChange
			) {
				const cells = generateAdaptiveGridCells(temperatureData, viewport);
				console.log("Setting", cells.length, "grid cells in store");
				setGridCells(cells);

				prevViewportRef.current = viewport;
				prevResolutionRef.current = resolutionLevel;
				prevFirstDatapointTemperature.current = currentFirstDatapointTemp;
			} else {
				console.log("Skipping grid generation - no significant changes");
			}
		},
		[generateAdaptiveGridCells],
	);

	return {
		gridCells,
		setGridCells,
		isProcessingGrid,
		setIsProcessingGrid,
		countriesGeoJSON,
		setCountriesGeoJSON,
		generateGridCellsFromTemperatureData,
	};
};
