import { CalendarOutlined } from "@ant-design/icons";
import { Select, Slider, Tooltip, Typography } from "antd";
import type { ReactNode } from "react";
import { isMobile } from "react-device-detect";
import { viewingMode } from "../../../stores/ViewingModeStore.ts";
import GeneralCard from "../../Multiuse/GeneralCard.tsx";

const { Text } = Typography;
const { Option } = Select;

interface AntdTimelineSelectorProps {
	year: number;
	month: number;
	onYearChange: (value: number) => void;
	onMonthChange: (value: number) => void;
	legend?: ReactNode;
}

const TimelineSelector: React.FC<AntdTimelineSelectorProps> = ({
	year,
	month,
	onYearChange,
	onMonthChange,
	legend,
}) => {
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

	const yearOptions = [];
	for (let y = 1960; y <= 2100; y++) {
		yearOptions.push(y);
	}

	const mobileContainerStyle: React.CSSProperties = {
		position: "fixed",
		bottom: "0em",
		left: "50%",
		transform: "translateX(-50%)",
		zIndex: 500,
	};

	const containerStyle = isMobile ? mobileContainerStyle : { zIndex: 500 };

	return (
		<div style={containerStyle} data-testid="timeline-selector">
			<GeneralCard
				style={
					isMobile
						? {
								minWidth: "85vw",
								backgroundColor: "rgba(255,255,255,0.8)",
								border: "0",
							}
						: { minWidth: "91vw" }
				}
				bodyStyle={{ padding: "10px 24px" }}
			>
				<div
					style={
						viewingMode.isExpert
							? {
									backgroundColor: "white",
									padding: "12px 8px",
									borderRadius: "10px",
								}
							: {}
					}
				>
					<div style={{ width: "100%" }}>
						{1 === 2 && (
							<Text hidden style={{ fontSize: 24, display: "block" }}>
								{year}
							</Text>
						)}

						<div
							style={{
								display: "flex",
								alignItems: "center",
								gap: 16,
								width: "100%",
							}}
						>
							{/* Year input - slider on desktop, dropdown on mobile */}
							<div style={{ flex: 1, paddingRight: "10px" }}>
								{isMobile ? (
									<Select
										value={year}
										onChange={onYearChange}
										style={{
											width: "100%",
											height: "50px",
											fontWeight: "600",
											textAlign: "center",
										}}
										placeholder="Select Year"
										className={isMobile ? "light-box-shadow" : ""}
										showSearch
										size="large"
										filterOption={(input, option) =>
											option?.children
												?.toString()
												.toLowerCase()
												.includes(input.toLowerCase()) ?? false
										}
									>
										{yearOptions.map((yearOption) => (
											<Option
												style={{ background: "translucent" }}
												key={yearOption}
												value={yearOption}
											>
												{yearOption}
											</Option>
										))}
									</Select>
								) : (
									<Tooltip title={year}>
										<Slider
											value={year}
											min={1960}
											max={2100}
											marks={marks}
											included={false}
											onChange={onYearChange}
											trackStyle={{ background: "transparent" }}
											railStyle={{ background: "#d9d9d9" }}
											handleStyle={{
												borderColor: "#1890ff",
												backgroundColor: "#1890ff",
												boxShadow: "0 2px 6px rgba(24, 144, 255, 0.3)",
											}}
											style={{ width: "100%" }}
										/>
									</Tooltip>
								)}
							</div>

							{/* Month selector
							<Select
								value={month}
								onChange={onMonthChange}
								style={{ minWidth: 140, flexShrink: 0 }}
								suffixIcon={<CalendarOutlined />}
							>
								{months.map((monthName, index) => (
									<Option key={index.toString() + monthName} value={index + 1}>
										{monthName}
									</Option>
								))}
							</Select>*/}
						</div>
					</div>

					{/* Legend appears below on mobile only */}
					{isMobile && (
						<div
							style={{
								display: "flex",
								alignItems: "center",
								gap: 16,
								width: "100%",
							}}
						>
							{legend}
						</div>
					)}
				</div>
			</GeneralCard>
		</div>
	);
};

export default TimelineSelector;
