import {
	type DataProcessingState,
	useDataProcessingState,
} from "./useDataProcessingState";
import { type MapUIState, useMapUIState } from "./useMapUIState";
import {
	type UserSelectionState,
	useUserSelectionState,
} from "./useUserSelectionState";

export interface ClimateMapState
	extends MapUIState,
		DataProcessingState,
		UserSelectionState {}

export const useClimateMapState = (): ClimateMapState => {
	const mapUIState = useMapUIState();
	const dataProcessingState = useDataProcessingState();
	const userSelectionState = useUserSelectionState();

	return {
		...mapUIState,
		...dataProcessingState,
		...userSelectionState,
	};
};
