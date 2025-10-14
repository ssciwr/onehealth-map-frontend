import { observer } from "mobx-react-lite";
import type React from "react";
import { useCallback } from "react";
import { GeoJSON, Pane } from "react-leaflet";
import { useMapDataStore } from "../../contexts/MapDataContext";
import { useMapUIInteractionsStore } from "../../contexts/MapUIInteractionsContext";
import { useUserSelectionsStore } from "../../contexts/UserSelectionsContext";
import { mapStyleService } from "../../services/MapStyleService";
import * as MapInteractionHandlers from "../../utils/MapInteractionHandlers";
import AdaptiveGridLayer from "./AdaptiveGridLayer";
import CitiesLayer from "./CitiesLayer";

interface MapLayersProps {
	processedEuropeNutsRegions?: any;
	processedWorldwideRegions?: any;
	processedDataExtremes?: any;
}

const MapLayers: React.FC<MapLayersProps> = observer(
	({
		processedEuropeNutsRegions: propsProcessedEuropeNutsRegions,
		processedWorldwideRegions: propsProcessedWorldwideRegions,
		processedDataExtremes: propsProcessedDataExtremes,
	}) => {
		// Use stores for UI state and data
		const userStore = useUserSelectionsStore();
		const mapUIStore = useMapUIInteractionsStore();
		const mapDataStore = useMapDataStore();

		// Use processed data from props (from ClimateMap) rather than hook instances
		const processedDataExtremes = propsProcessedDataExtremes;
		const processedWorldwideRegions = propsProcessedWorldwideRegions;
		const processedEuropeNutsRegions = propsProcessedEuropeNutsRegions;

		// Create interaction handlers
		const highlightFeature = MapInteractionHandlers.createHighlightFeature(
			userStore.mapMode,
			mapUIStore.borderStyle,
			processedDataExtremes,
			processedWorldwideRegions,
			processedEuropeNutsRegions,
			mapDataStore.baseWorldGeoJSON,
			mapUIStore.mapHoverTimeout,
			mapUIStore.setMapHoverTimeout,
			mapUIStore.mapHoveredLayer,
			mapUIStore.setMapHoveredLayer,
		);

		const resetHighlight = MapInteractionHandlers.createResetHighlight(
			userStore.mapMode,
			mapUIStore.borderStyle,
			processedDataExtremes,
			processedWorldwideRegions,
			processedEuropeNutsRegions,
			mapDataStore.baseWorldGeoJSON,
			mapUIStore.mapHoverTimeout,
			mapUIStore.setMapHoverTimeout,
			mapUIStore.mapHoveredLayer,
			mapUIStore.setMapHoveredLayer,
		);

		const onEachWorldwideFeature =
			MapInteractionHandlers.createOnEachWorldwideFeature(
				userStore.currentVariableType,
				highlightFeature,
				resetHighlight,
			);

		const onEachEuropeOnlyFeature =
			MapInteractionHandlers.createOnEachEuropeOnlyFeature(
				userStore.currentVariableType,
				highlightFeature,
				resetHighlight,
			);

		// Memoize style functions to prevent recreation on every render
		const nutsStyleFunction = useCallback(
			(f?: GeoJSON.Feature) =>
				f ? mapStyleService.getNutsStyle(f, processedDataExtremes) : {},
			[processedDataExtremes],
		);

		const worldwideStyleFunction = useCallback(
			(f?: GeoJSON.Feature) =>
				f
					? mapStyleService.getWorldwideStyle(
							f,
							mapUIStore.borderStyle,
							processedDataExtremes,
						)
					: {},
			[mapUIStore.borderStyle, processedDataExtremes],
		);
		return (
			<>
				{/* Worldwide Mode Layer */}
				{userStore.mapMode === "worldwide" && (
					<Pane name="worldwidePane" style={{ zIndex: 30, opacity: 0.9 }}>
						{processedWorldwideRegions?.features &&
							processedWorldwideRegions.features.length > 0 && (
								<GeoJSON
									data={processedWorldwideRegions}
									style={worldwideStyleFunction}
									onEachFeature={onEachWorldwideFeature}
								/>
							)}
					</Pane>
				)}

				{/* Europe-only Mode Layer */}
				{userStore.mapMode === "europe-only" && (
					<Pane name="europeOnlyPane" style={{ zIndex: 30, opacity: 0.9 }}>
						{!mapDataStore.isProcessingEuropeNutsData &&
							processedEuropeNutsRegions?.features &&
							processedEuropeNutsRegions.features.length > 0 && (
								<GeoJSON
									key={`europe-nuts-${processedEuropeNutsRegions.features.length}`}
									data={processedEuropeNutsRegions}
									style={nutsStyleFunction}
									onEachFeature={onEachEuropeOnlyFeature}
								/>
							)}
					</Pane>
				)}

				{/* Grid Mode Layer */}
				{userStore.mapMode === "grid" && (
					<Pane name="gridPane" style={{ zIndex: 340, opacity: 1.0 }}>
						<AdaptiveGridLayer />
					</Pane>
				)}

				{/* Cities Layer - always rendered, but filtered by data regions, and only over the rendered regions */}
				<CitiesLayer
					zoom={mapDataStore.mapZoomLevel}
					dataRegions={
						userStore.mapMode === "europe-only"
							? processedEuropeNutsRegions
							: userStore.mapMode === "grid"
								? null
								: processedWorldwideRegions
					}
				/>
			</>
		);
	},
);

MapLayers.displayName = "MapLayers";

export default MapLayers;
