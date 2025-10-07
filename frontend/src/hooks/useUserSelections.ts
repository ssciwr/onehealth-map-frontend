import { useState } from "react";
import type { Month } from "../component/Mapper/types";

export interface UserSelectionsState {
	selectedModel: string;
	setSelectedModel: (model: string) => void;
	selectedOptimism: string;
	setSelectedOptimism: (optimism: string) => void;
	currentYear: number;
	setCurrentYear: (year: number) => void;
	currentMonth: Month;
	setCurrentMonth: (month: Month) => void;
	currentVariableValue: string;
	setCurrentVariableValue: (value: string) => void;
	mapMode: "worldwide" | "europe-only" | "grid";
	setMapMode: (mode: "worldwide" | "europe-only" | "grid") => void;
}

export const useUserSelections = (): UserSelectionsState => {
	const [selectedModel, setSelectedModel] = useState<string>("");
	const [selectedOptimism, setSelectedOptimism] =
		useState<string>("optimistic");
	const [currentYear, setCurrentYear] = useState<number>(2016);
	const [currentMonth, setCurrentMonth] = useState<Month>(7);
	const [currentVariableValue, setCurrentVariableValue] =
		useState<string>("R0");
	const [mapMode, setMapMode] = useState<"worldwide" | "europe-only" | "grid">(
		"europe-only",
	);

	return {
		selectedModel,
		setSelectedModel,
		selectedOptimism,
		setSelectedOptimism,
		currentYear,
		setCurrentYear,
		currentMonth,
		setCurrentMonth,
		currentVariableValue,
		setCurrentVariableValue,
		mapMode,
		setMapMode,
	};
};
