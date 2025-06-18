import type React from "react";
import { isMobile } from "react-device-detect";

interface LineChartProps {
	data: Record<string | number, number>;
	width?: number;
	height?: number;
}

/** An AI generated line chart implementation, because A) the ant-design-charts library that goes with our UI library
 * is way too large to make sense for just one chart type, B) the white background we use keeps this quite simple.
 * @param data
 * @param width
 * @param height
 * @constructor
 */
const SimpleLineChart: React.FC<LineChartProps> = ({
	data,
	width = isMobile ? 370 : 500,
	height = 500,
}) => {
	const padding = 90;
	const chartWidth = width - padding * 2;
	const chartHeight = height - padding * 2;

	const entries = Object.entries(data);
	const values = entries.map(([, value]) => value);
	const labels = entries.map(([key]) => key.toString());

	const maxValue = Math.max(...values);
	const minValue = Math.min(...values);
	const range = maxValue - minValue || 1;

	// Generate Y-axis ticks
	const tickCount = 5;
	const yTicks = Array.from({ length: tickCount }, (_, i) => {
		const value = minValue + (range * i) / (tickCount - 1);
		return {
			value: Math.round(value * 100) / 100,
			y: padding + chartHeight - ((value - minValue) / range) * chartHeight,
		};
	});

	const points = values.map((value, index) => ({
		x: padding + (index / (values.length - 1)) * chartWidth,
		y: padding + chartHeight - ((value - minValue) / range) * chartHeight,
	}));

	const pathData = points.reduce((path, point, index) => {
		return (
			path +
			(index === 0 ? `M ${point.x} ${point.y}` : ` L ${point.x} ${point.y}`)
		);
	}, "");

	return (
		<svg
			width={width}
			height={height}
			className="border border-gray-200 rounded bg-white"
			style={{ marginLeft: isMobile ? "-12px" : "0px" }}
			role="img"
			aria-label="Line chart showing data values over time"
		>
			<title>Line Chart</title>
			<defs>
				<pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
					<path
						d="M 40 0 L 0 0 0 40"
						fill="none"
						stroke="#f3f4f6"
						strokeWidth="1"
					/>
				</pattern>
			</defs>

			<rect
				x={padding}
				y={padding}
				width={chartWidth}
				height={chartHeight}
				fill="url(#grid)"
			/>

			<line
				x1={padding}
				y1={padding}
				x2={padding}
				y2={padding + chartHeight}
				stroke="#374151"
				strokeWidth="2"
			/>
			<line
				x1={padding}
				y1={padding + chartHeight}
				x2={padding + chartWidth}
				y2={padding + chartHeight}
				stroke="#374151"
				strokeWidth="2"
			/>

			{/* Y-axis title */}
			<text
				x={20}
				y={padding + chartHeight / 2}
				textAnchor="middle"
				transform={`rotate(-90, 20, ${padding + chartHeight / 2})`}
				className="text-sm fill-gray-700 font-medium"
			>
				Values
			</text>

			{/* Y-axis ticks and labels */}
			{yTicks.map((tick) => (
				<g key={`y-tick-${tick.value}`}>
					<line
						x1={padding - 5}
						y1={tick.y}
						x2={padding}
						y2={tick.y}
						stroke="#374151"
						strokeWidth="1"
					/>
					<text
						x={padding - 10}
						y={tick.y + 4}
						textAnchor="end"
						className="text-xs fill-gray-600"
					>
						{tick.value}
					</text>
				</g>
			))}

			{labels.map((label, index) => (
				<text
					key={`x-label-${label}`}
					x={padding + (index / (values.length - 1)) * chartWidth}
					y={padding + chartHeight + 20}
					textAnchor="middle"
					className="text-xs fill-gray-600"
				>
					{label}
				</text>
			))}

			<path
				d={pathData}
				fill="none"
				stroke="#3b82f6"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>

			{points.map((point) => (
				<circle
					key={`point-${point.x}-${point.y}`}
					cx={point.x}
					cy={point.y}
					r="4"
					fill="#3b82f6"
					stroke="white"
					strokeWidth="2"
				/>
			))}
		</svg>
	);
};

export default SimpleLineChart;
