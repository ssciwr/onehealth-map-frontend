import * as turf from "@turf/turf";
import type {
	Feature,
	FeatureCollection,
	MultiPolygon,
	Polygon,
} from "geojson";
import type {
	DataExtremes,
	NutsFeature,
	NutsGeoJSON,
	TemperatureDataPoint,
} from "../types";

interface CountryData {
	temperatureSum: number;
	pointCount: number;
	avgTemperature: number;
}

interface CountryTemperatureMap {
	[countryCode: string]: CountryData;
}

export class GridToNutsConverter {
	private countriesGeoJSON: FeatureCollection | null = null;
	private nutsGeoJSON: FeatureCollection | null = null;
	private isLoading = false;
	private isLoadingNuts = false;

	async loadCountriesGeoJSON(): Promise<void> {
		if (this.countriesGeoJSON || this.isLoading) return;

		this.isLoading = true;
		try {
			const response = await fetch(
				"https://raw.githubusercontent.com/datasets/geo-countries/main/data/countries.geojson",
			);
			const data = await response.json();
			this.countriesGeoJSON = data;
			console.log(
				"Countries GeoJSON loaded for NUTS conversion, features:",
				data.features.length,
			);
		} catch (error) {
			console.error(
				"Failed to load countries GeoJSON for NUTS conversion:",
				error,
			);
			throw error;
		} finally {
			this.isLoading = false;
		}
	}

	async loadNutsGeoJSON(): Promise<void> {
		if (this.nutsGeoJSON || this.isLoadingNuts) return;

		this.isLoadingNuts = true;
		try {
			// Load NUTS 2 regions from Eurostat official source
			const response = await fetch(
				"https://gisco-services.ec.europa.eu/distribution/v2/nuts/geojson/NUTS_RG_20M_2021_4326_LEVL_2.geojson",
			);
			const nutsData = await response.json();

			// Filter to only NUTS 2 level regions (level code "2")
			const nuts2Features = nutsData.features.filter(
				(feature: Feature) => feature.properties?.LEVL_CODE === 2,
			);

			this.nutsGeoJSON = {
				type: "FeatureCollection",
				features: nuts2Features,
			};

			console.log(`NUTS 2 GeoJSON loaded: ${nuts2Features.length} regions`);
			console.log(
				"Sample regions:",
				nuts2Features.slice(0, 5).map((f: Feature) => f.properties?.NUTS_ID),
			);
		} catch (error) {
			console.error("Failed to load NUTS data from Eurostat:", error);
			// Fallback to empty if can't load
			this.nutsGeoJSON = { type: "FeatureCollection", features: [] };
		} finally {
			this.isLoadingNuts = false;
		}
	}

	private getCountriesWithNutsData(): Set<string> {
		const nutsCountries = new Set<string>();
		if (this.nutsGeoJSON?.features) {
			for (const feature of this.nutsGeoJSON.features) {
				const nutsId =
					feature.properties?.NUTS_ID || feature.properties?.nuts_id;
				if (nutsId) {
					const countryCode = nutsId.substring(0, 2);
					nutsCountries.add(countryCode);
				}
			}
		}
		return nutsCountries;
	}

	private createSpatialIndex(
		temperatureData: TemperatureDataPoint[],
		bucketSize: number,
	): { [key: string]: TemperatureDataPoint[] } {
		const index: { [key: string]: TemperatureDataPoint[] } = {};

		for (const dataPoint of temperatureData) {
			if (
				!dataPoint ||
				typeof dataPoint.lat !== "number" ||
				typeof dataPoint.lng !== "number" ||
				!dataPoint.point
			) {
				console.warn(
					"Skipping invalid dataPoint in spatial index creation:",
					dataPoint,
				);
				continue;
			}
			const lat = dataPoint.lat;
			const lng = dataPoint.lng;

			// Create bucket key based on rounded coordinates
			const latBucket = Math.floor(lat / bucketSize) * bucketSize;
			const lngBucket = Math.floor(lng / bucketSize) * bucketSize;
			const bucketKey = `${latBucket},${lngBucket}`;

			if (!index[bucketKey]) {
				index[bucketKey] = [];
			}
			index[bucketKey].push(dataPoint);
		}

		return index;
	}

	private getPolygonBounds(polygon: Feature<Polygon | MultiPolygon>): {
		minLat: number;
		maxLat: number;
		minLng: number;
		maxLng: number;
	} {
		const bbox = turf.bbox(polygon);
		return {
			minLng: bbox[0],
			minLat: bbox[1],
			maxLng: bbox[2],
			maxLat: bbox[3],
		};
	}

	private getRelevantBuckets(
		polygonBounds: {
			minLat: number;
			maxLat: number;
			minLng: number;
			maxLng: number;
		},
		bucketSize: number,
	): string[] {
		const buckets: string[] = [];

		// Expand bounds slightly to catch edge cases
		const buffer = bucketSize * 0.1;
		const minLat = polygonBounds.minLat - buffer;
		const maxLat = polygonBounds.maxLat + buffer;
		const minLng = polygonBounds.minLng - buffer;
		const maxLng = polygonBounds.maxLng + buffer;

		// Find all buckets that intersect with the polygon bounds
		for (
			let lat = Math.floor(minLat / bucketSize) * bucketSize;
			lat <= maxLat;
			lat += bucketSize
		) {
			for (
				let lng = Math.floor(minLng / bucketSize) * bucketSize;
				lng <= maxLng;
				lng += bucketSize
			) {
				buckets.push(`${lat},${lng}`);
			}
		}

		return buckets;
	}

	private findNearestDataPoint(
		centroidCoords: [number, number],
		spatialIndex: { [key: string]: TemperatureDataPoint[] },
		bucketSize: number,
	): TemperatureDataPoint | null {
		const [lng, lat] = centroidCoords;
		let nearestPoint: TemperatureDataPoint | null = null;
		let minDistance = Number.POSITIVE_INFINITY;

		// Start with the bucket containing the centroid
		const centroidBucket = `${Math.floor(lat / bucketSize) * bucketSize},${Math.floor(lng / bucketSize) * bucketSize}`;

		// Expand search radius until we find a point
		for (let radius = 0; radius <= 3; radius++) {
			const searchBuckets: string[] = [];

			if (radius === 0) {
				searchBuckets.push(centroidBucket);
			} else {
				// Add surrounding buckets in expanding rings
				for (let latOffset = -radius; latOffset <= radius; latOffset++) {
					for (let lngOffset = -radius; lngOffset <= radius; lngOffset++) {
						if (
							Math.abs(latOffset) === radius ||
							Math.abs(lngOffset) === radius
						) {
							const searchLat =
								Math.floor(lat / bucketSize) * bucketSize +
								latOffset * bucketSize;
							const searchLng =
								Math.floor(lng / bucketSize) * bucketSize +
								lngOffset * bucketSize;
							searchBuckets.push(`${searchLat},${searchLng}`);
						}
					}
				}
			}

			// Check all points in current search buckets
			for (const bucketKey of searchBuckets) {
				const bucketPoints = spatialIndex[bucketKey];
				if (!bucketPoints) continue;

				for (const dataPoint of bucketPoints) {
					const distance = Math.sqrt(
						(dataPoint.lat - lat) ** 2 + (dataPoint.lng - lng) ** 2,
					);

					if (distance < minDistance) {
						minDistance = distance;
						nearestPoint = dataPoint;
					}
				}
			}

			// If we found a point, return it
			if (nearestPoint) {
				return nearestPoint;
			}
		}

		return nearestPoint;
	}

	private getCountryIdentifier(feature: Feature): string | null {
		if (!feature.properties) return null;
		const countryCode =
			feature.properties["ISO3166-1-Alpha-3"] ||
			feature.properties["ISO3166-1-Alpha-2"] ||
			feature.properties?.ISO3 ||
			feature.properties?.ISO2 ||
			feature.properties.code ||
			feature.properties.id;

		const countryName =
			feature.properties?.name || feature.properties?.NAME || "";
		return countryCode || countryName || null;
	}

	private getCountryDisplayName(feature: Feature): string {
		console.log("Getting country names etc...", feature, feature.properties);
		return (
			feature.properties?.name ||
			feature.properties?.NAME ||
			feature.properties?.["ISO3166-1-Alpha-3"] ||
			feature.properties?.["ISO3166-1-Alpha-2"] ||
			"Unknown Country"
		);
	}

	private createPolygonFromFeature(
		feature: Feature,
	): Feature<Polygon | MultiPolygon> | null {
		try {
			if (feature.geometry?.type === "Polygon") {
				return turf.polygon((feature.geometry as Polygon).coordinates);
			}
			if (feature.geometry?.type === "MultiPolygon") {
				return turf.multiPolygon(
					(feature.geometry as MultiPolygon).coordinates,
				);
			}
			return null;
		} catch (error) {
			console.warn("Failed to create polygon for feature:", error);
			return null;
		}
	}

	async convertGridDataToNuts(
		temperatureData: TemperatureDataPoint[],
	): Promise<{ nutsGeoJSON: NutsGeoJSON; extremes: DataExtremes }> {
		try {
			console.log("Starting NUTS conversion...");
			await Promise.all([this.loadCountriesGeoJSON(), this.loadNutsGeoJSON()]);

			if (!this.countriesGeoJSON) {
				throw new Error("Countries GeoJSON not loaded");
			}

			console.log("GeoJSON loaded successfully, starting processing...");
			console.log(
				`Processing all ${temperatureData.length} temperature points for NUTS conversion with spatial indexing...`,
			);

			// Validate temperature data structure
			if (temperatureData.length > 0) {
				const samplePoint = temperatureData[0];
				console.log("Sample temperature data point:", samplePoint);
				if (!samplePoint.point) {
					console.error("Temperature data points missing 'point' property");
				}
			}

			// Create spatial index using 5-degree buckets
			const spatialIndex = this.createSpatialIndex(temperatureData, 5);
			console.log(
				`Created spatial index with ${Object.keys(spatialIndex).length} buckets`,
			);

			const nutsFeatures: NutsFeature[] = [];
			const temperatures: number[] = [];

			// Identify countries that have NUTS 2 data
			const nutsCountries = this.getCountriesWithNutsData();
			console.log(
				"Countries with NUTS 2 regions:",
				Array.from(nutsCountries).sort(),
			);

			// Process NUTS 2 regions for EU countries
			console.log("About to process NUTS regions...");
			if (this.nutsGeoJSON && this.nutsGeoJSON.features.length > 0) {
				console.log(
					`Processing ${this.nutsGeoJSON.features.length} NUTS 2 regions...`,
				);

				for (const nutsFeature of this.nutsGeoJSON.features) {
					const polygon = this.createPolygonFromFeature(nutsFeature);
					if (!polygon) continue;

					const nutsId =
						nutsFeature.properties?.NUTS_ID || nutsFeature.properties?.nuts_id;

					if (!nutsId) {
						console.warn("NUTS feature missing NUTS_ID:", nutsFeature);
						continue;
					}

					// Get polygon bounds and relevant buckets
					const polygonBounds = this.getPolygonBounds(polygon);
					const relevantBuckets = this.getRelevantBuckets(polygonBounds, 5);

					const pointsInRegion: number[] = [];
					let totalCandidatePoints = 0;

					// Only check points in relevant buckets
					for (const bucketKey of relevantBuckets) {
						const bucketPoints = spatialIndex[bucketKey];
						if (!bucketPoints) continue;

						totalCandidatePoints += bucketPoints.length;

						for (const dataPoint of bucketPoints) {
							try {
								if (!dataPoint || !dataPoint.point) {
									console.warn(
										"Invalid data point in NUTS bucketPoints:",
										dataPoint,
									);
									continue;
								}
								if (turf.booleanPointInPolygon(dataPoint.point, polygon)) {
									pointsInRegion.push(dataPoint.temperature);
								}
							} catch (error) {
								console.warn(
									"Error in NUTS point-in-polygon check:",
									error,
									dataPoint,
								);
								// Skip points that cause errors
							}
						}
					}

					// Calculate average temperature if we have points
					if (pointsInRegion.length > 0) {
						const temperatureSum = pointsInRegion.reduce((a, b) => a + b, 0);
						const avgTemperature = temperatureSum / pointsInRegion.length;

						temperatures.push(avgTemperature);

						const nutsFeatureResult: NutsFeature = {
							type: "Feature",
							properties: {
								NUTS_ID: nutsId,
								intensity: avgTemperature,
								countryName: this.getNutsDisplayName(nutsId),
								pointCount: pointsInRegion.length,
								nutsLevel: 2,
							},
							geometry: nutsFeature.geometry as Polygon | MultiPolygon,
						};

						nutsFeatures.push(nutsFeatureResult);
					} else {
						// Fallback: find nearest point to region centroid
						const centroid = turf.centroid(polygon);
						const centroidCoords = centroid.geometry.coordinates as [
							number,
							number,
						];
						const nearestPoint = this.findNearestDataPoint(
							centroidCoords,
							spatialIndex,
							5,
						);

						if (nearestPoint) {
							console.log(
								`NUTS region ${nutsId}: no points inside, using nearest point (${nearestPoint.temperature.toFixed(1)}°C)`,
							);
							temperatures.push(nearestPoint.temperature);

							const nutsFeatureResult: NutsFeature = {
								type: "Feature",
								properties: {
									NUTS_ID: nutsId,
									intensity: nearestPoint.temperature,
									countryName: this.getNutsDisplayName(nutsId),
									pointCount: 0, // Mark as fallback
									nutsLevel: 2,
									isFallback: true,
								},
								geometry: nutsFeature.geometry as Polygon | MultiPolygon,
							};

							nutsFeatures.push(nutsFeatureResult);
						} else {
							console.log(
								`NUTS region ${nutsId}: no points found (checked ${totalCandidatePoints} candidates)`,
							);
						}
					}
				}
			}

			// Then, process remaining countries that don't have detailed NUTS data
			console.log("Processing remaining countries...");
			const countryTemperatures: CountryTemperatureMap = {};

			for (const feature of this.countriesGeoJSON.features) {
				if (!feature || !feature.properties) {
					console.warn("Skipping invalid country feature:", feature);
					continue;
				}
				const countryId = this.getCountryIdentifier(feature);
				if (!countryId) continue;

				// Skip countries that already have detailed NUTS regions
				const countryCode = this.getCountryCode(countryId);

				// Hardcoded exclusion for problematic countries that show both NUTS and whole country
				const hardcodedExclusions = [
					"FRO",
					"NOR",
					"FR",
					"GB",
					"NO",
					"DE",
					"IT",
					"ES",
					"AT",
					"BE",
					"NL",
					"PL",
					"SE",
					"DK",
					"FI",
				];

				if (
					nutsCountries.has(countryCode) ||
					hardcodedExclusions.includes(countryCode)
				) {
					console.log(
						`Skipping whole country ${countryId} (${countryCode}) - has NUTS 2 regions or hardcoded exclusion`,
					);
					continue;
				}

				const polygon = this.createPolygonFromFeature(feature);
				if (!polygon) continue;

				const pointsInCountry: number[] = [];

				// Get polygon bounds and relevant buckets for efficient spatial query
				const polygonBounds = this.getPolygonBounds(polygon);
				const relevantBuckets = this.getRelevantBuckets(polygonBounds, 5);

				// Only check points in relevant buckets
				for (const bucketKey of relevantBuckets) {
					const bucketPoints = spatialIndex[bucketKey];
					if (!bucketPoints) continue;

					for (const dataPoint of bucketPoints) {
						try {
							if (!dataPoint || !dataPoint.point) {
								console.warn(
									"Invalid data point in country bucketPoints:",
									dataPoint,
								);
								continue;
							}
							if (turf.booleanPointInPolygon(dataPoint.point, polygon)) {
								pointsInCountry.push(dataPoint.temperature);
							}
						} catch (error) {
							console.warn(
								"Error in country point-in-polygon check:",
								error,
								dataPoint,
							);
							// Skip points that cause errors
						}
					}
				}

				// Calculate average temperature if we have points
				if (pointsInCountry.length > 0) {
					const temperatureSum = pointsInCountry.reduce((a, b) => a + b, 0);
					const avgTemperature = temperatureSum / pointsInCountry.length;

					countryTemperatures[countryId] = {
						temperatureSum,
						pointCount: pointsInCountry.length,
						avgTemperature,
					};
				}
			}

			// Add country-level features for countries without detailed NUTS data
			console.log("Adding country-level features...");
			for (const feature of this.countriesGeoJSON.features) {
				if (!feature || !feature.properties) {
					console.warn(
						"Skipping invalid country feature in second loop:",
						feature,
					);
					continue;
				}
				const countryId = this.getCountryIdentifier(feature);
				if (!countryId || !countryTemperatures[countryId]) continue;

				const countryData = countryTemperatures[countryId];
				const displayName = this.getCountryDisplayName(feature);

				temperatures.push(countryData.avgTemperature);

				const nutsFeature: NutsFeature = {
					type: "Feature",
					properties: {
						NUTS_ID: countryId,
						intensity: countryData.avgTemperature,
						countryName: displayName,
						pointCount: countryData.pointCount,
						nutsLevel: 0,
					},
					geometry: {
						type:
							feature.geometry?.type === "Polygon" ||
							feature.geometry?.type === "MultiPolygon"
								? feature.geometry.type
								: "Polygon",
						coordinates:
							feature.geometry?.type === "Polygon" ||
							feature.geometry?.type === "MultiPolygon"
								? (feature.geometry as Polygon | MultiPolygon).coordinates
								: [],
					},
				};

				nutsFeatures.push(nutsFeature);
			}

			// Calculate extremes
			console.log("Calculating extremes...");
			const extremes: DataExtremes =
				temperatures.length > 0
					? {
							min: Math.min(...temperatures),
							max: Math.max(...temperatures),
						}
					: {
							min: 0,
							max: 0,
						};

			const nutsGeoJSON: NutsGeoJSON = {
				type: "FeatureCollection",
				features: nutsFeatures,
			};

			console.log(
				`NUTS conversion complete: ${nutsFeatures.length} regions with temperature data`,
			);
			console.log(
				`Temperature range: ${extremes.min.toFixed(1)}°C to ${extremes.max.toFixed(1)}°C`,
			);

			return { nutsGeoJSON, extremes };
		} catch (error) {
			console.error("Error in convertGridDataToNuts:", error);
			// Return a fallback result to prevent the function from returning undefined
			return {
				nutsGeoJSON: { type: "FeatureCollection", features: [] },
				extremes: { min: 0, max: 0 },
			};
		}
	}

	private getCountryCode(countryId: string): string {
		// Extract 2-letter country code from various country identifier formats
		if (countryId.length === 2) return countryId.toUpperCase();

		// Map ISO3 codes to ISO2 codes
		const iso3ToIso2: { [key: string]: string } = {
			AUT: "AT",
			BEL: "BE",
			BGR: "BG",
			CHE: "CH",
			CYP: "CY",
			CZE: "CZ",
			DEU: "DE",
			DNK: "DK",
			ESP: "ES",
			EST: "EE",
			FIN: "FI",
			GRC: "EL",
			HRV: "HR",
			HUN: "HU",
			IRL: "IE",
			ISL: "IS",
			ITA: "IT",
			LTU: "LT",
			LUX: "LU",
			LVA: "LV",
			NLD: "NL",
			POL: "PL",
			PRT: "PT",
			ROU: "RO",
			SVK: "SK",
			SVN: "SI",
			SWE: "SE",
			TUR: "TR",
			UKR: "UA",
			ALB: "AL",
			BIH: "BA",
			MKD: "MK",
			MNE: "ME",
			SRB: "RS",
			XKX: "XK",
			GBR: "GB",
			FRA: "FR",
			NOR: "NO",
		};

		if (countryId.length === 3 && iso3ToIso2[countryId.toUpperCase()]) {
			return iso3ToIso2[countryId.toUpperCase()];
		}

		// Map some common country names to codes
		const countryNameMap: { [key: string]: string } = {
			Germany: "DE",
			France: "FR",
			Italy: "IT",
			Spain: "ES",
			Austria: "AT",
			Belgium: "BE",
			Netherlands: "NL",
			Poland: "PL",
			Slovenia: "SI",
			Slovakia: "SK",
			"Czech Republic": "CZ",
			Czechia: "CZ",
			Hungary: "HU",
			Croatia: "HR",
			Bulgaria: "BG",
			Romania: "RO",
			Portugal: "PT",
			Greece: "EL",
			Finland: "FI",
			Sweden: "SE",
			Denmark: "DK",
			Norway: "NO",
			Switzerland: "CH",
			Ireland: "IE",
			Estonia: "EE",
			Latvia: "LV",
			Lithuania: "LT",
			Luxembourg: "LU",
			Cyprus: "CY",
			Malta: "MT",
			Iceland: "IS",
			Turkey: "TR",
			Ukraine: "UA",
			Albania: "AL",
			"Bosnia and Herzegovina": "BA",
			"North Macedonia": "MK",
			Montenegro: "ME",
			Serbia: "RS",
			Kosovo: "XK",
			"United Kingdom": "GB",
			"Great Britain": "GB",
		};

		const mapped = countryNameMap[countryId];
		if (mapped) return mapped;

		// Fallback: try to extract first 2 characters if longer than 2
		if (countryId.length > 2) {
			return countryId.substring(0, 2).toUpperCase();
		}

		return countryId.toUpperCase();
	}

	private getNutsDisplayName(nutsId: string): string {
		// Map NUTS IDs to more readable names
		const nutsNames: { [key: string]: string } = {
			AT: "Austria",
			BE: "Belgium",
			DE: "Germany",
			FR: "France",
			IT: "Italy",
			ES: "Spain",
			NL: "Netherlands",
			PL: "Poland",
			SI: "Slovenia",
			SK: "Slovakia",
		};

		const countryCode = nutsId.substring(0, 2);
		const baseCountry = nutsNames[countryCode] || countryCode;

		if (nutsId.length > 2) {
			return `${baseCountry} - ${nutsId}`;
		}

		return baseCountry;
	}

	// Method to overlay actual model NUTS 3 data over calculated data
	async overlayModelData(modelData: { [nutsId: string]: number }): Promise<{
		nutsGeoJSON: NutsGeoJSON;
		extremes: DataExtremes;
	}> {
		if (!this.nutsGeoJSON) {
			throw new Error("NUTS GeoJSON not loaded. Call loadNutsGeoJSON() first.");
		}

		const updatedFeatures: NutsFeature[] = [];
		const temperatures: number[] = [];

		// Update features with model data where available
		for (const feature of this.nutsGeoJSON.features) {
			if (!feature.properties) continue;
			const nutsId = feature.properties.NUTS_ID;
			const modelTemperature = modelData[nutsId];

			if (modelTemperature !== undefined) {
				// Use model data
				temperatures.push(modelTemperature);
				updatedFeatures.push({
					...feature,
					properties: {
						...feature.properties,
						NUTS_ID: nutsId,
						intensity: modelTemperature,
						isModelData: true,
					},
					geometry: feature.geometry as Polygon | MultiPolygon,
				});
			} else {
				// Keep calculated data
				if (feature.properties && feature.properties.intensity !== undefined) {
					temperatures.push(feature.properties.intensity);
					updatedFeatures.push({
						...feature,
						properties: {
							...feature.properties,
							NUTS_ID: feature.properties?.NUTS_ID || "",
							intensity: feature.properties?.intensity || 0,
							isModelData: false,
						},
						geometry: feature.geometry as Polygon | MultiPolygon,
					});
				}
			}
		}

		const extremes: DataExtremes = {
			min: Math.min(...temperatures),
			max: Math.max(...temperatures),
		};

		const nutsGeoJSON: NutsGeoJSON = {
			type: "FeatureCollection",
			features: updatedFeatures,
		};

		console.log(
			`Model data overlay complete: ${Object.keys(modelData).length} regions updated with model data`,
		);
		return { nutsGeoJSON, extremes };
	}

	// Method to reset to calculated data only
	async resetToCalculatedData(
		temperatureData: TemperatureDataPoint[],
	): Promise<{ nutsGeoJSON: NutsGeoJSON; extremes: DataExtremes }> {
		return this.convertGridDataToNuts(temperatureData);
	}
}

export const gridToNutsConverter = new GridToNutsConverter();
