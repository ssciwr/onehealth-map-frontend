import { Routes, Route } from 'react-router-dom'
import './App.css'
import Overview from './pages/Overview'
import GlobalMapGrid from "./component/GlobalMapGrid.tsx";
import GlobalMapCanvasOverlay from "./component/GlobalMapCanvasOverlay.tsx";
import NutsMapComponent from "./component/NUTSMapper/NutsMapComponent.tsx";
import NutsMapV2 from "./component/NUTSMapper/NutsMapV2.tsx";
import RealNutsMapComponent from "./component/NUTSMapper/RealNutsMapComponent.tsx";
import NutsMapV5 from "./component/NUTSMapper/NutsMapV5.tsx";

function App() {
    return (
        <>
            <Routes>
                <Route path="/" element={<Overview />} />
                <Route path="/nuts5" element={<NutsMapV5 nutsLevel='2' />} />
            </Routes>
        </>
    )
}

// <Route path="/vega" element={<GlobalMapVega />} />
export default App
