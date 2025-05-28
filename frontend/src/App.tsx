import { Routes, Route } from 'react-router-dom'
import { observer } from 'mobx-react-lite'
import './App.css'
import Overview from './pages/Overview'
import NutsMapV5 from "./component/NUTSMapper/NutsMapV5.tsx";
import ClimateMapV2 from "./component/Mapper/ClimateMapV2.tsx";
import MapWithModal from './components/MapWithModal.tsx';
import { viewingMode } from './stores/ViewingModeStore';
import MapWithExpertiseModal from "./component/Mapper/InterfaceInputs/MapWithExpertiseModal.tsx";

const App = observer(() => {
    return (
        <>
            <Routes>
                <Route path="/nuts5" element={<NutsMapV5 />} />
                <Route
                    path="/map/citizen"
                    element={
                        <ClimateMapV2
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
                        <ClimateMapV2
                            onMount={() => {
                                viewingMode.isExpert = true;
                                viewingMode.isCitizen = false;
                            }}
                        />
                    }
                />
                <Route path="/map" element={<MapWithExpertiseModal />} />
                <Route path="/" element={<ClimateMapV2 />} />
                <Route path="/OldOverview" element={<Overview />} />
            </Routes>
        </>
    )
});

export default App;