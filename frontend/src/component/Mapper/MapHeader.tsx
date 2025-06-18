import { SettingOutlined } from "@ant-design/icons";
import { Button, Modal } from "antd";
import { useState } from "react";
import { isMobile } from "react-device-detect";
import { viewingMode } from "../../stores/ViewingModeStore.ts";
import GeneralCard from "../General/GeneralCard.tsx";
import ModelSelector from "./InterfaceInputs/ModelSelector.tsx";
import OptimismLevelSelector from "./InterfaceInputs/OptimismSelector.tsx";
import TimelineSelector from "./InterfaceInputs/TimelineSelector.tsx";

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
	const [isSettingsOpen, setIsSettingsOpen] = useState(false);

	return isMobile ? (
		<div>
			<div
				style={{
					position: "fixed",
					top: "1em",
					left: "50%",
					transform: "translateX(-50%)",
					width: "95vw",
					opacity: 1,
					zIndex: 500,
					padding: "1px",
				}}
			>
				<GeneralCard style={{ border: "0px solid" }}>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
						}}
					>
						<img
							alt="OneHealth Logo - two objects on either side that appear to be holding a circular shape inbetween the them"
							style={{ height: "42px", width: "42px" }}
							src="/images/oneHealthLogoOnlySymbols.png"
						/>

						<div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
							<ModelSelector
								selectedModel={selectedModel}
								onModelSelect={handleModelSelect}
							/>
						</div>

						<Button
							type="text"
							icon={<SettingOutlined />}
							onClick={() => setIsSettingsOpen(true)}
							style={{
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								width: "42px",
								height: "42px",
							}}
						/>
					</div>
				</GeneralCard>
			</div>

			<Modal
				title="Settings"
				open={isSettingsOpen}
				onCancel={() => setIsSettingsOpen(false)}
				footer={
					<Button
						type="primary"
						block
						onClick={() => setIsSettingsOpen(false)}
						style={{
							backgroundColor: "#0052CC",
							borderColor: "#0052CC",
						}}
					>
						Close
					</Button>
				}
				width="90vw"
				style={{ top: 20 }}
			>
				<div style={{ padding: "20px 0" }}>
					<div style={{ marginBottom: "24px" }}>
						<h4>Disease Model</h4>
						<ModelSelector
							selectedModel={selectedModel}
							onModelSelect={handleModelSelect}
						/>
					</div>

					<div style={{ marginBottom: "24px" }}>
						<h4>Optimism Level</h4>
						<OptimismLevelSelector
							availableOptimismLevels={getOptimismLevels()}
							selectedOptimism={selectedOptimism}
							setOptimism={setSelectedOptimism}
						/>
					</div>
				</div>
			</Modal>
		</div>
	) : (
		<div className="header-section center min-w-100">
			<GeneralCard
				style={{ border: "0px solid", marginBottom: "0px", marginTop: "10px" }}
				bodyStyle={{ paddingTop: "20px", paddingBottom: "20px" }}
			>
				<div className="logo-section">
					<h1 hidden className="map-title">
						<span className="title-one">One</span>
						<span className="title-health">Health</span>
						<span className="title-platform">Platform</span>
						<small className="tertiary">
							<i>&nbsp;{viewingMode.isExpert && "Expert Mode"}</i>
						</small>
					</h1>
				</div>
				<div
					className="header-font-size"
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						gap: "8px",
						flexWrap: "wrap",
					}}
				>
					<img
						style={{ height: "36px" }}
						alt="OneHealth Logo - two objects on either side that appear to be holding a circular shape inbetween the them"
						src="/images/oneHealthLogoFullLight.png"
					/>
					<ModelSelector
						selectedModel={selectedModel}
						onModelSelect={handleModelSelect}
					/>
					<span>with</span>
					<OptimismLevelSelector
						availableOptimismLevels={getOptimismLevels()}
						selectedOptimism={selectedOptimism}
						setOptimism={setSelectedOptimism}
					/>
					<small
						className="tertiary"
						style={{
							border: "1px solid lightgray",
							padding: "2px 4px",
							borderRadius: "4px",
						}}
						hidden={viewingMode.isExpert === false}
					>
						Expert Mode
					</small>
				</div>
			</GeneralCard>
		</div>
	);
};
