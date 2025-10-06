import { Popup, Rectangle } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useGridProcessing } from "../../hooks/useGridProcessing";
import type { DataExtremes } from "./types";
import { getColorFromGradient } from "./utilities/gradientUtilities";

interface AdaptiveGridLayerProps {
	extremes: DataExtremes;
}

const AdaptiveGridLayer = ({ extremes }: AdaptiveGridLayerProps) => {
	const { gridCells } = useGridProcessing();

	const getGridCellStyle = (temperature: number) => {
		const color = getColorFromGradient(temperature, extremes);
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
};

export default AdaptiveGridLayer;
