/**
 * Utilities for calculating the different gradients on the map. Like similar projects, we may want to use
 * Blue-Yellow-Red rather than a simple Blue-Red, to increase contrast, particularly in parts of the map where
 * changes have high implications, but can be hard to see on a simple two color gradient.
 */

interface ExtremePoints {
	min: number;
	max: number;
}

interface RGBColor {
	r: number;
	g: number;
	b: number;
}

/**
 * Converts a hex color string to RGB values
 * @param hex - Hex color string (e.g., "#FF0000" or "FF0000")
 * @returns RGB color object
 */
function hexToRgb(hex: string): RGBColor {
	// Remove # if present and ensure uppercase
	const cleanHex = hex.replace("#", "").toUpperCase();

	// Validate hex format
	if (!/^[0-9A-F]{6}$/.test(cleanHex)) {
		throw new Error(`Invalid hex color format: ${hex}`);
	}

	return {
		r: Number.parseInt(cleanHex.slice(0, 2), 16),
		g: Number.parseInt(cleanHex.slice(2, 4), 16),
		b: Number.parseInt(cleanHex.slice(4, 6), 16),
	};
}

/**
 * Converts RGB values to hex color string
 * @param rgb - RGB color object
 * @returns Hex color string with # prefix
 */
function rgbToHex(rgb: RGBColor): string {
	const toHex = (value: number): string => {
		const hex = Math.round(Math.max(0, Math.min(255, value))).toString(16);
		return hex.length === 1 ? `0${hex}` : hex;
	};

	return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`.toUpperCase();
}

/**
 * Interpolates between two colors based on a value's position within a range
 * @param value - The value to map to a color
 * @param extremePoints - Object containing min and max values for the range
 * @param minColor - Hex color for the minimum value
 * @param maxColor - Hex color for the maximum value
 * @returns Interpolated hex color string
 */
export const getColorFromGradient = (
	value: number,
	extremePoints: ExtremePoints,
	minColor: string,
	maxColor: string,
): string => {
	if (typeof value !== "number" || !Number.isFinite(value)) {
		throw new Error("Value must be a finite number");
	}

	if (
		!extremePoints ||
		typeof extremePoints.min !== "number" ||
		typeof extremePoints.max !== "number"
	) {
		throw new Error("ExtremePoints must contain valid min and max numbers");
	}

	if (!minColor || !maxColor) {
		throw new Error("Both minColor and maxColor must be provided");
	}

	const { min, max } = extremePoints;

	if (min === max) {
		return minColor;
	}

	const clampedValue = Math.max(min, Math.min(max, value));

	const factor = (clampedValue - min) / (max - min);

	const minRgb = hexToRgb(minColor);
	const maxRgb = hexToRgb(maxColor);

	const interpolatedRgb: RGBColor = {
		r: minRgb.r + (maxRgb.r - minRgb.r) * factor,
		g: minRgb.g + (maxRgb.g - minRgb.g) * factor,
		b: minRgb.b + (maxRgb.b - minRgb.b) * factor,
	};

	// Convert back to hex and return
	return rgbToHex(interpolatedRgb);
};
