import type { Feature, Point as PointGeometry } from "geojson";
import type L from "leaflet";

export interface NutsProperties {
	NUTS_ID: string;
	intensity: number | null;
	countryName?: string;
	pointCount?: number;
	nutsLevel?: number;
	isFallback?: boolean;
	isModelData?: boolean;
}

export interface NutsGeometry {
	type: "Polygon" | "MultiPolygon";
	coordinates: number[][][] | number[][][][]; // Proper coordinate typing
}

export interface NutsFeature {
	type: "Feature";
	properties: NutsProperties;
	geometry: NutsGeometry;
}

export interface NutsGeoJSON {
	type: "FeatureCollection";
	features: NutsFeature[];
}

export interface OutbreakData {
	id: string;
	category: string;
	location: string;
	latitude: number;
	longitude: number;
	date: string;
	cases: number;
	notes?: string;
}

export interface ProcessingStats {
	processed: number;
	skipped: number;
	errors: number;
	skippedRegions?: string[];
}

export interface GridCell {
	bounds: L.LatLngBoundsExpression;
	temperature: number;
	id: string;
}

export interface ViewportBounds {
	north: number;
	south: number;
	east: number;
	west: number;
	zoom: number;
}

export interface DataExtremes {
	min: number;
	max: number;
}

// Temperature data point interface
export interface TemperatureDataPoint {
	lat: number;
	lng: number;
	temperature: number;
	point: Feature<PointGeometry>;
	date?: string;
	id?: string;
}
