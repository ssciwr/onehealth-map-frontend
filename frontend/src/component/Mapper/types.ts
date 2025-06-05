export interface NutsProperties {
	NUTS_ID: string;
	intensity: number | null;
}

export interface NutsGeometry {
	type: string;
	coordinates: any[][];
}

export interface NutsFeature {
	type: string;
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

// Export constants
export const COLOR_SCHEMES = {
	virus: {
		low: "#4ade80",
		high: "#8b5cf6",
	},
	climate: {
		low: "#22c55e",
		high: "#ef4444",
	},
	rainfall: {
		low: "#ffffff",
		high: "#3b82f6",
	},
	default: {
		low: "#22c55e",
		high: "#ef4444",
	},
} as const; // preserve literal types
