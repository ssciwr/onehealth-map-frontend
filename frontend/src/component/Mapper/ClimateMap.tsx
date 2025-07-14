import * as turf from "@turf/turf";
import { Modal } from "antd";
import { useCallback, useEffect, useRef, useState } from "react";
import { GeoJSON, MapContainer, Marker, Pane, TileLayer } from "react-leaflet";
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
import type {
	DataExtremes,
	NutsGeoJSON,
	TemperatureDataPoint,
	ViewportBounds,
} from "./types.ts";
import { getColorFromGradient } from "./utilities/gradientUtilities";
import { gridToNutsConverter } from "./utilities/gridToNutsConverter";
import {
	Legend,
	MAX_ZOOM,
	MIN_ZOOM,
	loadTemperatureData,
} from "./utilities/mapDataUtils";

interface ViewportChangeData {
	bounds: L.LatLngBounds;
	zoom: number;
}

const ClimateMap = ({ onMount = () => true }) => {
	const [loading, setLoading] = useState<boolean>(false);
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
	const [currentYear, setCurrentYear] = useState<number>(2025);
	const [currentMonth, setCurrentMonth] = useState<number>(1);
	const [map, setMap] = useState<L.Map | null>(null);
	const [dataExtremes, setDataExtremes] = useState<DataExtremes | null>(null);
	const [dataBounds, setDataBounds] = useState<L.LatLngBounds | null>(null);
	const [worldGeoJSON, setWorldGeoJSON] =
		useState<GeoJSON.FeatureCollection | null>(null);
	const [convertedNutsGeoJSON, setConvertedNutsGeoJSON] =
		useState<NutsGeoJSON | null>(null);
	const [africanRegionsGeoJSON, setAfricanRegionsGeoJSON] =
		useState<GeoJSON.FeatureCollection | null>(null);

	// Natural Earth URL and African countries list
	const NATURAL_EARTH_URL =
		"https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_1_states_provinces.geojson";

	const africanCountries = [
		"South Africa",
		"Nigeria",
		"Kenya",
		"Ghana",
		"Ethiopia",
		"Morocco",
		"Egypt",
		"Tanzania",
		"Uganda",
		"Algeria",
		"Sudan",
		"Libya",
		"Chad",
		"Mali",
		"Niger",
		"Angola",
		"Burkina Faso",
		"Cameroon",
		"Madagascar",
		"Zambia",
		"Senegal",
	];

	// Grid/NUTS mode state
	const [mapMode, setMapMode] = useState<"grid" | "nuts">("nuts");
	const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);
	const [currentHoveredLayer, setCurrentHoveredLayer] =
		useState<L.Layer | null>(null);

	// Style mode state
	const [styleMode, setStyleMode] = useState<"unchanged" | "purple" | "red">(
		"unchanged",
	);

	// Screenshoter state
	const [screenshoter, setScreenshoter] =
		useState<L.SimpleMapScreenshoter | null>(null);

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

					const model = {
						id: result.id || "",
						virusType: result.virusType || "",
						modelName: result.modelName || "",
						title: result.title || "",
						description: result.description || "",
						emoji: result.emoji || "",
						icon: result.icon || "",
						color: result.color || "",
						details: result.details || "",
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

	const handleLoadTemperatureData = useCallback(async (year: number) => {
		try {
			loadingStore.start();
			console.log("Started loading of store...");
			const { dataPoints, extremes, bounds } = await loadTemperatureData(year);
			setTemperatureData(dataPoints);
			setDataExtremes(extremes);
			if (bounds) {
				setDataBounds(bounds);
			}
			console.log("Finished loading of store...");
			loadingStore.complete();
		} catch (err: unknown) {
			const error = err as Error;
			loadingStore.complete();
			errorStore.showError(
				"Temperature Data Error",
				`Failed to load temperature data: ${error.message}`,
			);
			setError(`Failed to load temperature data: ${error.message}`);
		}
	}, []);

	useEffect(() => {
		handleLoadTemperatureData(currentYear);
	}, [currentYear, handleLoadTemperatureData]);

	// Load African regions on mount
	useEffect(() => {
		loadAfricanRegions();
	}, []);

	// Load African administrative regions
	const loadAfricanRegions = async () => {
		try {
			console.log("Loading global administrative regions...");
			const response = await fetch(NATURAL_EARTH_URL);
			const data = await response.json();

			// Load ALL administrative regions from around the world - no geographic filtering
			const allFeatures = data.features.filter((feature: any) => {
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

			setAfricanRegionsGeoJSON(globalRegions);
			console.log(
				`Loaded ${allFeatures.length} global administrative regions from all countries`,
			);
		} catch (error) {
			console.error("Failed to load African administrative regions:", error);
		}
	};

	// Sample temperature data to 1% for performance
	const sampleTemperatureData = (
		temperatureData: TemperatureDataPoint[],
		sampleRate = 0.01,
	) => {
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
	};

	// Calculate average temperature for a region based on points within it
	const calculateRegionTemperature = (
		regionFeature: any,
		temperatureData: TemperatureDataPoint[],
	) => {
		const regionName =
			regionFeature.properties.name ||
			regionFeature.properties.name_en ||
			regionFeature.properties.admin ||
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

		console.log(
			`Region ${regionName}: found ${pointsInRegion.length} points within region`,
		);

		// Debug: For first few regions, test with some sample points
		if (temperatureData.length > 0) {
			const samplePoint = temperatureData[0];
			const testResult = isPointInRegion(
				samplePoint.lat,
				samplePoint.lng,
				regionFeature.geometry,
			);
			console.log(
				`Region ${regionName}: testing sample point (${samplePoint.lat}, ${samplePoint.lng}) - inside: ${testResult}`,
			);
		}

		if (pointsInRegion.length === 0) {
			// Fallback: find nearest point
			const nearestPoint = findNearestPoint(regionFeature, temperatureData);
			console.log(
				`Region ${regionName}: using nearest point fallback, temp: ${nearestPoint ? nearestPoint.temperature : "null"}`,
			);
			return nearestPoint ? nearestPoint.temperature : null;
		}

		// Calculate average temperature
		const avgTemp =
			pointsInRegion.reduce((sum, point) => sum + point.temperature, 0) /
			pointsInRegion.length;
		console.log(
			`Region ${regionName}: calculated average temp: ${avgTemp} from ${pointsInRegion.length} points`,
		);
		return avgTemp;
	};

	// Use turf.js for accurate point-in-polygon checking
	const isPointInRegion = (lat: number, lon: number, geometry: any) => {
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
				isNaN(lat) ||
				isNaN(lon) ||
				!isFinite(lat) ||
				!isFinite(lon)
			) {
				console.error("Invalid lat/lon values:", {
					lat,
					lon,
					latType: typeof lat,
					lonType: typeof lon,
					latIsNaN: isNaN(lat),
					lonIsNaN: isNaN(lon),
					latIsFinite: isFinite(lat),
					lonIsFinite: isFinite(lon),
				});
				return false;
			}

			if (!geometry || !geometry.type || !geometry.coordinates) {
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
			const result = turf.booleanPointInPolygon(point, polygon);

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
				geometryCoordinates: geometry?.coordinates ? "present" : "missing",
				errorMessage: error.message,
				errorStack: error.stack,
			});
			return false;
		}
	};

	// Find nearest temperature point to a region using turf.js
	const findNearestPoint = (
		regionFeature: any,
		temperatureData: TemperatureDataPoint[],
	) => {
		try {
			// Get centroid of the region using turf.js
			const polygon = turf.feature(regionFeature.geometry);
			const centroid = turf.centroid(polygon);
			const [centroidLon, centroidLat] = centroid.geometry.coordinates;

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
	};

	// Get bounds of a geometry feature using turf.js
	const getFeatureBounds = (geometry: any) => {
		try {
			const polygon = turf.feature(geometry);
			const bbox = turf.bbox(polygon);
			const [west, south, east, north] = bbox;

			return { north, south, east, west };
		} catch (error) {
			console.error("Error getting feature bounds:", error);
			return { north: -90, south: 90, east: -180, west: 180 };
		}
	};

	// Convert grid data to NUTS when mode is NUTS and temperature data is available
	useEffect(() => {
		// Skip processing if there's already a processing error
		if (processingError) {
			console.log("Skipping processing due to previous error");
			return;
		}

		const convertToNuts = async () => {
			if (mapMode === "nuts" && temperatureData.length > 0) {
				// Load African regions if not already loaded
				if (!africanRegionsGeoJSON) {
					try {
						await loadAfricanRegions();
					} catch (error) {
						console.error("Failed to load African regions:", error);
						setProcessingError(true);
						setError("Failed to load African regions");
					}
					return;
				}

				try {
					console.log(
						"Converting grid data to global administrative regions...",
					);
					console.log(
						`Processing ${africanRegionsGeoJSON.features.length} global regions`,
					);

					// Sample temperature data to 10% for better accuracy
					const sampledTemperatureData = sampleTemperatureData(
						temperatureData,
						0.02,
					);
					console.log(
						`Temperature data sample: first few points:`,
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

					// Debug: Show bounds of first few global regions
					console.log(
						`First 3 global regions:`,
						africanRegionsGeoJSON.features.slice(0, 3).map((f) => ({
							name:
								f.properties.name || f.properties.name_en || f.properties.admin,
							bounds: getFeatureBounds(f.geometry),
						})),
					);

					// Process each global region and calculate temperature
					const processedFeatures = [];
					let hasError = false;

					for (
						let index = 0;
						index < africanRegionsGeoJSON.features.length;
						index++
					) {
						const feature = africanRegionsGeoJSON.features[index];
						const regionName =
							feature.properties.name ||
							feature.properties.name_en ||
							feature.properties.admin ||
							`Region-${index}`;

						try {
							console.log(`Processing region ${index + 1}: ${regionName}`);

							const avgTemp = calculateRegionTemperature(
								feature,
								sampledTemperatureData,
							);
							const result = {
								...feature,
								properties: {
									...feature.properties,
									intensity: avgTemp,
									NUTS_ID:
										feature.properties.name ||
										feature.properties.name_en ||
										"Unknown",
									countryName: feature.properties.admin || "Unknown Country",
									pointCount: sampledTemperatureData.filter((point) =>
										isPointInRegion(point.lat, point.lng, feature.geometry),
									).length,
									isFallback:
										sampledTemperatureData.filter((point) =>
											isPointInRegion(point.lat, point.lng, feature.geometry),
										).length === 0,
								},
							};

							if (result.properties.intensity !== null) {
								processedFeatures.push(result);
								console.log(
									`Region ${regionName} processed successfully: intensity=${avgTemp}`,
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

					setConvertedNutsGeoJSON(processedGeoJSON as NutsGeoJSON);

					// Calculate extremes from processed data
					const temperatures = processedFeatures
						.map((f) => f.properties.intensity)
						.filter((t) => t !== null);
					console.log(
						`Temperature values for extremes calculation:`,
						temperatures,
					);
					if (temperatures.length > 0) {
						const extremes = {
							min: Math.min(...temperatures),
							max: Math.max(...temperatures),
						};
						setDataExtremes(extremes);
						console.log("Set African regions extremes:", extremes);
						console.log(
							`Total regions with temperature data: ${temperatures.length}`,
						);
					} else {
						console.warn("No temperature data found for any region!");
					}
				} catch (error) {
					console.error(
						"Failed to convert grid data to African regions:",
						error,
					);
					setProcessingError(true);
					setError("Failed to process African regions");
				}
			} else if (mapMode === "grid") {
				setConvertedNutsGeoJSON(null);
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
			}
		};

		convertToNuts();
	}, [mapMode, temperatureData, africanRegionsGeoJSON, processingError]);

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
							[position.coords.latitude, position.coords.lnggitude],
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

	const worldStyle = () => {
		return {
			fillColor: "#374151",
			weight: 0.5,
			opacity: 0.8,
			color: "#6b7280",
			fillOpacity: 1,
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
			if (mapMode === "nuts" && convertedNutsGeoJSON) {
				prevLayer.setStyle(nutsStyle(prevLayer.feature));
			} else if (nutsGeoJSON) {
				prevLayer.setStyle(style(prevLayer.feature));
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

		// Show popup on hover for NUTS mode with slight delay
		if (mapMode === "nuts") {
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
			if (mapMode === "nuts" && convertedNutsGeoJSON) {
				geoJSONLayer.setStyle(nutsStyle(geoJSONLayer.feature));
			} else if (nutsGeoJSON) {
				geoJSONLayer.setStyle(style(geoJSONLayer.feature));
			}

			// Close popup on mouseout for NUTS mode
			if (mapMode === "nuts") {
				(geoJSONLayer as L.Layer & { closePopup: () => void }).closePopup();
			}

			setCurrentHoveredLayer(null);
		}
	};

	const onEachNutsFeature = (feature: GeoJSON.Feature, layer: L.Layer) => {
		layer.on({
			mouseover: highlightFeature,
			mouseout: resetHighlight,
		});

		if (feature.properties) {
			const properties = feature.properties as {
				NUTS_ID?: string;
				intensity?: number;
				countryName?: string;
				pointCount?: number;
				isFallback?: boolean;
			};
			const { NUTS_ID, intensity, countryName, pointCount, isFallback } =
				properties;
			const displayName = countryName || NUTS_ID || "Unknown Country";

			const dataSource = isFallback
				? "Nearest point"
				: pointCount && pointCount > 0
					? `${pointCount} data points`
					: "Calculated";

			const popupContent = `
        <div class="nuts-popup">
          <h4>${displayName}</h4>
          <p><strong>Temperature:</strong> ${intensity !== null && intensity !== undefined ? `${intensity.toFixed(1)}°C` : "N/A"}</p>
          <p><strong>Data Source:</strong> ${dataSource}</p>
          ${isFallback ? `<p><small style="color: #666;">⚠️ Using nearest available data point</small></p>` : ""}
          <p><small>Region: ${NUTS_ID || "N/A"}</small></p>
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

							{mapMode === "nuts" && (
								<Pane name="nutsPane" style={{ zIndex: 30, opacity: 0.9 }}>
									{convertedNutsGeoJSON?.features &&
										convertedNutsGeoJSON.features.length > 0 && (
											<GeoJSON
												data={convertedNutsGeoJSON}
												style={(f) => (f ? nutsStyle(f) : {})}
												onEachFeature={onEachNutsFeature}
											/>
										)}
								</Pane>
							)}

							<ViewportMonitor onViewportChange={handleViewportChange} />
						</MapContainer>

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
												unit="°C"
												isMobile={isMobile}
											/>
										) : (
											<div />
										)
									}
								/>
							</div>
						)}

						{/* Advanced Timeline Selector - Desktop Only */}
						{!isMobile && styleMode !== "unchanged" && (
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
											unit="°C"
											isMobile={false}
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
							/>
						)}
					</div>
				</div>

				{/* Desktop-only legend positioned over the map */}
				{!isMobile && dataExtremes && (
					<Legend extremes={dataExtremes} unit="°C" isMobile={false} />
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

			<Footer />
		</div>
	);
};

export default ClimateMap;
