import { computed } from "mobx";
import { observer } from "mobx-react-lite";
import { useMemo } from "react";
import { viewingMode } from "../../../stores/ViewingModeStore.ts";
import Selector from "../../General/Selector.tsx";

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
						color: "#DE350B",
					},
					{
						id: "realistic",
						title: viewingMode.isExpert ? "Normative" : "Realistic",
						description: "Balanced projections based on current trends",
						emoji: "📊",
						color: "#0052CC",
					},
					{
						id: "optimistic",
						title: "Optimistic",
						description: "Best-case scenarios with favorable conditions",
						emoji: "📈",
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
			<span data-testid="optimism-selector">
				<Selector
					items={filteredLevels}
					selectedId={selectedOptimism}
					onSelect={setOptimism}
					title="Optimism Levels"
					description="Select a scenario level to adjust model predictions"
					buttonText={selectedLevel?.title || "Select Level"}
					footerText="Adjust prediction confidence levels"
					className="header-font-size"
				/>
				&nbsp;predictions
			</span>
		);
	},
);

export default OptimismLevelSelector;
