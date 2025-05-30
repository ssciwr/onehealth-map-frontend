import { Routes, Route } from 'react-router-dom'
import { observer } from 'mobx-react-lite'
import './App.css'
import Overview from './pages/Overview'
import NutsMapV5 from "./component/NUTSMapper/NutsMapV5.tsx";
import EnhancedClimateMap from "./component/Mapper/EnhancedClimateMap.tsx";
import { viewingMode } from './stores/ViewingModeStore';
import MapWithExpertiseModal from "./component/Mapper/InterfaceInputs/MapWithExpertiseModal.tsx";
import NotFound from "./pages/NotFound.tsx";

const App = observer(() => {

    /*

    Note if you edit these routes: The order matters. An earlier matching route can match what you really intended
    a later route to match. that is why the not found and / route are last.

     */
    return (
        <>
            <Routes>
                <Route path="/nuts5" element={<NutsMapV5 />} />
                <Route
                    path="/map/citizen"
                    element={
                        <EnhancedClimateMap
                            onMount={() => {
                                viewingMode.isCitizen = true;
                                viewingMode.isExpert = false;
                            }}
                        />
                    }
                />
                <Route
                    path="/map/expert"
                    element={
                        <EnhancedClimateMap
                            onMount={() => {
                                viewingMode.isExpert = true;
                                viewingMode.isCitizen = false;
                            }}
                        />
                    }
                />
                <Route
                    path="/map/third"
                    element={
                        <EnhancedClimateMap />
                    }
                />
                <Route path="/map" element={<MapWithExpertiseModal />} />
                <Route path="/OldOverview" element={<Overview />} />
                <Route path="/" element={<EnhancedClimateMap />} />
                <Route path="*" element={<NotFound />} />
            </Routes>
        </>
    )
});

export default App;