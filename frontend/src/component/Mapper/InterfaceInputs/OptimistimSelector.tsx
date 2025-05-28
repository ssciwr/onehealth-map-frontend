import React, { useState, useEffect, useMemo } from "react";
import { ChevronDown, TrendingUp, BarChart3, Info } from "lucide-react";
import { observer } from 'mobx-react-lite';
import { viewingMode } from "../../../stores/ViewingModeStore.ts";

const OptimismLevelSelector = observer(({ availableOptimismLevels, selectedOptimism, setOptimism } : {
    availableOptimismLevels: Array<string>, selectedOptimism: string, setOptimism: (newOptimismLevel: string) => void;
}) => {
    const [isOpen, setIsOpen] = useState(false);

    // Define OPTIMISM_LEVELS with reactive title based on viewingMode
    const OPTIMISM_LEVELS = useMemo(() => [
        {
            id: 'pessimistic',
            title: 'Pessimistic',
            description: 'Conservative estimates with worst-case scenarios',
            emoji: '📉',
            icon: TrendingUp,
            color: '#DE350B'
        },
        {
            id: 'realistic',
            title: viewingMode.isExpert ? "Normative" : "Realistic",
            description: 'Balanced projections based on current trends',
            emoji: '📊',
            icon: BarChart3,
            color: '#0052CC'
        },
        {
            id: 'optimistic',
            title: 'Optimistic',
            description: 'Best-case scenarios with favorable conditions',
            emoji: '📈',
            icon: TrendingUp,
            color: '#36B37E'
        }
    ], [viewingMode.isExpert, viewingMode.isCitizen]);

    // Filter available levels based on what's passed in - also reactive
    const filteredLevels = useMemo(() =>
        OPTIMISM_LEVELS.filter(level =>
            availableOptimismLevels.includes(level.id)
        ), [OPTIMISM_LEVELS, availableOptimismLevels]
    );

    const selectedLevel = OPTIMISM_LEVELS.find(level => level.id === selectedOptimism);

    return (
        <span className="model-selector">
            <button
                className="model-selector-button"
                onClick={() => setIsOpen(!isOpen)}
            >
                <BarChart3 className="icon" />
                <span>{selectedLevel?.title || 'Select Level'}</span>
                <ChevronDown className={`chevron ${isOpen ? 'open' : ''}`} />
            </button>&nbsp;predictions

            {isOpen && (
                <div className="model-dropdown">
                    <div className="model-header">
                        <h3>Optimism Levels</h3>
                        <p className="model-description">
                            Select a scenario level to adjust model predictions
                        </p>
                    </div>

                    <div className="virus-list">
                        {filteredLevels.map(level => (
                            <button
                                key={level.id}
                                className={`virus-item ${selectedOptimism === level.id ? 'selected' : ''}`}
                                onClick={() => {
                                    setOptimism(level.id);
                                    setIsOpen(false);
                                }}
                            >
                                <div className="virus-icon" style={{ color: level.color }}>
                                    <level.icon size={24} />
                                </div>
                                <div className="virus-info">
                                    <h4>{level.title}</h4>
                                    <p>{level.description}</p>
                                </div>
                                <span className="virus-emoji">{level.emoji}</span>
                            </button>
                        ))}
                    </div>

                    <div className="model-footer">
                        <Info className="icon" />
                        <span>Adjust prediction confidence levels</span>
                    </div>
                </div>
            )}
        </span>
    );
});

export default OptimismLevelSelector;