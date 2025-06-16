import * as turf from "@turf/turf";
import L from "leaflet";
import {
	COLOR_SCHEMES,
	type DataExtremes,
	type OutbreakData,
	type TemperatureDataPoint,
} from "../types.ts";

export const MIN_ZOOM = 3.4;
export const MAX_ZOOM = 7;

const TEMP_COLORS = [
	"#2c7bd4",
	"#5a9ee8",
	"#87c1f2",
	"#b8d8f5",
	"#f0c45a",
	"#e89c35",
	"#d67220",
	"#c44020",
	"#dc143c",
];

// Generate color for temperature value based on gradient
const getColorForTemperature = (
	temp: number,
	min: number,
	max: number,
): string => {
	const normalizedTemp = (temp - min) / (max - min);
	const colorIndex = Math.min(
		Math.floor(normalizedTemp * (TEMP_COLORS.length - 1)),
		TEMP_COLORS.length - 1,
	);
	return TEMP_COLORS[colorIndex];
};

// Generate whole number intervals every 10 degrees
const generateIntervals = (
	min: number,
	max: number,
	maxIntervals: number,
): number[] => {
	const intervals: number[] = [];
	const startTemp = Math.ceil(min / 10) * 10;

	for (
		let temp = startTemp;
		temp < max && intervals.length < maxIntervals;
		temp += 10
	) {
		intervals.push(temp);
	}

	return intervals;
};

export const BottomLegend = ({
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
	const wrapperStyle: React.CSSProperties = isMobile ? {
		minWidth: "100%",
		marginTop: "12px",
	} : {
		position: "fixed",
		top: "130px",
		left: "40px",
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
	};

	const barStyle: React.CSSProperties = {
		borderRadius: "8px",
		position: "relative",
		display: "flex",
		flexDirection: isVertical ? "column" : "row",
		...(isVertical
				? { width: "40px", height: "300px" }
				: { width: "100%", height: "30px" }
		),
	};

	const labelsStyle: React.CSSProperties = {
		display: "flex",
		flexDirection: isVertical ? "column" : "row",
		justifyContent: "space-between",
		alignItems: isVertical ? "flex-start" : "center",
		position: "relative",
		...(isVertical
				? { height: "300px" }
				: { width: "100%", marginTop: "20px" }
		),
	};

	// Color blocks with proper orientation
	const colors = isVertical ? [...TEMP_COLORS].reverse() : TEMP_COLORS;
	const numBlocks = colors.length;

	const renderColorBlocks = () =>
		colors.map((color, i) => {
			const isFirst = i === 0;
			const isLast = i === numBlocks - 1;
			const borderRadius = isVertical
				? isFirst ? "8px 8px 0 0" : isLast ? "0 0 8px 8px" : "0"
				: isFirst ? "8px 0 0 8px" : isLast ? "0 8px 8px 0" : "0";

			return (
				<div
					key={`${color}-${i}`}
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
						backgroundColor: "#666",
						transform: isVertical ? "translateY(50%)" : "translateX(-50%)",
					}}
				/>
			);
		});

	const renderLabels = () => {
		const labelStyle = (size: "small" | "large") => ({
			fontSize: size === "small" ? "11px" : "13px",
			fontWeight: size === "small" ? "500" : "bold",
			color: size === "small" ? "#666" : "#333",
		});

		const sortedIntervals = isVertical ? [...intervals].reverse() : intervals;

		return (
			<>
				{/* Min/Max extremes */}
				<span style={labelStyle("large")}>
					{isVertical ? Math.round(extremes.max) : Math.round(extremes.min)}{unit}
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
							{temp}{unit}
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
					{isVertical ? Math.round(extremes.min) : Math.round(extremes.max)}{unit}
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
				<div style={labelsStyle}>
					{renderLabels()}
				</div>
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

export const parseCSVToOutbreaks = (csvData: string): OutbreakData[] => {
	const lines = csvData.trim().split("\n");
	const headers = lines[0].split(",");

	return lines.slice(1).map((line, index) => {
		const values = line.split(",");
		const outbreak: Record<string, string | number> = {};

		headers.forEach((header, i) => {
			const value = values[i];
			if (
				header === "latitude" ||
				header === "longitude" ||
				header === "cases"
			) {
				outbreak[header] = Number.parseFloat(value) || 0;
			} else {
				outbreak[header] = value || "";
			}
		});

		return {
			id: (outbreak.id as string) || `outbreak-${index}`,
			category: (outbreak.category as string) || "Unknown",
			location: (outbreak.location as string) || "Unknown",
			latitude: (outbreak.latitude as number) || 0,
			longitude: (outbreak.longitude as number) || 0,
			date: (outbreak.date as string) || "",
			cases: (outbreak.cases as number) || 0,
			notes: (outbreak.notes as string) || undefined,
		} as OutbreakData;
	});
};