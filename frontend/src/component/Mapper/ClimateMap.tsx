import { useCallback, useEffect } from "react";
import { MapContainer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type L from "leaflet";
import ViewportMonitor from "./ViewportMonitor.tsx";
import "./Map.css";
import { isMobile } from "react-device-detect";
import { useGridProcessing } from "../../hooks/useGridProcessing";
import { useMapDataState } from "../../hooks/useMapDataState";
import { useMapScreenshot } from "../../hooks/useMapScreenshot";
import { useMapUIInteractions } from "../../hooks/useMapUIInteractions";
import { useModelData } from "../../hooks/useModelData";
import { useTemperatureData } from "../../hooks/useTemperatureData";
import { useUserSelections } from "../../hooks/useUserSelections";
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
	const userSelections = useUserSelections();
	const mapUIInteractions = useMapUIInteractions();
	const mapData = useMapDataState();
	const gridProcessing = useGridProcessing();

	const {
		mapMode,
		setMapMode,
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
	} = userSelections;

	const {
		generalError,
		setGeneralError,
		dataProcessingError,
		setDataProcessingError,
		borderStyle,
		setBorderStyle,
		mapHoverTimeout,
		setMapHoverTimeout,
		mapHoveredLayer,
		setMapHoveredLayer,
		mapScreenshoter,
		setMapScreenshoter,
		noDataModalVisible,
		setNoDataModalVisible,
		userRequestedYear,
		setUserRequestedYear,
		dataFetchErrorMessage,
		setDataFetchErrorMessage,
	} = mapUIInteractions;

	const {
		rawRegionTemperatureData,
		setRawRegionTemperatureData,
		processedDataExtremes,
		setProcessedDataExtremes,
		mapDataBounds,
		setMapDataBounds,
		baseWorldGeoJSON,
		setBaseWorldGeoJSON,
		processedWorldwideRegions,
		setProcessedWorldwideRegions,
		worldwideRegionBoundaries,
		setWorldwideRegionBoundaries,
		processedEuropeNutsRegions,
		setProcessedEuropeNutsRegions,
		isProcessingEuropeNutsData,
		setIsProcessingEuropeNutsData,
		isProcessingWorldwideRegionData,
		setIsProcessingWorldwideRegionData,
		isLoadingRawData,
		setIsLoadingRawData,
		leafletMapInstance,
		setLeafletMapInstance,
		mapZoomLevel,
		setMapZoomLevel,
		mapViewportBounds,
		setMapViewportBounds,
		dataResolution,
		setDataResolution,
	} = mapData;

	const { generateGridCellsFromTemperatureData } = gridProcessing;

	// Use model data hook
	const { models, getOptimismLevels } = useModelData(
		selectedModel,
		setSelectedModel,
	);

	// Use temperature data hook for region-based processing (europe/worldwide)
	const { loadworldwideRegions } = useTemperatureData({
		models,
		selectedModel,
		currentYear,
		currentMonth,
		setTemperatureData: setRawRegionTemperatureData,
		setDataExtremes: setProcessedDataExtremes,
		setDataBounds: setMapDataBounds,
		setCurrentVariableValue,
		setRequestedYear: setUserRequestedYear,
		setLackOfDataModalVisible: setNoDataModalVisible,
		setApiErrorMessage: setDataFetchErrorMessage,
		setIsLoadingData: setIsLoadingRawData,
		setError: setGeneralError,
		setWorldGeoJSON: setBaseWorldGeoJSON,
		setworldwideRegionsGeoJSON: setWorldwideRegionBoundaries,
	});

	// Use screenshot hook
	const { handleScreenshot } = useMapScreenshot({
		map: leafletMapInstance,
		screenshoter: mapScreenshoter,
		setScreenshoter: setMapScreenshoter,
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
				if (leafletMapInstance) {
					leafletMapInstance.closePopup();
				}
			}
		};

		// Add event listener to document for event delegation
		document.addEventListener("click", handlePopupClose);

		return () => {
			document.removeEventListener("click", handlePopupClose);
		};
	}, [leafletMapInstance]);

	useEffect(() => {
		onMount();
	}, [onMount]);

	// Process data based on map mode
	useEffect(() => {
		// Skip processing if there's already a processing error
		if (dataProcessingError) {
			console.log("Skipping processing due to previous error");
			return;
		}

		const processData = async () => {
			if (mapMode === "worldwide" && rawRegionTemperatureData.length > 0) {
				// Load worldwide regions if not already loaded
				if (!worldwideRegionBoundaries) {
					try {
						await loadworldwideRegions();
					} catch (error) {
						console.error("Failed to load worldwide regions:", error);
						setDataProcessingError(true);
						setGeneralError("Failed to load worldwide regions");
					}
					return;
				}

				try {
					setIsProcessingWorldwideRegionData(true);
					const { processedGeoJSON, extremes } =
						await regionProcessor.processWorldwideRegions(
							rawRegionTemperatureData,
							worldwideRegionBoundaries,
						);
					setProcessedWorldwideRegions(processedGeoJSON);
					if (extremes) {
						setProcessedDataExtremes(extremes);
					}
					setIsProcessingWorldwideRegionData(false);
				} catch (error) {
					console.error("Failed to convert data to worldwide regions:", error);
					setDataProcessingError(true);
					setGeneralError("Failed to process worldwide regions");
					setIsProcessingWorldwideRegionData(false);
				}
			} else if (
				mapMode === "europe-only" &&
				rawRegionTemperatureData.length > 0
			) {
				try {
					// Clear existing data immediately to prevent stale display
					setProcessedEuropeNutsRegions(null);
					setIsProcessingEuropeNutsData(true);

					const { nutsGeoJSON, extremes } =
						await regionProcessor.processEuropeOnlyRegions(
							rawRegionTemperatureData,
							currentYear,
						);

					// Always update state since we're processing the latest data
					setProcessedEuropeNutsRegions({ ...nutsGeoJSON });
					setProcessedDataExtremes(extremes);
					setIsProcessingEuropeNutsData(false);
				} catch (error) {
					console.error(
						"Failed to convert data to Europe-only NUTS regions:",
						error,
					);
					setDataProcessingError(true);
					setGeneralError("Failed to process Europe-only NUTS regions");
					setIsProcessingEuropeNutsData(false);
				}
			} else if (mapMode === "grid" && rawRegionTemperatureData.length > 0) {
				// Grid mode: set extremes from raw temperature data and generate grid cells
				const temps = rawRegionTemperatureData.map((d) => d.temperature);
				const extremes = {
					min: Math.min(...temps),
					max: Math.max(...temps),
				};
				setProcessedDataExtremes(extremes);

				// Generate grid cells using the hook (grid uses same raw data but processes differently)
				generateGridCellsFromTemperatureData(
					rawRegionTemperatureData,
					mapViewportBounds,
					dataResolution,
				);

				// Clear other processed data
				setProcessedWorldwideRegions(null);
				setProcessedEuropeNutsRegions(null);
				setIsProcessingEuropeNutsData(false);
				setIsProcessingWorldwideRegionData(false);
			} else {
				// Clear all when switching modes
				setProcessedWorldwideRegions(null);
				setProcessedEuropeNutsRegions(null);
				setIsProcessingEuropeNutsData(false);
				setIsProcessingWorldwideRegionData(false);
			}
		};

		processData();
	}, [
		mapMode,
		rawRegionTemperatureData,
		worldwideRegionBoundaries,
		dataProcessingError,
		loadworldwideRegions,
		currentYear,
		mapViewportBounds,
		dataResolution,
		generateGridCellsFromTemperatureData,
		setProcessedWorldwideRegions,
		setProcessedEuropeNutsRegions,
		setProcessedDataExtremes,
		setIsProcessingEuropeNutsData,
		setIsProcessingWorldwideRegionData,
		setDataProcessingError,
		setGeneralError,
	]);

	// Cleanup timeouts on unmount
	useEffect(() => {
		return () => {
			if (mapHoverTimeout) {
				clearTimeout(mapHoverTimeout);
			}
		};
	}, [mapHoverTimeout]);

	useEffect(() => {
		if (leafletMapInstance && mapDataBounds) {
			const leafletBounds: L.LatLngBoundsExpression = [
				[mapDataBounds.south, mapDataBounds.west],
				[mapDataBounds.north, mapDataBounds.east],
			];
			leafletMapInstance.setMaxBounds(leafletBounds);
		}
	}, [leafletMapInstance, mapDataBounds]);

	// Viewport change handler
	const handleViewportChange = useCallback(
		(newViewport: { bounds: L.LatLngBounds; zoom: number }) => {
			MapInteractionHandlers.handleViewportChange(
				newViewport,
				setMapViewportBounds,
				setDataResolution,
				setMapZoomLevel,
			);
		},
		[setMapViewportBounds, setDataResolution, setMapZoomLevel],
	);

	const handleModelSelect = (modelId: string) => {
		setSelectedModel(modelId);
	};

	// Control functions using MapInteractionHandlers
	const handleZoomIn = () =>
		MapInteractionHandlers.handleZoomIn(leafletMapInstance);
	const handleZoomOut = () =>
		MapInteractionHandlers.handleZoomOut(leafletMapInstance);
	const handleResetZoom = () =>
		MapInteractionHandlers.handleResetZoom(leafletMapInstance);
	const handleLocationFind = () =>
		MapInteractionHandlers.handleLocationFind(leafletMapInstance);

	const handleLoadCurrentYear = () => {
		const currentYear = new Date().getFullYear();
		setCurrentYear(currentYear);
		setNoDataModalVisible(false);
	};

	// Create interaction handlers
	const highlightFeature = MapInteractionHandlers.createHighlightFeature(
		mapMode,
		borderStyle,
		processedDataExtremes,
		processedWorldwideRegions,
		processedEuropeNutsRegions,
		baseWorldGeoJSON,
		mapHoverTimeout,
		setMapHoverTimeout,
		mapHoveredLayer,
		setMapHoveredLayer,
	);

	const resetHighlight = MapInteractionHandlers.createResetHighlight(
		mapMode,
		borderStyle,
		processedDataExtremes,
		processedWorldwideRegions,
		processedEuropeNutsRegions,
		baseWorldGeoJSON,
		mapHoverTimeout,
		setMapHoverTimeout,
		mapHoveredLayer,
		setMapHoveredLayer,
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
							ref={setLeafletMapInstance}
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
								dataExtremes={processedDataExtremes}
								convertedWorldwideGeoJSON={processedWorldwideRegions}
								convertedEuropeOnlyGeoJSON={processedEuropeNutsRegions}
								isProcessingEuropeOnly={isProcessingEuropeNutsData}
								currentZoom={mapZoomLevel}
								borderStyle={borderStyle}
								onEachWorldwideFeature={onEachWorldwideFeature}
								onEachEuropeOnlyFeature={onEachEuropeOnlyFeature}
							/>
							<ViewportMonitor onViewportChange={handleViewportChange} />
						</MapContainer>

						{/* Loading Skeleton Overlay */}
						<LoadingSkeleton
							isProcessing={
								isProcessingEuropeNutsData ||
								isProcessingWorldwideRegionData ||
								isLoadingRawData
							}
							message={
								isProcessingEuropeNutsData
									? "Processing Europe-only data..."
									: isProcessingWorldwideRegionData
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
							map={leafletMapInstance}
							screenshoter={mapScreenshoter}
							models={models}
							selectedModelId={selectedModel}
							onModelSelect={handleModelSelect}
							legend={
								processedDataExtremes ? (
									<Legend
										extremes={processedDataExtremes}
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
								map={leafletMapInstance}
								selectedModel={selectedModel}
								onModelSelect={handleModelSelect}
							/>
						)}
					</div>
				</div>

				{/* Desktop-only legend positioned over the map */}
				{!isMobile && processedDataExtremes && (
					<Legend
						extremes={processedDataExtremes}
						unit={getVariableUnit(currentVariableValue)}
					/>
				)}

				<div className="map-bottom-bar">
					<div className="control-section">
						{dataProcessingError && (
							<button
								type="button"
								onClick={() => {
									setDataProcessingError(false);
									setGeneralError(null);
									console.log("Processing error reset");
								}}
								className="secondary-button"
							>
								Reset Processing Error
							</button>
						)}
					</div>

					{generalError && (
						<div className="error-message">
							<p>{generalError}</p>
							{dataProcessingError && (
								<p>
									<small>
										Processing has been stopped to prevent infinite errors. Use
										the reset button to try again.
									</small>
								</p>
							)}
						</div>
					)}

					{mapViewportBounds && (
						<DebugStatsPanel
							stats={{ processed: 0, skipped: 0, errors: 0 }}
							temperatureDataCount={rawRegionTemperatureData.length}
							currentResolution={dataResolution}
							viewport={mapViewportBounds}
						/>
					)}
				</div>
			</div>

			<NoDataModal
				isOpen={noDataModalVisible}
				onClose={() => setNoDataModalVisible(false)}
				onLoadCurrentYear={handleLoadCurrentYear}
				requestedYear={userRequestedYear}
				errorMessage={dataFetchErrorMessage}
			/>

			<Footer />
		</div>
	);
};

export default ClimateMap;
