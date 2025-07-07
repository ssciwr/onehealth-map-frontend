import {
	CalendarOutlined,
	LeftOutlined,
	RightOutlined,
	SettingOutlined,
} from "@ant-design/icons";
import { Button, Select, Slider, Tooltip } from "antd";
import type L from "leaflet";
import {
	Camera,
	Database,
	ExternalLink,
	HelpCircle,
	MapPin,
	RotateCcw,
	ZoomIn,
	ZoomOut,
} from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { isMobile } from "react-device-detect";

const { Option } = Select;

interface AdvancedTimelineSelectorProps {
	year: number;
	month: number;
	onYearChange: (value: number) => void;
	onMonthChange: (value: number) => void;
	onZoomIn: () => void;
	onZoomOut: () => void;
	onResetZoom: () => void;
	onLocationFind: () => void;
	onScreenshot: () => void;
	onModelInfo: () => void;
	onAbout: () => void;
	colorScheme: "purple" | "red";
	legend?: ReactNode;
	map?: L.Map | null;
	screenshoter?: L.SimpleMapScreenshoter | null;
}

const AdvancedTimelineSelector: React.FC<AdvancedTimelineSelectorProps> = ({
	year,
	month,
	onYearChange,
	onMonthChange,
	onZoomIn,
	onZoomOut,
	onResetZoom,
	onLocationFind,
	onScreenshot,
	onModelInfo,
	onAbout,
	colorScheme,
	legend,
	map,
	screenshoter,
}) => {
	const [isSaving, setIsSaving] = useState(false);

	const handleSaveScreenshot = async () => {
		if (!map || !screenshoter) {
			console.error("Map or screenshoter not initialized");
			return;
		}

		setIsSaving(true);

		try {
			// Ensure the map has rendered before taking screenshot
			await new Promise((resolve) => setTimeout(resolve, 100));

			const blob = (await screenshoter.takeScreen("blob", {
				mimeType: "image/png",
			})) as Blob;
			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = `map-screenshot-${Date.now()}.png`;
			link.click();

			URL.revokeObjectURL(url);

			console.log("Screenshot saved successfully");
		} catch (error) {
			console.error("Screenshot failed:", error);
		} finally {
			setIsSaving(false);
		}
	};

	const months = [
		"January",
		"February",
		"March",
		"April",
		"May",
		"June",
		"July",
		"August",
		"September",
		"October",
		"November",
		"December",
	];

	const marks = {
		1960: "1960",
		1980: "1980",
		2000: "2000",
		2020: "2020",
		2040: "2040",
		2060: "2060",
		2080: "2080",
		2100: "2100",
	};

	const backgroundGradient =
		colorScheme === "purple"
			? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
			: "linear-gradient(135deg, #ff6b6b 0%, #ffa726 100%)";

	return (
		<div
			style={{
				position: "fixed",
				bottom: 0,
				left: 0,
				right: 0,
				background: backgroundGradient,
				zIndex: 1000,
				padding: "16px 60px",
				backdropFilter: "blur(20px)",
				borderTop: "1px solid rgba(255, 255, 255, 0.2)",
			}}
		>
			{/* Top row with controls */}
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					marginBottom: "16px",
				}}
			>
				{/* Left controls */}
				<div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
					<Button
						type="text"
						icon={<ZoomIn size={27} />}
						onClick={onZoomIn}
						style={{
							color: "white",
							border: "1px solid rgba(255, 255, 255, 0.3)",
							background: "rgba(255, 255, 255, 0.1)",
							borderRadius: "50%",
							width: "56px",
							height: "56px",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
						}}
					/>
					<Button
						type="text"
						icon={<ZoomOut size={27} />}
						onClick={onZoomOut}
						style={{
							color: "white",
							border: "1px solid rgba(255, 255, 255, 0.3)",
							background: "rgba(255, 255, 255, 0.1)",
							borderRadius: "50%",
							width: "56px",
							height: "56px",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
						}}
					/>
					<Button
						type="text"
						icon={<RotateCcw size={27} />}
						onClick={onResetZoom}
						style={{
							color: "white",
							border: "1px solid rgba(255, 255, 255, 0.3)",
							background: "rgba(255, 255, 255, 0.1)",
							borderRadius: "50%",
							width: "56px",
							height: "56px",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
						}}
					/>
					<Button
						type="text"
						icon={<MapPin size={27} />}
						onClick={onLocationFind}
						style={{
							color: "white",
							border: "1px solid rgba(255, 255, 255, 0.3)",
							background: "rgba(255, 255, 255, 0.1)",
							borderRadius: "50%",
							width: "56px",
							height: "56px",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
						}}
					/>
				</div>

				{/* Center - Year and Month display */}
				<div
					style={{
						display: "flex",
						alignItems: "center",
						gap: "16px",
						color: "white",
						fontSize: "18px",
						fontWeight: "600",
					}}
				>
					<span style={{ fontSize: "48px" }}>{year}</span>
					<div style={{ minWidth: "150px" }}>
						<Select
							value={month}
							onChange={onMonthChange}
							style={{
								width: "100%",
								color: "white",
							}}
							size="large"
							dropdownStyle={{
								background: "rgba(0, 0, 0, 0.8)",
								backdropFilter: "blur(10px)",
							}}
						>
							{months.map((monthName, index) => (
								<Option key={monthName} value={index + 1}>
									{monthName}
								</Option>
							))}
						</Select>
					</div>
				</div>

				{/* Right controls */}
				<div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
					<button
						type="button"
						onClick={handleSaveScreenshot}
						disabled={isSaving || !screenshoter}
						style={{
							color: "white",
							border: "1px solid rgba(255, 255, 255, 0.3)",
							background: "rgba(255, 255, 255, 0.1)",
							borderRadius: "12px",
							padding: "8px 16px",
							display: "flex",
							alignItems: "center",
							gap: "8px",
							cursor: "pointer",
							fontSize: "14px",
							fontWeight: "500",
							opacity: isSaving || !screenshoter ? 0.5 : 1,
						}}
						title={
							!screenshoter
								? "Screenshot plugin not loaded"
								: "Capture map as image"
						}
					>
						<Camera size={20} />
						{isSaving ? "Saving..." : "Screenshot"}
						<ExternalLink size={20} />
					</button>
					<button
						type="button"
						onClick={onModelInfo}
						style={{
							color: "white",
							border: "1px solid rgba(255, 255, 255, 0.3)",
							background: "rgba(255, 255, 255, 0.1)",
							borderRadius: "12px",
							padding: "8px 16px",
							display: "flex",
							alignItems: "center",
							gap: "8px",
							cursor: "pointer",
							fontSize: "14px",
							fontWeight: "500",
						}}
					>
						<Database size={20} />
						Model Info
					</button>
					<button
						type="button"
						onClick={onAbout}
						style={{
							color: "white",
							border: "1px solid rgba(255, 255, 255, 0.3)",
							background: "rgba(255, 255, 255, 0.1)",
							borderRadius: "12px",
							padding: "8px 16px",
							display: "flex",
							alignItems: "center",
							gap: "8px",
							cursor: "pointer",
							fontSize: "14px",
							fontWeight: "500",
						}}
					>
						<HelpCircle size={20} />
						About
					</button>
				</div>
			</div>

			{/* Bottom row with timeline and month selector */}
			<div
				style={{
					display: "flex",
					alignItems: "center",
					gap: "20px",
					marginLeft: "20px",
					marginRight: "20px",
				}}
			>
				{/* Year slider */}
				<div style={{ flex: 1 }}>
					<Tooltip title={year}>
						<Slider
							value={year}
							min={1960}
							max={2100}
							marks={marks}
							included={false}
							onChange={onYearChange}
							trackStyle={{ background: "transparent" }}
							railStyle={{
								background: "rgba(255, 255, 255, 0.7)",
								height: "8px",
								borderRadius: "4px",
							}}
							handleStyle={{
								borderColor: "rgba(0, 0, 0, 0.2)",
								backgroundColor: "white",
								boxShadow:
									"0 4px 16px rgba(0, 0, 0, 0.3), 0 0 0 2px rgba(0, 0, 0, 0.1)",
								width: "28px",
								height: "28px",
								marginTop: "-10px",
							}}
							style={{ width: "100%" }}
						/>
					</Tooltip>
				</div>
			</div>

			{/* Legend */}
			{isMobile && legend && (
				<div
					style={{
						position: "absolute",
						left: "20px",
						top: "50%",
						transform: "translateY(-50%)",
						zIndex: 1001,
					}}
				>
					{legend}
				</div>
			)}

			{/* Custom CSS for white styling */}
			<style>
				{`
					.ant-slider .ant-slider-rail {
						background: rgba(255, 255, 255, 0.5) !important;
						border-radius: 4px !important;
						height: 8px !important;
					}

					.ant-slider .ant-slider-track {
						background: transparent !important;
						height: 8px !important;
					}

					.ant-slider .ant-slider-handle {
						background: white !important;
						box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3), 0 0 0 2px rgba(0, 0, 0, 0.1) !important;
						width: 28px !important;
						height: 28px !important;
						border-radius: 50% !important;
						margin-left: -14px !important;
						margin-top: -10px !important;
					}

					.ant-slider-handle::before,
					.ant-slider-handle::after {
						content: none !important;
					}

					.ant-slider .ant-slider-handle:hover {
						background: white !important;
						box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4), 0 0 0 3px rgba(0, 0, 0, 0.15) !important;
						transform: scale(1.05) !important;
						border-color: rgba(0, 0, 0, 0.3) !important;
					}

					.ant-slider-mark-text {
						color: rgba(255, 255, 255, 0.95) !important;
						font-size: 24px !important;
						font-weight: 600 !important;
					}

					.ant-select-selector {
						background: rgba(255, 255, 255, 0.2) !important;
						border: 1px solid rgba(255, 255, 255, 0.3) !important;
						color: white !important;
					}

					.ant-select-selection-item {
						color: white !important;
					}

					.ant-select-arrow {
						color: white !important;
					}

					.ant-btn:hover {
						background: rgba(255, 255, 255, 0.2) !important;
						border-color: rgba(255, 255, 255, 0.5) !important;
					}
				`}
			</style>
		</div>
	);
};

export default AdvancedTimelineSelector;
