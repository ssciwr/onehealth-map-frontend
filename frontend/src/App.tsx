import { Routes, Route } from 'react-router-dom'
import './App.css'
import Overview from './pages/Overview'
import NutsMapV5 from "./component/NUTSMapper/NutsMapV5.tsx";
import GridMap from "./component/GridMapper/GridMap.tsx";
import AltMap from "./component/GridMapper/AltMap.tsx";
import OtherMap from "./component/GridMapper/OtherMap.tsx";
import GridMapEarlier from "./component/GridMapper/GridMapEarlier.tsx";
import GridMapperEarly from "./component/GridMapper/GridMapperEarly.tsx";
import GridMapper4 from "./component/GridMapper/GridMapper4.tsx";

function App() {
    return (
        <>
            <Routes>
                <Route path="/" element={<Overview />} />
                <Route path="/nuts5" element={<NutsMapV5 />} />
                <Route path="/gridCountries" element={<GridMapEarlier />} />
                <Route path="/gridCountries2" element={<GridMapperEarly />} />
                <Route path="/gridCountries3" element={<GridMap />} />
                <Route path="/gridCountries4" element={<GridMapper4 />} />
                <Route path="/grid2" element={<AltMap />} />
                <Route path="/grid3" element={<OtherMap />} />
            </Routes>
        </>
    )
}

export default App
