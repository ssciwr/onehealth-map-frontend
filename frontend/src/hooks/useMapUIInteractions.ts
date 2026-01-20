import type L from "leaflet";
import { useState } from "react";

export interface MapUIInteractionsState {
	generalError: string | null;
	setGeneralError: (error: string | null) => void;
	dataProcessingError: boolean;
	setDataProcessingError: (error: boolean) => void;
	borderStyle: "white" | "light-gray" | "black" | "half-opacity" | "black-80";
	setBorderStyle: (
		style: "white" | "light-gray" | "black" | "half-opacity" | "black-80",
	) => void;
	mapHoverTimeout: NodeJS.Timeout | null;
	setMapHoverTimeout: (timeout: NodeJS.Timeout | null) => void;
	mapHoveredLayer: L.Layer | null;
	setMapHoveredLayer: (layer: L.Layer | null) => void;
	mapScreenshoter: L.SimpleMapScreenshoter | null;
	setMapScreenshoter: (screenshoter: L.SimpleMapScreenshoter | null) => void;
	noDataModalVisible: boolean;
	setNoDataModalVisible: (visible: boolean) => void;
	userRequestedYear: number;
	setUserRequestedYear: (year: number) => void;
	dataFetchErrorMessage: string;
	setDataFetchErrorMessage: (message: string) => void;
}

export const useMapUIInteractions = (): MapUIInteractionsState => {
	const [generalError, setGeneralError] = useState<string | null>(null);
	const [dataProcessingError, setDataProcessingError] =
		useState<boolean>(false);
	const [borderStyle, setBorderStyle] = useState<
		"white" | "light-gray" | "black" | "half-opacity" | "black-80"
	>("white");
	const [mapHoverTimeout, setMapHoverTimeout] = useState<NodeJS.Timeout | null>(
		null,
	);
	const [mapHoveredLayer, setMapHoveredLayer] = useState<L.Layer | null>(null);
	const [mapScreenshoter, setMapScreenshoter] =
		useState<L.SimpleMapScreenshoter | null>(null);
	const [noDataModalVisible, setNoDataModalVisible] = useState(false);
	const [userRequestedYear, setUserRequestedYear] = useState<number>(2016);
	const [dataFetchErrorMessage, setDataFetchErrorMessage] =
		useState<string>("");

	return {
		generalError,
		setGeneralError,
		dataProcessingError,
		setDataProcessingError,
		borderStyle,
		setBorderStyle,
		mapHoverTimeout,
		setMapHoverTimeout,
		mapHoveredLayer,
		setMapHoveredLayer,
		mapScreenshoter,
		setMapScreenshoter,
		noDataModalVisible,
		setNoDataModalVisible,
		userRequestedYear,
		setUserRequestedYear,
		dataFetchErrorMessage,
		setDataFetchErrorMessage,
	};
};
