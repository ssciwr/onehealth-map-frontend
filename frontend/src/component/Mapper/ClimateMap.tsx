import * as turf from "@turf/turf";
import { Modal } from "antd";
import { useCallback, useEffect, useState } from "react";
import { GeoJSON, MapContainer, Pane } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import ViewportMonitor from "./ViewportMonitor.tsx";
import "./Map.css";
import Footer, { AboutContent } from "../../static/Footer.tsx";
import ClippedGridLayer from "./ClippedGridLayer.tsx";
import DebugStatsPanel from "./DebugStatsPanel.tsx";
import ControlBar from "./InterfaceInputs/ControlBar.tsx";
import ModelDetailsModal from "./InterfaceInputs/ModelDetailsModal";
import MapHeader from "./MapHeader.tsx";
import "leaflet-simple-map-screenshoter";
import { isMobile } from "react-device-detect";
import { errorStore } from "../../stores/ErrorStore";
import { loadingStore } from "../../stores/LoadingStore";
import AdvancedTimelineSelector from "./InterfaceInputs/AdvancedTimelineSelector.tsx";
import TimelineSelector from "./InterfaceInputs/TimelineSelector.tsx";
import LoadingSkeleton from "./LoadingSkeleton.tsx";
import NoDataModal from "./NoDataModal.tsx";
import type {
	DataExtremes,
	Month,
	NutsGeoJSON,
	TemperatureDataPoint,
	ViewportBounds,
	WorldwideGeoJSON,
} from "./types.ts";
import { gridToNutsConverter } from "./utilities/GridToNutsConverter";
import { getColorFromGradient } from "./utilities/gradientUtilities";
import {
	Legend,
	MAX_ZOOM,
	MIN_ZOOM,
	loadTemperatureData,
} from "./utilities/mapDataUtils";
import {
	getFormattedVariableValue,
	getVariableDisplayName,
	getVariableUnit,
} from "./utilities/monthUtils";

interface ViewportChangeData {
	bounds: L.LatLngBounds;
	zoom: number;
}

const ClimateMap = ({ onMount = () => true }) => {
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
	const [currentMonth, setCurrentMonth] = useState<Month>(6);
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

	// Natural Earth URL with all countries geometries.
	const NATURAL_EARTH_URL =
		"https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_1_states_provinces.geojson";

	// Grid/Worldwide/NUTS mode state
	const [mapMode, setMapMode] = useState<"grid" | "worldwide" | "europe-only">(
		"europe-only",
	);
	const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);
	const [currentHoveredLayer, setCurrentHoveredLayer] =
		useState<L.Layer | null>(null);

	// Style mode state
	const [styleMode, setStyleMode] = useState<"unchanged" | "purple" | "red">(
		"purple",
	);

	// Screenshoter state
	const [screenshoter, setScreenshoter] =
		useState<L.SimpleMapScreenshoter | null>(null);

	// No data modal state
	const [lackOfDataModalVisible, setLackOfDataModalVisible] = useState(false);
	const [requestedYear, setRequestedYear] = useState<number>(2016);
	const [apiErrorMessage, setApiErrorMessage] = useState<string>("");

	// Initialize screenshoter when map is ready
	useEffect(() => {
		if (map && !screenshoter) {
			if (typeof L.simpleMapScreenshoter === "function") {
				const initializeScreenshoter = () => {
					try {
						const screenshotPlugin = L.simpleMapScreenshoter({
							hidden: true,
							preventDownload: true,
							cropImageByInnerWH: true,
							hideElementsWithSelectors: [],
							mimeType: "image/png",
							screenName: () => `map-screenshot-${Date.now()}`,
						});

						screenshotPlugin.addTo(map);
						setScreenshoter(screenshotPlugin);
					} catch (error) {
						console.error("Error initializing screenshoter:", error);
					}
				};

				if (map.getContainer() && map.getSize().x > 0 && map.getSize().y > 0) {
					initializeScreenshoter();
				} else {
					map.once("load", initializeScreenshoter);
					map.once("resize", initializeScreenshoter);
				}

				return () => {
					if (screenshoter) {
						try {
							map.removeControl(screenshoter);
						} catch (error) {
							console.error("Error removing screenshoter:", error);
						}
					}
				};
			}
		}
	}, [map, screenshoter]);

	// Models for ModelDetailsModal
	const [models, setModels] = useState<
		Array<{
			id: string;
			virusType: string;
			modelName: string;
			title: string;
			description: string;
			emoji: string;
			icon: string;
			color: string;
			details: string;
			output: string[];
		}>
	>([]);

	useEffect(() => {
		onMount();
	}, [onMount]);

	// Load models for ModelDetailsModal
	useEffect(() => {
		const loadModels = async () => {
			const modelFiles = [
				"westNileModel1.yaml",
				"westNileModel2.yaml",
				"dengueModel1.yaml",
				"malariaModel1.yaml",
				"covidModel1.yaml",
				"zikaModel1.yaml",
			];

			const loadedModels = [];

			for (const filename of modelFiles) {
				try {
					const response = await fetch(`/modelsyaml/${filename}`);
					if (!response.ok) continue;

					const yamlText = await response.text();
					const lines = yamlText.split("\n");
					const result: Record<string, string> = {};
					let currentKey = "";
					let isInArray = false;
					let arrayItems: string[] = [];

					for (const line of lines) {
						const trimmed = line.trim();
						if (trimmed && !trimmed.startsWith("#")) {
							const colonIndex = trimmed.indexOf(":");
							if (colonIndex > 0) {
								// If we were in an array, save it as a string
								if (isInArray && currentKey) {
									result[currentKey] = arrayItems.join(", ");
									arrayItems = [];
									isInArray = false;
								}

								const key = trimmed.substring(0, colonIndex).trim();
								let value = trimmed.substring(colonIndex + 1).trim();

								if (
									(value.startsWith("'") && value.endsWith("'")) ||
									(value.startsWith('"') && value.endsWith('"'))
								) {
									value = value.slice(1, -1);
								}

								if (value === "") {
									// This might be the start of an array
									currentKey = key;
									isInArray = true;
								} else {
									result[key] = value;
								}
							} else if (trimmed.startsWith("- ") && isInArray) {
								// This is an array item
								arrayItems.push(trimmed.substring(2).trim());
							}
						}
					}

					// Handle any remaining array - convert to string for the result type
					if (isInArray && currentKey) {
						result[currentKey] = arrayItems.join(", ");
					}

					const model = {
						id: result.id || "",
						virusType: result["virus-type"] || "",
						modelName: result["model-name"] || "",
						title: result.title || "",
						description: result.description || "",
						emoji: result.emoji || "",
						icon: result.icon || "",
						color: result.color || "",
						details: result.details || "",
						output: result.output ? result.output.split(", ") : ["R0"],
					};

					if (model.id) {
						loadedModels.push(model);
					}
				} catch (error) {
					console.error(`Error loading ${filename}:`, error);
				}
			}

			setModels(loadedModels);
		};

		loadModels();
	}, []);

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
	}, []);

	// Load models and set first one as default
	useEffect(() => {
		const loadDefaultModel = async () => {
			try {
				const modelFiles = [
					"westNileModel1.yaml",
					"westNileModel2.yaml",
					"dengueModel1.yaml",
					"malariaModel1.yaml",
					"covidModel1.yaml",
					"zikaModel1.yaml",
				];

				for (const filename of modelFiles) {
					try {
						const response = await fetch(`/modelsyaml/${filename}`);
						if (!response.ok) continue;

						const yamlText = await response.text();
						const lines = yamlText.split("\n");
						const result: Record<string, string> = {};

						for (const line of lines) {
							const trimmed = line.trim();
							if (trimmed && !trimmed.startsWith("#")) {
								const colonIndex = trimmed.indexOf(":");
								if (colonIndex > 0) {
									const key = trimmed.substring(0, colonIndex).trim();
									let value = trimmed.substring(colonIndex + 1).trim();
									if (
										(value.startsWith("'") && value.endsWith("'")) ||
										(value.startsWith('"') && value.endsWith('"'))
									) {
										value = value.slice(1, -1);
									}
									result[key] = value;
								}
							}
						}

						const modelId = result.id || "";
						if (modelId) {
							setSelectedModel(modelId);
							return; // Use the first successfully loaded model
						}
					} catch (error) {
						console.error(`Error loading ${filename}:`, error);
					}
				}

				// Fallback to hardcoded model if no models could be loaded
				setSelectedModel("west-nile-a17");
			} catch (error) {
				console.error("Error loading default model:", error);
				setSelectedModel("west-nile-a17");
			}
		};

		if (!selectedModel) {
			loadDefaultModel();
		}
	}, [selectedModel]);

	const getOptimismLevels = () => ["optimistic", "realistic", "pessimistic"];

	const handleLoadTemperatureData = useCallback(
		async (year: number, month: Month) => {
			try {
				loadingStore.start();
				setIsLoadingData(true);

				// Guard against undefined month - use June as default
				const safeMonth = month || 6;
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
		[models, selectedModel],
	);

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
	}, []);

	// Load worldwide regions on mount
	useEffect(() => {
		loadworldwideRegions();
	}, [loadworldwideRegions]);

	// Sample temperature data to 1% for performance
	const sampleTemperatureData = useCallback(
		(temperatureData: TemperatureDataPoint[], sampleRate = 0.5) => {
			const sampleSize = Math.max(
				1,
				Math.floor(temperatureData.length * sampleRate),
			);
			const step = Math.floor(temperatureData.length / sampleSize);

			const sampledData = [];
			for (let i = 0; i < temperatureData.length; i += step) {
				sampledData.push(temperatureData[i]);
				if (sampledData.length >= sampleSize) break;
			}

			console.log(
				`Sampled ${sampledData.length} points from ${temperatureData.length} total (${(sampleRate * 100).toFixed(1)}%)`,
			);
			return sampledData;
		},
		[],
	);

	// Calculate temperature and coordinate info for a region
	const calculateRegionTemperatureWithCoords = useCallback(
		(
			regionFeature: GeoJSON.Feature,
			temperatureData: TemperatureDataPoint[],
		) => {
			const regionName =
				regionFeature.properties?.name ||
				regionFeature.properties?.name_en ||
				regionFeature.properties?.admin ||
				"Unknown";

			const pointsInRegion = temperatureData.filter((point) => {
				// Use turf.js for accurate point-in-polygon checking
				const isInside = isPointInRegion(
					point.lat,
					point.lng,
					regionFeature.geometry,
				);
				return isInside;
			});

			// Get centroid of the region using turf.js
			const polygon = turf.feature(regionFeature.geometry);
			const centroid = turf.centroid(polygon);
			const currentPosition = {
				lat: centroid.geometry.coordinates[1],
				lng: centroid.geometry.coordinates[0],
			};

			console.log(
				`Region ${regionName}: found ${pointsInRegion.length} points within region`,
			);

			if (pointsInRegion.length === 0) {
				// Fallback: find nearest point
				const nearestPoint = findNearestPoint(regionFeature, temperatureData);
				console.log(
					`Region ${regionName}: using nearest point fallback, temp: ${nearestPoint ? nearestPoint.temperature : "null"}`,
				);
				return {
					temperature: nearestPoint ? nearestPoint.temperature : null,
					isFallback: true,
					currentPosition,
					nearestDataPoint: nearestPoint
						? {
								lat: nearestPoint.lat,
								lng: nearestPoint.lng,
							}
						: null,
					dataPoints: nearestPoint ? [nearestPoint] : [],
				};
			}

			// Calculate average temperature
			const avgTemp =
				pointsInRegion.reduce((sum, point) => sum + point.temperature, 0) /
				pointsInRegion.length;
			console.log(
				`Region ${regionName}: calculated average temp: ${avgTemp} from ${pointsInRegion.length} points`,
			);
			return {
				temperature: avgTemp,
				isFallback: false,
				currentPosition,
				nearestDataPoint: null,
				dataPoints: pointsInRegion.slice(0, 3),
			};
		},
		[],
	);

	// Use turf.js for accurate point-in-polygon checking
	const isPointInRegion = useCallback(
		(lat: number, lon: number, geometry: GeoJSON.Geometry) => {
			try {
				// Reduced debug logging (only log first few calls to avoid spam)
				if (Math.random() < 0.001) {
					// Only log 0.1% of calls
					console.log("isPointInRegion sample call:", {
						lat,
						lon,
						latType: typeof lat,
						lonType: typeof lon,
						geometryType: geometry?.type,
					});
				}

				// Validate inputs with more detailed checks
				if (
					typeof lat !== "number" ||
					typeof lon !== "number" ||
					Number.isNaN(lat) ||
					Number.isNaN(lon) ||
					!Number.isFinite(lat) ||
					!Number.isFinite(lon)
				) {
					console.error("Invalid lat/lon values:", {
						lat,
						lon,
						latType: typeof lat,
						lonType: typeof lon,
						latIsNaN: Number.isNaN(lat),
						lonIsNaN: Number.isNaN(lon),
						latIsFinite: Number.isFinite(lat),
						lonIsFinite: Number.isFinite(lon),
					});
					return false;
				}

				if (!geometry || !geometry.type || !("coordinates" in geometry)) {
					console.error("Invalid geometry:", geometry);
					return false;
				}

				// Additional validation for coordinate values
				if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
					console.error("Lat/lon values out of valid range:", { lat, lon });
					return false;
				}

				// Create a turf point from lat/lon coordinates
				const point = turf.point([lon, lat]);

				// Create a turf polygon/multipolygon from the geometry
				const polygon = turf.feature(geometry);

				// Use turf's booleanPointInPolygon for accurate checking
				const result = turf.booleanPointInPolygon(
					point,
					polygon as GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>,
				);

				return result;
			} catch (error) {
				console.error("Error in point-in-polygon check:", error);
				console.error("Error details:", {
					lat,
					lon,
					latType: typeof lat,
					lonType: typeof lon,
					latRaw: lat,
					lonRaw: lon,
					geometryType: geometry?.type,
					geometryCoordinates:
						"coordinates" in geometry ? "present" : "missing",
					errorMessage: error instanceof Error ? error.message : String(error),
					errorStack: error instanceof Error ? error.stack : undefined,
				});
				return false;
			}
		},
		[],
	);

	// Find nearest temperature point to a region using turf.js
	const findNearestPoint = useCallback(
		(
			regionFeature: GeoJSON.Feature,
			temperatureData: TemperatureDataPoint[],
		) => {
			try {
				// Get centroid of the region using turf.js
				const polygon = turf.feature(regionFeature.geometry);
				const centroid = turf.centroid(polygon);

				let nearestPoint = null;
				let minDistance = Number.POSITIVE_INFINITY;

				for (const point of temperatureData) {
					// Use turf.js distance calculation
					const tempPoint = turf.point([point.lng, point.lat]);
					const distance = turf.distance(centroid, tempPoint, {
						units: "kilometers",
					});

					if (distance < minDistance) {
						minDistance = distance;
						nearestPoint = point;
					}
				}

				return nearestPoint;
			} catch (error) {
				console.error("Error finding nearest point:", error);
				return null;
			}
		},
		[],
	);

	// Convert grid data to worldwide regions when mode is worldwide and temperature data is available
	useEffect(() => {
		// Skip processing if there's already a processing error
		if (processingError) {
			console.log("Skipping processing due to previous error");
			return;
		}

		const convertToWorldwide = async () => {
			if (mapMode === "worldwide" && temperatureData.length > 0) {
				// Load worldwide regions if not already loaded
				if (!worldwideRegionsGeoJSON) {
					try {
						await loadworldwideRegions();
					} catch (error) {
						console.error("Failed to load worldwide regions:", error);
						setProcessingError(true);
						setError("Failed to load worldwide regions");
					}
					return;
				}

				try {
					setIsProcessingWorldwide(true);
					console.log(
						"Converting grid data to global administrative regions...",
					);
					console.log(
						`Processing ${worldwideRegionsGeoJSON.features.length} global regions`,
					);

					// Sample temperature data to 10% for better accuracy
					const sampledTemperatureData = sampleTemperatureData(
						temperatureData,
						0.005,
					);
					console.log(
						"Temperature data sample: first few points:",
						sampledTemperatureData.slice(0, 5),
					);

					// Debug: Show bounds of temperature data
					if (sampledTemperatureData.length > 0) {
						const tempBounds = {
							minLat: Math.min(...sampledTemperatureData.map((p) => p.lat)),
							maxLat: Math.max(...sampledTemperatureData.map((p) => p.lat)),
							minLon: Math.min(...sampledTemperatureData.map((p) => p.lng)),
							maxLon: Math.max(...sampledTemperatureData.map((p) => p.lng)),
						};
						console.log(
							`Temperature data bounds: lat(${tempBounds.minLat} to ${tempBounds.maxLat}), lon(${tempBounds.minLon} to ${tempBounds.maxLon})`,
						);
					}

					// Process each global region and calculate temperature
					const processedFeatures = [];
					let hasError = false;

					for (
						let index = 0;
						index < worldwideRegionsGeoJSON.features.length;
						index++
					) {
						const feature = worldwideRegionsGeoJSON.features[index];
						const regionName =
							feature.properties?.name ||
							feature.properties?.name_en ||
							feature.properties?.admin ||
							`Region-${index}`;

						try {
							console.log(`Processing region ${index + 1}: ${regionName}`);

							const tempResult = calculateRegionTemperatureWithCoords(
								feature,
								sampledTemperatureData,
							);
							const result = {
								...feature,
								properties: {
									...feature.properties,
									intensity: tempResult.temperature,
									WORLDWIDE_ID:
										feature.properties?.name ||
										feature.properties?.name_en ||
										"Unknown",
									countryName: feature.properties?.admin || "Unknown Country",
									pointCount: sampledTemperatureData.filter((point) =>
										isPointInRegion(point.lat, point.lng, feature.geometry),
									).length,
									isFallback: tempResult.isFallback,
									currentPosition: tempResult.currentPosition,
									nearestDataPoint: tempResult.nearestDataPoint,
									dataPoints: tempResult.dataPoints,
								},
							};

							if (result.properties.intensity !== null) {
								processedFeatures.push(result);
								console.log(
									`Region ${regionName} processed successfully: intensity=${result.properties.intensity}`,
								);
							} else {
								console.log(
									`Region ${regionName} has null intensity, skipping`,
								);
							}
						} catch (regionError) {
							console.error(
								`Error processing region ${regionName}:`,
								regionError,
							);
							hasError = true;
							break;
						}
					}

					if (hasError) {
						console.error("Processing stopped due to error");
						setProcessingError(true);
						setError("Error processing regions");
						return;
					}

					console.log(
						`Processed ${processedFeatures.length} regions with valid temperature data`,
					);

					const processedGeoJSON = {
						type: "FeatureCollection" as const,
						features: processedFeatures,
					};

					setConvertedWorldwideGeoJSON(processedGeoJSON as WorldwideGeoJSON);

					// Calculate extremes from processed data
					const temperatures = processedFeatures
						.map((f) => f.properties.intensity)
						.filter((t) => t !== null);
					console.log(
						"Temperature values for extremes calculation:",
						temperatures,
					);
					if (temperatures.length > 0) {
						const extremes = {
							min: Math.min(...temperatures),
							max: Math.max(...temperatures),
						};
						setDataExtremes(extremes);
						console.log("Set worldwide regions extremes:", extremes);
						console.log(
							`Total regions with temperature data: ${temperatures.length}`,
						);
					} else {
						console.warn("No temperature data found for any region!");
					}
					setIsProcessingWorldwide(false);
				} catch (error) {
					console.error(
						"Failed to convert grid data to worldwide regions:",
						error,
					);
					setProcessingError(true);
					setError("Failed to process worldwide regions");
					setIsProcessingWorldwide(false);
				}
			} else if (mapMode === "europe-only") {
				try {
					console.log(
						`DEBUGYEARCHANGE: Converting grid data to Europe-only NUTS regions for year ${currentYear}...`,
					);
					console.log(
						`DEBUGYEARCHANGE: Temperature data length: ${temperatureData.length}`,
					);
					console.log(
						"DEBUGYEARCHANGE: First temperature point:",
						temperatureData[0],
					);

					// Clear existing data immediately to prevent stale display
					setConvertedEuropeOnlyGeoJSON(null);
					setIsProcessingEuropeOnly(true);

					// Use GridToNutsConverter to process temperature data into NUTS regions
					const { nutsGeoJSON, extremes } =
						await gridToNutsConverter.convertGridDataToNuts(temperatureData);

					console.log(
						`DEBUGYEARCHANGE: NUTS conversion complete for year ${currentYear}`,
					);
					console.log(
						`DEBUGYEARCHANGE: NUTS features count: ${nutsGeoJSON.features.length}`,
					);
					console.log("DEBUGYEARCHANGE: NUTS extremes:", extremes);
					console.log(
						"DEBUGYEARCHANGE: First NUTS feature:",
						nutsGeoJSON.features[0],
					);

					// Always update state since we're processing the latest data
					setConvertedEuropeOnlyGeoJSON({ ...nutsGeoJSON });
					setDataExtremes(extremes);
					setIsProcessingEuropeOnly(false);
				} catch (error) {
					console.error(
						"Failed to convert grid data to Europe-only NUTS regions:",
						error,
					);
					setProcessingError(true);
					setError("Failed to process Europe-only NUTS regions");
					setIsProcessingEuropeOnly(false);
				}
			} else if (mapMode === "grid") {
				setConvertedWorldwideGeoJSON(null);
				setConvertedEuropeOnlyGeoJSON(null);
				// Restore original extremes for grid mode
				if (temperatureData.length > 0) {
					const temps = temperatureData.map((d) => d.temperature);
					const extremes = {
						min: Math.min(...temps),
						max: Math.max(...temps),
					};
					console.log("Setting grid extremes:", extremes);
					setDataExtremes(extremes);
				} else {
					console.log("No temperature data for grid mode");
				}
			} else {
				// Clear all when switching modes
				setConvertedWorldwideGeoJSON(null);
				setConvertedEuropeOnlyGeoJSON(null);
				setIsProcessingEuropeOnly(false);
				setIsProcessingWorldwide(false);
			}
		};

		convertToWorldwide();
	}, [
		mapMode,
		temperatureData,
		worldwideRegionsGeoJSON,
		processingError,
		loadworldwideRegions,
		calculateRegionTemperatureWithCoords,
		isPointInRegion,
		sampleTemperatureData,
		currentYear,
	]);

	// Cleanup timeouts on unmount
	useEffect(() => {
		return () => {
			if (hoverTimeout) {
				clearTimeout(hoverTimeout);
			}
		};
	}, [hoverTimeout]);

	useEffect(() => {
		if (map && dataBounds) {
			map.setMaxBounds(dataBounds);
		}
	}, [map, dataBounds]);

	const handleViewportChange = useCallback(
		(newViewport: ViewportChangeData) => {
			if (newViewport) {
				const bounds = newViewport.bounds;
				const zoom = newViewport.zoom;

				setViewport((prevViewport) => {
					if (
						!prevViewport ||
						Math.abs(bounds.getNorth() - prevViewport.north) > 0.1 ||
						Math.abs(bounds.getSouth() - prevViewport.south) > 0.1 ||
						Math.abs(bounds.getEast() - prevViewport.east) > 0.1 ||
						Math.abs(bounds.getWest() - prevViewport.west) > 0.1 ||
						Math.abs(zoom - prevViewport.zoom) > 0.1
					) {
						return {
							north: bounds.getNorth(),
							south: bounds.getSouth(),
							east: bounds.getEast(),
							west: bounds.getWest(),
							zoom: zoom,
						};
					}
					return prevViewport;
				});

				let newResolution = 1;
				if (zoom < 2.5) newResolution = 4.5;
				else if (zoom < 4.5) newResolution = 3.5;
				else if (zoom < 6) newResolution = 2.5;
				else if (zoom < 8) newResolution = 1.5;
				else newResolution = 1;

				setResolutionLevel((prevResolution) => {
					if (prevResolution !== newResolution) {
						return newResolution;
					}
					return prevResolution;
				});
			}
		},
		[],
	);

	const handleModelSelect = (modelId: string) => {
		setSelectedModel(modelId);
	};

	// Control functions for advanced timeline
	const handleZoomIn = () => {
		if (map) {
			map.zoomIn();
		}
	};

	const handleZoomOut = () => {
		if (map) {
			map.zoomOut();
		}
	};

	const handleResetZoom = () => {
		if (map) {
			map.setView([10, 12], 3);
		}
	};

	const handleLocationFind = () => {
		if (navigator.geolocation) {
			navigator.geolocation.getCurrentPosition(
				(position) => {
					if (map) {
						map.setView(
							[position.coords.latitude, position.coords.longitude],
							6,
						);
					}
				},
				(error) => {
					console.error("Error getting location:", error);
					errorStore.showError("Location Error", "Unable to get your location");
				},
			);
		} else {
			errorStore.showError(
				"Location Error",
				"Geolocation is not supported by this browser",
			);
		}
	};

	const handleScreenshot = () => {
		// Type assertion for the screenshoter plugin
		interface MapWithScreenshoter extends L.Map {
			simpleMapScreenshoter?: {
				takeScreen: (format: string) => Promise<Blob>;
			};
		}

		const mapWithScreenshoter = map as MapWithScreenshoter;

		if (map && mapWithScreenshoter.simpleMapScreenshoter) {
			try {
				mapWithScreenshoter.simpleMapScreenshoter
					.takeScreen("blob")
					.then((blob: Blob) => {
						const url = URL.createObjectURL(blob);
						const a = document.createElement("a");
						a.href = url;
						a.download = `climate-map-${new Date().toISOString().split("T")[0]}.png`;
						document.body.appendChild(a);
						a.click();
						document.body.removeChild(a);
						URL.revokeObjectURL(url);
					});
			} catch (error) {
				console.error("Screenshot error:", error);
				errorStore.showError(
					"Screenshot Error",
					"Failed to capture screenshot",
				);
			}
		}
	};

	const [isModelInfoOpen, setIsModelInfoOpen] = useState(false);
	const [isAboutOpen, setIsAboutOpen] = useState(false);

	const handleModelInfo = () => {
		setIsModelInfoOpen(true);
	};

	const handleAbout = () => {
		setIsAboutOpen(true);
	};

	const handleLoadCurrentYear = () => {
		const currentYear = new Date().getFullYear();
		setCurrentYear(currentYear);
		setLackOfDataModalVisible(false);
	};

	const worldwideStyle = (feature: GeoJSON.Feature) => {
		if (!feature || !feature.properties) return {};

		const properties = feature.properties as { intensity?: number };

		return {
			fillColor: dataExtremes
				? getColorFromGradient(properties.intensity || 0, dataExtremes)
				: "#cccccc",
			weight: 2,
			opacity: 1,
			color: "white",
			dashArray: "",
			fillOpacity: 0.8,
		};
	};

	const worldStyle = () => {
		return {
			fillColor: "#374151",
			weight: 0.5,
			opacity: 0.8,
			color: "#6b7280",
			fillOpacity: 1,
		};
	};

	const nutsStyle = (feature: GeoJSON.Feature) => {
		if (!feature || !feature.properties) return {};

		const properties = feature.properties as { intensity?: number };

		return {
			fillColor: dataExtremes
				? getColorFromGradient(properties.intensity || 0, dataExtremes)
				: "#cccccc",
			weight: 2,
			opacity: 1,
			color: "white",
			dashArray: "",
			fillOpacity: 0.8,
		};
	};

	const highlightFeature = (e: L.LeafletMouseEvent) => {
		const layer = e.target as L.Path;

		// Clear any existing timeout
		if (hoverTimeout) {
			clearTimeout(hoverTimeout);
		}

		// If this is the same layer, don't do anything
		if (currentHoveredLayer === layer) {
			return;
		}

		// Reset previous layer if exists
		if (currentHoveredLayer) {
			const prevLayer = currentHoveredLayer as L.Path & {
				feature: GeoJSON.Feature;
			};
			if (mapMode === "worldwide" && convertedWorldwideGeoJSON) {
				prevLayer.setStyle(worldwideStyle(prevLayer.feature));
			} else if (mapMode === "europe-only" && convertedEuropeOnlyGeoJSON) {
				prevLayer.setStyle(nutsStyle(prevLayer.feature));
			} else if (worldGeoJSON) {
				prevLayer.setStyle(worldStyle());
			}
			(prevLayer as L.Layer & { closePopup: () => void }).closePopup();
		}

		// Set new layer styling
		layer.setStyle({
			weight: 3,
			color: "#666",
			dashArray: "",
			fillOpacity: 0.9,
		});

		if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
			layer.bringToFront();
		}

		setCurrentHoveredLayer(layer);

		// Show popup on hover for worldwide and europe-only modes with slight delay
		if (mapMode === "worldwide" || mapMode === "europe-only") {
			const timeout = setTimeout(() => {
				if (currentHoveredLayer === layer) {
					(layer as L.Layer & { openPopup: () => void }).openPopup();
				}
			}, 100);
			setHoverTimeout(timeout);
		}
	};

	const resetHighlight = (e: L.LeafletMouseEvent) => {
		const geoJSONLayer = e.target as L.Path & { feature: GeoJSON.Feature };

		// Clear any existing timeout
		if (hoverTimeout) {
			clearTimeout(hoverTimeout);
			setHoverTimeout(null);
		}

		// Only reset if this is the currently hovered layer
		if (currentHoveredLayer === geoJSONLayer) {
			if (mapMode === "worldwide" && convertedWorldwideGeoJSON) {
				geoJSONLayer.setStyle(worldwideStyle(geoJSONLayer.feature));
			} else if (mapMode === "europe-only" && convertedEuropeOnlyGeoJSON) {
				geoJSONLayer.setStyle(nutsStyle(geoJSONLayer.feature));
			} else if (worldGeoJSON) {
				geoJSONLayer.setStyle(worldStyle());
			}

			// Close popup on mouseout for worldwide and europe-only modes
			if (mapMode === "worldwide" || mapMode === "europe-only") {
				(geoJSONLayer as L.Layer & { closePopup: () => void }).closePopup();
			}

			setCurrentHoveredLayer(null);
		}
	};

	const onEachWorldwideFeature = (feature: GeoJSON.Feature, layer: L.Layer) => {
		layer.on({
			mouseover: highlightFeature,
			mouseout: resetHighlight,
		});

		if (feature.properties) {
			const properties = feature.properties as {
				WORLDWIDE_ID?: string;
				intensity?: number;
				countryName?: string;
				pointCount?: number;
				isFallback?: boolean;
				currentPosition?: { lat: number; lng: number };
				nearestDataPoint?: { lat: number; lng: number };
				dataPoints?: Array<{ lat: number; lng: number; temperature: number }>;
			};
			const {
				WORLDWIDE_ID,
				intensity,
				countryName,
				pointCount,
				isFallback,
				currentPosition,
				nearestDataPoint,
				dataPoints,
			} = properties;
			const displayName = countryName || WORLDWIDE_ID || "Unknown Country";

			const dataSource = isFallback
				? "Nearest point"
				: pointCount && pointCount > 0
					? `${pointCount} data points`
					: "Calculated";

			// Build coordinate information for fallback case
			let coordinateInfo = "";
			if (isFallback && currentPosition && nearestDataPoint) {
				coordinateInfo = `
          <p><strong>Current Position:</strong> ${currentPosition.lat.toFixed(3)}, ${currentPosition.lng.toFixed(3)}</p>
          <p><strong>Nearest Data Point:</strong> ${nearestDataPoint.lat.toFixed(3)}, ${nearestDataPoint.lng.toFixed(3)}</p>
        `;
			}

			// Build data points list (first 3)
			let dataPointsList = "";
			if (dataPoints && dataPoints.length > 0) {
				const pointsToShow = dataPoints.slice(0, 3);
				const pointsListItems = pointsToShow
					.map(
						(point) =>
							`<li>[${point.lat.toFixed(3)}, ${point.lng.toFixed(3)}, ${getFormattedVariableValue(currentVariableValue, point.temperature)}]</li>`,
					)
					.join("");
				dataPointsList = `
          <p><strong>Data Points:</strong></p>
          <ul style="margin: 0; padding-left: 15px;">
            ${pointsListItems}
          </ul>
        `;
			}

			const popupContent = `
        <div class="worldwide-popup">
          <h4>${displayName}</h4>
          <p><strong>${getVariableDisplayName(currentVariableValue)}:</strong> ${intensity !== null && intensity !== undefined ? getFormattedVariableValue(currentVariableValue, intensity) : "N/A"}</p>
          <p><strong>Data Source:</strong> ${dataSource}</p>
          ${isFallback ? `<p><small style="color: #666;">⚠️ Using nearest available data point</small></p>` : ""}
          ${coordinateInfo}
          ${dataPointsList}
          <p><small>Region: ${WORLDWIDE_ID || "N/A"}</small></p>
        </div>
      `;
			(layer as L.Layer & { bindPopup: (content: string) => void }).bindPopup(
				popupContent,
			);
		}
	};

	const onEachEuropeOnlyFeature = (
		feature: GeoJSON.Feature,
		layer: L.Layer,
	) => {
		layer.on({
			mouseover: highlightFeature,
			mouseout: resetHighlight,
		});

		if (feature.properties) {
			const properties = feature.properties as {
				NUTS_ID?: string;
				intensity?: number | null;
				countryName?: string;
				pointCount?: number;
				nutsLevel?: number;
				isFallback?: boolean;
				isModelData?: boolean;
				currentPosition?: { lat: number; lng: number };
				nearestDataPoint?: { lat: number; lng: number };
				dataPoints?: Array<{ lat: number; lng: number; temperature: number }>;
			};
			const {
				NUTS_ID,
				intensity,
				countryName,
				pointCount,
				nutsLevel,
				isFallback,
				isModelData,
				currentPosition,
				nearestDataPoint,
				dataPoints,
			} = properties;
			const displayName = countryName || NUTS_ID || "Unknown Region";

			const regionType =
				nutsLevel === 2
					? "NUTS 2 Region"
					: nutsLevel === 0
						? "Country"
						: "Region";

			const dataSource = isFallback
				? "Nearest point"
				: pointCount && pointCount > 0
					? `${pointCount} data points`
					: "Calculated";

			// Build coordinate information for fallback case
			let coordinateInfo = "";
			if (isFallback && currentPosition && nearestDataPoint) {
				coordinateInfo = `
          <p><strong>Current Position:</strong> ${currentPosition.lat.toFixed(3)}, ${currentPosition.lng.toFixed(3)}</p>
          <p><strong>Nearest Data Point:</strong> ${nearestDataPoint.lat.toFixed(3)}, ${nearestDataPoint.lng.toFixed(3)}</p>
        `;
			}

			// Build data points list (first 3)
			let dataPointsList = "";
			if (dataPoints && dataPoints.length > 0) {
				const pointsToShow = dataPoints.slice(0, 3);
				const pointsListItems = pointsToShow
					.map(
						(point) =>
							`<li>[${point.lat.toFixed(3)}, ${point.lng.toFixed(3)}, ${getFormattedVariableValue(currentVariableValue, point.temperature)}]</li>`,
					)
					.join("");
				dataPointsList = `
          <p><strong>Data Points:</strong></p>
          <ul style="margin: 0; padding-left: 15px;">
            ${pointsListItems}
          </ul>
        `;
			}

			const popupContent = `
        <div class="europe-only-popup">
          <h4>${regionType}: ${displayName}</h4>
          <p><strong>${getVariableDisplayName(currentVariableValue)}:</strong> ${intensity !== null && intensity !== undefined ? getFormattedVariableValue(currentVariableValue, intensity) : "N/A"}</p>
          <p><strong>Data Source:</strong> ${dataSource}</p>
          ${isFallback ? `<p><small style="color: #666;">⚠️ Using nearest available data point</small></p>` : ""}
          ${isModelData ? `<p><small style="color: #007acc;">📊 Model data</small></p>` : ""}
          ${coordinateInfo}
          ${dataPointsList}
          <p><small>Region ID: ${NUTS_ID || "N/A"}</small></p>
        </div>
      `;
			(layer as L.Layer & { bindPopup: (content: string) => void }).bindPopup(
				popupContent,
			);
		}
	};

	return (
		<div>
			<div className="climate-map-container">
				<MapHeader
					selectedModel={selectedModel}
					handleModelSelect={handleModelSelect}
					selectedOptimism={selectedOptimism}
					setSelectedOptimism={setSelectedOptimism}
					getOptimismLevels={getOptimismLevels}
					mapMode={mapMode}
					onMapModeChange={setMapMode}
					styleMode={styleMode}
					onStyleModeChange={setStyleMode}
				/>

				<div className="map-content-wrapper">
					<div className="map-content" style={{ position: "relative" }}>
						<MapContainer
							className="full-height-map"
							center={[10, 12]}
							zoom={3}
							minZoom={MIN_ZOOM}
							maxZoom={MAX_ZOOM}
							ref={setMap}
							zoomControl={false}
							worldCopyJump={false}
							style={{
								backgroundColor: "white",
								marginLeft: isMobile ? "0px" : "140px",
								width: isMobile ? "100%" : "calc(100% - 140px)",
							}}
						>
							{mapMode === "grid" && (
								<Pane name="worldPane" style={{ zIndex: 10 }}>
									{worldGeoJSON && (
										<GeoJSON data={worldGeoJSON} style={worldStyle} />
									)}
								</Pane>
							)}
							{mapMode === "grid" && (
								<Pane name="gridPane" style={{ zIndex: 20, opacity: 1.0 }}>
									{temperatureData.length > 0 && viewport && dataExtremes && (
										<div>
											<ClippedGridLayer
												dataPoints={[...temperatureData]}
												viewport={viewport}
												resolutionLevel={resolutionLevel}
												extremes={dataExtremes}
												countriesGeoJSON={worldGeoJSON || undefined}
											/>
										</div>
									)}
								</Pane>
							)}

							{mapMode === "worldwide" && (
								<Pane name="worldwidePane" style={{ zIndex: 30, opacity: 0.9 }}>
									{convertedWorldwideGeoJSON?.features &&
										convertedWorldwideGeoJSON.features.length > 0 && (
											<GeoJSON
												data={convertedWorldwideGeoJSON}
												style={(f) => (f ? worldwideStyle(f) : {})}
												onEachFeature={onEachWorldwideFeature}
											/>
										)}
								</Pane>
							)}

							{mapMode === "europe-only" && (
								<Pane
									name="europeOnlyPane"
									style={{ zIndex: 30, opacity: 0.9 }}
								>
									{!isProcessingEuropeOnly &&
										convertedEuropeOnlyGeoJSON?.features &&
										convertedEuropeOnlyGeoJSON.features.length > 0 && (
											<div>
												<div
													hidden
													style={{
														position: "fixed",
														top: "150px",
														left: "150px",
														backgroundColor: "red",
														color: "white",
														padding: "50px",
														zIndex: "92382354",
													}}
												>
													GeoJSON debug:{" "}
													{
														convertedEuropeOnlyGeoJSON.features[0].properties
															.NUTS_ID
													}
													:{" "}
													{
														convertedEuropeOnlyGeoJSON.features[0].properties
															.intensity
													}
												</div>
												<GeoJSON
													data={convertedEuropeOnlyGeoJSON}
													key={
														convertedEuropeOnlyGeoJSON.features[0].properties
															.intensity
													}
													style={(f) => (f ? nutsStyle(f) : {})}
													onEachFeature={onEachEuropeOnlyFeature}
												/>
											</div>
										)}
								</Pane>
							)}

							<ViewportMonitor onViewportChange={handleViewportChange} />
						</MapContainer>

						{/* Loading Skeleton Overlay */}
						<LoadingSkeleton
							isProcessing={
								isProcessingEuropeOnly || isProcessingWorldwide || isLoadingData
							}
							message={
								isProcessingEuropeOnly
									? "Processing Europe-only data..."
									: isProcessingWorldwide
										? "Processing worldwide data..."
										: "Loading map data..."
							}
						/>

						{/* Bottom UI Container - TimelineSelector and ControlBar */}
						{styleMode === "unchanged" && (
							<div
								style={
									isMobile
										? {}
										: {
												position: "fixed",
												bottom: "10px",
												left: "50%",
												transform: "translateX(-50%)",
												zIndex: 600,
												pointerEvents: "auto",
												display: "flex",
												flexDirection: "column",
												alignItems: "center",
												gap: "12px",
											}
								}
							>
								{!isMobile && (
									<ControlBar
										map={map}
										selectedModel={selectedModel}
										onModelSelect={handleModelSelect}
										styleMode={styleMode}
									/>
								)}

								<TimelineSelector
									year={currentYear}
									month={currentMonth}
									onYearChange={setCurrentYear}
									onMonthChange={setCurrentMonth}
									styleMode={styleMode}
									legend={
										dataExtremes ? (
											<Legend
												extremes={dataExtremes}
												unit={getVariableUnit(currentVariableValue)}
											/>
										) : (
											<div />
										)
									}
								/>
							</div>
						)}

						{/* Advanced Timeline Selector - Now supports mobile */}
						{styleMode !== "unchanged" && (
							<AdvancedTimelineSelector
								year={currentYear}
								month={currentMonth}
								onYearChange={setCurrentYear}
								onMonthChange={setCurrentMonth}
								onZoomIn={handleZoomIn}
								onZoomOut={handleZoomOut}
								onResetZoom={handleResetZoom}
								onLocationFind={handleLocationFind}
								onScreenshot={handleScreenshot}
								onModelInfo={handleModelInfo}
								onAbout={handleAbout}
								colorScheme={styleMode === "purple" ? "purple" : "red"}
								map={map}
								screenshoter={screenshoter}
								legend={
									dataExtremes ? (
										<Legend
											extremes={dataExtremes}
											unit={getVariableUnit(currentVariableValue)}
										/>
									) : (
										<div />
									)
								}
							/>
						)}

						{/* Mobile ControlBar stays in original position */}
						{isMobile && (
							<ControlBar
								map={map}
								selectedModel={selectedModel}
								onModelSelect={handleModelSelect}
								styleMode={styleMode}
							/>
						)}
					</div>
				</div>

				{/* Desktop-only legend positioned over the map */}
				{!isMobile && dataExtremes && (
					<Legend
						extremes={dataExtremes}
						unit={getVariableUnit(currentVariableValue)}
					/>
				)}

				<div className="map-bottom-bar">
					<div className="control-section">
						{processingError && (
							<button
								type="button"
								onClick={() => {
									setProcessingError(false);
									setError(null);
									console.log("Processing error reset");
								}}
								className="secondary-button"
							>
								Reset Processing Error
							</button>
						)}
					</div>

					{error && (
						<div className="error-message">
							<p>{error}</p>
							{processingError && (
								<p>
									<small>
										Processing has been stopped to prevent infinite errors. Use
										the reset button to try again.
									</small>
								</p>
							)}
						</div>
					)}

					{viewport && (
						<DebugStatsPanel
							stats={{ processed: 0, skipped: 0, errors: 0 }}
							temperatureDataCount={temperatureData.length}
							currentResolution={resolutionLevel}
							viewport={viewport}
						/>
					)}
				</div>
			</div>

			{/* Modals for Advanced Timeline */}
			<ModelDetailsModal
				isOpen={isModelInfoOpen}
				onClose={() => setIsModelInfoOpen(false)}
				models={models}
				selectedModelId={selectedModel}
				onModelSelect={handleModelSelect}
			/>

			<Modal
				title="About OneHealth Platform"
				open={isAboutOpen}
				onCancel={() => setIsAboutOpen(false)}
				footer={null}
				width={600}
			>
				<AboutContent />
			</Modal>

			<NoDataModal
				isOpen={lackOfDataModalVisible}
				onClose={() => setLackOfDataModalVisible(false)}
				onLoadCurrentYear={handleLoadCurrentYear}
				requestedYear={requestedYear}
				errorMessage={apiErrorMessage}
			/>

			<Footer />
		</div>
	);
};

export default ClimateMap;
