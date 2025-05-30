import {ProcessingStats, ViewportBounds} from "./types.ts";

export default ({ stats, temperatureDataCount, currentResolution, viewport } :
{ stats: ProcessingStats, temperatureDataCount: number, currentResolution: number, viewport: ViewportBounds}) => {
    return (
        <div className="stats-panel">
            {stats.processed > 0 && (
                <div className="stat-section">
                    <h3>NUTS Processing</h3>
                    <div className="stat-item">
                        <span className="stat-label">Regions processed:</span>
                        <span className="stat-value">{stats.processed}</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-label">Regions skipped:</span>
                        <span className="stat-value">{stats.skipped}</span>
                    </div>
                    {stats.errors > 0 && (
                        <div className="stat-item error">
                            <span className="stat-label">Errors:</span>
                            <span className="stat-value">{stats.errors}</span>
                        </div>
                    )}
                </div>
            )}

            <div className="stat-section">
                <h3>Grid Data</h3>
                <div className="stat-item">
                    <span className="stat-label">Temperature points:</span>
                    <span className="stat-value">{temperatureDataCount}</span>
                </div>
                {viewport && (
                    <div className="stat-item">
                        <span className="stat-label">Resolution:</span>
                        <span className="stat-value">Level {currentResolution}</span>
                    </div>
                )}
            </div>
        </div>
    );
};