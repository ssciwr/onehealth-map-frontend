import { SettingOutlined } from "@ant-design/icons";
import { Button, Modal, Select } from "antd";
import { Eye, EyeOff, Map as MapIcon, Palette } from "lucide-react";

const { Option } = Select;
import React, { useState } from "react";
import { isMobile } from "react-device-detect";
import { viewingMode } from "../../stores/ViewingModeStore.ts";
import GeneralCard from "../General/GeneralCard.tsx";
import ModelSelector from "./InterfaceInputs/ModelSelector.tsx";
import OptimismLevelSelector from "./InterfaceInputs/OptimismSelector.tsx";

interface MapHeaderProps {
	selectedModel: string;
	handleModelSelect: (modelId: string) => void;
	selectedOptimism: string;
	setSelectedOptimism: (optimism: string) => void;
	getOptimismLevels: () => string[];
	mapMode?: "grid" | "nuts";
	onMapModeChange?: (mode: "grid" | "nuts") => void;
	styleMode?: "unchanged" | "purple" | "red";
	onStyleModeChange?: (mode: "unchanged" | "purple" | "red") => void;
}

export default ({
	selectedModel,
	handleModelSelect,
	selectedOptimism,
	setSelectedOptimism,
	getOptimismLevels,
	mapMode = "grid",
	onMapModeChange,
	styleMode = "unchanged",
	onStyleModeChange,
}: MapHeaderProps) => {
	const [isSettingsOpen, setIsSettingsOpen] = useState(false);
	const [areControlsHidden, setAreControlsHidden] = useState(false);

	// Color schemes for styling
	const colorSchemes = {
		purple: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
		red: "linear-gradient(135deg, #ff6b6b 0%, #ffa726 100%)",
	};

	return isMobile ? (
		<div className="map-header">
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
		<div
			className="map-header header-section center min-w-100"
			style={
				styleMode !== "unchanged"
					? {
							position: "fixed",
							top: 0,
							left: 0,
							right: 0,
							background: colorSchemes[styleMode],
							boxShadow: "0 8px 32px rgba(0, 0, 0, 0.25)",
							zIndex: 1000,
							backdropFilter: "blur(20px)",
							borderBottom: "1px solid rgba(255, 255, 255, 0.2)",
							margin: 0,
						}
					: {
							position: "fixed",
							top: 0,
							left: 0,
							right: 0,
							zIndex: 1000,
							backgroundColor: "white",
						}
			}
		>
			{/* Glass morphism overlay for styled modes */}
			{styleMode !== "unchanged" && (
				<div
					style={{
						position: "absolute",
						top: 0,
						left: 0,
						right: 0,
						bottom: 0,
						background: "rgba(255, 255, 255, 0.1)",
						backdropFilter: "blur(10px)",
						pointerEvents: "none",
						color: "white",
					}}
				/>
			)}

			<GeneralCard
				style={{
					border: "0px solid",
					marginBottom: "0px",
					marginTop: styleMode !== "unchanged" ? "0px" : "10px",
					background: styleMode !== "unchanged" ? "transparent" : undefined,
					position: "relative",
					zIndex: 1,
				}}
				bodyStyle={{
					paddingTop: styleMode !== "unchanged" ? "16px" : "20px",
					paddingBottom: styleMode !== "unchanged" ? "16px" : "20px",
				}}
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
						style={{
							height: "48px",
							marginRight: "10px",
						}}
						alt="OneHealth Logo - two objects on either side that appear to be holding a circular shape inbetween the them"
						src={
							styleMode !== "unchanged"
								? "/images/oneHealthWhite.png"
								: "/images/oneHealthLogoFullLight.png"
						}
					/>
					<div
						style={
							styleMode !== "unchanged"
								? {
										background: "rgba(255, 255, 255, 0.2)",
										border: "1px solid rgba(255, 255, 255, 0.3)",
										borderRadius: "12px",
										padding: "10px 16px",
										backdropFilter: "blur(10px)",
										transition: "all 0.3s ease",
										display: "flex",
										alignItems: "center",
										gap: "4px",
									}
								: {}
						}
						className={styleMode !== "unchanged" ? "glass-button" : ""}
					>
						<span
							style={{
								color: styleMode === "unchanged" ? "rgb(30,30,30)" : "white",
								fontWeight: "500",
							}}
						>
							Display&nbsp;
						</span>
						<ModelSelector
							selectedModel={selectedModel}
							onModelSelect={handleModelSelect}
						/>
					</div>
					<span
						style={{
							color: styleMode !== "unchanged" ? "white" : "inherit",
							fontWeight: styleMode !== "unchanged" ? "500" : "normal",
							textShadow:
								styleMode !== "unchanged"
									? "0 2px 4px rgba(0, 0, 0, 0.2)"
									: "none",
						}}
					>
						with
					</span>
					<div
						style={
							styleMode !== "unchanged"
								? {
										background: "rgba(255, 255, 255, 0.2)",
										border: "1px solid rgba(255, 255, 255, 0.3)",
										borderRadius: "12px",
										padding: "10px 16px",
										backdropFilter: "blur(10px)",
										transition: "all 0.3s ease",
										display: "flex",
										alignItems: "center",
										gap: "4px",
									}
								: {}
						}
						className={styleMode !== "unchanged" ? "glass-button" : ""}
					>
						<OptimismLevelSelector
							availableOptimismLevels={getOptimismLevels()}
							selectedOptimism={selectedOptimism}
							setOptimism={setSelectedOptimism}
						/>
						<span
							style={{
								color: styleMode === "unchanged" ? "rgb(30,30,30)" : "white",
								fontWeight: "500",
							}}
						>
							&nbsp;predictions
						</span>
					</div>
					{!areControlsHidden && (
						<>
							<button
								type="button"
								onClick={() =>
									onMapModeChange?.(mapMode === "grid" ? "nuts" : "grid")
								}
								className={styleMode !== "unchanged" ? "glass-button" : ""}
								style={
									styleMode !== "unchanged"
										? {
												display: "flex",
												alignItems: "center",
												gap: "10px",
												padding: "12px 16px",
												background: "rgba(255, 255, 255, 0.2)",
												border: "1px solid rgba(255, 255, 255, 0.3)",
												borderRadius: "12px",
												backdropFilter: "blur(10px)",
												transition: "all 0.3s ease",
												color: "white",
												fontWeight: "500",
											}
										: {
												display: "flex",
												alignItems: "center",
												gap: "8px",
												padding: "8px 12px",
											}
								}
								title={`Switch to ${mapMode === "grid" ? "NUTS" : "Grid"} mode`}
							>
								<MapIcon size={styleMode !== "unchanged" ? 20 : 16} />
								{mapMode === "grid" ? "Grid" : "NUTS"}
							</button>
							{!isMobile && (
								<div
									className={styleMode !== "unchanged" ? "glass-button" : ""}
									style={
										styleMode !== "unchanged"
											? {
													display: "flex",
													alignItems: "center",
													gap: "10px",
													padding: "12px 16px",
													background: "rgba(255, 255, 255, 0.2)",
													border: "1px solid rgba(255, 255, 255, 0.3)",
													borderRadius: "12px",
													backdropFilter: "blur(10px)",
													transition: "all 0.3s ease",
												}
											: {
													display: "flex",
													alignItems: "center",
													gap: "8px",
												}
									}
								>
									<Palette
										size={styleMode !== "unchanged" ? 20 : 16}
										color={styleMode !== "unchanged" ? "white" : "inherit"}
									/>
									<Select
										value={styleMode}
										onChange={onStyleModeChange}
										style={{ minWidth: 140 }}
										size="middle"
									>
										<Option value="unchanged">Unchanged</Option>
										<Option value="purple">Style Purple</Option>
										<Option value="red">Style Red</Option>
									</Select>
								</div>
							)}
							<button
								type="button"
								onClick={() => setAreControlsHidden(true)}
								className={styleMode !== "unchanged" ? "glass-button" : ""}
								style={
									styleMode !== "unchanged"
										? {
												display: "flex",
												alignItems: "center",
												gap: "8px",
												padding: "12px 16px",
												background: "rgba(255, 255, 255, 0.2)",
												border: "1px solid rgba(255, 255, 255, 0.3)",
												borderRadius: "12px",
												backdropFilter: "blur(10px)",
												transition: "all 0.3s ease",
												color: "white",
												fontWeight: "500",
											}
										: {
												display: "flex",
												alignItems: "center",
												gap: "8px",
												padding: "8px 12px",
											}
								}
								title="Hide controls (reload page to restore)"
							>
								<EyeOff size={styleMode !== "unchanged" ? 20 : 16} />
								Hide
							</button>
						</>
					)}
					<small
						className={
							styleMode !== "unchanged" ? "tertiary glass-button" : "tertiary"
						}
						style={
							styleMode !== "unchanged"
								? {
										background: "rgba(255, 255, 255, 0.2)",
										border: "1px solid rgba(255, 255, 255, 0.3)",
										borderRadius: "12px",
										padding: "8px 12px",
										backdropFilter: "blur(10px)",
										transition: "all 0.3s ease",
										color: "white",
										fontWeight: "500",
									}
								: {
										border: "1px solid lightgray",
										padding: "2px 4px",
										borderRadius: "4px",
									}
						}
						hidden={viewingMode.isExpert === false}
					>
						Expert Mode
					</small>
				</div>

				{/* Custom CSS for styled modes */}
				{styleMode !== "unchanged" && (
					<style>
						{`
							.glass-button:hover {
								background: rgba(255, 255, 255, 0.3) !important;
								border-color: rgba(255, 255, 255, 0.5) !important;
								transform: translateY(-1px);
								box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
							}

							.glass-button .ant-select-selector,
							.glass-button .ant-select-selection-item,
							.glass-button .ant-select-arrow,
							.glass-button .anticon {
								color: white !important;
							}

							.glass-button button {
								background: transparent !important;
								border: none !important;
								color: white !important;
							}

							.glass-button button:hover {
								background: rgba(255, 255, 255, 0.1) !important;
							}
						`}
					</style>
				)}
			</GeneralCard>
		</div>
	);
};
