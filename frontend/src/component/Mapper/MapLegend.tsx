import {GRADIENT_PRESETS} from "./gradientUtilities.ts";

interface MapLegendProps {
    gradientKey: string;
    minValue: number;
    maxValue: number;
    unit?: string;
}

export default ({ gradientKey, unit = '' }: MapLegendProps) => {
    const gradient = GRADIENT_PRESETS[gradientKey];
    if (!gradient) return null;

    return (
        <div className="map-legend">
            <h3 className="legend-title">{gradient.name}</h3>
            <div className="legend-items">
                {gradient.ranges.slice().reverse().map((range, index) => (
                    <div key={index} className="legend-item">
            <span
                className="legend-color"
                style={{ backgroundColor: range.color }}
            />
                        <span className="legend-label">
    {index === 0 ? '> ' : ''}{range.min}{unit}
    </span>
                    </div>
                ))}
            </div>
        </div>
    );
};