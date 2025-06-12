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

export const BottomLegend = ({
	extremes,
	unit = "°C",
}: { extremes: DataExtremes; unit?: string }) => {
	if (!extremes) return null;

	const scheme = COLOR_SCHEMES.default;

	return (
		<div
			style={{
				position: "fixed",
				bottom: 0,
				left: 0,
				right: 0,
				minHeight: "25px",
				background: `linear-gradient(to right, ${scheme.low}, ${scheme.high})`, // putting the real yellow here makes it very ugly :/
				// but yellow makes the map much easier to understand/read. Another color less contrasting could work. Grey maybe but thats bad.
				// I would say white, but the BG is which generally.
				zIndex: 700,
				display: "flex",
				alignItems: "center",
				justifyContent: "space-between",
				backgroundColor: "white",
			}}
		>
			<span
				style={{
					fontSize: "12px",
					minHeight: "100%",
					fontWeight: "bold",
					backgroundColor: "rgba(255,255,255,0.3)",
					color: "white",
					padding: "4px 2px",
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
					padding: "4px 2px",
				}}
			>
				{extremes.max.toFixed(1)}
				<small style={{ color: "rgba(255,255,255,0.5)" }}>{unit}</small>
			</span>
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
