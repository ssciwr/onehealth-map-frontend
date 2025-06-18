import { Button, Dropdown, Space, Typography } from "antd";
import type { MenuProps } from "antd";
import { ChevronDown, Plug } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { isMobile } from "react-device-detect";
import ModelDetailsModal from "./ModelDetailsModal";
const { Title } = Typography;

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
}

const parseYamlText = (yamlText: string): YamlData => {
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
	// State to control dropdown visibility
	const [dropdownOpen, setDropdownOpen] = useState(false);

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
					},
				]);
			} finally {
				setLoading(false);
			}
		};

		loadData();
	}, []);

	const selectedModelData = models.find((m) => m.id === selectedModel);

	const items: MenuProps["items"] = models.map((model) => ({
		key: model.id,
		label: (
			<div
				style={{
					display: "flex",
					alignItems: "center",
					gap: "12px",
					padding: "8px 0",
				}}
			>
				<div
					style={{
						width: "32px",
						height: "32px",
						borderRadius: "6px",
						background: `${model.color}20`,
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						fontSize: "16px",
					}}
				>
					{model.emoji}
				</div>
				<div style={{ flex: 1 }}>
					<div style={{ fontWeight: 600, fontSize: "14px", color: "#172B4D" }}>
						{model.title} - {model.modelName}
					</div>
					<div style={{ fontSize: "12px", color: "#6B778C" }}>
						{model.description}
					</div>
				</div>
			</div>
		),
		onClick: () => {
			onModelSelect(model.id);
			// Close dropdown after model selection
			setDropdownOpen(false);
		},
	}));

	// Handler to open modal and close dropdown
	const handleViewDetailsClick = () => {
		setIsDetailsModalOpen(true);
		setDropdownOpen(false); // Close dropdown when modal opens
	};

	const dropdownRender = (originNode: React.ReactNode) => (
		<div
			style={{
				backgroundColor: "white",
				borderRadius: "16px",
				border: "1px solid rgb(240,240,240)",
			}}
		>
			<div style={{ padding: "16px 20px" }}>
				<Title level={5} style={{ margin: "0 0 8px 0" }}>
					Disease Models
				</Title>
				<p className="tertiary">
					{loading
						? "Loading models..."
						: error
							? "Error loading models (using fallback)"
							: "Select a disease model to visualize spread patterns"}
				</p>
			</div>
			{originNode}
			<div style={{ padding: "12px 20px", borderTop: "1px solid #EBECF0" }}>
				<Button
					data-testid="view-all-models"
					type="link"
					size="small"
					onClick={handleViewDetailsClick}
					style={{ padding: 0, height: "auto", color: "#0052CC" }}
					disabled={loading}
				>
					View Details & Compare Models
				</Button>
			</div>
		</div>
	);

	// Create display text with proper truncation
	const getDisplayText = (modelData: Model) => {
		const fullText = `${modelData.title} - ${modelData.modelName}`;
		return truncateText(fullText, isMobile ? 20 : 30);
	};

	return (
		<span className="model-selector">
			{isMobile === false && "Display"}&nbsp;
			<Dropdown
				data-testid="model-dropdown"
				menu={{ items }}
				trigger={["click"]}
				popupRender={dropdownRender}
				overlayStyle={{ minWidth: "350px" }}
				disabled={loading}
				open={dropdownOpen}
				onOpenChange={isMobile ? setIsDetailsModalOpen : setDropdownOpen}
			>
				<Button
					className="header-font-size"
					style={{
						display: "inline-flex",
						alignItems: "center",
						gap: "8px",
						padding: "8px 16px",
						background: "white",
						border: "1px solid #DFE1E6",
						borderRadius: "8px",
						color: "#172B4D",
						height: "auto",
						maxWidth: isMobile ? "200px" : "300px", // Limit button width
					}}
					loading={loading}
				>
					{selectedModelData ? (
						<Space>
							<span>{selectedModelData.emoji}</span>
							<span
								style={{
									overflow: "hidden",
									textOverflow: "ellipsis",
									whiteSpace: "nowrap",
								}}
								title={`${selectedModelData.title} - ${selectedModelData.modelName}`} // Show full text on hover
							>
								{getDisplayText(selectedModelData)}
							</span>
						</Space>
					) : (
						<Space>
							<Plug size={18} style={{ color: "#0052CC" }} />
							<span>Data Source</span>
						</Space>
					)}
					<ChevronDown size={16} style={{ color: "#6B778C" }} />
				</Button>
			</Dropdown>
			<ModelDetailsModal
				isOpen={isDetailsModalOpen}
				onClose={() => {
					setIsDetailsModalOpen(false);
					setDropdownOpen(false);
				}}
				models={models}
				selectedModelId={selectedModel}
				onModelSelect={onModelSelect}
			/>
		</span>
	);
};

export default ModelSelector;
