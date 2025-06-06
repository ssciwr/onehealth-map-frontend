import { Space } from "antd";
import { BarChart3, ChevronDown, Info, Plug, TrendingUp } from "lucide-react";
import { computed } from "mobx";
import { observer } from "mobx-react-lite";
import React, { useMemo, useState } from "react";
import { viewingMode } from "../../../stores/ViewingModeStore.ts";

const OptimismLevelSelector = observer(
	({
		availableOptimismLevels,
		selectedOptimism,
		setOptimism,
	}: {
		availableOptimismLevels: Array<string>;
		selectedOptimism: string;
		setOptimism: (newOptimismLevel: string) => void;
	}) => {
		const [isOpen, setIsOpen] = useState(false);

		// Use MobX computed for the MobX observable part, wrapped in useMemo for React props, so pre-commit doesn't complain
		// about viewingMode.isExpert (which it felt was not a dependency, even though removing it broke this code :P)
		const OPTIMISM_LEVELS = useMemo(
			() =>
				computed(() => [
					{
						id: "pessimistic",
						title: "Pessimistic",
						description: "Conservative estimates with worst-case scenarios",
						emoji: "📉",
						icon: TrendingUp,
						color: "#DE350B",
					},
					{
						id: "realistic",
						title: viewingMode.isExpert ? "Normative" : "Realistic",
						description: "Balanced projections based on current trends",
						emoji: "📊",
						icon: BarChart3,
						color: "#0052CC",
					},
					{
						id: "optimistic",
						title: "Optimistic",
						description: "Best-case scenarios with favorable conditions",
						emoji: "📈",
						icon: TrendingUp,
						color: "#36B37E",
					},
				]),
			[],
		).get();

		const filteredLevels = useMemo(
			() =>
				OPTIMISM_LEVELS.filter((level) =>
					availableOptimismLevels.includes(level.id),
				),
			[OPTIMISM_LEVELS, availableOptimismLevels],
		);

		const selectedLevel = OPTIMISM_LEVELS.find(
			(level) => level.id === selectedOptimism,
		);

		return (
			<span className="model-selector">
				<button
					type="button"
					className="model-selector-button"
					onClick={() => setIsOpen(!isOpen)}
				>
					<Space>
						<BarChart3 className="icon" />
						<span>{selectedLevel?.title || "Select Level"}</span>
						<ChevronDown className={`chevron ${isOpen ? "open" : ""}`} />
					</Space>
				</button>
				&nbsp;predictions
				{isOpen && (
					<div className="model-dropdown">
						<div className="model-header">
							<h3>Optimism Levels</h3>
							<p className="model-description">
								Select a scenario level to adjust model predictions
							</p>
						</div>

						<div className="virus-list">
							{filteredLevels.map((level) => (
								<button
									type="button"
									key={level.id}
									className={`virus-item ${selectedOptimism === level.id ? "selected" : ""}`}
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
	},
);

export default OptimismLevelSelector;
