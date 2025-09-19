import { useEffect, useState } from "react";

export interface Model {
	id: string;
	virusType: string;
	modelName: string;
	title: string;
	description: string;
	emoji: string;
	icon: string;
	color: string;
	details: string;
	output: string[];
}

export interface UseModelDataReturn {
	models: Model[];
	setModels: (models: Model[]) => void;
	getOptimismLevels: () => string[];
}

export const useModelData = (
	selectedModel: string,
	setSelectedModel: (model: string) => void,
): UseModelDataReturn => {
	const [models, setModels] = useState<Model[]>([]);

	const getOptimismLevels = () => ["optimistic", "realistic", "pessimistic"];

	// Load models for ModelDetailsModal
	useEffect(() => {
		const loadModels = async () => {
			const modelFiles = [
				"westNileModel1.yaml",
				"westNileModel2.yaml",
				"dengueModel1.yaml",
				"malariaModel1.yaml",
				"covidModel1.yaml",
				"zikaModel1.yaml",
			];

			const loadedModels = [];

			for (const filename of modelFiles) {
				try {
					const response = await fetch(`/modelsyaml/${filename}`);
					if (!response.ok) continue;

					const yamlText = await response.text();
					const lines = yamlText.split("\n");
					const result: Record<string, string> = {};
					let currentKey = "";
					let isInArray = false;
					let arrayItems: string[] = [];

					for (const line of lines) {
						const trimmed = line.trim();
						if (trimmed && !trimmed.startsWith("#")) {
							const colonIndex = trimmed.indexOf(":");
							if (colonIndex > 0) {
								// If we were in an array, save it as a string
								if (isInArray && currentKey) {
									result[currentKey] = arrayItems.join(", ");
									arrayItems = [];
									isInArray = false;
								}

								const key = trimmed.substring(0, colonIndex).trim();
								let value = trimmed.substring(colonIndex + 1).trim();

								if (
									(value.startsWith("'") && value.endsWith("'")) ||
									(value.startsWith('"') && value.endsWith('"'))
								) {
									value = value.slice(1, -1);
								}

								if (value === "") {
									// This might be the start of an array
									currentKey = key;
									isInArray = true;
								} else {
									result[key] = value;
								}
							} else if (trimmed.startsWith("- ") && isInArray) {
								// This is an array item
								arrayItems.push(trimmed.substring(2).trim());
							}
						}
					}

					// Handle any remaining array - convert to string for the result type
					if (isInArray && currentKey) {
						result[currentKey] = arrayItems.join(", ");
					}

					const model: Model = {
						id: result.id || "",
						virusType: result["virus-type"] || "",
						modelName: result["model-name"] || "",
						title: result.title || "",
						description: result.description || "",
						emoji: result.emoji || "",
						icon: result.icon || "",
						color: result.color || "",
						details: result.details || "",
						output: result.output ? result.output.split(", ") : ["R0"],
					};

					if (model.id) {
						loadedModels.push(model);
					}
				} catch (error) {
					console.error(`Error loading ${filename}:`, error);
				}
			}

			setModels(loadedModels);
		};

		loadModels();
	}, []);

	// Load models and set first one as default
	useEffect(() => {
		const loadDefaultModel = async () => {
			try {
				const modelFiles = [
					"westNileModel1.yaml",
					"westNileModel2.yaml",
					"dengueModel1.yaml",
					"malariaModel1.yaml",
					"covidModel1.yaml",
					"zikaModel1.yaml",
				];

				for (const filename of modelFiles) {
					try {
						const response = await fetch(`/modelsyaml/${filename}`);
						if (!response.ok) continue;

						const yamlText = await response.text();
						const lines = yamlText.split("\n");
						const result: Record<string, string> = {};

						for (const line of lines) {
							const trimmed = line.trim();
							if (trimmed && !trimmed.startsWith("#")) {
								const colonIndex = trimmed.indexOf(":");
								if (colonIndex > 0) {
									const key = trimmed.substring(0, colonIndex).trim();
									let value = trimmed.substring(colonIndex + 1).trim();
									if (
										(value.startsWith("'") && value.endsWith("'")) ||
										(value.startsWith('"') && value.endsWith('"'))
									) {
										value = value.slice(1, -1);
									}
									result[key] = value;
								}
							}
						}

						const modelId = result.id || "";
						if (modelId) {
							setSelectedModel(modelId);
							return; // Use the first successfully loaded model
						}
					} catch (error) {
						console.error(`Error loading ${filename}:`, error);
					}
				}

				// Fallback to hardcoded model if no models could be loaded
				setSelectedModel("west-nile-a17");
			} catch (error) {
				console.error("Error loading default model:", error);
				setSelectedModel("west-nile-a17");
			}
		};

		if (!selectedModel) {
			loadDefaultModel();
		}
	}, [selectedModel, setSelectedModel]);

	return {
		models,
		setModels,
		getOptimismLevels,
	};
};
