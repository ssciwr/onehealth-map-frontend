import { Popup, Rectangle } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { observer } from "mobx-react-lite";
import { gridProcessingStore } from "../../stores/GridProcessingStore";
import { temperatureDataStore } from "../../stores/TemperatureDataStore";
import { getColorFromGradient } from "./utilities/gradientUtilities";

type AdaptiveGridLayerProps = {};

const AdaptiveGridLayer = observer(({}: AdaptiveGridLayerProps) => {
	const gridCells = gridProcessingStore.gridCells;
	const processedDataExtremes = temperatureDataStore.processedDataExtremes;

	console.log("Rendering grid cells:", gridCells.length);

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

	return (
		<>
			{gridCells.map((cell) => (
				<Rectangle
					key={cell.id}
					bounds={cell.bounds}
					pathOptions={getGridCellStyle(cell.temperature)}
					eventHandlers={{
						click: (e) => {
							e.target.openPopup();
							e.originalEvent?.stopPropagation();
						},
					}}
				>
					<Popup className="grid-popup">
						<h4>Grid Cell</h4>
						<p>Temperature: {cell.temperature.toFixed(2)}°C</p>
						<p>Coordinates: {cell.id}</p>
					</Popup>
				</Rectangle>
			))}
		</>
	);
});

export default AdaptiveGridLayer;
