import { Routes, Route } from 'react-router-dom'
import './App.css'
import Overview from './pages/Overview'
import GlobalMapGrid from "./component/GlobalMapGrid.tsx";
import GlobalMapCanvasOverlay from "./component/GlobalMapCanvasOverlay.tsx";
import NutsMapComponent from "./component/NUTSMapper/NutsMapComponent.tsx";
import NutsMapV2 from "./component/NUTSMapper/NutsMapV2.tsx";
import RealNutsMapComponent from "./component/NUTSMapper/RealNutsMapComponent.tsx";

function App() {
    return (
        <>
            <Routes>
                <Route path="/" element={<Overview />} />
                <Route path="/about" element={<div>The project...</div>} />
                <Route path="/grid" element={<GlobalMapGrid />} />
                <Route path="/gridcanvas" element={<GlobalMapCanvasOverlay />} />
                <Route path="/nuts" element={<NutsMapComponent nutsLevel='2'
                       nutsDataUrl="https://gisco-services.ec.europa.eu/distribution/v2/nuts/geojson/NUTS_RG_60M_2024_3857_LEVL_2.geojson" />} />
                <Route path="/nuts2" element={<NutsMapV2 nutsLevel='2'
                                                               nutsDataUrl="https://gisco-services.ec.europa.eu/distribution/v2/nuts/geojson/NUTS_RG_60M_2024_3857_LEVL_2.geojson" />} />
                <Route path="/realnuts" element={<RealNutsMapComponent nutsLevel='2' />} />
            </Routes>
        </>
    )
}

// <Route path="/vega" element={<GlobalMapVega />} />
export default App
