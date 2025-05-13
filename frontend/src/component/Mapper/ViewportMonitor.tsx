// Custom hook to monitor and respond to map viewport changes
import {useEffect, useState} from "react";
import {
    useMap,
} from 'react-leaflet';

function useMapViewport() {
    const map = useMap();
    const [viewport, setViewport] = useState({
        bounds: map.getBounds(),
        zoom: map.getZoom(),
    });

    useEffect(() => {
        const handleViewportChange = () => {
            setViewport({
                bounds: map.getBounds(),
                zoom: map.getZoom(),
            });
        };

        map.on('moveend', handleViewportChange);
        map.on('zoomend', handleViewportChange);

        return () => {
            map.off('moveend', handleViewportChange);
            map.off('zoomend', handleViewportChange);
        };
    }, [map]);

    return viewport;
}

// Keep track of viewport for more efficienct and responsive rendering
function ViewportMonitor({ onViewportChange }) {
    const viewport = useMapViewport();

    useEffect(() => {
        onViewportChange(viewport);
    }, [viewport, onViewportChange]);

    return null;
}


export default ViewportMonitor;