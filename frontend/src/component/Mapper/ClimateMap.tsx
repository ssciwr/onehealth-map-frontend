import { Modal } from "antd";
import { useCallback, useEffect, useRef, useState } from "react";
import { GeoJSON, MapContainer, Marker, Pane, TileLayer } from "react-leaflet";
import NutsMapperV5 from "./utilities/prepareNutsDataForDrawing";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import ViewportMonitor from "./ViewportMonitor.tsx";
import "./Map.css";
import { Layers } from "lucide-react";
import Footer, { AboutContent } from "../../static/Footer.tsx";
import AdaptiveGridLayer from "./AdaptiveGridLayer.tsx";
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
	ProcessingStats,
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
	const [nutsGeoJSON, setNutsGeoJSON] = useState<NutsGeoJSON | null>(null);
	const [loading, setLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);
	const [stats, setStats] = useState<ProcessingStats>({
		processed: 0,
		skipped: 0,
		errors: 0,
	});
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
	const fileInputRef = useRef<HTMLInputElement>(null);

	// Cities loaded from external data source
	const [cities, setCities] = useState<
		Array<{
			name: string;
			lat: number;
			lng: number;
			tier: number;
			population: number;
		}>
	>([]);

	// Grid/NUTS mode state
	const [mapMode, setMapMode] = useState<"grid" | "nuts">("nuts");
	const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);
	const [currentHoveredLayer, setCurrentHoveredLayer] =
		useState<L.Layer | null>(null);
	const [showTileLayer, setShowTileLayer] = useState<boolean>(false);

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

	// Load cities data from JSON file
	useEffect(() => {
		const loadCities = async () => {
			try {
				const response = await fetch("/data/cities.json");
				const data = await response.json();

				// Create tiers based on population
				const citiesWithTiers = data.cities.map(
					(city: {
						name: string;
						lat: number;
						lng: number;
						population: number;
					}) => ({
						...city,
						tier:
							city.population >= 10000000
								? 1
								: // Tier 1: 10M+ population
									city.population >= 5000000
									? 2
									: // Tier 2: 5M-10M population
										city.population >= 1000000
										? 3
										: // Tier 3: 1M-5M population
											4, // Tier 4: <1M population
					}),
				);

				setCities(citiesWithTiers);
			} catch (error) {
				console.error("Failed to load cities data:", error);
				// Fallback to empty array if loading fails
				setCities([]);
			}
		};

		onMount();
		loadCities();
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

	// Convert grid data to NUTS when mode is NUTS and temperature data is available
	useEffect(() => {
		const convertToNuts = async () => {
			if (mapMode === "nuts" && temperatureData.length > 0) {
				try {
					console.log("Converting grid data to NUTS regions...");
					const { nutsGeoJSON, extremes } =
						await gridToNutsConverter.convertGridDataToNuts(temperatureData);
					setConvertedNutsGeoJSON(nutsGeoJSON);
					setDataExtremes(extremes);
				} catch (error) {
					console.error("Failed to convert grid data to NUTS:", error);
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
	}, [mapMode, temperatureData]);

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

	const loadNutsData = () => {
		setLoading(true);
		setError(null);

		fetch("/data/nutsRegions.csv")
			.then((response) => response.text())
			.then((csvData) => {
				processCSVData(csvData);
				setLoading(false);
			})
			.catch((err: Error) => {
				console.error("Error loading NUTS data:", err);
				setError(err.message);
				setLoading(false);
				errorStore.showError("NUTS Data Error", err.message);
			});
	};

	const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (!file) return;

		setLoading(true);
		setError(null);
		loadingStore.start();
		console.log("Started loading of file upload store...");

		const reader = new FileReader();
		reader.onload = (e) => {
			try {
				const csvData = e.target?.result as string;
				processCSVData(csvData);
			} catch (err: unknown) {
				const error = err as Error;
				console.error("Error processing uploaded file:", error);
				setError(error.message);
				setLoading(false);
				loadingStore.complete();
				errorStore.showError("File Processing Error", error.message);
			}
		};
		reader.onerror = (err) => {
			console.error("File reading error:", err);
			setError("Error reading file");
			setLoading(false);
			loadingStore.complete();
			errorStore.showError(
				"File Reading Error",
				"Error reading the uploaded file",
			);
		};
		reader.readAsText(file);
	};

	const processCSVData = (csvData: string) => {
		try {
			const nutsMapper = new NutsMapperV5();
			const geoJSON = nutsMapper.parseNutsCSV(csvData);
			setNutsGeoJSON(geoJSON as NutsGeoJSON);
			setStats(nutsMapper.getStats());

			if (geoJSON?.features) {
				const intensities = geoJSON.features
					.map((feature) => feature.properties.intensity)
					.filter(
						(intensity): intensity is number =>
							intensity !== null && !Number.isNaN(intensity),
					);

				if (intensities.length > 0) {
					const extremes = {
						min: Math.min(...intensities),
						max: Math.max(...intensities),
					};
					setDataExtremes(extremes);
				}
			}
		} catch (err: unknown) {
			const error = err as Error;
			console.error("Error processing CSV data:", error);
			setError(error.message);
			errorStore.showError("CSV Processing Error", error.message);
		} finally {
			setLoading(false);
		}
	};

	const handleUploadClick = () => {
		fileInputRef.current?.click();
	};

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

	const style = (feature: GeoJSON.Feature) => {
		if (!feature || !feature.properties) return {};

		const properties = feature.properties as { intensity?: number };

		return {
			fillColor: dataExtremes
				? getColorFromGradient(
						properties.intensity || 0,
						dataExtremes,
						"#8b5cf6",
						"#cccccc",
					)
				: "blue",
			weight: 1,
			opacity: 1,
			color: "white",
			dashArray: "3",
			fillOpacity: 0.7,
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

	const worldStyle = () => {
		return {
			fillColor: "#374151",
			weight: 0.5,
			opacity: 0.8,
			color: "#6b7280",
			fillOpacity: 1,
		};
	};

	const createCityLabelIcon = (
		city: { name: string; tier: number; population: number },
		_zoom: number,
	) => {
		const fontSize =
			city.tier === 1 ? 13 : city.tier === 2 ? 12 : city.tier === 3 ? 11 : 10;
		const fontWeight = city.tier === 1 ? 600 : city.tier === 2 ? 500 : 400;

		return L.divIcon({
			html: `<span class="city-name" style="font-size: ${fontSize}px; font-weight: ${fontWeight};">${city.name}</span>`,
			className: "city-label-marker",
			iconSize: [0, 0],
			iconAnchor: [0, 0],
		});
	};

	const getVisibleCities = (zoom: number) => {
		if (zoom >= 6) return cities; // Show all cities
		if (zoom >= 5) return cities.filter((city) => city.tier <= 3); // Show tiers 1-3
		if (zoom >= 4) return cities.filter((city) => city.tier <= 2); // Show tiers 1-2
		return cities.filter((city) => city.tier === 1); // Show only tier 1
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

	const onEachFeature = (feature: GeoJSON.Feature, layer: L.Layer) => {
		layer.on({
			mouseover: highlightFeature,
			mouseout: resetHighlight,
		});

		if (feature.properties) {
			const properties = feature.properties as {
				NUTS_ID?: string;
				intensity?: number;
			};
			const { NUTS_ID, intensity } = properties;
			const popupContent = `
        <div class="nuts-popup">
          <h4>NUTS Region: ${NUTS_ID || "Unknown"}</h4>
          <p>Value: ${intensity !== null && intensity !== undefined ? `${intensity.toFixed(1)}°C` : "N/A"}</p>
        </div>
      `;
			(layer as L.Layer & { bindPopup: (content: string) => void }).bindPopup(
				popupContent,
			);
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
							{showTileLayer && (
								<TileLayer
									url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
									noWrap={true}
								/>
							)}
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

							<Pane name="geoJsonPane" style={{ zIndex: 40 }}>
								{nutsGeoJSON?.features && nutsGeoJSON.features.length > 0 && (
									<GeoJSON
										data={nutsGeoJSON}
										style={(f) => (f ? style(f) : {})}
										onEachFeature={onEachFeature}
									/>
								)}
							</Pane>

							{mapMode === "grid" && (
								<Pane name="cityLabelsPane" style={{ zIndex: 350 }}>
									{viewport &&
										getVisibleCities(viewport.zoom).map((city) => (
											<Marker
												key={`${city.name}-${city.lat}-${city.lng}`}
												position={[city.lat, city.lng]}
												icon={createCityLabelIcon(city, viewport.zoom)}
											/>
										))}
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
						<button
							type="button"
							onClick={loadNutsData}
							disabled={loading}
							className="primary-button"
						>
							<Layers size={18} />
							{loading ? "Loading..." : "Load NUTS Regions"}
						</button>

						<button
							type="button"
							onClick={handleUploadClick}
							disabled={loading}
							className="secondary-button"
						>
							Upload NUTS CSV
						</button>

						<button
							type="button"
							onClick={() => setShowTileLayer(!showTileLayer)}
							className={showTileLayer ? "primary-button" : "secondary-button"}
							title={
								showTileLayer ? "Hide map background" : "Show map background"
							}
						>
							🗺️ {showTileLayer ? "Hide" : "Show"} Background
						</button>

						<input
							type="file"
							ref={fileInputRef}
							onChange={handleFileUpload}
							accept=".csv"
							style={{ display: "none" }}
						/>
					</div>

					{error && (
						<div className="error-message">
							<p>{error}</p>
						</div>
					)}

					{viewport && (
						<DebugStatsPanel
							stats={stats}
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
