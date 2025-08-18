import type L from "leaflet";
import { useCallback, useEffect } from "react";
import type {
	DataExtremes,
	Month,
	TemperatureDataPoint,
} from "../component/Mapper/types";
import { loadTemperatureData } from "../component/Mapper/utilities/mapDataUtils";
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
	currentYear: number;
	currentMonth: Month;
	setTemperatureData: (data: TemperatureDataPoint[]) => void;
	setDataExtremes: (extremes: DataExtremes | null) => void;
	setDataBounds: (bounds: L.LatLngBounds | null) => void;
	setCurrentVariableValue: (value: string) => void;
	setRequestedYear: (year: number) => void;
	setLackOfDataModalVisible: (visible: boolean) => void;
	setApiErrorMessage: (message: string) => void;
	setIsLoadingData: (loading: boolean) => void;
	setError: (error: string | null) => void;
	setWorldGeoJSON: (data: GeoJSON.FeatureCollection | null) => void;
	setworldwideRegionsGeoJSON: (data: GeoJSON.FeatureCollection | null) => void;
}

export const useTemperatureData = ({
	models,
	selectedModel,
	currentYear,
	currentMonth,
	setTemperatureData,
	setDataExtremes,
	setDataBounds,
	setCurrentVariableValue,
	setRequestedYear,
	setLackOfDataModalVisible,
	setApiErrorMessage,
	setIsLoadingData,
	setError,
	setWorldGeoJSON,
	setworldwideRegionsGeoJSON,
}: UseTemperatureDataProps): UseTemperatureDataReturn => {
	const handleLoadTemperatureData = useCallback(
		async (year: number, month: Month) => {
			try {
				loadingStore.start();
				setIsLoadingData(true);

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
				setRequestedYear(year);

				// Get the selected model's output value
				const selectedModelData = models.find((m) => m.id === selectedModel);
				const requestedVariableValue = selectedModelData?.output?.[0] || "R0";
				const outputFormat = selectedModelData?.output;

				// Update current variable value for legend display
				setCurrentVariableValue(requestedVariableValue);

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
				setTemperatureData(dataPoints);
				setDataExtremes(extremes);
				if (bounds) {
					setDataBounds(bounds);
				}
				console.log(
					`DEBUGYEARCHANGE: Finished loading store for year ${year}, month ${safeMonth}`,
				);
				loadingStore.complete();
				setIsLoadingData(false);
			} catch (err: unknown) {
				const error = err as Error;
				loadingStore.complete();
				setIsLoadingData(false);

				// Check if this is an API error indicating missing data
				if (error.message.includes("API_ERROR:")) {
					const errorMsg = error.message.replace("API_ERROR: ", "");
					setApiErrorMessage(errorMsg);
					setLackOfDataModalVisible(true);
				} else {
					errorStore.showError(
						"Temperature Data Error",
						`Failed to load temperature data: ${error.message}`,
					);
					setError(`Failed to load temperature data: ${error.message}`);
				}
			}
		},
		[
			models,
			selectedModel,
			setTemperatureData,
			setDataExtremes,
			setDataBounds,
			setCurrentVariableValue,
			setRequestedYear,
			setLackOfDataModalVisible,
			setApiErrorMessage,
			setIsLoadingData,
			setError,
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

			const globalRegions = {
				type: "FeatureCollection" as const,
				features: allFeatures,
			};

			setworldwideRegionsGeoJSON(globalRegions);
			console.log(
				`Loaded ${allFeatures.length} global administrative regions from all countries`,
			);
		} catch (error) {
			console.error("Failed to load worldwide administrative regions:", error);
		}
	}, [setworldwideRegionsGeoJSON]);

	// Load world GeoJSON data
	useEffect(() => {
		const loadWorldData = async () => {
			try {
				const response = await fetch(
					"https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson",
				);
				const worldData = await response.json();
				setWorldGeoJSON(worldData);
			} catch (error) {
				console.warn("Failed to load world GeoJSON:", error);
			}
		};
		loadWorldData();
	}, [setWorldGeoJSON]);

	// Load worldwide regions on mount
	useEffect(() => {
		loadworldwideRegions();
	}, [loadworldwideRegions]);

	// Load temperature data when year or month changes
	useEffect(() => {
		console.log(
			"DEBUGYEARCHANGE: Year/Month effect triggered, currentYear:",
			currentYear,
			"currentMonth:",
			currentMonth,
			"typeof currentMonth:",
			typeof currentMonth,
		);

		// Additional validation before calling
		if (
			typeof currentMonth !== "number" ||
			currentMonth < 1 ||
			currentMonth > 12
		) {
			console.error("Invalid currentMonth value:", currentMonth);
			return;
		}

		handleLoadTemperatureData(currentYear, currentMonth);
	}, [currentYear, currentMonth, handleLoadTemperatureData]);

	return {
		handleLoadTemperatureData,
		loadworldwideRegions,
	};
};
