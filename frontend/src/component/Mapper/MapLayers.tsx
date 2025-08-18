import type React from "react";
import { GeoJSON, Pane } from "react-leaflet";
import { mapStyleService } from "../../services/MapStyleService";
import type { BorderStyle } from "../../services/MapStyleService";
import CitiesLayer from "./CitiesLayer";
import ClippedGridLayer from "./ClippedGridLayer";
import type {
	DataExtremes,
	NutsGeoJSON,
	TemperatureDataPoint,
	ViewportBounds,
	WorldwideGeoJSON,
} from "./types";

interface MapLayersProps {
	mapMode: "grid" | "worldwide" | "europe-only";
	temperatureData: TemperatureDataPoint[];
	viewport: ViewportBounds | null;
	resolutionLevel: number;
	dataExtremes: DataExtremes | null;
	worldGeoJSON: GeoJSON.FeatureCollection | null;
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
	temperatureData,
	viewport,
	resolutionLevel,
	dataExtremes,
	worldGeoJSON,
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
			{/* Grid Mode Layers */}
			{mapMode === "grid" && (
				<Pane name="worldPane" style={{ zIndex: 10 }}>
					{worldGeoJSON && (
						<GeoJSON
							data={worldGeoJSON}
							style={mapStyleService.getWorldStyle}
						/>
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

			{/* Cities Layer - always rendered */}
			<CitiesLayer zoom={currentZoom} />
		</>
	);
};

export default MapLayers;
