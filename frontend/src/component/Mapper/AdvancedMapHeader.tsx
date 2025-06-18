import ModelSelector from "./InterfaceInputs/ModelSelector.tsx";
import OptimismLevelSelector from "./InterfaceInputs/OptimismSelector.tsx";

interface MapHeaderProps {
	selectedModel: string;
	handleModelSelect: (modelId: string) => void;
	selectedOptimism: string;
	setSelectedOptimism: (optimism: string) => void;
	getOptimismLevels: () => string[];
}

export default ({
	selectedModel,
	handleModelSelect,
	selectedOptimism,
	setSelectedOptimism,
	getOptimismLevels,
}: MapHeaderProps) => {
	return (
		<div
			style={{
				display: "flex",
				alignItems: "center",
				gap: "12px",
				minWidth: "100%",
			}}
		>
			<ModelSelector
				selectedModel={selectedModel}
				onModelSelect={handleModelSelect}
			/>
			<span style={{ color: "white", fontSize: "14px" }}>with</span>
			<OptimismLevelSelector
				availableOptimismLevels={getOptimismLevels()}
				selectedOptimism={selectedOptimism}
				setOptimism={setSelectedOptimism}
			/>
		</div>
	);
};
