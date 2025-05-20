// Custom hook to monitor and respond to map viewport changes
import { useEffect, useState } from "react";
import { useMap } from 'react-leaflet';
import L from 'leaflet';

// Define types for viewport and props
interface Viewport {
    bounds: L.LatLngBounds;
    zoom: number;
}

interface ViewportMonitorProps {
    onViewportChange: (viewport: Viewport) => void;
}

function useMapViewport(): Viewport {
    const map = useMap();
    const [viewport, setViewport] = useState<Viewport>({
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

// Keep track of viewport for more efficient and responsive rendering
function ViewportMonitor({ onViewportChange }: ViewportMonitorProps) {
    const viewport = useMapViewport();

    useEffect(() => {
        onViewportChange(viewport);
    }, [viewport, onViewportChange]);

    return null;
}

export default ViewportMonitor;