import { useCallback, useEffect, useMemo } from "react";
import { MapContainer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type L from "leaflet";
import ViewportMonitor from "./ViewportMonitor.tsx";
import "./Map.css";
import { observer } from "mobx-react-lite";
import { isMobile } from "react-device-detect";
import { useUserSelectionsStore } from "../../contexts/UserSelectionsContext";
import { useMapScreenshot } from "../../hooks/useMapScreenshot";
import { useMapUIInteractions } from "../../hooks/useMapUIInteractions";
import { useModelData } from "../../hooks/useModelData";
import { regionProcessor } from "../../services/RegionProcessor";
import Footer from "../../static/Footer.tsx";
import { gridProcessingStore } from "../../stores/GridProcessingStore";
import { mapDataStore } from "../../stores/MapDataStore";
import { temperatureDataStore } from "../../stores/TemperatureDataStore";
import * as MapInteractionHandlers from "../../utils/MapInteractionHandlers";
import DebugStatsPanel from "./DebugStatsPanel.tsx";
import AdvancedTimelineSelector from "./InterfaceInputs/AdvancedTimelineSelector.tsx";
import MobileSideButtons from "./InterfaceInputs/MobileSideButtons.tsx";
import LoadingSkeleton from "./LoadingSkeleton.tsx";
import MapHeader from "./MapHeader.tsx";
import MapLayers from "./MapLayers.tsx";
import NoDataModal from "./NoDataModal.tsx";
import { loadNutsData } from "./utilities/mapDataUtils";
import { Legend, MAX_ZOOM, MIN_ZOOM } from "./utilities/mapDataUtils";
import { getVariableUnit } from "./utilities/monthUtils";

type ClimateMapProps = {
	onMount?: () => boolean;
};

const ClimateMap = observer(({ onMount = () => true }: ClimateMapProps) => {
	const userStore = useUserSelectionsStore();
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

	// Use model data hook
	const { models } = useModelData(
		userStore.selectedModel,
		userStore.setSelectedModel,
	);

	// Use screenshot hook
	const { handleScreenshot } = useMapScreenshot({
		map: mapDataStore.leafletMapInstance,
		screenshoter: mapScreenshoter,
		setScreenshoter: setMapScreenshoter,
		models,
		selectedModel: userStore.selectedModel,
		currentYear: userStore.currentYear,
		currentMonth: userStore.currentMonth,
		selectedOptimism: userStore.selectedOptimism,
	});

	// Set theme to purple
	useEffect(() => {
		document.documentElement.setAttribute("data-theme", "purple");
	}, []);

	// Load data when mode changes
	useEffect(() => {
		const loadData = async () => {
			if (userStore.mapMode === "grid" || userStore.mapMode === "worldwide") {
				console.log(`Loading lat/lon data for ${userStore.mapMode} mode`);
				console.log(
					"🗺️ Current mapViewportBounds when loading data:",
					mapDataStore.mapViewportBounds,
				);

				// Use current viewport bounds for data fetching
				const viewportBoundsToUse = mapDataStore.mapViewportBounds;
				console.log("🔄 Using viewport bounds:", viewportBoundsToUse);

				await temperatureDataStore.loadTemperatureData(
					userStore.currentYear,
					userStore.currentMonth,
					models,
					userStore.selectedModel,
					userStore.setCurrentVariableType,
					setUserRequestedYear,
					setNoDataModalVisible,
					setDataFetchErrorMessage,
					mapDataStore.setIsLoadingRawData,
					setGeneralError,
					viewportBoundsToUse,
				);
			}

			if (userStore.mapMode === "worldwide") {
				await temperatureDataStore.loadWorldwideRegions();
			}
		};

		loadData();
	}, [
		userStore.mapMode,
		userStore.currentYear,
		userStore.currentMonth,
		userStore.selectedModel,
		models,
		userStore.setCurrentVariableType,
		setUserRequestedYear,
		setNoDataModalVisible,
		setDataFetchErrorMessage,
		setGeneralError,
	]);

	// Handle popup close button clicks
	useEffect(() => {
		const handlePopupClose = (event: Event) => {
			const target = event.target as HTMLElement;
			if (target?.classList.contains("popup-close-btn")) {
				event.preventDefault();
				event.stopPropagation();
				if (mapDataStore.leafletMapInstance) {
					mapDataStore.leafletMapInstance.closePopup();
				}
			}
		};

		// Add event listener to document for event delegation
		document.addEventListener("click", handlePopupClose);

		return () => {
			document.removeEventListener("click", handlePopupClose);
		};
	}, []);

	useEffect(() => {
		onMount();
	}, [onMount]);

	// Process data based on map mode - separate effects to prevent dependency loops
	// Europe-only mode effect (independent of temperatureDataStore.rawRegionTemperatureData)
	useEffect(() => {
		if (userStore.mapMode !== "europe-only" || dataProcessingError) {
			console.log(
				"Change of map mode, but only europe is supported for now.",
				userStore.mapMode,
			);
			return;
		}

		// Only run once per year/month combination to prevent infinite loops
		let isProcessing = false;

		const processEuropeData = async () => {
			if (isProcessing) return;
			isProcessing = true;

			try {
				console.log(
					`Processing Europe NUTS: ${userStore.currentYear}-${userStore.currentMonth}`,
				);
				// Clear existing data immediately to prevent stale display
				mapDataStore.setProcessedEuropeNutsRegions(null);
				mapDataStore.setProcessedWorldwideRegions(null);
				mapDataStore.setIsProcessingEuropeNutsData(true);

				// Load NUTS data directly from API (avoid unstable function dependency)
				mapDataStore.setIsLoadingRawData(true);
				const selectedModelData = models.find(
					(m) => m.id === userStore.selectedModel,
				);
				const requestedVariableValue = selectedModelData?.output?.[0] || "R0";
				userStore.setCurrentVariableType(requestedVariableValue);

				const nutsApiData = await loadNutsData(
					userStore.currentYear,
					userStore.currentMonth,
					requestedVariableValue,
				);
				mapDataStore.setIsLoadingRawData(false);

				// Process API data into GeoJSON format
				const { nutsGeoJSON, extremes } =
					await regionProcessor.processEuropeOnlyRegionsFromApi(
						nutsApiData,
						userStore.currentYear,
					);

				// Update state with processed data
				mapDataStore.setProcessedEuropeNutsRegions(nutsGeoJSON);
				temperatureDataStore.setProcessedDataExtremes(extremes);
				mapDataStore.setIsProcessingEuropeNutsData(false);
			} catch (error) {
				console.error("Failed to load/process Europe-only NUTS data:", error);
				setDataProcessingError(true);
				setGeneralError("Failed to process Europe-only NUTS data");
				mapDataStore.setIsProcessingEuropeNutsData(false);
				mapDataStore.setIsLoadingRawData(false);
			} finally {
				isProcessing = false;
			}
		};

		processEuropeData();
	}, [
		userStore.mapMode,
		userStore.currentYear,
		userStore.currentMonth,
		userStore.selectedModel,
		dataProcessingError,
		models,
		userStore.setCurrentVariableType,
		setDataProcessingError,
		setGeneralError,
	]);

	// Worldwide/Grid mode effect (dependent on temperatureDataStore.rawRegionTemperatureData)
	// biome-ignore lint/correctness/useExhaustiveDependencies: MobX observable dependency needed for reactivity
	useEffect(() => {
		// Skip processing if there's already a processing error or in Europe mode
		if (dataProcessingError || userStore.mapMode === "europe-only") {
			console.log("Skipping lat/lon processing due to error or Europe mode");
			return;
		}

		const rawDataLength = temperatureDataStore.rawRegionTemperatureData.length;

		const processData = async () => {
			if (userStore.mapMode === "worldwide" && rawDataLength > 0) {
				// Load worldwide regions if not already loaded
				if (!temperatureDataStore.worldwideRegionBoundaries) {
					try {
						await temperatureDataStore.loadWorldwideRegions();
					} catch (error) {
						console.error("Failed to load worldwide regions:", error);
						setDataProcessingError(true);
						setGeneralError("Failed to load worldwide regions");
					}
					return;
				}

				try {
					mapDataStore.setIsProcessingWorldwideRegionData(true);
					const { processedGeoJSON, extremes } =
						await regionProcessor.processWorldwideRegions(
							temperatureDataStore.rawRegionTemperatureData,
							temperatureDataStore.worldwideRegionBoundaries,
						);
					mapDataStore.setProcessedWorldwideRegions(processedGeoJSON);
					if (extremes) {
						temperatureDataStore.setProcessedDataExtremes(extremes);
					}
					mapDataStore.setIsProcessingWorldwideRegionData(false);
				} catch (error) {
					console.error("Failed to convert data to worldwide regions:", error);
					setDataProcessingError(true);
					setGeneralError("Failed to process worldwide regions");
					mapDataStore.setIsProcessingWorldwideRegionData(false);
				}
			} else if (userStore.mapMode === "grid" && rawDataLength > 0) {
				console.log("Grid processing check:", userStore.mapMode, rawDataLength);
				console.log(
					"mapDataStore.mapViewportBounds:",
					mapDataStore.mapViewportBounds,
				);
				console.log("dataResolution:", mapDataStore.dataResolution);

				// Grid mode: set extremes from raw temperature data and generate grid cells
				const temps = temperatureDataStore.rawRegionTemperatureData.map(
					(d) => d.temperature,
				);
				const extremes = {
					min: Math.min(...temps),
					max: Math.max(...temps),
				};
				temperatureDataStore.setProcessedDataExtremes(extremes);

				// Generate grid cells using MobX store
				console.log("About to call generateGridCellsFromTemperatureData");
				const viewportBounds = mapDataStore.mapViewportBounds;
				const resolution = mapDataStore.dataResolution;
				gridProcessingStore.generateGridCellsFromTemperatureData(
					temperatureDataStore.rawRegionTemperatureData,
					viewportBounds,
					resolution,
				);

				// Clear other processed data
				mapDataStore.setProcessedWorldwideRegions(null);
				mapDataStore.setProcessedEuropeNutsRegions(null);
				mapDataStore.setIsProcessingEuropeNutsData(false);
				mapDataStore.setIsProcessingWorldwideRegionData(false);
			} else {
				console.log(
					"Entered the or case: No world wide or grid data to load so unable to really do anything.",
				);
				// Clear all when switching modes or no data
				mapDataStore.setProcessedWorldwideRegions(null);
				mapDataStore.setProcessedEuropeNutsRegions(null);
				mapDataStore.setIsProcessingEuropeNutsData(false);
				mapDataStore.setIsProcessingWorldwideRegionData(false);
			}
		};

		processData();
	}, [
		userStore.mapMode,
		dataProcessingError,
		setDataProcessingError,
		setGeneralError,
		temperatureDataStore.rawRegionTemperatureData.length,
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
		if (
			mapDataStore.leafletMapInstance &&
			temperatureDataStore.mapDataBounds &&
			userStore.mapMode !== "grid"
		) {
			const leafletBounds: L.LatLngBoundsExpression = [
				[
					temperatureDataStore.mapDataBounds.south,
					temperatureDataStore.mapDataBounds.west,
				],
				[
					temperatureDataStore.mapDataBounds.north,
					temperatureDataStore.mapDataBounds.east,
				],
			];
			mapDataStore.leafletMapInstance.setMaxBounds(leafletBounds);
		} else if (
			mapDataStore.leafletMapInstance &&
			userStore.mapMode === "grid"
		) {
			mapDataStore.leafletMapInstance.setMaxBounds(undefined);
		}
	}, [userStore.mapMode]);

	// Memoize legend components to prevent unnecessary re-renders
	const memoizedMobileLegend = useMemo(
		() =>
			temperatureDataStore.processedDataExtremes ? (
				<Legend
					extremes={temperatureDataStore.processedDataExtremes}
					unit={getVariableUnit(userStore.currentVariableType)}
				/>
			) : (
				<div />
			),
		[userStore.currentVariableType],
	);

	const memoizedDesktopLegend = useMemo(
		() =>
			temperatureDataStore.processedDataExtremes ? (
				<Legend
					extremes={temperatureDataStore.processedDataExtremes}
					unit={getVariableUnit(userStore.currentVariableType)}
				/>
			) : null,
		[userStore.currentVariableType],
	);

	// Viewport change handler
	const handleViewportChange = useCallback(
		(newViewport: { bounds: L.LatLngBounds; zoom: number }) => {
			if (newViewport) {
				const bounds = newViewport.bounds;
				const zoom = newViewport.zoom;

				const newViewportBounds = {
					north: bounds.getNorth(),
					south: bounds.getSouth(),
					east: bounds.getEast(),
					west: bounds.getWest(),
					zoom: zoom,
				};

				console.log("🎯 Setting new viewport bounds:", newViewportBounds);
				mapDataStore.setMapViewportBounds(newViewportBounds);
				mapDataStore.setMapZoomLevel(zoom);

				// Set resolution based on zoom
				const resolution = zoom < 5 ? 2 : zoom < 7 ? 1 : 0.5;
				mapDataStore.setDataResolution(resolution);
			}
		},
		[],
	);

	// Control functions using MapInteractionHandlers
	const handleZoomIn = () =>
		MapInteractionHandlers.handleZoomIn(mapDataStore.leafletMapInstance);
	const handleZoomOut = () =>
		MapInteractionHandlers.handleZoomOut(mapDataStore.leafletMapInstance);
	const handleResetZoom = () =>
		MapInteractionHandlers.handleResetZoom(mapDataStore.leafletMapInstance);
	const handleLocationFind = () =>
		MapInteractionHandlers.handleLocationFind(mapDataStore.leafletMapInstance);

	const handleLoadCurrentYear = () => {
		const currentYear = new Date().getFullYear();
		userStore.setCurrentYear(currentYear);
		setNoDataModalVisible(false);
	};

	const handleModelSelect = (modelId: string) => {
		userStore.setSelectedModel(modelId);
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
							ref={mapDataStore.setLeafletMapInstance}
							zoomControl={false}
							worldCopyJump={false}
							style={{
								backgroundColor: "white",
								marginLeft: isMobile ? "0px" : "140px",
								width: isMobile ? "100%" : "calc(100% - 140px)",
							}}
						>
							<MapLayers
								processedEuropeNutsRegions={
									mapDataStore.processedEuropeNutsRegions
								}
								processedWorldwideRegions={
									mapDataStore.processedWorldwideRegions
								}
								processedDataExtremes={
									temperatureDataStore.processedDataExtremes
								}
							/>
							<ViewportMonitor onViewportChange={handleViewportChange} />
						</MapContainer>

						{/* Loading Skeleton Overlay */}
						<LoadingSkeleton
							isProcessing={
								mapDataStore.isProcessingEuropeNutsData ||
								mapDataStore.isProcessingWorldwideRegionData ||
								mapDataStore.isLoadingRawData
							}
							message={
								mapDataStore.isProcessingEuropeNutsData
									? "Processing Europe-only data..."
									: mapDataStore.isProcessingWorldwideRegionData
										? "Processing worldwide data..."
										: "Loading map data..."
							}
						/>

						{/* Advanced Timeline Selector - Now supports mobile */}
						<AdvancedTimelineSelector
							year={userStore.currentYear}
							month={userStore.currentMonth}
							onYearChange={userStore.setCurrentYear}
							onMonthChange={userStore.setCurrentMonth}
							onZoomIn={handleZoomIn}
							onZoomOut={handleZoomOut}
							onResetZoom={handleResetZoom}
							onLocationFind={handleLocationFind}
							onScreenshot={handleScreenshot}
							colorScheme="purple"
							map={mapDataStore.leafletMapInstance}
							screenshoter={mapScreenshoter}
							models={models}
							selectedModelId={userStore.selectedModel}
							onModelSelect={handleModelSelect}
							legend={memoizedMobileLegend}
						/>

						{/* Mobile side buttons */}
						{isMobile && (
							<MobileSideButtons map={mapDataStore.leafletMapInstance} />
						)}
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

					{mapDataStore.mapViewportBounds && (
						<DebugStatsPanel
							stats={{ processed: 0, skipped: 0, errors: 0 }}
							temperatureDataCount={
								temperatureDataStore.rawRegionTemperatureData.length
							}
							currentResolution={mapDataStore.dataResolution}
							viewport={mapDataStore.mapViewportBounds}
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
});

export default ClimateMap;
