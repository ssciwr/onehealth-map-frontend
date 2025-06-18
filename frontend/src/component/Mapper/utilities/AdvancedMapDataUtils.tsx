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

// Risk level colors matching the dashboard design
export const RISK_LEVELS = [
	{ min: 0, max: 12.5, color: "#2563eb", label: "Very Low" },
	{ min: 12.5, max: 25, color: "#3b82f6", label: "Low" },
	{ min: 25, max: 37.5, color: "#60a5fa", label: "Low-Medium" },
	{ min: 37.5, max: 50, color: "#fbbf24", label: "Medium" },
	{ min: 50, max: 62.5, color: "#f59e0b", label: "Medium-High" },
	{ min: 62.5, max: 75, color: "#f97316", label: "High" },
	{ min: 75, max: 87.5, color: "#ef4444", label: "Very High" },
	{ min: 87.5, max: 100, color: "#7c2d12", label: "Critical" },
];

export const getRiskLevelColor = (
	value: number,
	extremes: DataExtremes,
): string => {
	// Normalize the value to 0-100 scale
	const normalized =
		((value - extremes.min) / (extremes.max - extremes.min)) * 100;

	// Find the appropriate risk level
	const level = RISK_LEVELS.find(
		(l) => normalized >= l.min && normalized < l.max,
	);
	return level ? level.color : RISK_LEVELS[0].color;
};

export const BottomLegend = ({
	extremes,
	unit = "°C",
	isMobile = false,
}: { extremes: DataExtremes; unit?: string; isMobile?: boolean }) => {
	if (!extremes) return null;

	if (isMobile) {
		// Keep existing mobile legend
		const mobileStyle: React.CSSProperties = {
			minHeight: "25px",
			background:
				"linear-gradient(to right, #2c7bd4, #5a9ee8, #87c1f2, #b8d8f5, #e8f2a8, #f2e485, #f0c45a, #e89c35, #d67220, #c44020, crimson)",
			zIndex: 700,
			display: "flex",
			alignItems: "center",
			minWidth: "100%",
			justifyContent: "space-between",
			backgroundColor: "white",
			borderRadius: "12px",
			marginTop: "12px",
			overflow: "hidden",
		};

		return (
			<div style={{ minWidth: "100%" }}>
				<div style={mobileStyle}>
					<span
						style={{
							fontSize: "12px",
							minHeight: "100%",
							fontWeight: "bold",
							backgroundColor: "rgba(255,255,255,0.3)",
							color: "white",
							padding: "4px 8px",
						}}
					>
						{extremes.min.toFixed(1)}
						<small style={{ color: "rgba(255,255,255,0.5)" }}>{unit}</small>
					</span>
					<span
						style={{
							fontSize: "12px",
							minHeight: "100%",
							fontWeight: "bold",
							backgroundColor: "rgba(255,255,255,0.3)",
							color: "white",
							padding: "4px 8px",
						}}
					>
						{extremes.max.toFixed(1)}
						<small style={{ color: "rgba(255,255,255,0.5)" }}>{unit}</small>
					</span>
				</div>
			</div>
		);
	}

	// Desktop legend is now integrated into the map component
	return null;
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
	console.log("January..");
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

	console.log("Returning data..");

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
