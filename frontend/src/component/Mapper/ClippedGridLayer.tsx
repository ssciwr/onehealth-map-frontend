import { useCallback, useEffect, useRef, useState } from "react";
import { Polygon, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import * as turf from "@turf/turf";
import type { Feature, FeatureCollection } from "geojson";
import type L from "leaflet";
import type { DataExtremes, ViewportBounds } from "./types";
import { getColorFromGradient } from "./utilities/gradientUtilities";

interface DataPoint {
	lat: number;
	lng: number;
	temperature: number;
}

interface ClippedGridCell {
	coordinates: number[][][]; // Polygon coordinates
	temperature: number;
	id: string;
}

interface ClippedGridLayerProps {
	dataPoints: DataPoint[];
	viewport: ViewportBounds;
	resolutionLevel: number;
	extremes: DataExtremes;
	countriesGeoJSON?: FeatureCollection;
}

// Helper function to calculate the derived interval size from dataPoints
const calculateDerivedIntervalSize = (dataPoints: DataPoint[]): number => {
	if (!dataPoints || dataPoints.length < 2) return 0.1; // default fallback

	const first = dataPoints[0];
	const second = dataPoints[1];

	// Check lat difference first
	const latDiff = Math.abs(second.lat - first.lat);
	if (latDiff > 0) {
		return Math.min(latDiff, 3);
	}

	// If lat is same, check lng difference
	const lngDiff = Math.abs(second.lng - first.lng);
	if (lngDiff > 0) {
		return Math.min(lngDiff, 3);
	}

	// If both are same, return default
	return 0.5;
};

const ClippedGridLayer = ({
	dataPoints,
	viewport,
	resolutionLevel,
	extremes,
	countriesGeoJSON: propCountriesGeoJSON,
}: ClippedGridLayerProps) => {
	const [clippedGridCells, setClippedGridCells] = useState<ClippedGridCell[]>(
		[],
	);
	const [countriesGeoJSON, setCountriesGeoJSON] =
		useState<FeatureCollection | null>(null);
	const prevViewportRef = useRef<ViewportBounds | null>(null);
	const prevResolutionRef = useRef<number>(resolutionLevel);
	const prevFirstDatapointTemperature = useRef<number>(
		dataPoints[0]?.temperature,
	);

	// Load country boundaries - use prop if provided, otherwise load from external source
	useEffect(() => {
		if (propCountriesGeoJSON) {
			console.log(
				"DEBUG: Using provided countriesGeoJSON with",
				propCountriesGeoJSON.features?.length,
				"features",
			);
			setCountriesGeoJSON(propCountriesGeoJSON);
			return;
		}

		const loadCountries = async () => {
			try {
				console.log("DEBUG: Starting to load countries GeoJSON...");
				const response = await fetch(
					"https://raw.githubusercontent.com/datasets/geo-countries/main/data/countries.geojson",
				);
				console.log(
					"DEBUG: Countries GeoJSON response status:",
					response.status,
				);
				if (!response.ok) {
					throw new Error(`HTTP error! status: ${response.status}`);
				}
				const data = await response.json();
				console.log(
					"DEBUG: Countries GeoJSON loaded successfully, features count:",
					data.features?.length,
				);
				setCountriesGeoJSON(data);
			} catch (error) {
				console.error("Failed to load countries GeoJSON:", error);
			}
		};

		if (!countriesGeoJSON) {
			loadCountries();
		}
	}, [countriesGeoJSON, propCountriesGeoJSON]);

	const createClippedGridCells = useCallback(() => {
		if (
			!viewport ||
			!dataPoints ||
			dataPoints.length === 0 ||
			!countriesGeoJSON
		) {
			return [];
		}

		// Sample only 1% of data points for performance
		const sampleSize = Math.max(1, Math.floor(dataPoints.length * 0.01));
		const sampledDataPoints = dataPoints
			.sort(() => Math.random() - 0.5) // Shuffle array
			.slice(0, sampleSize);

		console.log(
			`Sampling ${sampledDataPoints.length} out of ${dataPoints.length} data points (1%)`,
		);

		const { north, south, east, west, zoom } = viewport;
		const derivedIntervalSize = calculateDerivedIntervalSize(sampledDataPoints);

		let gridSize = derivedIntervalSize;

		// Adjust grid size based on zoom level
		if (zoom < 3) gridSize = derivedIntervalSize * 2.5;
		else if (zoom < 4) gridSize = derivedIntervalSize * 1.75;
		else if (zoom < 5.5) gridSize = derivedIntervalSize * 1.25;
		else if (zoom < 7) gridSize = derivedIntervalSize;
		else if (zoom < 9) gridSize = derivedIntervalSize * 0.5;

		console.log("DEBUG: ClippedGridLayer parameters:", {
			derivedIntervalSize,
			zoom,
			finalGridSize: gridSize,
			viewport: { north, south, east, west, zoom },
			sampledDataPointsCount: sampledDataPoints.length,
		});

		// Create grid cells with temperature data
		const cellMap = new Map<
			string,
			{ sum: number; count: number; bounds: number[][] }
		>();
		const buffer = gridSize * 2;
		const filteredData = sampledDataPoints.filter(
			(point: DataPoint) =>
				point.lat >= south - buffer &&
				point.lat <= north + buffer &&
				point.lng >= west - buffer &&
				point.lng <= east + buffer,
		);

		console.log("DEBUG: After filtering data:", {
			originalCount: sampledDataPoints.length,
			filteredCount: filteredData.length,
			buffer,
			bounds: {
				south: south - buffer,
				north: north + buffer,
				west: west - buffer,
				east: east + buffer,
			},
		});

		// Group data points into grid cells
		for (const point of filteredData) {
			const cellLat = Math.floor(point.lat / gridSize) * gridSize;
			const cellLng = Math.floor(point.lng / gridSize) * gridSize;
			const cellId = `${cellLat.toFixed(4)}_${cellLng.toFixed(4)}`;

			const bounds = [
				[cellLng, cellLat],
				[cellLng + gridSize, cellLat],
				[cellLng + gridSize, cellLat + gridSize],
				[cellLng, cellLat + gridSize],
				[cellLng, cellLat], // Close the polygon
			];

			if (cellMap.has(cellId)) {
				const cell = cellMap.get(cellId);
				if (cell) {
					cell.sum += point.temperature;
					cell.count += 1;
				}
			} else {
				cellMap.set(cellId, {
					sum: point.temperature,
					count: 1,
					bounds,
				});
			}
		}

		console.log("DEBUG: After creating grid cells:", {
			cellMapSize: cellMap.size,
			sampleCells: Array.from(cellMap.entries())
				.slice(0, 3)
				.map(([id, cell]) => ({
					id,
					avgTemperature: cell.sum / cell.count,
					pointCount: cell.count,
					bounds: cell.bounds,
				})),
		});

		// Create properly clipped grid cells
		const newClippedCells: ClippedGridCell[] = [];
		let processedCells = 0;
		let intersectingCells = 0;
		let successfullyClippedCells = 0;

		console.log(
			"DEBUG: Starting proper clipping process with",
			countriesGeoJSON.features.length,
			"country features",
		);

		// Debug first cell and first country to understand the geometry structure
		if (cellMap.size > 0 && countriesGeoJSON.features.length > 0) {
			const firstCell = cellMap.entries().next().value;
			const firstCountry = countriesGeoJSON.features[0];
			console.log("DEBUG: First cell bounds:", firstCell[1].bounds);
			console.log("DEBUG: First country feature:", {
				type: firstCountry.geometry?.type,
				coordinates: firstCountry.geometry?.coordinates?.length,
				properties: firstCountry.properties,
			});
		}

		for (const [id, cell] of cellMap) {
			processedCells++;
			// Create a proper cell feature
			const cellFeature = turf.polygon([cell.bounds]);
			let clippedGeometry: Feature<turf.Polygon> | null = null;
			let intersectedWithCountry = false;

			// Check intersection with all countries and clip accordingly
			for (const countryFeature of countriesGeoJSON.features) {
				try {
					// Skip invalid features
					if (
						!countryFeature.geometry ||
						!countryFeature.geometry.coordinates
					) {
						continue;
					}

					// Validate geometry type
					if (
						countryFeature.geometry.type !== "Polygon" &&
						countryFeature.geometry.type !== "MultiPolygon"
					) {
						continue;
					}

					// Check if cell intersects with this country
					try {
						if (turf.booleanIntersects(cellFeature, countryFeature)) {
							intersectedWithCountry = true;

							// Skip turf.intersect entirely - use manual polygon analysis
							try {
								// Check if all corners are inside the country
								const cellBounds = cell.bounds;
								const corners = cellBounds.slice(0, 4); // Remove duplicate last point

								const cornersInside = corners.map((corner) =>
									turf.booleanPointInPolygon(
										turf.point([corner[0], corner[1]]),
										countryFeature,
									),
								);

								const allInside = cornersInside.every((inside) => inside);
								const someInside = cornersInside.some((inside) => inside);

								if (allInside) {
									// Cell is completely inside country - use original cell
									if (processedCells <= 3) {
										console.log(
											"DEBUG: Cell",
											id,
											"completely inside country - using original",
										);
									}
									if (!clippedGeometry) {
										clippedGeometry = cellFeature;
									}
								} else if (someInside) {
									// Cell partially intersects - for now use original (proper clipping is complex)
									if (processedCells <= 3) {
										console.log(
											"DEBUG: Cell",
											id,
											"partially inside country - using original (needs clipping)",
										);
									}
									if (!clippedGeometry) {
										clippedGeometry = cellFeature;
									}
								} else {
									// No corners inside but intersection was detected
									// This means the country boundary passes through the cell
									if (processedCells <= 3) {
										console.log(
											"DEBUG: Cell",
											id,
											"boundary passes through - using original",
										);
									}
									if (!clippedGeometry) {
										clippedGeometry = cellFeature;
									}
								}
							} catch (clipError) {
								if (processedCells <= 3) {
									console.log(
										"DEBUG: Manual clipping failed for cell",
										id,
										":",
										clipError.message,
									);
								}

								// Fallback: use original cell bounds
								if (!clippedGeometry) {
									clippedGeometry = cellFeature;
								}
							}
						}
					} catch (intersectsError) {
						if (processedCells <= 5) {
							console.log("DEBUG: booleanIntersects failed:", intersectsError);
						}
					}
				} catch (error) {
					if (processedCells <= 5) {
						console.log("DEBUG: Error processing country feature:", error);
					}
				}
			}

			if (intersectedWithCountry) {
				intersectingCells++;
			}

			// Only add cells that have valid clipped geometry
			if (clippedGeometry?.geometry) {
				successfullyClippedCells++;
				const temperature = cell.sum / cell.count;

				if (processedCells <= 3) {
					console.log("DEBUG: Final clipped geometry for cell", id, ":", {
						geometryType: clippedGeometry.geometry.type,
						coordinatesLength: clippedGeometry.geometry.coordinates?.length,
						isOriginalCell:
							JSON.stringify(clippedGeometry.geometry.coordinates) ===
							JSON.stringify([cell.bounds]),
					});
				}

				// Handle both Polygon and MultiPolygon results
				if (clippedGeometry.geometry.type === "Polygon") {
					newClippedCells.push({
						coordinates: clippedGeometry.geometry.coordinates,
						temperature,
						id,
					});
				} else if (clippedGeometry.geometry.type === "MultiPolygon") {
					// For MultiPolygon, create separate cells for each polygon
					clippedGeometry.geometry.coordinates.forEach(
						(polygonCoords: number[][][], index: number) => {
							newClippedCells.push({
								coordinates: polygonCoords,
								temperature,
								id: `${id}_${index}`,
							});
						},
					);
				}
			} else if (intersectedWithCountry && processedCells <= 5) {
				console.log(
					"DEBUG: Cell",
					id,
					"intersected but no valid clipped geometry created",
				);
			}
		}

		console.log("DEBUG: Proper clipping process complete:", {
			processedCells,
			intersectingCells,
			successfullyClippedCells,
			finalClippedCellsCount: newClippedCells.length,
			sampleClippedCells: newClippedCells.slice(0, 3).map((cell) => ({
				id: cell.id,
				temperature: cell.temperature,
				coordinatesLength: cell.coordinates.length,
			})),
		});

		return newClippedCells;
	}, [dataPoints, viewport, countriesGeoJSON]);

	useEffect(() => {
		const hasViewportChanged =
			!prevViewportRef.current ||
			(viewport &&
				(Math.abs(viewport.zoom - prevViewportRef.current.zoom) > 0.1 ||
					Math.abs(viewport.north - prevViewportRef.current.north) > 0.1 ||
					Math.abs(viewport.south - prevViewportRef.current.south) > 0.1 ||
					Math.abs(viewport.east - prevViewportRef.current.east) > 0.1 ||
					Math.abs(viewport.west - prevViewportRef.current.west) > 0.1));

		const hasResolutionChanged = resolutionLevel !== prevResolutionRef.current;

		const hasDataPointsChanged =
			prevFirstDatapointTemperature.current !== dataPoints[0]?.temperature;

		console.log("DEBUG: useEffect conditions:", {
			hasViewportChanged,
			hasResolutionChanged,
			hasDataPointsChanged,
			countriesGeoJSON: !!countriesGeoJSON,
			dataPointsLength: dataPoints.length,
			viewport: !!viewport,
		});

		if (
			hasViewportChanged ||
			hasResolutionChanged ||
			hasDataPointsChanged ||
			countriesGeoJSON
		) {
			console.log("DEBUG: Calling createClippedGridCells()");
			const newClippedCells = createClippedGridCells();
			console.log(
				"DEBUG: createClippedGridCells returned",
				newClippedCells.length,
				"cells",
			);
			setClippedGridCells(newClippedCells);
			prevViewportRef.current = viewport;
			prevResolutionRef.current = resolutionLevel;
			prevFirstDatapointTemperature.current = dataPoints[0]?.temperature;
		}
	}, [
		viewport,
		resolutionLevel,
		createClippedGridCells,
		dataPoints,
		countriesGeoJSON,
	]);

	console.log(
		"DEBUG: Rendering ClippedGridLayer with",
		clippedGridCells.length,
		"cells, extremes:",
		extremes,
	);

	return (
		<>
			{clippedGridCells.map((cell) => {
				// Convert coordinates to Leaflet format (lat, lng)
				const leafletCoordinates = cell.coordinates.map((ring) =>
					ring.map(([lng, lat]) => [lat, lng] as L.LatLngExpression),
				);

				return (
					<Polygon
						key={cell.id}
						positions={leafletCoordinates}
						pathOptions={{
							color: "rgba(0, 0, 0, 0.3)",
							fillColor: getColorFromGradient(cell.temperature, extremes),
							fillOpacity: 0.8, // Increased opacity for better visibility
							weight: 0.5, // Thin border to show country boundaries
						}}
					>
						<Popup>
							<div className="grid-popup">
								<h4>Grid Cell (Clipped)</h4>
								<p>Temperature: {cell.temperature.toFixed(1)}°C</p>
							</div>
						</Popup>
					</Polygon>
				);
			})}
		</>
	);
};

export default ClippedGridLayer;
