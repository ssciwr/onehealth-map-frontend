import { Routes, Route } from 'react-router-dom'
import './App.css'
import Overview from './pages/Overview'
import NutsMapV5 from "./component/NUTSMapper/NutsMapV5.tsx";

function App() {
    return (
        <>
            <Routes>
                <Route path="/" element={<Overview />} />
                <Route path="/nuts5" element={<NutsMapV5 />} />
            </Routes>
        </>
    )
}

export default App
