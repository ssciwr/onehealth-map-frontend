import { Button } from "antd";
import { Plug } from "lucide-react";
import { useEffect, useState } from "react";
import { isMobile } from "react-device-detect";
import Selector from "../../General/Selector.tsx";
import ModelDetailsModal from "./ModelDetailsModal";

interface YamlData {
	id?: string;
	"virus-type"?: string;
	"model-name"?: string;
	title?: string;
	description?: string;
	emoji?: string;
	icon?: string;
	color?: string;
	details?: string;
	image?: string;
	authors?: string[];
	paper?: {
		paperTitle?: string;
		url?: string;
	};
	output?: string[];
}

const parseYamlText = (yamlText: string): YamlData => {
	const lines = yamlText.split("\n");
	const result: Record<string, string | string[]> = {};
	let currentKey = "";
	let isInArray = false;
	let arrayItems: string[] = [];

	for (const line of lines) {
		const trimmed = line.trim();
		if (trimmed && !trimmed.startsWith("#")) {
			const colonIndex = trimmed.indexOf(":");
			if (colonIndex > 0) {
				// If we were in an array, save it
				if (isInArray && currentKey) {
					result[currentKey] = arrayItems;
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

	// Handle any remaining array
	if (isInArray && currentKey) {
		result[currentKey] = arrayItems;
	}

	return result as YamlData;
};

interface Model {
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

const loadModels = async (): Promise<Model[]> => {
	const modelFiles = [
		"westNileModel1.yaml",
		"westNileModel2.yaml",
		"dengueModel1.yaml",
		"malariaModel1.yaml",
		"covidModel1.yaml",
		"zikaModel1.yaml",
	];

	const models: Model[] = [];

	for (const filename of modelFiles) {
		try {
			const response = await fetch(`/modelsyaml/${filename}`);
			if (!response.ok) {
				console.warn(`Failed to load ${filename}: ${response.status}`);
				continue;
			}

			const yamlText = await response.text();
			const yamlData = parseYamlText(yamlText);

			const model: Model = {
				id: yamlData.id || "",
				virusType: yamlData["virus-type"] || "",
				modelName: yamlData["model-name"] || "",
				title: yamlData.title || "",
				description: yamlData.description || "",
				emoji: yamlData.emoji || "",
				icon: yamlData.icon || "",
				color: yamlData.color || "",
				details: yamlData.details || "",
				output: yamlData.output || ["R0"],
			};

			models.push(model);
		} catch (error) {
			console.error(`Error loading ${filename}:`, error);
		}
	}

	return models;
};

// Helper function to truncate text
const truncateText = (text: string, maxLength: number): string => {
	if (text.length <= maxLength) return text;
	return `${text.slice(0, maxLength)}...`;
};

const ModelSelector = ({
	selectedModel,
	onModelSelect,
}: {
	selectedModel: string;
	onModelSelect: (newModelId: string) => void;
}) => {
	const [models, setModels] = useState<Model[]>([]);
	const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const loadData = async () => {
			try {
				setLoading(true);
				setError(null);
				const loadedModels = await loadModels();

				if (loadedModels.length === 0) {
					throw new Error("No models could be loaded");
				}

				setModels(loadedModels);
			} catch (err) {
				console.error("Error loading models:", err);
				setError("Failed to load models");

				console.log("Falling back to hardcoded model data");
				setModels([
					{
						id: "west-nile-a17",
						virusType: "west-nile",
						modelName: "Model A17",
						title: "West Nile Virus",
						description: "Mosquito-borne disease affecting humans and animals",
						emoji: "🦟",
						icon: "Bug",
						color: "#754910",
						details:
							"Advanced climate model incorporating temperature, humidity, and precipitation data from NOAA weather stations.",
						output: ["R0"],
					},
				]);
			} finally {
				setLoading(false);
			}
		};

		loadData();
	}, []);

	const selectedModelData = models.find((m) => m.id === selectedModel);

	// Convert models to selector items format
	const selectorItems = models.map((model) => ({
		id: model.id,
		title: `${model.title} - ${model.modelName}`,
		description: model.description,
		emoji: model.emoji,
		color: model.color,
	}));

	// Handler to open modal
	const handleViewDetailsClick = () => {
		setIsDetailsModalOpen(true);
	};

	// Handler for info icon click - opens modal and selects the model
	const handleInfoClick = (modelId: string) => {
		onModelSelect(modelId);
		setIsDetailsModalOpen(true);
	};

	// Create display text with proper truncation
	const getDisplayText = (modelData: Model) => {
		const fullText = `${modelData.title} - ${modelData.modelName}`;
		return truncateText(fullText, isMobile ? 20 : 30);
	};

	if (isMobile) {
		// On mobile, just show button that opens modal
		return (
			<span className="model-selector">
				<Button
					className="header-font-size bg-surface-raised border-light"
					style={{
						display: "inline-flex",
						alignItems: "center",
						gap: "8px",
						padding: "8px 16px",
						borderRadius: "8px",
						color: "var(--text-primary)",
						height: "auto",
						maxWidth: "200px",
					}}
					loading={loading}
					onClick={() => setIsDetailsModalOpen(true)}
				>
					{selectedModelData ? (
						<>
							<span>{selectedModelData.emoji}</span>
							<span
								style={{
									overflow: "hidden",
									textOverflow: "ellipsis",
									whiteSpace: "nowrap",
								}}
								title={`${selectedModelData.title} - ${selectedModelData.modelName}`}
							>
								{getDisplayText(selectedModelData)}
							</span>
						</>
					) : (
						<>
							<Plug size={18} style={{ color: "#0052CC" }} />
							<span>Data Source</span>
						</>
					)}
				</Button>
				<ModelDetailsModal
					isOpen={isDetailsModalOpen}
					onClose={() => setIsDetailsModalOpen(false)}
					models={models}
					selectedModelId={selectedModel}
					onModelSelect={onModelSelect}
				/>
			</span>
		);
	}

	return (
		<span className="model-selector" data-testid="model-selector">
			<Selector
				items={selectorItems}
				selectedId={selectedModel}
				onSelect={onModelSelect}
				title="Disease Models"
				description={
					loading
						? "Loading models..."
						: error
							? "Error loading models (using fallback)"
							: "Select a disease model to visualize spread patterns"
				}
				buttonText={
					selectedModelData ? getDisplayText(selectedModelData) : "Data Source"
				}
				className="header-font-size"
				onInfoClick={handleInfoClick}
				footerAction={
					<Button
						data-testid="view-all-models"
						type="link"
						size="small"
						onClick={handleViewDetailsClick}
						style={{ padding: 0, height: "auto", color: "blue" }}
						disabled={loading}
					>
						View Details & Compare Models
					</Button>
				}
			/>
			<ModelDetailsModal
				isOpen={isDetailsModalOpen}
				onClose={() => setIsDetailsModalOpen(false)}
				models={models}
				selectedModelId={selectedModel}
				onModelSelect={onModelSelect}
			/>
		</span>
	);
};

export default ModelSelector;
