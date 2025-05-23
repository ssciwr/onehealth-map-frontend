import React from "react";

const GRADIENT_PRESETS = {
    temperature: {
        name: 'Temperature',
        ranges: [
            { min: -20, color: '#800080' },
            { min: -10, color: '#0000FF' },
            { min: 0, color: '#00FFFF' },
            { min: 10, color: '#00FF00' },
            { min: 20, color: '#FFFF00' },
            { min: 30, color: '#FFAA00' },
            { min: 40, color: '#FF0000' }
        ]
    },
    virusSpread: {
        name: 'Virus Spread',
        ranges: [
            { min: 0, color: '#00FF00' },
            { min: 20, color: '#40E0D0' },
            { min: 40, color: '#1E90FF' },
            { min: 60, color: '#9370DB' },
            { min: 80, color: '#8B008B' },
            { min: 90, color: '#4B0082' }
        ]
    },
    grayscale: {
        name: 'Grayscale',
        ranges: [
            { min: 0, color: '#FFFFFF' },
            { min: 20, color: '#E0E0E0' },
            { min: 40, color: '#A0A0A0' },
            { min: 60, color: '#606060' },
            { min: 80, color: '#303030' },
            { min: 100, color: '#000000' }
        ]
    },
    rainfall: {
        name: 'Rainfall',
        ranges: [
            { min: 0, color: '#FFFFE0' },
            { min: 50, color: '#87CEEB' },
            { min: 100, color: '#4682B4' },
            { min: 200, color: '#0000CD' },
            { min: 400, color: '#000080' },
            { min: 600, color: '#191970' }
        ]
    },
    risk: {
        name: 'Risk Level',
        ranges: [
            { min: 0, color: '#00FF00' },
            { min: 20, color: '#90EE90' },
            { min: 40, color: '#FFFF00' },
            { min: 60, color: '#FFA500' },
            { min: 80, color: '#FF4500' },
            { min: 95, color: '#DC143C' }
        ]
    }
};

// Color utility function
export const getColorFromGradient = (value: number, gradientKey: string): string => {
    const gradient = GRADIENT_PRESETS[gradientKey];
    if (!gradient) return '#cccccc';

    const ranges = gradient.ranges;
    for (let i = ranges.length - 1; i >= 0; i--) {
        if (value >= ranges[i].min) {
            return ranges[i].color;
        }
    }
    return ranges[0].color;
};