import type React from "react";
import { memo, useCallback } from "react";
import { GeoJSON, Pane } from "react-leaflet";
import { useMapDataState } from "../../hooks/useMapDataState";
import { useMapUIInteractions } from "../../hooks/useMapUIInteractions";
import { useUserSelections } from "../../hooks/useUserSelections";
import { mapStyleService } from "../../services/MapStyleService";
import * as MapInteractionHandlers from "../../utils/MapInteractionHandlers";
import AdaptiveGridLayer from "./AdaptiveGridLayer";
import CitiesLayer from "./CitiesLayer";

interface MapLayersProps {
	processedEuropeNutsRegions?: any;
	processedWorldwideRegions?: any;
	processedDataExtremes?: any;
}

const MapLayers: React.FC<MapLayersProps> = memo(
	({
		processedEuropeNutsRegions: propsProcessedEuropeNutsRegions,
		processedWorldwideRegions: propsProcessedWorldwideRegions,
		processedDataExtremes: propsProcessedDataExtremes,
	}) => {
		// Use hooks for UI state and some data, but get processed data from props
		const { mapMode, currentVariableValue } = useUserSelections();
		const {
			borderStyle,
			mapHoverTimeout,
			setMapHoverTimeout,
			mapHoveredLayer,
			setMapHoveredLayer,
		} = useMapUIInteractions();
		const { baseWorldGeoJSON, isProcessingEuropeNutsData, mapZoomLevel } =
			useMapDataState();

		// Use processed data from props (from ClimateMap) rather than hook instances
		const processedDataExtremes = propsProcessedDataExtremes;
		const processedWorldwideRegions = propsProcessedWorldwideRegions;
		const processedEuropeNutsRegions = propsProcessedEuropeNutsRegions;

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
							borderStyle,
							processedDataExtremes,
						)
					: {},
			[borderStyle, processedDataExtremes],
		);
		return (
			<>
				{/* Worldwide Mode Layer */}
				{mapMode === "worldwide" && (
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
				{mapMode === "europe-only" && (
					<Pane name="europeOnlyPane" style={{ zIndex: 30, opacity: 0.9 }}>
						{!isProcessingEuropeNutsData &&
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
				{mapMode === "grid" && (
					<Pane name="gridPane" style={{ zIndex: 340, opacity: 1.0 }}>
						<AdaptiveGridLayer />
					</Pane>
				)}

				{/* Cities Layer - always rendered, but filtered by data regions, and only over the rendered regions */}
				<CitiesLayer
					zoom={mapZoomLevel}
					dataRegions={
						mapMode === "europe-only"
							? processedEuropeNutsRegions
							: mapMode === "grid"
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
