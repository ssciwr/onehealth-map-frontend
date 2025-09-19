import type { FeatureCollection, GeoJsonProperties, Geometry } from "geojson";
import { type Dispatch, type SetStateAction, useState } from "react";
import type {
	DataExtremes,
	NutsGeoJSON,
	ProcessingStats,
	TemperatureDataPoint,
	ViewportBounds,
	WorldwideGeoJSON,
} from "../component/Mapper/types";

export interface DataProcessingState {
	temperatureData: TemperatureDataPoint[];
	setTemperatureData: (data: TemperatureDataPoint[]) => void;
	resolutionLevel: number;
	setResolutionLevel: Dispatch<SetStateAction<number>>;
	dataExtremes: DataExtremes | null;
	setDataExtremes: (extremes: DataExtremes | null) => void;
	dataBounds: ViewportBounds | null;
	setDataBounds: (bounds: ViewportBounds | null) => void;
	worldGeoJSON: FeatureCollection<Geometry, GeoJsonProperties> | null;
	setWorldGeoJSON: (
		data: FeatureCollection<Geometry, GeoJsonProperties> | null,
	) => void;
	convertedWorldwideGeoJSON: WorldwideGeoJSON | null;
	setConvertedWorldwideGeoJSON: (data: WorldwideGeoJSON | null) => void;
	worldwideRegionsGeoJSON: WorldwideGeoJSON | null;
	setworldwideRegionsGeoJSON: (data: WorldwideGeoJSON | null) => void;
	convertedEuropeOnlyGeoJSON: NutsGeoJSON | null;
	setConvertedEuropeOnlyGeoJSON: (data: NutsGeoJSON | null) => void;
	isProcessingEuropeOnly: boolean;
	setIsProcessingEuropeOnly: (processing: boolean) => void;
	isProcessingWorldwide: boolean;
	setIsProcessingWorldwide: (processing: boolean) => void;
	isLoadingData: boolean;
	setIsLoadingData: (loading: boolean) => void;
	processingStats: ProcessingStats | null;
	setProcessingStats: (stats: ProcessingStats | null) => void;
}

export const useDataProcessingState = (): DataProcessingState => {
	const [temperatureData, setTemperatureData] = useState<
		TemperatureDataPoint[]
	>([]);
	const [resolutionLevel, setResolutionLevel] = useState<number>(0.5);
	const [dataExtremes, setDataExtremes] = useState<DataExtremes | null>(null);
	const [dataBounds, setDataBounds] = useState<ViewportBounds | null>(null);
	const [worldGeoJSON, setWorldGeoJSON] = useState<FeatureCollection<
		Geometry,
		GeoJsonProperties
	> | null>(null);
	const [convertedWorldwideGeoJSON, setConvertedWorldwideGeoJSON] =
		useState<WorldwideGeoJSON | null>(null);
	const [worldwideRegionsGeoJSON, setworldwideRegionsGeoJSON] =
		useState<WorldwideGeoJSON | null>(null);
	const [convertedEuropeOnlyGeoJSON, setConvertedEuropeOnlyGeoJSON] =
		useState<NutsGeoJSON | null>(null);
	const [isProcessingEuropeOnly, setIsProcessingEuropeOnly] = useState(false);
	const [isProcessingWorldwide, setIsProcessingWorldwide] = useState(false);
	const [isLoadingData, setIsLoadingData] = useState(false);
	const [processingStats, setProcessingStats] =
		useState<ProcessingStats | null>(null);

	return {
		temperatureData,
		setTemperatureData,
		resolutionLevel,
		setResolutionLevel,
		dataExtremes,
		setDataExtremes,
		dataBounds,
		setDataBounds,
		worldGeoJSON,
		setWorldGeoJSON,
		convertedWorldwideGeoJSON,
		setConvertedWorldwideGeoJSON,
		worldwideRegionsGeoJSON,
		setworldwideRegionsGeoJSON,
		convertedEuropeOnlyGeoJSON,
		setConvertedEuropeOnlyGeoJSON,
		isProcessingEuropeOnly,
		setIsProcessingEuropeOnly,
		isProcessingWorldwide,
		setIsProcessingWorldwide,
		isLoadingData,
		setIsLoadingData,
		processingStats,
		setProcessingStats,
	};
};
