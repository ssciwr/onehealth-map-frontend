// gradientUtilities.ts
// Color gradient definitions and utilities for map visualization

export interface GradientRange {
    min: number;
    color: string;
}

export interface GradientPreset {
    name: string;
    ranges: GradientRange[];
    unit?: string;
}

export const GRADIENT_PRESETS: Record<string, GradientPreset> = {
    temperature: {
        name: 'Temperature',
        unit: '°C',
        ranges: [
            { min: -20, color: '#800080' }, // Purple (very cold)
            { min: -10, color: '#0000FF' }, // Blue
            { min: 0, color: '#00FFFF' },   // Cyan
            { min: 10, color: '#00FF00' },  // Green
            { min: 20, color: '#FFFF00' },  // Yellow
            { min: 30, color: '#FFAA00' },  // Orange
            { min: 40, color: '#FF0000' }   // Red (very hot)
        ]
    },
    virusSpread: {
        name: 'Virus Spread Intensity',
        unit: '%',
        ranges: [
            { min: 0, color: '#00FF00' },   // Green (low spread)
            { min: 20, color: '#40E0D0' },  // Turquoise
            { min: 40, color: '#1E90FF' },  // Dodger Blue
            { min: 60, color: '#9370DB' },  // Medium Purple
            { min: 80, color: '#8B008B' },  // Dark Magenta
            { min: 90, color: '#4B0082' }   // Indigo (high spread)
        ]
    },
    grayscale: {
        name: 'Grayscale',
        ranges: [
            { min: 0, color: '#FFFFFF' },   // White
            { min: 20, color: '#E0E0E0' },
            { min: 40, color: '#A0A0A0' },
            { min: 60, color: '#606060' },
            { min: 80, color: '#303030' },
            { min: 100, color: '#000000' }  // Black
        ]
    },
    rainfall: {
        name: 'Rainfall',
        unit: 'mm',
        ranges: [
            { min: 0, color: '#FFFFE0' },   // Light Yellow (dry)
            { min: 50, color: '#87CEEB' },  // Sky Blue
            { min: 100, color: '#4682B4' }, // Steel Blue
            { min: 200, color: '#0000CD' }, // Medium Blue
            { min: 400, color: '#000080' }, // Navy
            { min: 600, color: '#191970' }  // Midnight Blue (wet)
        ]
    },
    risk: {
        name: 'Risk Level',
        unit: '%',
        ranges: [
            { min: 0, color: '#00FF00' },   // Green (low risk)
            { min: 20, color: '#90EE90' },  // Light Green
            { min: 40, color: '#FFFF00' },  // Yellow
            { min: 60, color: '#FFA500' },  // Orange
            { min: 80, color: '#FF4500' },  // Orange Red
            { min: 95, color: '#DC143C' }   // Crimson (high risk)
        ]
    },
    humidity: {
        name: 'Humidity',
        unit: '%',
        ranges: [
            { min: 0, color: '#FFEBCD' },   // Blanched Almond (dry)
            { min: 20, color: '#F0E68C' },  // Khaki
            { min: 40, color: '#87CEEB' },  // Sky Blue
            { min: 60, color: '#4682B4' },  // Steel Blue
            { min: 80, color: '#1E90FF' },  // Dodger Blue
            { min: 95, color: '#0000CD' }   // Medium Blue (humid)
        ]
    }
};

/**
 * Get color from gradient based on value
 * @param value - The numeric value to map to a color
 * @param gradientKey - The key of the gradient preset to use
 * @returns Hex color string
 */
export function getColorFromGradient(value: number, gradientKey: string): string {
    const gradient = GRADIENT_PRESETS[gradientKey];
    if (!gradient) return '#cccccc'; // Default gray for unknown gradients

    const ranges = gradient.ranges;

    // Find the appropriate color range
    for (let i = ranges.length - 1; i >= 0; i--) {
        if (value >= ranges[i].min) {
            return ranges[i].color;
        }
    }

    // Return the first color if value is below all ranges
    return ranges[0].color;
}

/**
 * Interpolate color between two hex colors
 * @param color1 - First hex color
 * @param color2 - Second hex color
 * @param factor - Interpolation factor (0-1)
 * @returns Interpolated hex color
 */
export function interpolateColor(color1: string, color2: string, factor: number): string {
    const hex2rgb = (hex: string) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
    };

    const rgb2hex = (r: number, g: number, b: number) => {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    };

    const c1 = hex2rgb(color1);
    const c2 = hex2rgb(color2);

    const r = Math.round(c1.r + (c2.r - c1.r) * factor);
    const g = Math.round(c1.g + (c2.g - c1.g) * factor);
    const b = Math.round(c1.b + (c2.b - c1.b) * factor);

    return rgb2hex(r, g, b);
}

/**
 * Get smooth color from gradient with interpolation
 * @param value - The numeric value to map to a color
 * @param gradientKey - The key of the gradient preset to use
 * @returns Hex color string with smooth interpolation
 */
export function getSmoothColorFromGradient(value: number, gradientKey: string): string {
    const gradient = GRADIENT_PRESETS[gradientKey];
    if (!gradient) return '#cccccc';

    const ranges = gradient.ranges;

    // Find the two ranges to interpolate between
    for (let i = 0; i < ranges.length - 1; i++) {
        if (value >= ranges[i].min && value < ranges[i + 1].min) {
            const range = ranges[i + 1].min - ranges[i].min;
            const factor = (value - ranges[i].min) / range;
            return interpolateColor(ranges[i].color, ranges[i + 1].color, factor);
        }
    }

    // Handle edge cases
    if (value < ranges[0].min) return ranges[0].color;
    if (value >= ranges[ranges.length - 1].min) return ranges[ranges.length - 1].color;

    return '#cccccc';
}

/**
 * Generate CSS gradient string for background
 * @param gradientKey - The key of the gradient preset to use
 * @param direction - CSS gradient direction (default: 'to bottom')
 * @returns CSS gradient string
 */
export function generateCSSGradient(gradientKey: string, direction: string = 'to bottom'): string {
    const gradient = GRADIENT_PRESETS[gradientKey];
    if (!gradient) return 'linear-gradient(to bottom, #cccccc, #cccccc)';

    const colors = gradient.ranges.map(range => range.color).join(', ');
    return `linear-gradient(${direction}, ${colors})`;
}

/**
 * Get the appropriate gradient key based on data type
 * @param dataType - Type of data being visualized
 * @returns Gradient key
 */
export function getGradientForDataType(dataType: string): string {
    const dataTypeGradientMap: Record<string, string> = {
        temperature: 'temperature',
        temp: 'temperature',
        t2m: 'temperature',
        rainfall: 'rainfall',
        precipitation: 'rainfall',
        humidity: 'humidity',
        rh: 'humidity',
        virus: 'virusSpread',
        outbreak: 'virusSpread',
        risk: 'risk',
        susceptibility: 'risk'
    };

    return dataTypeGradientMap[dataType.toLowerCase()] || 'grayscale';
}