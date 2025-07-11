import * as turf from "@turf/turf";
import L from "leaflet";
import type { DataExtremes, TemperatureDataPoint } from "../types.ts";

export const MIN_ZOOM = 3.4;
export const MAX_ZOOM = 7;

/* Blue-red-red:
const TEMP_COLORS = [
	"#2c7bd4",
	"#5a9ee8",
	"#87c1f2",
	"#b8d8f5",
	"#f0c45a",
	"#e89c35",
	"#d67220",
	"#c44020",
];
 */
export const TEMP_COLORS = [
	"#4c1d4b", // Deep purple
	"#663399", // Purple
	"#7b4397", // Purple-blue
	"#2e86ab", // Blue
	"#39a97e", // Teal-green
	"#56c579", // Light green
	"#a7d88f", // Pale green
	"#e2fba2", // Very light green/yellow
];

// Generate whole number intervals every 10 degrees
const generateIntervals = (
	min: number,
	max: number,
	maxIntervals: number,
): number[] => {
	const practicalMin = min + 3;
	const practicalMax = max - 3; // 3 degree padding so that it doesn't overlap on the scale.
	const intervals: number[] = [];
	const startTemp = Math.ceil(practicalMin / 10) * 10;

	for (
		let temp = startTemp;
		temp < practicalMax && intervals.length < maxIntervals;
		temp += 5
	) {
		intervals.push(temp);
	}

	return intervals;
};

export const Legend = ({
	extremes,
	unit = "°C",
	isMobile = false,
}: { extremes: DataExtremes; unit?: string; isMobile?: boolean }) => {
	if (!extremes) return null;

	const intervals = generateIntervals(
		extremes.min,
		extremes.max,
		isMobile ? 2.5 : 10,
	);
	const totalRange = extremes.max - extremes.min;
	const isVertical = !isMobile;

	// Wrapper styles for positioning
	const wrapperStyle: React.CSSProperties = isMobile
		? {
				minWidth: "100%",
				marginTop: "12px",
			}
		: {
				position: "fixed",
				top: "20%",
				bottom: "20%",
				left: "32px",
				zIndex: 700,
			};

	// Container styles
	const containerStyle: React.CSSProperties = {
		backgroundColor: "white",
		borderRadius: "12px",
		padding: isMobile ? "12px" : "16px",
		boxShadow: `0 ${isMobile ? 2 : 4}px ${isMobile ? 8 : 12}px rgba(0, 0, 0, ${isMobile ? 0.1 : 0.15})`,
		display: "flex",
		flexDirection: isVertical ? "row" : "column",
		alignItems: "center",
		gap: isVertical ? "15px" : "12px",
		height: isVertical ? "100%" : "auto",
	};

	const barStyle: React.CSSProperties = {
		borderRadius: "8px",
		position: "relative",
		display: "flex",
		flexDirection: isVertical ? "column" : "row",
		...(isVertical
			? { width: "40px", height: "100%" }
			: { width: "100%", height: "30px" }),
	};

	const labelsStyle: React.CSSProperties = {
		display: "flex",
		flexDirection: isVertical ? "column" : "row",
		justifyContent: "space-between",
		alignItems: isVertical ? "flex-start" : "center",
		position: "relative",
		...(isVertical ? { height: "100%" } : { width: "100%" }),
	};

	// Color blocks with proper orientation
	const colors = isVertical ? [...TEMP_COLORS].reverse() : TEMP_COLORS;
	const numBlocks = colors.length;

	const renderColorBlocks = () =>
		colors.map((color, i) => {
			const isFirst = i === 0;
			const isLast = i === numBlocks - 1;
			const borderRadius = isVertical
				? isFirst
					? "8px 8px 0 0"
					: isLast
						? "0 0 8px 8px"
						: "0"
				: isFirst
					? "8px 0 0 8px"
					: isLast
						? "0 8px 8px 0"
						: "0";

			return (
				<div
					key={`${color}`}
					style={{
						[isVertical ? "height" : "width"]: `${100 / numBlocks}%`,
						[isVertical ? "width" : "height"]: "100%",
						backgroundColor: color,
						borderRadius,
					}}
				/>
			);
		});

	const renderIntervalMarkers = () =>
		intervals.map((temp) => {
			const position = ((temp - extremes.min) / totalRange) * 100;
			return (
				<div
					key={temp}
					style={{
						position: "absolute",
						[isVertical ? "bottom" : "left"]: `${position}%`,
						[isVertical ? "right" : "top"]: "100%",
						[isVertical ? "width" : "height"]: isVertical ? "12px" : "8px",
						[isVertical ? "height" : "width"]: "2px",
						backgroundColor: "#f8f9fa",
						transform: isVertical ? "translateY(50%)" : "translateX(-50%)",
					}}
				/>
			);
		});

	const renderLabels = () => {
		const labelStyle = (size: "small" | "large") => ({
			fontSize: size === "small" ? "11px" : "13px",
			fontWeight: size === "small" ? "500" : "bold",
			color: "rgb(80,80,80)",
		});

		const sortedIntervals = isVertical ? [...intervals].reverse() : intervals;

		return (
			<>
				{/* Min/Max extremes */}
				<span style={labelStyle("large")}>
					{isVertical ? Math.round(extremes.max) : Math.round(extremes.min)}
					{unit}
				</span>

				{/* Interval labels */}
				{sortedIntervals.map((temp) => {
					const position = ((temp - extremes.min) / totalRange) * 100;
					return (
						<span
							key={temp}
							style={{
								position: "absolute",
								[isVertical ? "bottom" : "left"]: `${position}%`,
								transform: isVertical ? "translateY(50%)" : "translateX(-50%)",
								...labelStyle("small"),
							}}
						>
							{temp}
							{unit}
						</span>
					);
				})}

				{/* Opposite extreme */}
				<span
					style={{
						...labelStyle("large"),
						position: "absolute",
						[isVertical ? "bottom" : "right"]: 0,
					}}
				>
					{isVertical ? Math.round(extremes.min) : Math.round(extremes.max)}
					{unit}
				</span>
			</>
		);
	};

	return (
		<div style={wrapperStyle}>
			<div style={containerStyle}>
				<div style={barStyle}>
					{renderColorBlocks()}
					{renderIntervalMarkers()}
				</div>
				<div style={labelsStyle}>{renderLabels()}</div>
			</div>
		</div>
	);
};

export const calculateExtremes = (
	data: TemperatureDataPoint[],
	calculatePercentiles = true,
): DataExtremes => {
	if (!data || data.length === 0) return { min: 0, max: 0 };

	const temperatures = data
		.map((point) => point.temperature)
		.filter((temp) => !Number.isNaN(temp));

	if (temperatures.length === 0) return { min: 0, max: 0 };

	if (calculatePercentiles) {
		const sortedTemps = [...temperatures].sort((a, b) => a - b);
		const p5Index = Math.floor((25 / 100) * (sortedTemps.length - 1));
		const p95Index = Math.floor((75 / 100) * (sortedTemps.length - 1));

		return {
			min: sortedTemps[p5Index],
			max: sortedTemps[p95Index],
		};
	}

	return {
		min: Math.min(...temperatures),
		max: Math.max(...temperatures),
	};
};

export const loadTemperatureData = async (
	year: number,
): Promise<{
	dataPoints: TemperatureDataPoint[];
	extremes: DataExtremes;
	bounds: L.LatLngBounds | null;
}> => {
	const dataPath = `${year.toString()}_data_january_05res.csv`;
	console.log("DataPath:", dataPath);
	const response = await fetch(`/${dataPath}`);
	const text = await response.text();
	const rows = text
		.split("\n")
		.slice(1)
		.filter((row) => row.trim() !== "");

	const sampleRate = 1;
	const dataPoints: TemperatureDataPoint[] = [];

	for (let i = 0; i < rows.length; i++) {
		if (i % Math.floor(1 / sampleRate) === 0) {
			const row = rows[i];
			const values = row.split(",");
			if (values.length >= 4) {
				const temperature = Number.parseFloat(values[3]) || 0;
				const lat = Number.parseFloat(values[1]) || 0;
				const lng = Number.parseFloat(values[2]) || 0;
				if (i % 100000 === 0) {
					console.log("Lat:", lat, "Long: ", lng, "Temp:", temperature);
				}

				if (
					!Number.isNaN(lat) &&
					!Number.isNaN(lng) &&
					!Number.isNaN(temperature)
				) {
					dataPoints.push({
						point: turf.point([lng, lat]),
						temperature: temperature,
						lat: lat,
						lng: lng,
					});
				}
			}
		}
	}

	const extremes = calculateExtremes(dataPoints);

	let bounds: L.LatLngBounds | null = null;
	if (dataPoints.length > 0) {
		const lats = dataPoints.map((p) => p.lat);
		const lngs = dataPoints.map((p) => p.lng);
		bounds = L.latLngBounds([
			[Math.min(...lats), Math.min(...lngs)],
			[Math.max(...lats), Math.max(...lngs)],
		]);
	}

	return { dataPoints, extremes, bounds };
};
