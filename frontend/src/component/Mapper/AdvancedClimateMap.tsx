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
import "./Advanced.css";
import { Layers } from "lucide-react";
import Footer from "../../static/Footer.tsx";
import AdaptiveGridLayer from "./AdaptiveGridLayer.tsx";
import AdvancedMapHeader from "./AdvancedMapHeader";
import DebugStatsPanel from "./DebugStatsPanel.tsx";
import ControlBar, {
	CONTROL_BAR_LOCATIONS,
} from "./InterfaceInputs/ControlBar.tsx";
import "leaflet-simple-map-screenshoter";
import { isMobile } from "react-device-detect";
import AdvancedLegend from "./AdvancedLegend.tsx";
import TimelineSelector from "./InterfaceInputs/TimelineSelector.tsx";
import type {
	DataExtremes,
	NutsGeoJSON,
	OutbreakData,
	ProcessingStats,
	TemperatureDataPoint,
	ViewportBounds,
} from "./types.ts";
import {
	BottomLegend,
	MAX_ZOOM,
	MIN_ZOOM,
	loadTemperatureData,
	parseCSVToOutbreaks,
} from "./utilities/AdvancedMapDataUtils.tsx";
import { getColorFromGradient } from "./utilities/advancedGradientUtilities";

interface ViewportChangeData {
	bounds: L.LatLngBounds;
	zoom: number;
}
const ProgressBar = ({ label }) => {
	// Generate random percentage inline (40-100% in 5% intervals)
	const percentage = 40 + Math.floor(Math.random() * 13) * 5;

	// Simple color logic
	const isGreen = percentage > 80;
	const bgColor = isGreen ? "#059669" : "#3b82f6";
	const textColor = isGreen ? "#064e3b" : "#1e40af";

	return (
		<div style={{ marginBottom: "20px" }}>
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					marginBottom: "8px",
				}}
			>
				<span style={{ fontSize: "14px", color: textColor, fontWeight: "500" }}>
					{label}
				</span>
				<span style={{ fontSize: "14px", color: textColor, fontWeight: "600" }}>
					{percentage}%
				</span>
			</div>
			<div
				style={{
					height: "12px",
					backgroundColor: "#e2e8f0",
					borderRadius: "6px",
				}}
			>
				<div
					style={{
						width: `${percentage}%`,
						height: "100%",
						backgroundColor: bgColor,
						borderRadius: "6px",
					}}
				/>
			</div>
		</div>
	);
};

/** An advanced version of the climate map with a totally different layout **/
const AdvancedClimateMap = ({ onMount = () => true }) => {
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
			console.log("Setting data points... ", dataPoints);
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

	if (isMobile) {
		// Keep existing mobile layout unchanged
		return (
			<div>
				<div className="climate-map-container">
					<AdvancedMapHeader
						selectedModel={selectedModel}
						handleModelSelect={handleModelSelect}
						selectedOptimism={selectedOptimism}
						setSelectedOptimism={setSelectedOptimism}
						getOptimismLevels={getOptimismLevels}
					/>

					<div className="map-content-wrapper">
						<div className="map-content" style={{ position: "relative" }}>
							<MapContainer
								style={{ minWidth: "30vh" }}
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
									attribution=""
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

								<div
									style={{
										position: "relative",
										bottom: "10px",
										zIndex: 1000,
										pointerEvents: "auto",
									}}
								>
									<TimelineSelector
										year={currentYear}
										month={currentMonth}
										onYearChange={setCurrentYear}
										onMonthChange={setCurrentMonth}
										legend={
											dataExtremes ? (
												<BottomLegend
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
							</MapContainer>

							<ControlBar position={CONTROL_BAR_LOCATIONS.TOP_LEFT} map={map} />
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
	}

	// Desktop layout - redesigned
	return (
		<div
			style={{
				height: "100vh",
				display: "flex",
				flexDirection: "column",
				backgroundColor: "#f8fafc",
			}}
		>
			{/* Header with logo and model selector */}
			<div
				style={{
					height: "80px",
					backgroundColor: "#1e293b",
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					padding: "6px 40px",
					boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
					minWidth: "100vw",
				}}
			>
				<div>
					<h1
						style={{
							margin: 0,
							color: "#3b82f6",
							fontSize: "24px",
							fontWeight: "bold",
							fontFamily: "Arial, sans-serif",
						}}
					>
						OneHealth
					</h1>
					<p
						style={{
							margin: 0,
							color: "#91a6c3",
							fontSize: "14px",
							fontFamily: "Arial, sans-serif",
						}}
					>
						Disease Susceptibility Maps
					</p>
				</div>

				{/* Model selector moved to top right */}
				<div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
					<AdvancedMapHeader
						selectedModel={selectedModel}
						handleModelSelect={handleModelSelect}
						selectedOptimism={selectedOptimism}
						setSelectedOptimism={setSelectedOptimism}
						getOptimismLevels={getOptimismLevels}
					/>
				</div>
			</div>

			{/* Main content area */}
			<div style={{ flex: 1, display: "flex", gap: "20px", padding: "20px" }}>
				{/* Map area */}
				<div
					style={{
						flex: 1,
						backgroundColor: "white",
						borderRadius: "8px",
						overflow: "hidden",
						boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
						position: "relative",
					}}
				>
					<MapContainer
						center={[10, 12]}
						zoom={5}
						minZoom={MIN_ZOOM}
						maxZoom={MAX_ZOOM}
						ref={setMap}
						zoomControl={false}
						worldCopyJump={false}
						style={{ height: "100%", width: "100%" }}
					>
						<TileLayer
							url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
							attribution=""
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

						<ViewportMonitor onViewportChange={handleViewportChange} />
					</MapContainer>

					<ControlBar position={CONTROL_BAR_LOCATIONS.TOP_LEFT} map={map} />

					<AdvancedLegend />

					{/* Timeline at bottom of map */}
					<div
						style={{
							position: "absolute",
							bottom: "20px",
							left: "20px",
							right: "20px",
							zIndex: 500,
						}}
					>
						<TimelineSelector
							year={currentYear}
							month={currentMonth}
							onYearChange={setCurrentYear}
							onMonthChange={setCurrentMonth}
							legend={null}
						/>
					</div>
				</div>

				{/* Right sidebar */}
				<div
					style={{
						width: "390px",
						backgroundColor: "white",
						borderRadius: "8px",
						boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
						display: "flex",
						flexDirection: "column",
						overflow: "hidden",
					}}
				>
					{/* Model Configuration Section */}
					<div style={{ padding: "20px", borderBottom: "1px solid #e2e8f0" }}>
						<h3
							style={{
								margin: "0 0 15px 0",
								fontSize: "16px",
								fontWeight: "bold",
								color: "#1e293b",
							}}
						>
							Model Configuration
						</h3>
						<div
							style={{ display: "flex", flexDirection: "column", gap: "8px" }}
						>
							<p style={{ margin: 0, fontSize: "14px", color: "#64748b" }}>
								Disease Model: {selectedModel}
							</p>
							<p style={{ margin: 0, fontSize: "14px", color: "#64748b" }}>
								Prediction Type:{" "}
								{selectedOptimism.charAt(0).toUpperCase() +
									selectedOptimism.slice(1)}
							</p>
						</div>
					</div>

					{/* Data Sources Section */}
					<div style={{ padding: "20px", borderBottom: "1px solid #e2e8f0" }}>
						<h3
							style={{
								margin: "0 0 15px 0",
								fontSize: "16px",
								fontWeight: "bold",
								color: "#1e293b",
							}}
						>
							Data Sources
						</h3>
						<div
							style={{ display: "flex", flexDirection: "column", gap: "12px" }}
						>
							<div>
								<p
									style={{
										margin: "0 0 4px 0",
										fontSize: "13px",
										fontWeight: "600",
										color: "#475569",
									}}
								>
									Climate Data
								</p>
								<p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>
									NOAA weather stations, satellite imagery
								</p>
							</div>
							<div>
								<p
									style={{
										margin: "0 0 4px 0",
										fontSize: "13px",
										fontWeight: "600",
										color: "#475569",
									}}
								>
									Population Data
								</p>
								<p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>
									UN Population Division, WorldPop
								</p>
							</div>
							<div>
								<p
									style={{
										margin: "0 0 4px 0",
										fontSize: "13px",
										fontWeight: "600",
										color: "#475569",
									}}
								>
									Precipitation
								</p>
								<p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>
									GPM satellite, local weather stations
								</p>
							</div>
						</div>
					</div>

					{/* Data Quality Section */}
					<div style={{ padding: "20px", borderBottom: "1px solid #e2e8f0" }}>
						<h3
							style={{
								margin: "0 0 15px 0",
								fontSize: "16px",
								fontWeight: "bold",
								color: "#1e293b",
							}}
						>
							Data Quality
						</h3>
						<div
							style={{ display: "flex", flexDirection: "column", gap: "15px" }}
						>
							<ProgressBar label="Environmental" />
							<ProgressBar label="Surveillance" />
						</div>
					</div>

					{/* Action buttons */}
					<div
						style={{
							padding: "20px",
							display: "flex",
							gap: "10px",
							borderTop: "1px solid #e2e8f0",
						}}
					>
						<button
							type="button"
							onClick={() => console.log("Export data")}
							style={{
								flex: 1,
								padding: "10px",
								backgroundColor: "#3b82f6",
								color: "white",
								border: "none",
								borderRadius: "6px",
								fontSize: "14px",
								cursor: "pointer",
								fontFamily: "Arial, sans-serif",
							}}
						>
							Export Data
						</button>
						<button
							type="button"
							style={{
								flex: 1.2,
								padding: "10px",
								backgroundColor: "#059669",
								color: "white",
								border: "none",
								borderRadius: "6px",
								fontSize: "14px",
								cursor: "pointer",
								fontFamily: "Arial, sans-serif",
							}}
						>
							Read Paper
						</button>
					</div>
				</div>
			</div>

			{/* Hide these elements that were in the original */}
			<div style={{ display: "none" }}>
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
	);
};

export default AdvancedClimateMap;
