import {makeAutoObservable, toJS} from "mobx";
import type { FeatureCollection, GeoJsonProperties, Geometry } from "geojson";
import type L from "leaflet";
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

export class GridProcessingStore {
	gridCells: GridCell[] = [];
	isProcessingGrid: boolean = false;
	countriesGeoJSON: FeatureCollection<Geometry, GeoJsonProperties> | null = null;
	
	private prevViewport: ViewportBounds | null = null;
	private prevResolution: number = 0;
	private prevFirstDatapointTemperature: number | undefined = undefined;

	constructor() {
		makeAutoObservable(this);
	}

	setGridCells = (cells: GridCell[]) => {
		this.gridCells = cells;
	};

	setIsProcessingGrid = (processing: boolean) => {
		this.isProcessingGrid = processing;
	};

	setCountriesGeoJSON = (data: FeatureCollection<Geometry, GeoJsonProperties> | null) => {
		this.countriesGeoJSON = data;
	};

	generateAdaptiveGridCells = (dataPoints: DataPoint[], viewport: ViewportBounds): GridCell[] => {
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

		return Array.from(cellMap.entries()).map(([id, data]) => ({
			id,
			bounds: data.bounds,
			temperature: data.sum / data.count,
		}));
	};

	generateGridCellsFromTemperatureData = (
		temperatureData: TemperatureDataPoint[],
		viewport: ViewportBounds | null,
		resolutionLevel: number,
	) => {
		console.log("generateGridCellsFromTemperatureData called with:", temperatureData.length, "points");
		
		if (!viewport || !temperatureData.length) {
			console.log("Setting empty array because of lack fo viewport or temrperatureData.length...", viewport, temperatureData.length);
			this.setGridCells([]);
			return;
		}

		const currentFirstDatapointTemp = temperatureData[0]?.temperature;
		const hasSignificantViewportChange =
			!this.prevViewport ||
			Math.abs(this.prevViewport.zoom - viewport.zoom) > 0.5 ||
			Math.abs(this.prevViewport.north - viewport.north) > 1 ||
			Math.abs(this.prevViewport.south - viewport.south) > 1 ||
			Math.abs(this.prevViewport.east - viewport.east) > 1 ||
			Math.abs(this.prevViewport.west - viewport.west) > 1;

		console.log("Significant viewport change:", currentFirstDatapointTemp);

		const hasResolutionChange =
			Math.abs(this.prevResolution - resolutionLevel) > 0.1;
		const hasDataChange =
			this.prevFirstDatapointTemperature !== currentFirstDatapointTemp;

		if (
			hasSignificantViewportChange ||
			hasResolutionChange ||
			hasDataChange
		) {
			console.log("Recalculating using temperature data:", toJS(temperatureData), "on viewport:", toJS(viewport));
			const cells = this.generateAdaptiveGridCells(temperatureData, viewport);
			console.log("Generated", cells.length, "grid cells");
			this.setGridCells(cells);

			this.prevViewport = viewport;
			this.prevResolution = resolutionLevel;
			this.prevFirstDatapointTemperature = currentFirstDatapointTemp;
		}
	};
}

export const gridProcessingStore = new GridProcessingStore();