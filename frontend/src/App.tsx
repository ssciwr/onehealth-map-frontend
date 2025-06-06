import { observer } from "mobx-react-lite";
import { Route, Routes } from "react-router-dom";
import "./App.css";
import ClimateMap from "./component/Mapper/ClimateMap.tsx";
import MapWithExpertiseModal from "./component/Mapper/InterfaceInputs/MapWithExpertiseModal.tsx";
import NotFound from "./pages/NotFound.tsx";
import Overview from "./pages/Overview";
import { viewingMode } from "./stores/ViewingModeStore";

const App = observer(() => {
	/*

    Note if you edit these routes: The order matters. An earlier matching route can match what you really intended
    a later route to match. that is why the not found and / route are last.

     */
	return (
		<>
			<Routes>
				<Route
					path="/map/citizen"
					element={
						<ClimateMap
							onMount={() => {
								viewingMode.isCitizen = true;
								viewingMode.isExpert = false;
								return true;
							}}
						/>
					}
				/>
				<Route
					path="/map/expert"
					element={
						<ClimateMap
							onMount={() => {
								viewingMode.isExpert = true;
								viewingMode.isCitizen = false;
								return true;
							}}
						/>
					}
				/>
				<Route path="/map" element={<MapWithExpertiseModal />} />
				<Route path="/OldOverview" element={<Overview />} />
				<Route path="/" element={<ClimateMap />} />
				<Route path="*" element={<NotFound />} />
			</Routes>
		</>
	);
});

export default App;
