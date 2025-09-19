import type L from "leaflet";
import { useState } from "react";
import type { ViewportBounds } from "../component/Mapper/types";

export interface MapUIState {
	map: L.Map | null;
	setMap: (map: L.Map | null) => void;
	currentZoom: number;
	setCurrentZoom: (zoom: number) => void;
	viewport: ViewportBounds | null;
	setViewport: React.Dispatch<React.SetStateAction<ViewportBounds | null>>;
	mapMode: "worldwide" | "europe-only";
	setMapMode: (mode: "worldwide" | "europe-only") => void;
	borderStyle: "white" | "light-gray" | "black" | "half-opacity" | "black-80";
	setBorderStyle: (
		style: "white" | "light-gray" | "black" | "half-opacity" | "black-80",
	) => void;
	hoverTimeout: NodeJS.Timeout | null;
	setHoverTimeout: (timeout: NodeJS.Timeout | null) => void;
	currentHoveredLayer: L.Layer | null;
	setCurrentHoveredLayer: (layer: L.Layer | null) => void;
	screenshoter: L.SimpleMapScreenshoter | null;
	setScreenshoter: (screenshoter: L.SimpleMapScreenshoter | null) => void;
}

export const useMapUIState = (): MapUIState => {
	const [map, setMap] = useState<L.Map | null>(null);
	const [currentZoom, setCurrentZoom] = useState(3);
	const [viewport, setViewport] = useState<ViewportBounds | null>(null);
	const [mapMode, setMapMode] = useState<"worldwide" | "europe-only">(
		"europe-only",
	);
	const [borderStyle, setBorderStyle] = useState<
		"white" | "light-gray" | "black" | "half-opacity" | "black-80"
	>("white");
	const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);
	const [currentHoveredLayer, setCurrentHoveredLayer] =
		useState<L.Layer | null>(null);
	const [screenshoter, setScreenshoter] =
		useState<L.SimpleMapScreenshoter | null>(null);

	return {
		map,
		setMap,
		currentZoom,
		setCurrentZoom,
		viewport,
		setViewport,
		mapMode,
		setMapMode,
		borderStyle,
		setBorderStyle,
		hoverTimeout,
		setHoverTimeout,
		currentHoveredLayer,
		setCurrentHoveredLayer,
		screenshoter,
		setScreenshoter,
	};
};
