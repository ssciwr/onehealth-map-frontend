import type L from "leaflet";
import { useState } from "react";
import type {
	DataExtremes,
	Month,
	NutsGeoJSON,
	TemperatureDataPoint,
	ViewportBounds,
	WorldwideGeoJSON,
} from "../component/Mapper/types";

export interface ClimateMapState {
	error: string | null;
	setError: (error: string | null) => void;
	processingError: boolean;
	setProcessingError: (error: boolean) => void;
	temperatureData: TemperatureDataPoint[];
	setTemperatureData: (data: TemperatureDataPoint[]) => void;
	viewport: ViewportBounds | null;
	setViewport: React.Dispatch<React.SetStateAction<ViewportBounds | null>>;
	resolutionLevel: number;
	setResolutionLevel: React.Dispatch<React.SetStateAction<number>>;
	selectedModel: string;
	setSelectedModel: (model: string) => void;
	selectedOptimism: string;
	setSelectedOptimism: (optimism: string) => void;
	currentYear: number;
	setCurrentYear: (year: number) => void;
	currentMonth: Month;
	setCurrentMonth: (month: Month) => void;
	currentVariableValue: string;
	setCurrentVariableValue: (value: string) => void;
	map: L.Map | null;
	setMap: (map: L.Map | null) => void;
	dataExtremes: DataExtremes | null;
	setDataExtremes: (extremes: DataExtremes | null) => void;
	dataBounds: L.LatLngBounds | null;
	setDataBounds: (bounds: L.LatLngBounds | null) => void;
	worldGeoJSON: GeoJSON.FeatureCollection | null;
	setWorldGeoJSON: (data: GeoJSON.FeatureCollection | null) => void;
	convertedWorldwideGeoJSON: WorldwideGeoJSON | null;
	setConvertedWorldwideGeoJSON: (data: WorldwideGeoJSON | null) => void;
	worldwideRegionsGeoJSON: GeoJSON.FeatureCollection | null;
	setworldwideRegionsGeoJSON: (data: GeoJSON.FeatureCollection | null) => void;
	convertedEuropeOnlyGeoJSON: NutsGeoJSON | null;
	setConvertedEuropeOnlyGeoJSON: (data: NutsGeoJSON | null) => void;
	isProcessingEuropeOnly: boolean;
	setIsProcessingEuropeOnly: (processing: boolean) => void;
	isProcessingWorldwide: boolean;
	setIsProcessingWorldwide: (processing: boolean) => void;
	isLoadingData: boolean;
	setIsLoadingData: (loading: boolean) => void;
	currentZoom: number;
	setCurrentZoom: (zoom: number) => void;
	mapMode: "grid" | "worldwide" | "europe-only";
	setMapMode: (mode: "grid" | "worldwide" | "europe-only") => void;
	borderStyle: "white" | "light-gray" | "black" | "half-opacity" | "black-80";
	setBorderStyle: (
		style: "white" | "light-gray" | "black" | "half-opacity" | "black-80",
	) => void;
	hoverTimeout: NodeJS.Timeout | null;
	setHoverTimeout: (timeout: NodeJS.Timeout | null) => void;
	currentHoveredLayer: L.Layer | null;
	setCurrentHoveredLayer: (layer: L.Layer | null) => void;
	screenshoter: L.SimpleMapScreenshoter | null;
	setScreenshoter: (screenshoter: L.SimpleMapScreenshoter | null) => void;
	lackOfDataModalVisible: boolean;
	setLackOfDataModalVisible: (visible: boolean) => void;
	requestedYear: number;
	setRequestedYear: (year: number) => void;
	apiErrorMessage: string;
	setApiErrorMessage: (message: string) => void;
	isModelInfoOpen: boolean;
	setIsModelInfoOpen: (open: boolean) => void;
	isAboutOpen: boolean;
	setIsAboutOpen: (open: boolean) => void;
}

export const useClimateMapState = (): ClimateMapState => {
	const [error, setError] = useState<string | null>(null);
	const [processingError, setProcessingError] = useState<boolean>(false);
	const [temperatureData, setTemperatureData] = useState<
		TemperatureDataPoint[]
	>([]);
	const [viewport, setViewport] = useState<ViewportBounds | null>(null);
	const [resolutionLevel, setResolutionLevel] = useState<number>(1);
	const [selectedModel, setSelectedModel] = useState<string>("");
	const [selectedOptimism, setSelectedOptimism] =
		useState<string>("optimistic");
	const [currentYear, setCurrentYear] = useState<number>(2016);
	const [currentMonth, setCurrentMonth] = useState<Month>(7);
	const [currentVariableValue, setCurrentVariableValue] =
		useState<string>("R0");
	const [map, setMap] = useState<L.Map | null>(null);
	const [dataExtremes, setDataExtremes] = useState<DataExtremes | null>(null);
	const [dataBounds, setDataBounds] = useState<L.LatLngBounds | null>(null);
	const [worldGeoJSON, setWorldGeoJSON] =
		useState<GeoJSON.FeatureCollection | null>(null);
	const [convertedWorldwideGeoJSON, setConvertedWorldwideGeoJSON] =
		useState<WorldwideGeoJSON | null>(null);
	const [worldwideRegionsGeoJSON, setworldwideRegionsGeoJSON] =
		useState<GeoJSON.FeatureCollection | null>(null);
	const [convertedEuropeOnlyGeoJSON, setConvertedEuropeOnlyGeoJSON] =
		useState<NutsGeoJSON | null>(null);
	const [isProcessingEuropeOnly, setIsProcessingEuropeOnly] = useState(false);
	const [isProcessingWorldwide, setIsProcessingWorldwide] = useState(false);
	const [isLoadingData, setIsLoadingData] = useState(false);
	const [currentZoom, setCurrentZoom] = useState(3);
	const [mapMode, setMapMode] = useState<"grid" | "worldwide" | "europe-only">(
		"europe-only",
	);
	const [borderStyle, setBorderStyle] = useState<
		"white" | "light-gray" | "black" | "half-opacity" | "black-80"
	>("white");
	const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);
	const [currentHoveredLayer, setCurrentHoveredLayer] =
		useState<L.Layer | null>(null);
	const [screenshoter, setScreenshoter] =
		useState<L.SimpleMapScreenshoter | null>(null);
	const [lackOfDataModalVisible, setLackOfDataModalVisible] = useState(false);
	const [requestedYear, setRequestedYear] = useState<number>(2016);
	const [apiErrorMessage, setApiErrorMessage] = useState<string>("");
	const [isModelInfoOpen, setIsModelInfoOpen] = useState(false);
	const [isAboutOpen, setIsAboutOpen] = useState(false);

	return {
		error,
		setError,
		processingError,
		setProcessingError,
		temperatureData,
		setTemperatureData,
		viewport,
		setViewport,
		resolutionLevel,
		setResolutionLevel,
		selectedModel,
		setSelectedModel,
		selectedOptimism,
		setSelectedOptimism,
		currentYear,
		setCurrentYear,
		currentMonth,
		setCurrentMonth,
		currentVariableValue,
		setCurrentVariableValue,
		map,
		setMap,
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
		currentZoom,
		setCurrentZoom,
		mapMode,
		setMapMode,
		borderStyle,
		setBorderStyle,
		hoverTimeout,
		setHoverTimeout,
		currentHoveredLayer,
		setCurrentHoveredLayer,
		screenshoter,
		setScreenshoter,
		lackOfDataModalVisible,
		setLackOfDataModalVisible,
		requestedYear,
		setRequestedYear,
		apiErrorMessage,
		setApiErrorMessage,
		isModelInfoOpen,
		setIsModelInfoOpen,
		isAboutOpen,
		setIsAboutOpen,
	};
};
