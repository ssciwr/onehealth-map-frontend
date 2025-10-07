import { useCallback, useEffect, useMemo } from "react";
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
import { loadNutsData } from "./utilities/mapDataUtils";
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
	// Only get the specific state we need for ClimateMap's core functionality
	const {
		mapMode,
		currentYear,
		setCurrentYear,
		currentMonth,
		setCurrentMonth,
		selectedModel,
		setSelectedModel,
		currentVariableValue,
		setCurrentVariableValue,
		selectedOptimism,
	} = useUserSelections();
	const {
		generalError,
		setGeneralError,
		dataProcessingError,
		setDataProcessingError,
		noDataModalVisible,
		setNoDataModalVisible,
		userRequestedYear,
		setUserRequestedYear,
		dataFetchErrorMessage,
		setDataFetchErrorMessage,
		mapScreenshoter,
		setMapScreenshoter,
		mapHoverTimeout,
	} = useMapUIInteractions();
	const {
		rawRegionTemperatureData,
		setRawRegionTemperatureData,
		processedDataExtremes,
		setProcessedDataExtremes,
		mapDataBounds,
		setMapDataBounds,
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
		mapViewportBounds,
		setMapZoomLevel,
		setMapViewportBounds,
		dataResolution,
		setDataResolution,
	} = useMapDataState();
	const { generateGridCellsFromTemperatureData } = useGridProcessing();

	// Use model data hook
	const { models } = useModelData(selectedModel, setSelectedModel);

	// Use temperature data hook for region-based processing (europe/worldwide)
	const { loadworldwideRegions } = useTemperatureData({
		models,
		selectedModel,
		mapMode,
		currentYear,
		currentMonth,
		setRawRegionTemperatureData,
		setProcessedDataExtremes,
		setMapDataBounds,
		setCurrentVariableValue,
		setUserRequestedYear,
		setNoDataModalVisible,
		setDataFetchErrorMessage,
		setIsLoadingRawData,
		setGeneralError,
		setBaseWorldGeoJSON,
		setWorldwideRegionBoundaries,
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

	// Process data based on map mode - separate effects to prevent dependency loops
	// Europe-only mode effect (independent of rawRegionTemperatureData)
	useEffect(() => {
		if (mapMode !== "europe-only" || dataProcessingError) {
			return;
		}

		// Only run once per year/month combination to prevent infinite loops
		let isProcessing = false;
		
		const processEuropeData = async () => {
			if (isProcessing) return;
			isProcessing = true;
			
			try {
				console.log(`Processing Europe NUTS: ${currentYear}-${currentMonth}`);
				// Clear existing data immediately to prevent stale display
				setProcessedEuropeNutsRegions(null);
				setProcessedWorldwideRegions(null);
				setIsProcessingEuropeNutsData(true);

				// Load NUTS data directly from API (avoid unstable function dependency)
				setIsLoadingRawData(true);
				const selectedModelData = models.find((m) => m.id === selectedModel);
				const requestedVariableValue = selectedModelData?.output?.[0] || "R0";
				setCurrentVariableValue(requestedVariableValue);
				
				const nutsApiData = await loadNutsData(
					currentYear,
					currentMonth,
					requestedVariableValue,
				);
				setIsLoadingRawData(false);

				// Process API data into GeoJSON format
				const { nutsGeoJSON, extremes } =
					await regionProcessor.processEuropeOnlyRegionsFromApi(
						nutsApiData,
						currentYear,
					);

				// Update state with processed data
				setProcessedEuropeNutsRegions(nutsGeoJSON);
				setProcessedDataExtremes(extremes);
				setIsProcessingEuropeNutsData(false);
			} catch (error) {
				console.error("Failed to load/process Europe-only NUTS data:", error);
				setDataProcessingError(true);
				setGeneralError("Failed to process Europe-only NUTS data");
				setIsProcessingEuropeNutsData(false);
				setIsLoadingRawData(false);
			} finally {
				isProcessing = false;
			}
		};

		processEuropeData();
	}, [mapMode, currentYear, currentMonth, dataProcessingError]); // Keep only stable dependencies

	// Worldwide/Grid mode effect (dependent on rawRegionTemperatureData)
	useEffect(() => {
		// Skip processing if there's already a processing error or in Europe mode
		if (dataProcessingError || mapMode === "europe-only") {
			console.log("Skipping lat/lon processing due to error or Europe mode");
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
				// Clear all when switching modes or no data
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

	// Memoize legend components to prevent unnecessary re-renders
	const memoizedMobileLegend = useMemo(
		() =>
			processedDataExtremes ? (
				<Legend
					extremes={processedDataExtremes}
					unit={getVariableUnit(currentVariableValue)}
				/>
			) : (
				<div />
			),
		[processedDataExtremes, currentVariableValue],
	);

	const memoizedDesktopLegend = useMemo(
		() =>
			processedDataExtremes ? (
				<Legend
					extremes={processedDataExtremes}
					unit={getVariableUnit(currentVariableValue)}
				/>
			) : null,
		[processedDataExtremes, currentVariableValue],
	);

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

	const handleModelSelect = (modelId: string) => {
		setSelectedModel(modelId);
	};

	return (
		<div>
			<div className="climate-map-container">
				<MapHeader />

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
								processedEuropeNutsRegions={processedEuropeNutsRegions}
								processedWorldwideRegions={processedWorldwideRegions}
								processedDataExtremes={processedDataExtremes}
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
							legend={memoizedMobileLegend}
						/>

						{/* Mobile side buttons */}
						{isMobile && <MobileSideButtons map={leafletMapInstance} />}
					</div>
				</div>

				{/* Desktop-only legend positioned over the map */}
				{!isMobile && memoizedDesktopLegend}

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
