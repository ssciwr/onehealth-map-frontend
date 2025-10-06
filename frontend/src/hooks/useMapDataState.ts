import type { FeatureCollection, GeoJsonProperties, Geometry } from "geojson";
import type L from "leaflet";
import { type Dispatch, type SetStateAction, useState } from "react";
import type {
	DataExtremes,
	NutsGeoJSON,
	ProcessingStats,
	TemperatureDataPoint,
	ViewportBounds,
	WorldwideGeoJSON,
} from "../component/Mapper/types";

export interface MapDataState {
	rawRegionTemperatureData: TemperatureDataPoint[];
	setRawRegionTemperatureData: (data: TemperatureDataPoint[]) => void;
	processedDataExtremes: DataExtremes | null;
	setProcessedDataExtremes: (extremes: DataExtremes | null) => void;
	mapDataBounds: ViewportBounds | null;
	setMapDataBounds: (bounds: ViewportBounds | null) => void;
	baseWorldGeoJSON: FeatureCollection<Geometry, GeoJsonProperties> | null;
	setBaseWorldGeoJSON: (
		data: FeatureCollection<Geometry, GeoJsonProperties> | null,
	) => void;
	processedWorldwideRegions: WorldwideGeoJSON | null;
	setProcessedWorldwideRegions: (data: WorldwideGeoJSON | null) => void;
	worldwideRegionBoundaries: WorldwideGeoJSON | null;
	setWorldwideRegionBoundaries: (data: WorldwideGeoJSON | null) => void;
	processedEuropeNutsRegions: NutsGeoJSON | null;
	setProcessedEuropeNutsRegions: (data: NutsGeoJSON | null) => void;
	isProcessingEuropeNutsData: boolean;
	setIsProcessingEuropeNutsData: (processing: boolean) => void;
	isProcessingWorldwideRegionData: boolean;
	setIsProcessingWorldwideRegionData: (processing: boolean) => void;
	isLoadingRawData: boolean;
	setIsLoadingRawData: (loading: boolean) => void;
	processingStats: ProcessingStats | null;
	setProcessingStats: (stats: ProcessingStats | null) => void;
	leafletMapInstance: L.Map | null;
	setLeafletMapInstance: (map: L.Map | null) => void;
	mapZoomLevel: number;
	setMapZoomLevel: (zoom: number) => void;
	mapViewportBounds: ViewportBounds | null;
	setMapViewportBounds: React.Dispatch<
		React.SetStateAction<ViewportBounds | null>
	>;
	dataResolution: number;
	setDataResolution: Dispatch<SetStateAction<number>>;
}

export const useMapDataState = (): MapDataState => {
	const [rawRegionTemperatureData, setRawRegionTemperatureData] = useState<
		TemperatureDataPoint[]
	>([]);
	const [processedDataExtremes, setProcessedDataExtremes] =
		useState<DataExtremes | null>(null);
	const [mapDataBounds, setMapDataBounds] = useState<ViewportBounds | null>(
		null,
	);
	const [baseWorldGeoJSON, setBaseWorldGeoJSON] = useState<FeatureCollection<
		Geometry,
		GeoJsonProperties
	> | null>(null);
	const [processedWorldwideRegions, setProcessedWorldwideRegions] =
		useState<WorldwideGeoJSON | null>(null);
	const [worldwideRegionBoundaries, setWorldwideRegionBoundaries] =
		useState<WorldwideGeoJSON | null>(null);
	const [processedEuropeNutsRegions, setProcessedEuropeNutsRegions] =
		useState<NutsGeoJSON | null>(null);
	const [isProcessingEuropeNutsData, setIsProcessingEuropeNutsData] =
		useState(false);
	const [isProcessingWorldwideRegionData, setIsProcessingWorldwideRegionData] =
		useState(false);
	const [isLoadingRawData, setIsLoadingRawData] = useState(false);
	const [processingStats, setProcessingStats] =
		useState<ProcessingStats | null>(null);
	const [leafletMapInstance, setLeafletMapInstance] = useState<L.Map | null>(
		null,
	);
	const [mapZoomLevel, setMapZoomLevel] = useState(3);
	const [mapViewportBounds, setMapViewportBounds] =
		useState<ViewportBounds | null>(null);
	const [dataResolution, setDataResolution] = useState<number>(0.5);

	return {
		rawRegionTemperatureData,
		setRawRegionTemperatureData,
		processedDataExtremes,
		setProcessedDataExtremes,
		mapDataBounds,
		setMapDataBounds,
		baseWorldGeoJSON,
		setBaseWorldGeoJSON,
		processedWorldwideRegions,
		setProcessedWorldwideRegions,
		worldwideRegionBoundaries,
		setWorldwideRegionBoundaries,
		processedEuropeNutsRegions,
		setProcessedEuropeNutsRegions,
		isProcessingEuropeNutsData,
		setIsProcessingEuropeNutsData,
		isProcessingWorldwideRegionData,
		setIsProcessingWorldwideRegionData,
		isLoadingRawData,
		setIsLoadingRawData,
		processingStats,
		setProcessingStats,
		leafletMapInstance,
		setLeafletMapInstance,
		mapZoomLevel,
		setMapZoomLevel,
		mapViewportBounds,
		setMapViewportBounds,
		dataResolution,
		setDataResolution,
	};
};
