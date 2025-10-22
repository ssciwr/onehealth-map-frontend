import type React from "react";
import { createContext, useContext } from "react";
import {
	type MapUIInteractionsStore,
	mapUIInteractionsStore,
} from "../stores/MapUIInteractionsStore";

const MapUIInteractionsContext = createContext<MapUIInteractionsStore>(
	mapUIInteractionsStore,
);

export const MapUIInteractionsProvider: React.FC<{
	children: React.ReactNode;
}> = ({ children }) => {
	return (
		<MapUIInteractionsContext.Provider value={mapUIInteractionsStore}>
			{children}
		</MapUIInteractionsContext.Provider>
	);
};

export const useMapUIInteractionsStore = () => {
	const context = useContext(MapUIInteractionsContext);
	if (!context) {
		throw new Error(
			"useMapUIInteractionsStore must be used within a MapUIInteractionsProvider",
		);
	}
	return context;
};
