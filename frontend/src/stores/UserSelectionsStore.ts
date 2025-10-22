import { makeAutoObservable } from "mobx";
import type { Month } from "../component/Mapper/types";

export class UserSelectionsStore {
	selectedModel: string = "";
	selectedOptimism: string = "optimistic";
	currentYear: number = 2016;
	currentMonth: Month = 7;
	currentVariableType: string = "R0";
	mapMode: "worldwide" | "europe-only" | "grid" = "europe-only";

	constructor() {
		makeAutoObservable(this);
	}

	setSelectedModel = (model: string) => {
		this.selectedModel = model;
	};

	setSelectedOptimism = (optimism: string) => {
		this.selectedOptimism = optimism;
	};

	setCurrentYear = (year: number) => {
		this.currentYear = year;
	};

	setCurrentMonth = (month: Month) => {
		this.currentMonth = month;
	};

	setCurrentVariableType = (value: string) => {
		this.currentVariableType = value;
	};

	setMapMode = (mode: "worldwide" | "europe-only" | "grid") => {
		this.mapMode = mode;
	};
}

export const userSelectionsStore = new UserSelectionsStore();