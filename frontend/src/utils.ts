import { buildNutsApiUrl } from "./services/nutsApi.ts";

export const NUTS_3_REGION_DATA = buildNutsApiUrl("/nuts_regions", {
	grid_resolution: "NUTS3",
});
// Backend endpoint that returns NUTS3 polygons as GeoJSON. Each feature has the region ID and polygon geometry.
