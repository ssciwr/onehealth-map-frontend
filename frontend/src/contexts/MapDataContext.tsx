import type React from "react";
import { createContext, useContext } from "react";
import { type MapDataStore, mapDataStore } from "../stores/MapDataStore";

const MapDataContext = createContext<MapDataStore>(mapDataStore);

export const MapDataProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	return (
		<MapDataContext.Provider value={mapDataStore}>
			{children}
		</MapDataContext.Provider>
	);
};

export const useMapDataStore = () => {
	const context = useContext(MapDataContext);
	if (!context) {
		throw new Error("useMapDataStore must be used within a MapDataProvider");
	}
	return context;
};
