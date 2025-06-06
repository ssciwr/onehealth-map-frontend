import { CalendarOutlined } from "@ant-design/icons";
import { Select, Slider, Tooltip, Typography } from "antd";
import type React from "react";
import { isMobile } from "react-device-detect";
import GeneralCard from "../../Multiuse/GeneralCard.tsx";

const { Text } = Typography;
const { Option } = Select;

interface AntdTimelineSelectorProps {
	year: number;
	month: number;
	onYearChange: (value: number) => void;
	onMonthChange: (value: number) => void;
}

const TimelineSelector: React.FC<AntdTimelineSelectorProps> = ({
	year,
	month,
	onYearChange,
	onMonthChange,
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

	// Generate year options for mobile dropdown
	const yearOptions = [];
	for (let y = 1960; y <= 2100; y++) {
		yearOptions.push(y);
	}

	const mobileContainerStyle: React.CSSProperties = {
		position: "fixed",
		bottom: "40px",
		left: "50%",
		transform: "translateX(-50%)",
		zIndex: 500,
	};

	const containerStyle = isMobile ? mobileContainerStyle : {};

	return (
		<div style={containerStyle}>
			<GeneralCard
				style={
					isMobile
						? {
								minWidth: "85vw",
								backgroundColor: "rgba(255,255,255,0.3)",
								border: "0",
							}
						: {}
				}
			>
				<div style={{ width: "100%" }}>
					{isMobile === false && (
						<Text
							type="secondary"
							style={{ fontSize: 12, marginBottom: 8, display: "block" }}
						>
							Year: {year}
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
									style={{ width: "100%" }}
									placeholder="Select Year"
									className={isMobile ? "light-box-shadow" : ""}
									showSearch
									filterOption={(input, option) =>
										option?.children
											?.toString()
											.toLowerCase()
											.includes(input.toLowerCase()) ?? false
									}
								>
									{yearOptions.map((yearOption) => (
										<Option key={yearOption} value={yearOption}>
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

						{/* Month selector */}
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
						</Select>
					</div>
				</div>
			</GeneralCard>
		</div>
	);
};

export default TimelineSelector;
