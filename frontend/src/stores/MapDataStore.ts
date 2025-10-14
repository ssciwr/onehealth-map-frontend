import { makeAutoObservable } from "mobx";
import type L from "leaflet";
import type {
	NutsGeoJSON,
	WorldwideGeoJSON,
	ViewportBounds,
} from "../component/Mapper/types";

export class MapDataStore {
	processedWorldwideRegions: WorldwideGeoJSON | null = null;
	processedEuropeNutsRegions: NutsGeoJSON | null = null;
	isProcessingEuropeNutsData: boolean = false;
	isProcessingWorldwideRegionData: boolean = false;
	isLoadingRawData: boolean = false;
	leafletMapInstance: L.Map | null = null;
	mapViewportBounds: ViewportBounds | null = null;
	mapZoomLevel: number = 3;
	dataResolution: number = 1;

	constructor() {
		makeAutoObservable(this);
	}

	setProcessedWorldwideRegions = (data: WorldwideGeoJSON | null) => {
		this.processedWorldwideRegions = data;
	};

	setProcessedEuropeNutsRegions = (data: NutsGeoJSON | null) => {
		this.processedEuropeNutsRegions = data;
	};

	setIsProcessingEuropeNutsData = (processing: boolean) => {
		this.isProcessingEuropeNutsData = processing;
	};

	setIsProcessingWorldwideRegionData = (processing: boolean) => {
		this.isProcessingWorldwideRegionData = processing;
	};

	setIsLoadingRawData = (loading: boolean) => {
		this.isLoadingRawData = loading;
	};

	setLeafletMapInstance = (map: L.Map | null) => {
		this.leafletMapInstance = map;
	};

	setMapViewportBounds = (bounds: ViewportBounds | null) => {
		this.mapViewportBounds = bounds;
	};

	setMapZoomLevel = (zoom: number) => {
		this.mapZoomLevel = zoom;
	};

	setDataResolution = (resolution: number) => {
		this.dataResolution = resolution;
	};
}

export const mapDataStore = new MapDataStore();