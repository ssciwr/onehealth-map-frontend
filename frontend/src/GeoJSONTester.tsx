import type React from "react";
import { useEffect, useState } from "react";

interface GeoJSONFeature {
	geometry: {
		type: "Polygon" | "MultiPolygon";
		coordinates: number[][][] | number[][][][];
	};
	properties: {
		name?: string;
		name_en?: string;
		admin?: string;
		[key: string]: string | number | boolean | null | undefined;
	};
}

interface GeoJSONData {
	type: "FeatureCollection";
	features: GeoJSONFeature[];
}

interface TestResult {
	country: string;
	features: number;
	polygons: number;
	hasData: boolean;
	data: GeoJSONData;
	names: string[];
}

const GeoJSONTester: React.FC = () => {
	const [globalData, setGlobalData] = useState<GeoJSONData | null>(null);
	const [loading, setLoading] = useState<boolean>(false);
	const [results, setResults] = useState<TestResult[]>([]);
	const [selectedCountry, setSelectedCountry] = useState<TestResult | null>(
		null,
	);

	const NATURAL_EARTH_URL =
		"https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_1_states_provinces.geojson";

	const africanCountries = [
		"South Africa",
		"Nigeria",
		"Kenya",
		"Ghana",
		"Ethiopia",
		"Morocco",
		"Egypt",
		"Tanzania",
		"Uganda",
		"Algeria",
		"Sudan",
		"Libya",
		"Chad",
		"Mali",
		"Niger",
		"Angola",
		"Burkina Faso",
		"Cameroon",
		"Madagascar",
		"Zambia",
		"Senegal",
	];

	useEffect(() => {
		loadAndTest();
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

	const loadAndTest = async () => {
		setLoading(true);
		try {
			console.log("Loading Natural Earth data...");
			const response = await fetch(NATURAL_EARTH_URL);
			const data = await response.json();
			setGlobalData(data);

			console.log(`Loaded ${data.features.length} global features`);

			// Test African countries
			const testResults = [];
			for (const country of africanCountries) {
				const features = data.features.filter((f: GeoJSONFeature) => {
					const props = f.properties;
					return (
						props.admin === country ||
						props.name_en === country ||
						JSON.stringify(props).toLowerCase().includes(country.toLowerCase())
					);
				});

				const polygons = features.filter(
					(f: GeoJSONFeature) =>
						f.geometry?.type === "Polygon" ||
						f.geometry?.type === "MultiPolygon",
				);

				testResults.push({
					country,
					features: features.length,
					polygons: polygons.length,
					hasData: polygons.length > 0,
					data: { type: "FeatureCollection" as const, features: polygons },
					names: features
						.slice(0, 3)
						.map(
							(f: GeoJSONFeature) => f.properties.name || f.properties.name_en,
						)
						.filter(Boolean),
				});
			}

			setResults(testResults);
		} catch (error) {
			console.error("Error:", error);
		} finally {
			setLoading(false);
		}
	};

	const showCountry = (countryData: TestResult) => {
		setSelectedCountry(countryData);
	};

	const renderMap = (data: GeoJSONData) => {
		if (!data?.features?.length) return null;

		const features = data.features;
		const bounds = { minLat: 90, maxLat: -90, minLng: 180, maxLng: -180 };

		for (const feature of features) {
			const coords = feature.geometry?.coordinates;
			const processCoords = (
				coordArray: number[] | number[][] | number[][][] | number[][][][],
			): void => {
				if (Array.isArray(coordArray)) {
					if (typeof coordArray[0] === "number") {
						const [lng, lat] = coordArray as number[];
						bounds.minLat = Math.min(bounds.minLat, lat);
						bounds.maxLat = Math.max(bounds.maxLat, lat);
						bounds.minLng = Math.min(bounds.minLng, lng);
						bounds.maxLng = Math.max(bounds.maxLng, lng);
					} else {
						for (const subArray of coordArray as (
							| number[]
							| number[][]
							| number[][][]
						)[]) {
							processCoords(subArray);
						}
					}
				}
			};
			if (coords) processCoords(coords);
		}

		const width = 500;
		const height = 400;
		const padding = 20;

		const scaleX = (lng: number) =>
			((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) *
				(width - 2 * padding) +
			padding;
		const scaleY = (lat: number) =>
			height -
			padding -
			((lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)) *
				(height - 2 * padding);

		return (
			<div style={{ margin: "20px 0" }}>
				<h3>
					{selectedCountry?.country} - {features.length} Administrative Regions
				</h3>
				<svg width={width} height={height} style={{ border: "1px solid #ccc" }}>
					<title>
						Map of {selectedCountry?.country} administrative regions
					</title>
					{features.map((feature: GeoJSONFeature, index: number) => {
						const { type, coordinates } = feature.geometry;
						const color = `hsl(${(index * 137.5) % 360}, 70%, 60%)`;
						const featureId =
							feature.properties.name ||
							feature.properties.name_en ||
							`feature-${index}`;

						if (type === "Polygon") {
							return (coordinates as number[][][]).map(
								(ring: number[][], ringIndex: number) => {
									const ringHash =
										ring.length > 0
											? `${ring[0][0]}-${ring[0][1]}`
											: String(ringIndex);
									return (
										<polygon
											key={`${featureId}-polygon-${ringHash}`}
											points={ring
												.map(
													(coord: number[]) =>
														`${scaleX(coord[0])},${scaleY(coord[1])}`,
												)
												.join(" ")}
											fill={color}
											fillOpacity={0.6}
											stroke="#333"
											strokeWidth={0.5}
										/>
									);
								},
							);
						}
						if (type === "MultiPolygon") {
							return (coordinates as number[][][][]).flatMap(
								(polygon: number[][][], polyIndex: number) =>
									polygon.map((ring: number[][], ringIndex: number) => {
										const ringHash =
											ring.length > 0
												? `${ring[0][0]}-${ring[0][1]}`
												: String(ringIndex);
										return (
											<polygon
												key={`${featureId}-multipolygon-${polyIndex}-${ringHash}`}
												points={ring
													.map(
														(coord: number[]) =>
															`${scaleX(coord[0])},${scaleY(coord[1])}`,
													)
													.join(" ")}
												fill={color}
												fillOpacity={0.6}
												stroke="#333"
												strokeWidth={0.5}
											/>
										);
									}),
							);
						}
						return null;
					})}
				</svg>
				<div style={{ fontSize: "12px", marginTop: "10px" }}>
					<strong>Regions:</strong>{" "}
					{features
						.map(
							(f: GeoJSONFeature) => f.properties.name || f.properties.name_en,
						)
						.filter(Boolean)
						.join(", ")}
				</div>
			</div>
		);
	};

	if (loading) {
		return <div style={{ padding: "20px" }}>Loading Natural Earth data...</div>;
	}

	return (
		<div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
			<h2>African Administrative Subdivisions Test</h2>

			{results.length > 0 && (
				<div>
					<h3>
						Results ({results.filter((r) => r.hasData).length} countries have
						subdivision data):
					</h3>
					<div
						style={{
							display: "grid",
							gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
							gap: "10px",
						}}
					>
						{results
							.filter((r) => r.hasData)
							.map((result) => (
								<button
									key={result.country}
									type="button"
									style={{
										padding: "10px",
										border: "1px solid #ddd",
										backgroundColor: "#f9f9f9",
										cursor: "pointer",
										width: "100%",
										textAlign: "left",
									}}
									onClick={() => showCountry(result)}
								>
									<strong>{result.country}</strong>
									<br />
									{result.polygons} regions
									<br />
									<small style={{ color: "#666" }}>
										{result.names.slice(0, 2).join(", ")}
										{result.names.length > 2 ? "..." : ""}
									</small>
								</button>
							))}
					</div>

					<button
						type="button"
						onClick={() => setSelectedCountry(null)}
						style={{ margin: "20px 0", padding: "10px" }}
					>
						Clear Map
					</button>
				</div>
			)}

			{selectedCountry && renderMap(selectedCountry.data)}

			{globalData && (
				<div style={{ marginTop: "20px", fontSize: "12px", color: "#666" }}>
					Global dataset: {globalData.features.length} features loaded
				</div>
			)}
		</div>
	);
};

export default GeoJSONTester;
