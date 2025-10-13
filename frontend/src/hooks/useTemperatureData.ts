import { useCallback, useEffect } from "react";
import type {
	DataExtremes,
	Month,
	TemperatureDataPoint,
	ViewportBounds,
	WorldwideFeature,
	WorldwideGeoJSON,
} from "../component/Mapper/types";
import {
	loadNutsData,
	loadTemperatureData,
} from "../component/Mapper/utilities/mapDataUtils";
import { errorStore } from "../stores/ErrorStore";
import { loadingStore } from "../stores/LoadingStore";
import type { Model } from "./useModelData";

// Natural Earth URL with all countries geometries.
const NATURAL_EARTH_URL =
	"https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_1_states_provinces.geojson";

export interface UseTemperatureDataReturn {
	handleLoadTemperatureData: (year: number, month: Month) => Promise<void>;
	loadworldwideRegions: () => Promise<void>;
}

interface UseTemperatureDataProps {
	models: Model[];
	selectedModel: string;
	mapMode: "worldwide" | "europe-only" | "grid";
	currentYear: number;
	currentMonth: Month;
	setRawRegionTemperatureData: (data: TemperatureDataPoint[]) => void;
	setProcessedDataExtremes: (extremes: DataExtremes | null) => void;
	setMapDataBounds: (bounds: ViewportBounds | null) => void;
	setCurrentVariableType: (value: string) => void;
	setUserRequestedYear: (year: number) => void;
	setNoDataModalVisible: (visible: boolean) => void;
	setDataFetchErrorMessage: (message: string) => void;
	setIsLoadingRawData: (loading: boolean) => void;
	setGeneralError: (error: string | null) => void;
	setBaseWorldGeoJSON: (data: GeoJSON.FeatureCollection | null) => void;
	setWorldwideRegionBoundaries: (data: WorldwideGeoJSON | null) => void;
}

export const useTemperatureData = ({
	models,
	selectedModel,
	mapMode,
	currentYear,
	currentMonth,
	setRawRegionTemperatureData,
	setProcessedDataExtremes,
	setMapDataBounds,
	setCurrentVariableType,
	setUserRequestedYear,
	setNoDataModalVisible,
	setDataFetchErrorMessage,
	setIsLoadingRawData,
	setGeneralError,
	setBaseWorldGeoJSON,
	setWorldwideRegionBoundaries,
}: UseTemperatureDataProps): UseTemperatureDataReturn => {
	console.log("Map mode is:", mapMode);
	const handleLoadTemperatureData = useCallback(
		async (year: number, month: Month) => {
			try {
				loadingStore.start();
				setIsLoadingRawData(true);

				// Guard against undefined month - use July as default
				const safeMonth = month || 7;
				console.log(
					`DEBUGYEARCHANGE: Starting to load data for year ${year}, month ${safeMonth}`,
					"Original month:",
					month,
					"Types:",
					typeof year,
					typeof month,
				);
				setUserRequestedYear(year);

				// Get the selected model's output value
				const selectedModelData = models.find((m) => m.id === selectedModel);
				const requestedVariableValue = selectedModelData?.output?.[0] || "R0";
				const outputFormat = selectedModelData?.output;

				// Update current variable value for legend display
				setCurrentVariableType(requestedVariableValue);

				const { dataPoints, extremes, bounds } = await loadTemperatureData(
					year,
					safeMonth,
					requestedVariableValue,
					outputFormat,
				);
				console.log(
					`DEBUGYEARCHANGE: Loaded ${dataPoints.length} data points for year ${year}, month ${safeMonth}`,
				);
				console.log(
					`DEBUGYEARCHANGE: Sample point for year ${year}, month ${safeMonth}:`,
					dataPoints[0],
				);
				console.log(
					`DEBUGYEARCHANGE: Data extremes for year ${year}, month ${safeMonth}:`,
					extremes,
				);
				setRawRegionTemperatureData(dataPoints);
				setProcessedDataExtremes(extremes);
				if (bounds) {
					const viewportBounds: ViewportBounds = {
						north: bounds.getNorth(),
						south: bounds.getSouth(),
						east: bounds.getEast(),
						west: bounds.getWest(),
						zoom: 10, // default zoom
					}; // this is perfect for Ingas API!!
					setMapDataBounds(viewportBounds);
				}
				console.log(
					`DEBUGYEARCHANGE: Finished loading store for year ${year}, month ${safeMonth}`,
				);
				loadingStore.complete();
				setIsLoadingRawData(false);
			} catch (err: unknown) {
				const error = err as Error;
				loadingStore.complete();
				setIsLoadingRawData(false);

				// Check if this is an API error indicating missing data
				if (error.message.includes("API_ERROR:")) {
					const errorMsg = error.message.replace("API_ERROR: ", "");
					setDataFetchErrorMessage(errorMsg);
					setNoDataModalVisible(true);
				} else {
					errorStore.showError(
						"Temperature Data Error",
						`Failed to load temperature data: ${error.message}`,
					);
					setGeneralError(`Failed to load temperature data: ${error.message}`);
				}
			}
		},
		[
			models,
			selectedModel,
			setRawRegionTemperatureData,
			setProcessedDataExtremes,
			setMapDataBounds,
			setCurrentVariableType,
			setUserRequestedYear,
			setNoDataModalVisible,
			setDataFetchErrorMessage,
			setIsLoadingRawData,
			setGeneralError,
		],
	);

	// Load worldwide administrative regions
	const loadworldwideRegions = useCallback(async () => {
		try {
			console.log("Loading global administrative regions...");
			const response = await fetch(NATURAL_EARTH_URL);
			const data = await response.json();

			// Load ALL administrative regions from around the world - no geographic filtering
			const allFeatures = data.features.filter((feature: GeoJSON.Feature) => {
				// Only keep polygons and multipolygons
				return (
					feature.geometry?.type === "Polygon" ||
					feature.geometry?.type === "MultiPolygon"
				);
			});

			const globalRegions: WorldwideGeoJSON = {
				type: "FeatureCollection" as const,
				features: allFeatures as WorldwideFeature[],
			};

			setWorldwideRegionBoundaries(globalRegions);
			console.log(
				`Loaded ${allFeatures.length} global administrative regions from all countries`,
			);
		} catch (error) {
			console.error("Failed to load worldwide administrative regions:", error);
		}
	}, [setWorldwideRegionBoundaries]);

	// Load world GeoJSON data
	useEffect(() => {
		const loadWorldData = async () => {
			try {
				const response = await fetch(
					"https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson",
				);
				const worldData = await response.json();
				setBaseWorldGeoJSON(worldData);
			} catch (error) {
				console.warn("Failed to load world GeoJSON:", error);
			}
		};
		loadWorldData();
	}, [setBaseWorldGeoJSON]);

	// Load worldwide regions only when needed (worldwide mode)
	useEffect(() => {
		if (mapMode === "worldwide") {
			loadworldwideRegions();
		}
	}, [mapMode]); // Remove unstable function reference

	// Load temperature data when year or month changes (only for worldwide/grid modes)
	// Europe-only mode will load NUTS data on-demand in ClimateMap
	useEffect(() => {
		if (mapMode !== "europe-only") {
			console.log(
				"Loading lat/lon data for mode:",
				mapMode,
				"year:",
				currentYear,
				"month:",
				currentMonth,
			);
		}

		// Skip loading lat/lon data for Europe-only mode
		if (mapMode === "europe-only") {
			console.log("Skipping lat/lon data load for Europe-only mode");
			return;
		}

		// Additional validation before calling
		if (
			typeof currentMonth !== "number" ||
			currentMonth < 1 ||
			currentMonth > 12
		) {
			console.error("Invalid currentMonth value:", currentMonth);
			return;
		}

		// Note: This loads lat/lon data for worldwide/grid modes only
		handleLoadTemperatureData(currentYear, currentMonth);
	}, [currentYear, currentMonth, mapMode, handleLoadTemperatureData]);

	// Load NUTS data directly for Europe-only mode
	const handleLoadNutsData = useCallback(
		async (year: number, month: Month) => {
			try {
				loadingStore.start();
				setIsLoadingRawData(true);

				const safeMonth = month || 7;
				console.log(`Loading NUTS data for year ${year}, month ${safeMonth}`);
				setUserRequestedYear(year);

				const selectedModelData = models.find((m) => m.id === selectedModel);
				const requestedVariableValue = selectedModelData?.output?.[0] || "R0";
				setCurrentVariableType(requestedVariableValue);

				const nutsData = await loadNutsData(
					year,
					safeMonth,
					requestedVariableValue,
				);

				console.log(
					`Loaded NUTS data for ${Object.keys(nutsData).length} regions`,
				);
				loadingStore.complete();
				setIsLoadingRawData(false);
				return nutsData;
			} catch (err: unknown) {
				const error = err as Error;
				loadingStore.complete();
				setIsLoadingRawData(false);

				if (error.message.includes("API_ERROR:")) {
					const errorMsg = error.message.replace("API_ERROR: ", "");
					setDataFetchErrorMessage(errorMsg);
					setNoDataModalVisible(true);
				} else {
					errorStore.showError(
						"NUTS Data Error",
						`Failed to load NUTS data: ${error.message}`,
					);
					setGeneralError(`Failed to load NUTS data: ${error.message}`);
				}
				throw error;
			}
		},
		[
			models,
			selectedModel,
			setCurrentVariableType,
			setUserRequestedYear,
			setNoDataModalVisible,
			setDataFetchErrorMessage,
			setIsLoadingRawData,
			setGeneralError,
		],
	);

	return {
		handleLoadTemperatureData,
		handleLoadNutsData,
		loadworldwideRegions,
	};
};
