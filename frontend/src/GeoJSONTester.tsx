import type React from "react";
import { useEffect, useState } from "react";

const GeoJSONTester: React.FC = () => {
	const [globalData, setGlobalData] = useState<any>(null);
	const [loading, setLoading] = useState<boolean>(false);
	const [results, setResults] = useState<any[]>([]);
	const [selectedCountry, setSelectedCountry] = useState<any>(null);

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
	}, []);

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
				const features = data.features.filter((f: any) => {
					const props = f.properties;
					return (
						props.admin === country ||
						props.name_en === country ||
						JSON.stringify(props).toLowerCase().includes(country.toLowerCase())
					);
				});

				const polygons = features.filter(
					(f: any) =>
						f.geometry?.type === "Polygon" ||
						f.geometry?.type === "MultiPolygon",
				);

				testResults.push({
					country,
					features: features.length,
					polygons: polygons.length,
					hasData: polygons.length > 0,
					data: { type: "FeatureCollection", features: polygons },
					names: features
						.slice(0, 3)
						.map((f: any) => f.properties.name || f.properties.name_en)
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

	const showCountry = (countryData: any) => {
		setSelectedCountry(countryData);
	};

	const renderMap = (data: any) => {
		if (!data?.features?.length) return null;

		const features = data.features;
		const bounds = { minLat: 90, maxLat: -90, minLng: 180, maxLng: -180 };

		features.forEach((feature: any) => {
			const coords = feature.geometry?.coordinates;
			const processCoords = (coordArray: any): void => {
				if (Array.isArray(coordArray)) {
					if (typeof coordArray[0] === "number") {
						const [lng, lat] = coordArray;
						bounds.minLat = Math.min(bounds.minLat, lat);
						bounds.maxLat = Math.max(bounds.maxLat, lat);
						bounds.minLng = Math.min(bounds.minLng, lng);
						bounds.maxLng = Math.max(bounds.maxLng, lng);
					} else {
						coordArray.forEach(processCoords);
					}
				}
			};
			if (coords) processCoords(coords);
		});

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
					{selectedCountry.country} - {features.length} Administrative Regions
				</h3>
				<svg width={width} height={height} style={{ border: "1px solid #ccc" }}>
					{features.map((feature: any, index: number) => {
						const { type, coordinates } = feature.geometry;
						const color = `hsl(${(index * 137.5) % 360}, 70%, 60%)`;

						if (type === "Polygon") {
							return coordinates.map((ring: any, ringIndex: number) => (
								<polygon
									key={`${index}-${ringIndex}`}
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
							));
						} else if (type === "MultiPolygon") {
							return coordinates.map((polygon: any, polyIndex: number) =>
								polygon.map((ring: any, ringIndex: number) => (
									<polygon
										key={`${index}-${polyIndex}-${ringIndex}`}
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
								)),
							);
						}
						return null;
					})}
				</svg>
				<div style={{ fontSize: "12px", marginTop: "10px" }}>
					<strong>Regions:</strong>{" "}
					{features
						.map((f: any) => f.properties.name || f.properties.name_en)
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
							.map((result, index) => (
								<div
									key={index}
									style={{
										padding: "10px",
										border: "1px solid #ddd",
										backgroundColor: "#f9f9f9",
										cursor: "pointer",
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
								</div>
							))}
					</div>

					<button
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
