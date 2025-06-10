interface ExtremePoints {
	min: number;
	max: number;
}

interface RGBColor {
	r: number;
	g: number;
	b: number;
}

function hexToRgb(hex: string): RGBColor {
	const cleanHex = hex.replace("#", "").toUpperCase();

	if (!/^[0-9A-F]{6}$/.test(cleanHex)) {
		throw new Error(`Invalid hex color format: ${hex}`);
	}

	return {
		r: Number.parseInt(cleanHex.slice(0, 2), 16),
		g: Number.parseInt(cleanHex.slice(2, 4), 16),
		b: Number.parseInt(cleanHex.slice(4, 6), 16),
	};
}

function rgbToHex(rgb: RGBColor): string {
	const toHex = (value: number): string => {
		const hex = Math.round(Math.max(0, Math.min(255, value))).toString(16);
		return hex.length === 1 ? `0${hex}` : hex;
	};

	return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`.toUpperCase();
}

export const getColorFromGradient = (
	value: number,
	extremePoints: ExtremePoints,
	minColor?: string,
	maxColor?: string,
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

	const { min, max } = extremePoints;

	if (min === max) {
		return minColor || "#537bcc";
	}

	const clampedValue = Math.max(min, Math.min(max, value));
	const factor = (clampedValue - min) / (max - min);

	if (!minColor || !maxColor) {
		const blueRgb = hexToRgb("#537bcc");
		const yellowRgb = hexToRgb("#FFFB00");
		const redRgb = hexToRgb("#f63f1f");

		if (factor <= 0.5) {
			const localFactor = factor * 2;
			const interpolatedRgb: RGBColor = {
				r: blueRgb.r + (yellowRgb.r - blueRgb.r) * localFactor,
				g: blueRgb.g + (yellowRgb.g - blueRgb.g) * localFactor,
				b: blueRgb.b + (yellowRgb.b - blueRgb.b) * localFactor,
			};
			return rgbToHex(interpolatedRgb);
		}
		const localFactor = (factor - 0.5) * 2;
		const interpolatedRgb: RGBColor = {
			r: yellowRgb.r + (redRgb.r - yellowRgb.r) * localFactor,
			g: yellowRgb.g + (redRgb.g - yellowRgb.g) * localFactor,
			b: yellowRgb.b + (redRgb.b - yellowRgb.b) * localFactor,
		};
		return rgbToHex(interpolatedRgb);
	}

	const minRgb = hexToRgb(minColor);
	const maxRgb = hexToRgb(maxColor);

	const interpolatedRgb: RGBColor = {
		r: minRgb.r + (maxRgb.r - minRgb.r) * factor,
		g: minRgb.g + (maxRgb.g - minRgb.g) * factor,
		b: minRgb.b + (maxRgb.b - minRgb.b) * factor,
	};

	return rgbToHex(interpolatedRgb);
};
