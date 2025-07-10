import type { DataExtremes } from "../types";
import { getColorFromGradient as getGradientColor } from "./gradientUtilities";

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
	return getGradientColor(value, { min: extremes.min, max: extremes.max });
};
