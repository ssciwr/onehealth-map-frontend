import { useState } from "react";
import type { Month } from "../component/Mapper/types";

export interface UserSelectionState {
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
	error: string | null;
	setError: (error: string | null) => void;
	processingError: boolean;
	setProcessingError: (error: boolean) => void;
	lackOfDataModalVisible: boolean;
	setLackOfDataModalVisible: (visible: boolean) => void;
	requestedYear: number;
	setRequestedYear: (year: number) => void;
	apiErrorMessage: string;
	setApiErrorMessage: (message: string) => void;
}

export const useUserSelectionState = (): UserSelectionState => {
	const [selectedModel, setSelectedModel] = useState<string>("");
	const [selectedOptimism, setSelectedOptimism] =
		useState<string>("optimistic");
	const [currentYear, setCurrentYear] = useState<number>(2016);
	const [currentMonth, setCurrentMonth] = useState<Month>(7);
	const [currentVariableValue, setCurrentVariableValue] =
		useState<string>("R0");
	const [error, setError] = useState<string | null>(null);
	const [processingError, setProcessingError] = useState<boolean>(false);
	const [lackOfDataModalVisible, setLackOfDataModalVisible] = useState(false);
	const [requestedYear, setRequestedYear] = useState<number>(2016);
	const [apiErrorMessage, setApiErrorMessage] = useState<string>("");

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
		error,
		setError,
		processingError,
		setProcessingError,
		lackOfDataModalVisible,
		setLackOfDataModalVisible,
		requestedYear,
		setRequestedYear,
		apiErrorMessage,
		setApiErrorMessage,
	};
};
