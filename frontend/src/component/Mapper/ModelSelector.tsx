import React, {useState} from "react";
import { ChevronDown, Plug,} from "lucide-react";
import {VIRUSES} from "./virusConstants.ts";

const ModelSelector = ({ selectedModel, onModelSelect}:
                       { selectedModel: string, onModelSelect: (newModelId: string) => void}) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <span className="model-selector">
            Display&nbsp;
            <button
                className="model-selector-button"
                onClick={() => setIsOpen(!isOpen)}
            >

                {selectedModel == null ? <span>
                    <Plug className="icon" />
                <span>Data Source</span>
                </span> : <span>🦟 West Nile Susceptibility</span>}
                <ChevronDown className={`chevron ${isOpen ? 'open' : ''}`} />
            </button>

            {isOpen && (
                <div className="model-dropdown">
                    <div className="model-header">
                        <h3>Disease Models</h3>
                        <p className="model-description">
                            Select a disease model to visualize spread patterns
                        </p>
                    </div>

                    <div className="virus-list">
                        {VIRUSES.map(virus => (
                            <button
                                key={virus.id}
                                className={`virus-item ${selectedModel === virus.id ? 'selected' : ''}`}
                                onClick={() => {
                                    onModelSelect(virus.id);
                                    setIsOpen(false);
                                }}
                            >
                                <div className="virus-icon" style={{ color: virus.color }}>
                                    <virus.icon size={24} />
                                </div>
                                <div className="virus-info">
                                    <h4>{virus.title}</h4>
                                    <p>{virus.description}</p>
                                </div>
                                <span className="virus-emoji">{virus.emoji}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </span>
    );
};

export default ModelSelector;