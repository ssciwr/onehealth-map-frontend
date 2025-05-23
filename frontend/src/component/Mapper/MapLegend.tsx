// Legend Component
import {GRADIENT_PRESETS} from "./gradientUtilities.ts";

// currently unused, should go on the right side of the map so theuser can scroll.
export default ({ gradientKey, minValue, maxValue, unit = '' }) => {
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