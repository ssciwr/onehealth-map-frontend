import type { DataExtremes } from "../types";
import { getRiskLevelColor } from "./AdvancedMapDataUtils.tsx";

export const getColorFromGradient = (
	value: number,
	extremes: DataExtremes,
	defaultColor = "#8b5cf6",
	nullColor = "#cccccc",
): string => {
	if (value === null || value === undefined || Number.isNaN(value)) {
		return nullColor;
	}

	if (!extremes || extremes.min === extremes.max) {
		return defaultColor;
	}

	// Use the discrete risk level colors instead of continuous gradient
	return getRiskLevelColor(value, extremes);
};
