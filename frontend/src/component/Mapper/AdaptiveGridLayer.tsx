import L from "leaflet";
import { useMemo } from "react";
import { Popup, Rectangle } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { observer } from "mobx-react-lite";
import { gridProcessingStore } from "../../stores/GridProcessingStore";
import { temperatureDataStore } from "../../stores/TemperatureDataStore";
import { getColorFromGradient } from "./utilities/gradientUtilities";

const AdaptiveGridLayer = observer(() => {
	const canvasRenderer = useMemo(() => L.canvas({ padding: 0.5 }), []);
	const renderStart = performance.now();
	const gridCells = gridProcessingStore.gridCells;
	const processedDataExtremes = temperatureDataStore.processedDataExtremes;

	console.log("📱 AdaptiveGridLayer render START - cells:", gridCells.length);

	const getGridCellStyle = (temperature: number) => {
		if (!processedDataExtremes)
			return {
				fillColor: "#ccc",
				weight: 0.5,
				opacity: 0.8,
				color: "#666",
				fillOpacity: 0.8,
			};
		const color = getColorFromGradient(temperature, processedDataExtremes);
		return {
			fillColor: color,
			weight: 0.5,
			opacity: 0.8,
			color: "#666",
			fillOpacity: 0.8,
		};
	};

	// zIndex less than the city layer so those appear on top.
	const result = (
		<div style={{ zIndex: "335" }}>
			{gridCells.map(
				(
					cell, // these adapt to different scales because cell.bounds changes.
				) => (
					<Rectangle
						key={cell.id}
						bounds={cell.bounds}
						renderer={canvasRenderer}
						interactive
						pathOptions={getGridCellStyle(cell.temperature)}
						eventHandlers={{
							click: (e) => {
								e.target.openPopup();
								e.originalEvent?.stopPropagation();
							},
						}}
					>
						<Popup className="grid-popup">
							<p>{cell.temperature.toFixed(2)}</p>
							<p>Coordinates: {cell.id}</p>
						</Popup>
					</Rectangle>
				),
			)}
		</div>
	); // todo: Replace just teh cell.temperature above: rename temperature to .value (as it is used for R0 too etc) and provide the label.
	// the label should be in some kind of mobx store or passed as prop.

	const renderTime = performance.now() - renderStart;
	console.log(
		`📱 AdaptiveGridLayer render COMPLETE - ${gridCells.length} cells in ${renderTime.toFixed(2)}ms`,
	);

	return result;
});

export default AdaptiveGridLayer;
