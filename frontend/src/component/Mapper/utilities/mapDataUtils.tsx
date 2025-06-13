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

// Generate color for temperature value based on gradient
const getColorForTemperature = (
	temp: number,
	min: number,
	max: number,
): string => {
	const colors = [
		"#2c7bd4",
		"#5a9ee8",
		"#87c1f2",
		"#b8d8f5",
		"#e8f2a8",
		"#f2e485",
		"#f0c45a",
		"#e89c35",
		"#d67220",
		"#c44020",
		"#dc143c",
	];

	const normalizedTemp = (temp - min) / (max - min);
	const colorIndex = Math.min(
		Math.floor(normalizedTemp * (colors.length - 1)),
		colors.length - 1,
	);
	return colors[colorIndex];
};

// Generate whole number intervals every 10 degrees
const generateIntervals = (
	min: number,
	max: number,
	maxIntervals: number,
): number[] => {
	const intervals: number[] = [];

	// Find the first multiple of 10 that's >= min
	const startTemp = Math.ceil(min / 10) * 10;

	// Generate intervals every 10 degrees
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

	const colors = [
		"#2c7bd4",
		"#5a9ee8",
		"#87c1f2",
		"#b8d8f5",
		// '#e8f2a8',
		//'#f2e485', // this light/white yellows look ugly and make it hard to differentiate on the map.
		"#f0c45a",

		"#e89c35",
		"#d67220",
		"#c44020",
		"#dc143c",
	];

	if (isMobile) {
		const mobileWrapperStyle: React.CSSProperties = {
			minWidth: "100%",
			marginTop: "12px",
		};

		const mobileContainerStyle: React.CSSProperties = {
			backgroundColor: "white",
			borderRadius: "12px",
			padding: "12px",
			boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
			zIndex: 700,
		};

		const mobileBarStyle: React.CSSProperties = {
			height: "30px",
			borderRadius: "6px",
			position: "relative",
			marginBottom: "20px",
			display: "flex",
		};

		const mobileLabelsStyle: React.CSSProperties = {
			display: "flex",
			justifyContent: "space-between",
			alignItems: "center",
			position: "relative",
		};

		const numBlocks = colors.length; // Use exactly 11 blocks
		const blockWidth = 100 / numBlocks;

		return (
			<div style={mobileWrapperStyle}>
				<div style={mobileContainerStyle}>
					<div style={mobileBarStyle}>
						{colors.map((color, i) => {
							const borderRadius =
								i === 0
									? "6px 0 0 6px"
									: i === numBlocks - 1
										? "0 6px 6px 0"
										: "0";

							return (
								<div
									key={color}
									style={{
										width: `${blockWidth}%`,
										height: "100%",
										backgroundColor: color,
										borderRadius: borderRadius,
									}}
								/>
							);
						})}

						{/* Interval markers */}
						{intervals.map((temp) => {
							const position = ((temp - extremes.min) / totalRange) * 100;
							return (
								<div
									key={temp}
									style={{
										position: "absolute",
										left: `${position}%`,
										top: "100%",
										width: "1px",
										height: "8px",
										backgroundColor: "#666",
										transform: "translateX(-50%)",
									}}
								/>
							);
						})}
					</div>

					<div style={mobileLabelsStyle}>
						{/* Min extreme */}
						<span
							hidden
							style={{ fontSize: "11px", fontWeight: "bold", color: "#333" }}
						>
							{extremes.min.toFixed(1)}
							{unit}
						</span>

						{/* Interval labels */}
						{intervals.map((temp) => {
							const position = ((temp - extremes.min) / totalRange) * 100;
							return (
								<span
									key={temp}
									style={{
										position: "absolute",
										left: `${position}%`,
										transform: "translateX(-50%)",
										fontSize: "10px",
										fontWeight: "500",
										color: "#666",
									}}
								>
									{temp}
									{unit}
								</span>
							);
						})}

						{/* Max extreme */}
						<span
							hidden
							style={{ fontSize: "11px", fontWeight: "bold", color: "#333" }}
						>
							{extremes.max.toFixed(1)}
							{unit}
						</span>
					</div>
				</div>
			</div>
		);
	}

	// Desktop version
	const desktopWrapperStyle: React.CSSProperties = {
		position: "fixed",
		bottom: "105px",
		left: "50%",
		transform: "translateX(-50%)",
		backgroundColor: "white",
		borderRadius: "12px",
		padding: "16px",
		boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
		zIndex: 700,
	};

	const desktopBarStyle: React.CSSProperties = {
		height: "40px",
		borderRadius: "8px",
		position: "relative",
		marginBottom: "25px",
		minWidth: "500px", // Wider for desktop
		display: "flex",
	};

	const desktopLabelsStyle: React.CSSProperties = {
		display: "flex",
		justifyContent: "space-between",
		alignItems: "center",
		position: "relative",
	};

	const numBlocks = colors.length; // Use exactly 11 blocks
	const blockWidth = 100 / numBlocks;

	return (
		<div style={desktopWrapperStyle}>
			<div style={desktopBarStyle}>
				{/* Color blocks */}
				{colors.map((color, i) => {
					const borderRadius =
						i === 0 ? "8px 0 0 8px" : i === numBlocks - 1 ? "0 8px 8px 0" : "0";

					return (
						<div
							key={color}
							style={{
								width: `${blockWidth}%`,
								height: "100%",
								backgroundColor: color,
								borderRadius: borderRadius,
							}}
						/>
					);
				})}

				{/* Interval markers */}
				{intervals.map((temp) => {
					const position = ((temp - extremes.min) / totalRange) * 100;
					return (
						<div
							key={temp}
							style={{
								position: "absolute",
								left: `${position}%`,
								top: "100%",
								width: "2px",
								height: "12px",
								backgroundColor: "#666",
								transform: "translateX(-50%)",
							}}
						/>
					);
				})}
			</div>

			<div style={desktopLabelsStyle}>
				{/* Min extreme */}
				<span
					hidden
					style={{ fontSize: "13px", fontWeight: "bold", color: "#333" }}
				>
					{extremes.min.toFixed(1)}
					{unit}
				</span>

				{/* Interval labels */}
				{intervals.map((temp) => {
					const position = ((temp - extremes.min) / totalRange) * 100;
					return (
						<span
							key={temp}
							style={{
								position: "absolute",
								left: `${position}%`,
								transform: "translateX(-50%)",
								fontSize: "12px",
								fontWeight: "500",
								color: "#666",
							}}
						>
							{temp}
							{unit}
						</span>
					);
				})}

				{/* Max extreme */}
				<span
					hidden
					style={{ fontSize: "13px", fontWeight: "bold", color: "#333" }}
				>
					{extremes.max.toFixed(1)}
					{unit}
				</span>
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
	const response = await fetch(dataPath);
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
