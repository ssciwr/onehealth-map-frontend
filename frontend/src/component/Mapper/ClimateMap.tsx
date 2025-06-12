import { useCallback, useEffect, useRef, useState } from "react";
import {
	CircleMarker,
	GeoJSON,
	MapContainer,
	Pane,
	Popup,
	TileLayer,
} from "react-leaflet";
import NutsMapperV5 from "./utilities/prepareNutsDataForDrawing";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import ViewportMonitor from "./ViewportMonitor.tsx";
import "./Map.css";
import { Layers } from "lucide-react";
import Footer from "../../static/Footer.tsx";
import AdaptiveGridLayer from "./AdaptiveGridLayer.tsx";
import DebugStatsPanel from "./DebugStatsPanel.tsx";
import ControlBar from "./InterfaceInputs/ControlBar.tsx";
import MapHeader from "./MapHeader.tsx";
import "leaflet-simple-map-screenshoter";
import TimelineSelector from "./InterfaceInputs/TimelineSelector.tsx";
import type {
	DataExtremes,
	NutsGeoJSON,
	OutbreakData,
	ProcessingStats,
	TemperatureDataPoint,
	ViewportBounds,
} from "./types.ts";
import { getColorFromGradient } from "./utilities/gradientUtilities";
import {
	BottomLegend,
	MAX_ZOOM,
	MIN_ZOOM,
	loadTemperatureData,
	parseCSVToOutbreaks,
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
	const [outbreaks, setOutbreaks] = useState<OutbreakData[]>([]);
	const [temperatureData, setTemperatureData] = useState<
		TemperatureDataPoint[]
	>([]);
	const [viewport, setViewport] = useState<ViewportBounds | null>(null);
	const [resolutionLevel, setResolutionLevel] = useState<number>(1);
	const [selectedModel, setSelectedModel] = useState<string>("temperature");
	const [selectedOptimism, setSelectedOptimism] =
		useState<string>("optimistic");
	const [currentYear, setCurrentYear] = useState<number>(2025);
	const [currentMonth, setCurrentMonth] = useState<number>(1);
	const [map, setMap] = useState<L.Map | null>(null);
	const [dataExtremes, setDataExtremes] = useState<DataExtremes | null>(null);
	const [dataBounds, setDataBounds] = useState<L.LatLngBounds | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		onMount();
	});

	const getOptimismLevels = () => ["optimistic", "realistic", "pessimistic"];

	const handleLoadTemperatureData = useCallback(async (year: number) => {
		try {
			const { dataPoints, extremes, bounds } = await loadTemperatureData(year);
			setTemperatureData(dataPoints);
			setDataExtremes(extremes);
			if (bounds) {
				setDataBounds(bounds);
			}
		} catch (err: unknown) {
			const error = err as Error;
			setError(`Failed to load temperature data: ${error.message}`);
		}
	}, []);

	useEffect(() => {
		handleLoadTemperatureData(currentYear);
	}, [currentYear, handleLoadTemperatureData]);

	useEffect(() => {
		if (map && dataBounds) {
			map.setMaxBounds(dataBounds);
		}
	}, [map, dataBounds]);

	useEffect(() => {
		fetch("/data/outbreaks.csv")
			.then((response) => response.text())
			.then((csvData) => {
				const parsedOutbreaks = parseCSVToOutbreaks(csvData);
				setOutbreaks(parsedOutbreaks);
			})
			.catch((err: Error) => {
				console.error("Error loading outbreaks data:", err);
				setError(err.message);
			});
	}, []);

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
			});
	};

	const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (!file) return;

		setLoading(true);
		setError(null);

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
			}
		};
		reader.onerror = (err) => {
			console.error("File reading error:", err);
			setError("Error reading file");
			setLoading(false);
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

	const highlightFeature = (e: L.LeafletMouseEvent) => {
		const layer = e.target as L.Path;
		layer.setStyle({
			weight: 3,
			color: "#666",
			dashArray: "",
			fillOpacity: 0.9,
		});

		if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
			layer.bringToFront();
		}
	};

	const resetHighlight = (e: L.LeafletMouseEvent) => {
		if (nutsGeoJSON) {
			const geoJSONLayer = e.target as L.Path & { feature: GeoJSON.Feature };
			geoJSONLayer.setStyle(style(geoJSONLayer.feature));
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

	return (
		<div>
			<div className="climate-map-container">
				<MapHeader
					selectedModel={selectedModel}
					handleModelSelect={handleModelSelect}
					selectedOptimism={selectedOptimism}
					setSelectedOptimism={setSelectedOptimism}
					getOptimismLevels={getOptimismLevels}
				/>

				<TimelineSelector
					year={currentYear}
					month={currentMonth}
					onYearChange={setCurrentYear}
					onMonthChange={setCurrentMonth}
					legend={
						dataExtremes ? (
							<BottomLegend extremes={dataExtremes} unit="°C" />
						) : (
							<div />
						)
					}
				/>

				<div className="map-content-wrapper">
					<div className="map-content" style={{ position: "relative" }}>
						<MapContainer
							className="full-height-map"
							center={[10, 12]}
							zoom={5}
							minZoom={MIN_ZOOM}
							maxZoom={MAX_ZOOM}
							ref={setMap}
							zoomControl={false}
							worldCopyJump={false}
						>
							<TileLayer
								url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
								attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
								noWrap={true}
							/>

							<Pane name="gridPane" style={{ zIndex: 340, opacity: 0.5 }}>
								{temperatureData.length > 0 && viewport && dataExtremes && (
									<div>
										<AdaptiveGridLayer
											dataPoints={[...temperatureData]}
											viewport={viewport}
											resolutionLevel={resolutionLevel}
											extremes={dataExtremes}
										/>
									</div>
								)}
							</Pane>

							<Pane name="geoJsonPane" style={{ zIndex: 320 }}>
								{nutsGeoJSON?.features && nutsGeoJSON.features.length > 0 && (
									<GeoJSON
										data={nutsGeoJSON}
										style={(f) => (f ? style(f) : {})}
										onEachFeature={onEachFeature}
									/>
								)}
							</Pane>

							<Pane name="markersPane" style={{ zIndex: 330 }}>
								{outbreaks.map((outbreak) => (
									<CircleMarker
										key={outbreak.id}
										center={[outbreak.latitude, outbreak.longitude]}
										radius={10}
										pathOptions={{
											fillColor: "#8A2BE2",
											color: "#000",
											weight: 1,
											opacity: 1,
											fillOpacity: 0.8,
										}}
									>
										<Popup className="outbreak-popup">
											<div>
												<h3>{outbreak.category}</h3>
												<p>
													<strong>Location:</strong> {outbreak.location}
												</p>
												<p>
													<strong>Date:</strong> {outbreak.date}
												</p>
												<p>
													<strong>Cases:</strong> {outbreak.cases}
												</p>
												{outbreak.notes && (
													<p>
														<strong>Notes:</strong> {outbreak.notes}
													</p>
												)}
											</div>
										</Popup>
									</CircleMarker>
								))}
							</Pane>

							<ViewportMonitor onViewportChange={handleViewportChange} />
						</MapContainer>

						{/* TimelineSelector positioned absolutely over the map */}
						<div
							style={{
								position: "absolute",
								top: "10px",
								left: "50%",
								transform: "translateX(-50%)",
								zIndex: 1000,
								pointerEvents: "auto",
							}}
						>
							<TimelineSelector
								year={currentYear}
								month={currentMonth}
								onYearChange={setCurrentYear}
								onMonthChange={setCurrentMonth}
							/>
						</div>

						<ControlBar map={map} />
					</div>
				</div>

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
			<Footer />
		</div>
	);
};

export default ClimateMap;
