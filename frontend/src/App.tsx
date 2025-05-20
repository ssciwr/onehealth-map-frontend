import { Routes, Route } from 'react-router-dom'
import './App.css'
import Overview from './pages/Overview'
import NutsMapV5 from "./component/NUTSMapper/NutsMapV5.tsx";
/*
import GridMapper4 from "./component/GridMapper/GridMapper4.tsx";
<Route path="/countries" element={<GridMapper4 />} />
 */
import ClimateMapV2 from "./component/Mapper/ClimateMapV2.tsx";

function App() {
    return (
        <>
            <Routes>
                <Route path="/nuts5" element={<NutsMapV5 />} />
                <Route path="/" element={<ClimateMapV2 />} />
                <Route path="/OldOverview" element={<Overview />} />
            </Routes>
        </>
    )
}

export default App
