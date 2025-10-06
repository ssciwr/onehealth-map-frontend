import type React from "react";
import { GeoJSON, Pane } from "react-leaflet";
import { mapStyleService } from "../../services/MapStyleService";
import type { BorderStyle } from "../../services/MapStyleService";
import AdaptiveGridLayer from "./AdaptiveGridLayer";
import CitiesLayer from "./CitiesLayer";
import type { DataExtremes, NutsGeoJSON, WorldwideGeoJSON } from "./types";

interface MapLayersProps {
	mapMode: "worldwide" | "europe-only" | "grid";
	dataExtremes: DataExtremes | null;
	convertedWorldwideGeoJSON: WorldwideGeoJSON | null;
	convertedEuropeOnlyGeoJSON: NutsGeoJSON | null;
	isProcessingEuropeOnly: boolean;
	currentZoom: number;
	borderStyle: BorderStyle;
	onEachWorldwideFeature: (feature: GeoJSON.Feature, layer: L.Layer) => void;
	onEachEuropeOnlyFeature: (feature: GeoJSON.Feature, layer: L.Layer) => void;
}

const MapLayers: React.FC<MapLayersProps> = ({
	mapMode,
	dataExtremes,
	convertedWorldwideGeoJSON,
	convertedEuropeOnlyGeoJSON,
	isProcessingEuropeOnly,
	currentZoom,
	borderStyle,
	onEachWorldwideFeature,
	onEachEuropeOnlyFeature,
}) => {
	return (
		<>
			{/* Worldwide Mode Layer */}
			{mapMode === "worldwide" && (
				<Pane name="worldwidePane" style={{ zIndex: 30, opacity: 0.9 }}>
					{convertedWorldwideGeoJSON?.features &&
						convertedWorldwideGeoJSON.features.length > 0 && (
							<GeoJSON
								data={convertedWorldwideGeoJSON}
								style={(f) =>
									f
										? mapStyleService.getWorldwideStyle(
												f,
												borderStyle,
												dataExtremes,
											)
										: {}
								}
								onEachFeature={onEachWorldwideFeature}
							/>
						)}
				</Pane>
			)}

			{/* Europe-only Mode Layer */}
			{mapMode === "europe-only" && (
				<Pane name="europeOnlyPane" style={{ zIndex: 30, opacity: 0.9 }}>
					{!isProcessingEuropeOnly &&
						convertedEuropeOnlyGeoJSON?.features &&
						convertedEuropeOnlyGeoJSON.features.length > 0 && (
							<div>
								<div
									hidden
									style={{
										position: "fixed",
										top: "150px",
										left: "150px",
										backgroundColor: "red",
										color: "white",
										padding: "50px",
										zIndex: "92382354",
									}}
								>
									GeoJSON debug:{" "}
									{convertedEuropeOnlyGeoJSON.features[0].properties.NUTS_ID}:{" "}
									{convertedEuropeOnlyGeoJSON.features[0].properties.intensity}
								</div>
								<GeoJSON
									data={convertedEuropeOnlyGeoJSON}
									key={
										convertedEuropeOnlyGeoJSON.features[0].properties.intensity
									}
									style={(f) =>
										f ? mapStyleService.getNutsStyle(f, dataExtremes) : {}
									}
									onEachFeature={onEachEuropeOnlyFeature}
								/>
							</div>
						)}
				</Pane>
			)}

			{/* Grid Mode Layer */}
			{mapMode === "grid" && (
				<Pane name="gridPane" style={{ zIndex: 340, opacity: 1.0 }}>
					{dataExtremes && <AdaptiveGridLayer extremes={dataExtremes} />}
				</Pane>
			)}

			{/* Cities Layer - always rendered, but filtered by data regions, and only over the rendered regions */}
			<CitiesLayer
				zoom={currentZoom}
				dataRegions={
					mapMode === "europe-only"
						? convertedEuropeOnlyGeoJSON
						: mapMode === "grid"
							? null
							: convertedWorldwideGeoJSON
				}
			/>
		</>
	);
};

export default MapLayers;
