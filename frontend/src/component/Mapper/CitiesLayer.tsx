import L from "leaflet";
import { useEffect, useState } from "react";
import { CircleMarker, Marker, Pane, Popup } from "react-leaflet";
import { MAX_ZOOM, MIN_ZOOM } from "./utilities/mapDataUtils.tsx";

interface City {
	name: string;
	lat: number;
	lng: number;
	population: number;
	country: string;
}

interface CityCSV {
	city: string;
	city_ascii: string;
	lat: string;
	lng: string;
	pop: string;
	country: string;
	iso2: string;
	iso3: string;
	province: string;
}

interface CitiesLayerProps {
	zoom: number;
}

const CitiesLayer = ({ zoom }: CitiesLayerProps) => {
	const [cities, setCities] = useState<City[]>([]);

	useEffect(() => {
		const loadCities = async () => {
			try {
				// Load from CSV data source (MIT licensed) - non-blocking
				const response = await fetch("/data/world_cities.csv");
				if (!response.ok) {
					throw new Error(`HTTP ${response.status}: ${response.statusText}`);
				}
				const csvText = await response.text();
				const cities = parseCSVToCities(csvText);
				setCities(cities);
			} catch (error) {
				console.warn(
					"Cities layer failed to load, continuing without cities:",
					error,
				);
				// Don't block map rendering if cities fail to load
				setCities([]);
			}
		};

		// Use setTimeout to make cities loading non-blocking
		const timeoutId = setTimeout(loadCities, 100);

		return () => clearTimeout(timeoutId);
	}, []);

	// CSV parsing function for world_cities.csv
	const parseCSVToCities = (csvText: string): City[] => {
		const lines = csvText.split("\n");
		const headers = lines[0].split(",").map((h) => h.trim());

		return lines
			.slice(1)
			.filter((line) => line.trim())
			.map((line) => {
				const values = line.split(",").map((v) => v.trim());
				const csvCity: Partial<CityCSV> = {};

				headers.forEach((header, index) => {
					csvCity[header as keyof CityCSV] = values[index];
				});

				return {
					name: csvCity.city_ascii || csvCity.city || "",
					lat: Number.parseFloat(csvCity.lat || "0"),
					lng: Number.parseFloat(csvCity.lng || "0"),
					population: Number.parseInt(csvCity.pop || "0"),
					country: csvCity.country || "",
				} as City;
			})
			.filter(
				(city) =>
					city.name &&
					!Number.isNaN(city.lat) &&
					!Number.isNaN(city.lng) &&
					city.population > 0,
			);
	};

	const getPopulationThreshold = (zoom: number): number => {
		const zoomRange = MAX_ZOOM - MIN_ZOOM;
		const zoomProgress = (zoom - MIN_ZOOM) / zoomRange;

		if (zoomProgress >= 0.9) return 0;
		if (zoomProgress >= 0.7) return 100000;
		if (zoomProgress >= 0.5) return 300000;
		if (zoomProgress >= 0.3) return 1000000;
		return 5000000;
	};

	const getMarkerSize = (population: number, zoom: number): number => {
		const baseSize = Math.min(zoom * 0.8, 8);
		const populationFactor = Math.log10(population / 100000) * 0.5;
		return Math.max(2, Math.min(12, baseSize + populationFactor));
	};

	const formatPopulation = (population: number): string => {
		if (population >= 1000000) {
			return `${(population / 1000000).toFixed(1)}M`;
		}
		if (population >= 1000) {
			return `${Math.round(population / 1000)}K`;
		}
		return population.toString();
	};

	const createCityLabelIcon = (cityName: string, zoom: number): L.DivIcon => {
		const fontSize = Math.max(11, Math.min(13, zoom * 1.1));
		const paddingVertical = Math.max(4, Math.min(6, zoom * 0.4));
		const paddingHorizontal = Math.max(8, Math.min(12, zoom * 0.8));

		// Estimate text width for proper sizing
		const estimatedWidth =
			cityName.length * fontSize * 0.6 + paddingHorizontal * 2;
		const estimatedHeight = fontSize + paddingVertical * 2 + 4;

		return L.divIcon({
			html: `
				<div style="
					background-color: rgba(255, 255, 255, 0.95);
					padding: ${paddingVertical}px ${paddingHorizontal}px;
					border: none;
					border-radius: 12px;
					font-size: ${fontSize}px;
					font-weight: 600;
					color: #2c3e50;
					white-space: nowrap;
					text-align: center;
					box-shadow: 0 2px 8px rgba(0,0,0,0.15);
					font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
					letter-spacing: 0.025em;
					line-height: 1.2;
					backdrop-filter: blur(4px);
					-webkit-backdrop-filter: blur(4px);
					display: inline-block;
					min-width: fit-content;
				">
					${cityName}
				</div>
			`,
			className: "city-label",
			iconSize: [estimatedWidth, estimatedHeight],
			iconAnchor: [estimatedWidth / 2, estimatedHeight + 8],
			popupAnchor: [0, 0],
		});
	};

	const threshold = getPopulationThreshold(zoom);
	const visibleCities = cities.filter((city) => city.population >= threshold);

	return (
		<Pane name="citiesPane" style={{ zIndex: 100 }}>
			{visibleCities.map((city) => (
				<div key={`${city.name}-${city.country}`}>
					{/* City marker dot */}
					<CircleMarker
						center={[city.lat, city.lng]}
						radius={getMarkerSize(city.population, zoom)}
						fillColor="#ffffff"
						fillOpacity={0.9}
						color="#333333"
						weight={1}
						opacity={0.8}
					>
						<Popup>
							<div style={{ fontSize: "14px", lineHeight: "1.4" }}>
								<strong>{city.name}</strong>
								<br />
								<span style={{ color: "#666" }}>{city.country}</span>
								<br />
								<span style={{ fontSize: "12px" }}>
									Population: {formatPopulation(city.population)}
								</span>
							</div>
						</Popup>
					</CircleMarker>

					{/* City name label */}
					<Marker
						position={[city.lat, city.lng]}
						icon={createCityLabelIcon(city.name, zoom)}
					/>
				</div>
			))}
		</Pane>
	);
};

export default CitiesLayer;
