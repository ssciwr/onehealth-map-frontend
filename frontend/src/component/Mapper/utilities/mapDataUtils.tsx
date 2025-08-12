import * as turf from "@turf/turf";
import L from "leaflet";
import { isMobile } from "react-device-detect";
import { fetchClimateData } from "../../../services/climateDataService.ts";
import type { DataExtremes, TemperatureDataPoint } from "../types.ts";

export const MIN_ZOOM = 3.4;
export const MAX_ZOOM = 10;

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
	unit = "R0",
}: { extremes: DataExtremes; unit?: string }) => {
	if (!extremes) return null;

	const intervals = generateIntervals(
		extremes.min,
		extremes.max,
		isMobile ? 6 : 10,
	);
	const totalRange = extremes.max - extremes.min;

	// Mobile timeline styles - full width, integrated with timeline
	if (isMobile) {
		const containerStyle: React.CSSProperties = {
			width: "100%",
			padding: "12px 16px",
			backgroundColor: "transparent",
			display: "flex",
			flexDirection: "column",
			gap: "8px",
			margin: 0,
		};

		const barStyle: React.CSSProperties = {
			height: "24px",
			width: "100%",
			borderRadius: "12px",
			position: "relative",
			display: "flex",
			flexDirection: "row",
			overflow: "hidden",
		};

		const labelsStyle: React.CSSProperties = {
			display: "flex",
			justifyContent: "space-between",
			alignItems: "center",
			width: "100%",
			position: "relative",
			marginTop: "6px",
		};

		const renderMobileColorBlocks = () =>
			TEMP_COLORS.map((color, i) => {
				const isFirst = i === 0;
				const isLast = i === TEMP_COLORS.length - 1;
				const borderRadius = isFirst
					? "12px 0 0 12px"
					: isLast
						? "0 12px 12px 0"
						: "0";

				return (
					<div
						key={color}
						style={{
							width: `${100 / TEMP_COLORS.length}%`,
							height: "100%",
							backgroundColor: color,
							borderRadius,
						}}
					/>
				);
			});

		const renderMobileLabels = () => {
			const labelStyle = {
				fontSize: "10px",
				fontWeight: "600",
				color: "rgb(60,60,60)",
			};

			return (
				<>
					<span style={labelStyle}>
						{Math.round(extremes.min)}&nbsp;
						{unit}
					</span>
					{intervals.map((temp) => {
						const position = ((temp - extremes.min) / totalRange) * 100;
						return (
							<span
								key={temp}
								style={{
									position: "absolute",
									left: `${position}%`,
									transform: "translateX(-50%)",
									...labelStyle,
									fontSize: "9px",
									fontWeight: "500",
								}}
							>
								{temp}
								{unit}
							</span>
						);
					})}
					<span style={labelStyle}>
						{Math.round(extremes.max)}&nbsp;
						{unit}
					</span>
				</>
			);
		};

		return (
			<div style={containerStyle}>
				<div style={barStyle}>{renderMobileColorBlocks()}</div>
				<div style={labelsStyle}>{renderMobileLabels()}</div>
			</div>
		);
	}

	// Desktop vertical legend styles (unchanged)
	if (!isMobile) {
		const wrapperStyle: React.CSSProperties = {
			position: "fixed",
			top: "20%",
			bottom: "20%",
			left: "32px",
			zIndex: 700,
		};

		const containerStyle: React.CSSProperties = {
			backgroundColor: "white",
			borderRadius: "12px",
			padding: "16px",
			boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
			display: "flex",
			flexDirection: "row",
			alignItems: "center",
			gap: "15px",
			height: "100%",
		};

		const barStyle: React.CSSProperties = {
			borderRadius: "8px",
			position: "relative",
			display: "flex",
			flexDirection: "column",
			width: "40px",
			height: "100%",
		};

		const labelsStyle: React.CSSProperties = {
			display: "flex",
			flexDirection: "column",
			justifyContent: "space-between",
			alignItems: "flex-start",
			position: "relative",
			height: "100%",
		};

		const renderColorBlocks = () => {
			const colors = [...TEMP_COLORS].reverse();
			return colors.map((color, i) => {
				const isFirst = i === 0;
				const isLast = i === colors.length - 1;
				const borderRadius = isFirst
					? "8px 8px 0 0"
					: isLast
						? "0 0 8px 8px"
						: "0";

				return (
					<div
						key={color}
						style={{
							height: `${100 / colors.length}%`,
							width: "100%",
							backgroundColor: color,
							borderRadius,
						}}
					/>
				);
			});
		};

		const renderIntervalMarkers = () =>
			intervals.map((temp) => {
				const position = ((temp - extremes.min) / totalRange) * 100;
				return (
					<div
						key={temp}
						style={{
							position: "absolute",
							bottom: `${position}%`,
							right: "100%",
							width: "12px",
							height: "2px",
							backgroundColor: "#f8f9fa",
							transform: "translateY(50%)",
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

			const sortedIntervals = [...intervals].reverse();

			return (
				<>
					<span style={labelStyle("large")}>
						{Math.round(extremes.max)}&nbsp;
						<small className="text-gray-800">{unit}</small>
					</span>

					{sortedIntervals.map((temp) => {
						const position = ((temp - extremes.min) / totalRange) * 100;
						return (
							<span
								key={temp}
								style={{
									position: "absolute",
									bottom: `${position}%`,
									transform: "translateY(50%)",
									...labelStyle("small"),
								}}
							>
								{temp}
								{unit}
							</span>
						);
					})}

					<span
						style={{
							...labelStyle("large"),
							position: "absolute",
							bottom: 0,
						}}
					>
						{Math.round(extremes.min)}&nbsp;
						<small className="text-gray-800">{unit}</small>
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
	}
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
	month: number,
	requestedVariableValue = "R0",
	outputFormat?: string[],
): Promise<{
	dataPoints: TemperatureDataPoint[];
	extremes: DataExtremes;
	bounds: L.LatLngBounds | null;
}> => {
	console.log(
		"Loading climate data for year:",
		year,
		"month:",
		month,
		"variable:",
		requestedVariableValue,
	);

	// Additional validation here too
	if (month === undefined || month === null) {
		throw new Error(
			`loadTemperatureData: Month parameter is ${month}. Expected a number between 1-12.`,
		);
	}

	try {
		const apiData = await fetchClimateData(
			year,
			month,
			requestedVariableValue,
			outputFormat,
		);
		const dataPoints: TemperatureDataPoint[] = [];

		for (let i = 0; i < apiData.length; i++) {
			const { latitude: lat, longitude: lng, temperature } = apiData[i];

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

		const extremes = calculateExtremes(dataPoints);

		let bounds: L.LatLngBounds | null = null;
		if (dataPoints.length > 0) {
			const lats = dataPoints.map((p) => p.lat);
			const lngs = dataPoints.map((p) => p.lng);
			bounds = L.latLngBounds([
				[Math.min(...lats) - 15, Math.min(...lngs) - 15],
				[Math.max(...lats) + 15, Math.max(...lngs) + 15],
			]);
		}

		return { dataPoints, extremes, bounds };
	} catch (error) {
		console.error("Failed to load temperature data:", error);
		throw error;
	}
};
