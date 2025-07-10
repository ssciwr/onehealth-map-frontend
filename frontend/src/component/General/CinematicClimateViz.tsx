import {
	Eye,
	EyeOff,
	Info,
	Layers,
	Pause,
	Play,
	SkipBack,
	SkipForward,
	Sliders,
} from "lucide-react";
import { useEffect, useState } from "react";
import { GeoJSON, MapContainer, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import type { Layer } from "leaflet";

type CountryId = "france" | "germany" | "uk";

type CountryFeature = Feature<Geometry, { name: string; id: CountryId }>;

const CinematicClimateViz = () => {
	const [isPlaying, setIsPlaying] = useState(false);
	const [currentYear, setCurrentYear] = useState(2020);
	const [showTemperature, setShowTemperature] = useState(true);
	const [selectedCountry, setSelectedCountry] = useState<CountryId | null>(
		null,
	);
	const [hoveredCountry, setHoveredCountry] = useState<CountryId | null>(null);

	// Fake climate data for each country
	const climateData = {
		france: {
			name: "France",
			temp2020: 13.5,
			temp2100: 17.2,
			deltaTemp: "+3.7°C",
			risk: "moderate",
			coordinates: [46.2276, 2.2137],
		},
		germany: {
			name: "Germany",
			temp2020: 10.2,
			temp2100: 13.8,
			deltaTemp: "+3.6°C",
			risk: "moderate",
			coordinates: [51.1657, 10.4515],
		},
		uk: {
			name: "United Kingdom",
			temp2020: 9.8,
			temp2100: 12.9,
			deltaTemp: "+3.1°C",
			risk: "low",
			coordinates: [55.3781, -3.436],
		},
	};

	// Simplified country boundaries (in real app, load from GeoJSON)
	const countryFeatures: FeatureCollection<
		Geometry,
		{ name: string; id: CountryId }
	> = {
		type: "FeatureCollection",
		features: [
			{
				type: "Feature",
				properties: { name: "France", id: "france" },
				geometry: {
					type: "Polygon",
					coordinates: [
						[
							[-5, 51],
							[2.5, 51],
							[7.5, 49],
							[7.5, 47],
							[7, 43.5],
							[2, 42.5],
							[-2, 43.5],
							[-5, 46],
							[-5, 51],
						],
					],
				},
			},
			{
				type: "Feature",
				properties: { name: "Germany", id: "germany" },
				geometry: {
					type: "Polygon",
					coordinates: [
						[
							[6, 55],
							[14, 55],
							[15, 50.5],
							[13, 48],
							[8, 47.5],
							[6, 49],
							[6, 55],
						],
					],
				},
			},
			{
				type: "Feature",
				properties: { name: "United Kingdom", id: "uk" },
				geometry: {
					type: "Polygon",
					coordinates: [
						[
							[-8, 59],
							[-1, 59],
							[2, 52],
							[2, 50],
							[-2, 49.5],
							[-6, 49.5],
							[-8, 54],
							[-8, 59],
						],
					],
				},
			},
		],
	};

	// Calculate interpolated temperature for current year
	const getTemperatureForYear = (country: CountryId, year: number) => {
		const data = climateData[country];
		const progress = (year - 2020) / 80; // 0 to 1 over 80 years
		return data.temp2020 + (data.temp2100 - data.temp2020) * progress;
	};

	// Get color based on temperature
	const getTemperatureColor = (countryId: CountryId) => {
		const temp = getTemperatureForYear(countryId, currentYear);
		const normalized = (temp - 8) / 10; // Normalize between 8°C and 18°C

		if (normalized < 0.3) return "rgba(59, 130, 246, 0.6)"; // Blue
		if (normalized < 0.6) return "rgba(34, 197, 94, 0.6)"; // Green
		if (normalized < 0.8) return "rgba(251, 146, 60, 0.6)"; // Orange
		return "rgba(239, 68, 68, 0.6)"; // Red
	};

	// Style for each country
	const countryStyle = (feature: CountryFeature | undefined) => {
		if (!feature) return {};
		const isHovered = hoveredCountry === feature?.properties?.id;
		const isSelected = selectedCountry === feature?.properties?.id;

		return {
			fillColor: showTemperature
				? getTemperatureColor(feature.properties.id)
				: "rgba(255, 255, 255, 0.1)",
			weight: isHovered || isSelected ? 2 : 1,
			opacity: 1,
			color:
				isHovered || isSelected
					? "rgba(255, 255, 255, 0.9)"
					: "rgba(255, 255, 255, 0.3)",
			fillOpacity: isHovered || isSelected ? 0.8 : 0.6,
		};
	};

	// Handle country interactions
	const onEachCountry = (feature: CountryFeature, layer: Layer) => {
		layer.on({
			mouseover: () => setHoveredCountry(feature.properties.id),
			mouseout: () => setHoveredCountry(null),
			click: () => setSelectedCountry(feature.properties.id),
		});
	};

	// Custom map component to handle view
	const MapController = () => {
		const map = useMap();
		useEffect(() => {
			map.fitBounds([
				[42, -8],
				[59, 15],
			]);
		}, [map]);
		return null;
	};

	// Animation effect
	useEffect(() => {
		if (isPlaying) {
			const interval = setInterval(() => {
				setCurrentYear((prev) => {
					if (prev >= 2100) {
						setIsPlaying(false);
						return 2100;
					}
					return prev + 1;
				});
			}, 50);
			return () => clearInterval(interval);
		}
	}, [isPlaying]);

	// Years for timeline
	const years = [1960, 1980, 2000, 2020, 2040, 2060, 2080, 2100];
	const progress = ((currentYear - 1960) / 140) * 100;

	return (
		<div className="relative w-full h-screen bg-black overflow-hidden">
			{/* Map Container with Custom Styling */}
			<div className="absolute inset-0">
				<MapContainer
					center={[51, 5]}
					zoom={5}
					className="h-full w-full"
					style={{ background: "#000" }}
					zoomControl={false}
					attributionControl={false}
					dragging={true}
					touchZoom={true}
					doubleClickZoom={true}
					scrollWheelZoom={true}
				>
					<MapController />
					{/* Dark minimal tile layer */}
					<TileLayer
						url="https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png"
						opacity={0.3}
					/>
					{/* Country overlays */}
					<GeoJSON
						data={countryFeatures}
						style={countryStyle}
						onEachFeature={onEachCountry}
					/>
				</MapContainer>

				{/* Vignette overlay */}
				<div className="absolute inset-0 pointer-events-none">
					<div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/50" />
					<div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-black/50" />
				</div>
			</div>

			{/* Ultra Minimal Header */}
			<div className="absolute top-0 left-0 right-0 h-20 flex items-center justify-center pointer-events-none">
				<div className="text-white/80 text-sm tracking-[0.3em] font-light uppercase">
					Climate Projections • {currentYear}
				</div>
			</div>

			{/* Selected Country Info - Floating */}
			{selectedCountry && (
				<div className="absolute top-24 left-8 bg-black/80 backdrop-blur-xl rounded-lg p-6 border border-white/10 max-w-sm">
					<div className="space-y-3">
						<h3 className="text-white text-lg font-light">
							{climateData[selectedCountry].name}
						</h3>
						<div className="space-y-2 text-sm">
							<div className="flex justify-between">
								<span className="text-white/60">Current Temperature</span>
								<span className="text-white">
									{getTemperatureForYear(selectedCountry, currentYear).toFixed(
										1,
									)}
									°C
								</span>
							</div>
							<div className="flex justify-between">
								<span className="text-white/60">Change by 2100</span>
								<span className="text-orange-400">
									{climateData[selectedCountry].deltaTemp}
								</span>
							</div>
							<div className="flex justify-between">
								<span className="text-white/60">Risk Level</span>
								<span
									className={`capitalize ${
										climateData[selectedCountry].risk === "low"
											? "text-green-400"
											: climateData[selectedCountry].risk === "moderate"
												? "text-yellow-400"
												: "text-red-400"
									}`}
								>
									{climateData[selectedCountry].risk}
								</span>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Cinematic Timeline - Bottom */}
			<div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent pointer-events-none">
				<div className="h-full px-12 flex items-center pointer-events-auto">
					<div className="flex-1 relative">
						{/* Year Markers */}
						<div className="absolute -top-8 left-0 right-0 flex justify-between px-2">
							{years.map((year) => (
								<div
									key={year}
									className={`text-xs transition-all duration-300 ${
										Math.abs(currentYear - year) < 5
											? "text-white font-medium"
											: "text-white/40"
									}`}
								>
									{year}
								</div>
							))}
						</div>

						{/* Timeline Track */}
						<div
							className="h-1 bg-white/10 rounded-full relative overflow-hidden cursor-pointer"
							onClick={(e) => {
								const rect = e.currentTarget.getBoundingClientRect();
								const x = e.clientX - rect.left;
								const percent = x / rect.width;
								setCurrentYear(Math.round(1960 + percent * 140));
							}}
							onKeyDown={(e) => {
								if (e.key === "Enter" || e.key === " ") {
									const progress = 0.5; // Default to middle when using keyboard
									setCurrentYear(Math.round(1960 + progress * 140));
								}
							}}
						>
							<div
								className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-500 to-violet-500 rounded-full transition-all duration-300"
								style={{ width: `${progress}%` }}
							/>
							<div
								className="absolute top-1/2 w-3 h-3 bg-white rounded-full -translate-y-1/2 shadow-lg shadow-white/50 transition-all duration-300"
								style={{
									left: `${progress}%`,
									transform: "translate(-50%, -50%)",
								}}
							/>
						</div>

						{/* Play Button - Centered Below */}
						<div className="absolute -bottom-12 left-1/2 -translate-x-1/2 flex items-center space-x-4">
							<button
								type="button"
								onClick={() => setCurrentYear(Math.max(1960, currentYear - 10))}
								className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center hover:bg-white/20 transition-all duration-300"
							>
								<SkipBack className="w-4 h-4 text-white/80" />
							</button>
							<button
								type="button"
								onClick={() => setIsPlaying(!isPlaying)}
								className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center hover:bg-white/20 transition-all duration-300 group"
							>
								{isPlaying ? (
									<Pause className="w-5 h-5 text-white/80 group-hover:text-white" />
								) : (
									<Play className="w-5 h-5 text-white/80 group-hover:text-white ml-0.5" />
								)}
							</button>
							<button
								type="button"
								onClick={() => setCurrentYear(Math.min(2100, currentYear + 10))}
								className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center hover:bg-white/20 transition-all duration-300"
							>
								<SkipForward className="w-4 h-4 text-white/80" />
							</button>
						</div>
					</div>
				</div>
			</div>

			{/* Minimal Side Controls */}
			<div className="absolute right-8 top-1/2 -translate-y-1/2 space-y-6">
				<div className="relative group">
					<button
						type="button"
						onClick={() => setShowTemperature(!showTemperature)}
						className="w-12 h-12 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all duration-300"
					>
						{showTemperature ? (
							<Eye className="w-5 h-5 text-white/60 group-hover:text-white/90" />
						) : (
							<EyeOff className="w-5 h-5 text-white/60 group-hover:text-white/90" />
						)}
					</button>
					<div className="absolute right-16 top-1/2 -translate-y-1/2 bg-black/80 backdrop-blur-sm px-3 py-1 rounded text-xs text-white/80 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
						{showTemperature ? "Hide Data" : "Show Data"}
					</div>
				</div>

				{[
					{ icon: Layers, label: "Layers" },
					{ icon: Sliders, label: "Adjust" },
					{ icon: Info, label: "Info" },
				].map(({ icon: Icon, label }) => (
					<div key={label} className="relative group">
						<button
							type="button"
							className="w-12 h-12 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all duration-300"
						>
							<Icon className="w-5 h-5 text-white/60 group-hover:text-white/90" />
						</button>
						<div className="absolute right-16 top-1/2 -translate-y-1/2 bg-black/80 backdrop-blur-sm px-3 py-1 rounded text-xs text-white/80 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
							{label}
						</div>
					</div>
				))}
			</div>

			{/* Temperature Gradient - Left Side */}
			<div className="absolute left-8 top-1/2 -translate-y-1/2">
				<div className="flex items-center space-x-3">
					<div className="relative">
						<div className="w-2 h-64 rounded-full overflow-hidden">
							<div className="w-full h-full bg-gradient-to-t from-blue-600 via-green-500 to-red-500 opacity-80" />
						</div>
						{/* Temperature labels */}
						<div className="absolute -top-2 -left-8 text-xs text-white/60">
							18°C
						</div>
						<div className="absolute top-1/2 -translate-y-1/2 -left-8 text-xs text-white/60">
							13°C
						</div>
						<div className="absolute -bottom-2 -left-8 text-xs text-white/60">
							8°C
						</div>
					</div>
				</div>
			</div>

			{/* Hover Info */}
			{hoveredCountry && !selectedCountry && (
				<div className="absolute top-24 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm px-4 py-2 rounded text-sm text-white/80 pointer-events-none">
					{climateData[hoveredCountry].name} •{" "}
					{getTemperatureForYear(hoveredCountry, currentYear).toFixed(1)}°C
				</div>
			)}
		</div>
	);
};

export default CinematicClimateViz;
