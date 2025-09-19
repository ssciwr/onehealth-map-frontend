import { useCallback, useEffect } from "react";
import { MapContainer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type L from "leaflet";
import ViewportMonitor from "./ViewportMonitor.tsx";
import "./Map.css";
import { isMobile } from "react-device-detect";
import { useClimateMapState } from "../../hooks/useClimateMapState";
import { useMapScreenshot } from "../../hooks/useMapScreenshot";
import { useModelData } from "../../hooks/useModelData";
import { useTemperatureData } from "../../hooks/useTemperatureData";
import { regionProcessor } from "../../services/RegionProcessor";
import Footer from "../../static/Footer.tsx";
import * as MapInteractionHandlers from "../../utils/MapInteractionHandlers";
import DebugStatsPanel from "./DebugStatsPanel.tsx";
import AdvancedTimelineSelector from "./InterfaceInputs/AdvancedTimelineSelector.tsx";
import MobileSideButtons from "./InterfaceInputs/MobileSideButtons.tsx";
import LoadingSkeleton from "./LoadingSkeleton.tsx";
import MapHeader from "./MapHeader.tsx";
import MapLayers from "./MapLayers.tsx";
import NoDataModal from "./NoDataModal.tsx";
import { Legend, MAX_ZOOM, MIN_ZOOM } from "./utilities/mapDataUtils";
import { getVariableUnit } from "./utilities/monthUtils";

const ClimateMap = ({ onMount = () => true }) => {
	// Use custom hooks to manage state
	const state = useClimateMapState();
	const {
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
	} = state;

	// Use model data hook
	const { models, getOptimismLevels } = useModelData(
		selectedModel,
		setSelectedModel,
	);

	// Use temperature data hook
	const { loadworldwideRegions } = useTemperatureData({
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
	});

	// Use screenshot hook
	const { handleScreenshot } = useMapScreenshot({
		map,
		screenshoter,
		setScreenshoter,
		models,
		selectedModel,
		currentYear,
		currentMonth,
		selectedOptimism,
	});

	// Set theme to purple
	useEffect(() => {
		document.documentElement.setAttribute("data-theme", "purple");
	}, []);

	// Handle popup close button clicks
	useEffect(() => {
		const handlePopupClose = (event: Event) => {
			const target = event.target as HTMLElement;
			if (target?.classList.contains("popup-close-btn")) {
				event.preventDefault();
				event.stopPropagation();
				if (map) {
					map.closePopup();
				}
			}
		};

		// Add event listener to document for event delegation
		document.addEventListener("click", handlePopupClose);

		return () => {
			document.removeEventListener("click", handlePopupClose);
		};
	}, [map]);

	useEffect(() => {
		onMount();
	}, [onMount]);

	// Process data based on map mode
	useEffect(() => {
		// Skip processing if there's already a processing error
		if (processingError) {
			console.log("Skipping processing due to previous error");
			return;
		}

		const processData = async () => {
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
					const { processedGeoJSON, extremes } =
						await regionProcessor.processWorldwideRegions(
							temperatureData,
							worldwideRegionsGeoJSON,
						);
					setConvertedWorldwideGeoJSON(processedGeoJSON);
					if (extremes) {
						setDataExtremes(extremes);
					}
					setIsProcessingWorldwide(false);
				} catch (error) {
					console.error("Failed to convert data to worldwide regions:", error);
					setProcessingError(true);
					setError("Failed to process worldwide regions");
					setIsProcessingWorldwide(false);
				}
			} else if (mapMode === "europe-only" && temperatureData.length > 0) {
				try {
					// Clear existing data immediately to prevent stale display
					setConvertedEuropeOnlyGeoJSON(null);
					setIsProcessingEuropeOnly(true);

					const { nutsGeoJSON, extremes } =
						await regionProcessor.processEuropeOnlyRegions(
							temperatureData,
							currentYear,
						);

					// Always update state since we're processing the latest data
					setConvertedEuropeOnlyGeoJSON({ ...nutsGeoJSON });
					setDataExtremes(extremes);
					setIsProcessingEuropeOnly(false);
				} catch (error) {
					console.error(
						"Failed to convert data to Europe-only NUTS regions:",
						error,
					);
					setProcessingError(true);
					setError("Failed to process Europe-only NUTS regions");
					setIsProcessingEuropeOnly(false);
				}
			} else {
				// Clear all when switching modes
				setConvertedWorldwideGeoJSON(null);
				setConvertedEuropeOnlyGeoJSON(null);
				setIsProcessingEuropeOnly(false);
				setIsProcessingWorldwide(false);
			}
		};

		processData();
	}, [
		mapMode,
		temperatureData,
		worldwideRegionsGeoJSON,
		processingError,
		loadworldwideRegions,
		currentYear,
		setConvertedWorldwideGeoJSON,
		setConvertedEuropeOnlyGeoJSON,
		setDataExtremes,
		setIsProcessingEuropeOnly,
		setIsProcessingWorldwide,
		setProcessingError,
		setError,
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

	// Viewport change handler
	const handleViewportChange = useCallback(
		(newViewport: { bounds: L.LatLngBounds; zoom: number }) => {
			MapInteractionHandlers.handleViewportChange(
				newViewport,
				setViewport,
				setResolutionLevel,
				setCurrentZoom,
			);
		},
		[setViewport, setResolutionLevel, setCurrentZoom],
	);

	const handleModelSelect = (modelId: string) => {
		setSelectedModel(modelId);
	};

	// Control functions using MapInteractionHandlers
	const handleZoomIn = () => MapInteractionHandlers.handleZoomIn(map);
	const handleZoomOut = () => MapInteractionHandlers.handleZoomOut(map);
	const handleResetZoom = () => MapInteractionHandlers.handleResetZoom(map);
	const handleLocationFind = () =>
		MapInteractionHandlers.handleLocationFind(map);

	const handleLoadCurrentYear = () => {
		const currentYear = new Date().getFullYear();
		setCurrentYear(currentYear);
		setLackOfDataModalVisible(false);
	};

	// Create interaction handlers
	const highlightFeature = MapInteractionHandlers.createHighlightFeature(
		mapMode,
		borderStyle,
		dataExtremes,
		convertedWorldwideGeoJSON,
		convertedEuropeOnlyGeoJSON,
		worldGeoJSON,
		hoverTimeout,
		setHoverTimeout,
		currentHoveredLayer,
		setCurrentHoveredLayer,
	);

	const resetHighlight = MapInteractionHandlers.createResetHighlight(
		mapMode,
		borderStyle,
		dataExtremes,
		convertedWorldwideGeoJSON,
		convertedEuropeOnlyGeoJSON,
		worldGeoJSON,
		hoverTimeout,
		setHoverTimeout,
		currentHoveredLayer,
		setCurrentHoveredLayer,
	);

	const onEachWorldwideFeature =
		MapInteractionHandlers.createOnEachWorldwideFeature(
			currentVariableValue,
			highlightFeature,
			resetHighlight,
		);

	const onEachEuropeOnlyFeature =
		MapInteractionHandlers.createOnEachEuropeOnlyFeature(
			currentVariableValue,
			highlightFeature,
			resetHighlight,
		);

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
					borderStyle={borderStyle}
					onBorderStyleChange={setBorderStyle}
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
							<MapLayers
								mapMode={mapMode}
								dataExtremes={dataExtremes}
								convertedWorldwideGeoJSON={convertedWorldwideGeoJSON}
								convertedEuropeOnlyGeoJSON={convertedEuropeOnlyGeoJSON}
								isProcessingEuropeOnly={isProcessingEuropeOnly}
								currentZoom={currentZoom}
								borderStyle={borderStyle}
								onEachWorldwideFeature={onEachWorldwideFeature}
								onEachEuropeOnlyFeature={onEachEuropeOnlyFeature}
							/>
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

						{/* Advanced Timeline Selector - Now supports mobile */}
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
							colorScheme="purple"
							map={map}
							screenshoter={screenshoter}
							models={models}
							selectedModelId={selectedModel}
							onModelSelect={handleModelSelect}
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

						{/* Mobile side buttons */}
						{isMobile && (
							<MobileSideButtons
								map={map}
								selectedModel={selectedModel}
								onModelSelect={handleModelSelect}
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
