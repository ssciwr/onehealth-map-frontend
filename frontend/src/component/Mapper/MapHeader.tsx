import { isMobile } from "react-device-detect";
import { viewingMode } from "../../stores/ViewingModeStore.ts";
import GeneralCard from "../Multiuse/GeneralCard.tsx";
import ModelSelector from "./InterfaceInputs/ModelSelector.tsx";
import OptimismLevelSelector from "./InterfaceInputs/OptimismSelector.tsx";
import TimelineSelector from "./InterfaceInputs/TimelineSelector.tsx";

interface MapHeaderProps {
	currentYear: number;
	currentMonth: number;
	setCurrentYear: (year: number) => void;
	setCurrentMonth: (month: number) => void;
	selectedModel: string;
	handleModelSelect: (modelId: string) => void;
	selectedOptimism: string;
	setSelectedOptimism: (optimism: string) => void;
	getOptimismLevels: () => string[];
}

export default ({
	currentYear,
	currentMonth,
	setCurrentYear,
	setCurrentMonth,
	selectedModel,
	handleModelSelect,
	selectedOptimism,
	setSelectedOptimism,
	getOptimismLevels,
}: MapHeaderProps) => {
	return isMobile ? (
		<div>
			<TimelineSelector
				year={currentYear}
				month={currentMonth}
				onYearChange={setCurrentYear}
				onMonthChange={setCurrentMonth}
			/>
			<div
				style={{
					position: "fixed",
					top: "10px",
					width: "95vw",
					opacity: 1,
					zIndex: 500,
				}}
			>
				<GeneralCard>
					<div
						style={{
							display: "flex",
							alignItems: "center",
						}}
					>
						<img
							alt="OneHealth Logo - two objects on either side that appear to be holding a circular shape inbetween the them"
							style={{ height: "42px", width: "42px" }}
							src="/images/oneHealthLogoOnlySymbols.png"
						/>
						&nbsp;
						<ModelSelector
							selectedModel={selectedModel}
							onModelSelect={handleModelSelect}
						/>
						&nbsp;
						{/* Todo: Here have a settings cog which opensa modal containing the Model selector,
						Otpimism selector and a close button at the bottom (fixed bottom: 10px full width). */}
					</div>
				</GeneralCard>
			</div>
		</div>
	) : (
		<div className="header-section center">
			<GeneralCard style={{ width: "fit-content" }}>
				<div className="logo-section">
					<h1 className="map-title">
						<span className="title-one">One</span>
						<span className="title-health">Health</span>
						<span className="title-platform">Platform</span>
						<small className="tertiary">
							<i>&nbsp;{viewingMode.isExpert && "Expert Mode"}</i>
						</small>
					</h1>
				</div>
				<ModelSelector
					selectedModel={selectedModel}
					onModelSelect={handleModelSelect}
				/>
				&nbsp; with&nbsp;
				<OptimismLevelSelector
					availableOptimismLevels={getOptimismLevels()}
					selectedOptimism={selectedOptimism}
					setOptimism={setSelectedOptimism}
				/>
			</GeneralCard>

			<TimelineSelector
				year={currentYear}
				month={currentMonth}
				onYearChange={setCurrentYear}
				onMonthChange={setCurrentMonth}
			/>
		</div>
	);
};
