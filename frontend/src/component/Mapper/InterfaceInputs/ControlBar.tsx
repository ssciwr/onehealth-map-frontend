import type L from "leaflet";
import { Download, MapPin, Minus, Plus } from "lucide-react";
import { useState } from "react";

interface ControlBarProps {
	map: L.Map | null;
}

const ControlBar = ({ map }: ControlBarProps) => {
	const [isLocating, setIsLocating] = useState<boolean>(false);
	const [isSaving, setIsSaving] = useState<boolean>(false);

	const handleZoomIn = () => {
		if (map) {
			map.zoomIn();
		}
	};

	const handleZoomOut = () => {
		if (map) {
			map.zoomOut();
		}
	};

	const handleLocationRequest = () => {
		setIsLocating(true);

		if (!navigator.geolocation) {
			console.error("Geolocation is not supported by this browser");
			setIsLocating(false);
			return;
		}

		navigator.geolocation.getCurrentPosition(
			(position) => {
				const { latitude, longitude } = position.coords;
				if (map) {
					console.log("Setting map position to: ", latitude, longitude);
					map.flyTo([latitude, longitude], 8, {
						duration: 2,
						easeLinearity: 0.1,
					});
				}
				setIsLocating(false);
			},
			(error) => {
				let errorMessage = "Unable to get your location";
				switch (error.code) {
					case error.PERMISSION_DENIED:
						errorMessage = "Location permission denied";
						break;
					case error.POSITION_UNAVAILABLE:
						errorMessage = "Location information unavailable";
						break;
					case error.TIMEOUT:
						errorMessage = "Location request timed out";
						break;
				}
				console.error(errorMessage);
				setIsLocating(false);
			},
			{
				enableHighAccuracy: true,
				timeout: 10000,
				maximumAge: 60000,
			},
		);
	};

	const handleSaveScreenshot = () => {
		if (!map) return;

		setIsSaving(true);

		// Use leaflet-image plugin or simple DOM to canvas
		const mapContainer = map.getContainer();
		const mapPane = mapContainer.querySelector(
			".leaflet-map-pane",
		) as HTMLElement;

		if (!mapPane) {
			setIsSaving(false);
			return;
		}

		// Get map dimensions
		const bounds = mapPane.getBoundingClientRect();

		// Create canvas
		const canvas = document.createElement("canvas");
		canvas.width = bounds.width;
		canvas.height = bounds.height;
		const ctx = canvas.getContext("2d");

		if (!ctx) {
			setIsSaving(false);
			return;
		}

		// Simple approach: convert map pane to canvas using domtoimage-like method
		const svg = `
            <svg xmlns="http://www.w3.org/2000/svg" width="${bounds.width}" height="${bounds.height}">
                <foreignObject width="100%" height="100%">
                    <div xmlns="http://www.w3.org/1999/xhtml" style="width:${bounds.width}px;height:${bounds.height}px;">
                        ${mapPane.outerHTML}
                    </div>
                </foreignObject>
            </svg>`;

		const img = new Image();
		img.onload = () => {
			ctx.drawImage(img, 0, 0);

			canvas.toBlob((blob) => {
				if (blob) {
					const url = URL.createObjectURL(blob);
					const link = document.createElement("a");
					link.href = url;
					link.download = `map-${Date.now()}.png`;
					link.click();
					URL.revokeObjectURL(url);
				}
				setIsSaving(false);
			});
		};

		img.onerror = () => setIsSaving(false);
		img.src = `data:image/svg+xml;base64,${btoa(svg)}`;
	};

	const circularButtonSize = 22;

	return (
		<div
			style={{
				position: "fixed",
				right: "6vw",
				top: "50%",
				transform: "translateY(-50%)",
				zIndex: 600, // 600-700 now reserved for control elements on map. 1000 for modals. 300-400 for map layers.
				display: "flex",
				flexDirection: "column",
				gap: "4px",
			}}
		>
			<button type="button" onClick={handleZoomIn} className="button-icon">
				<Plus size={circularButtonSize} className="button-icon-text" />
			</button>

			<button type="button" onClick={handleZoomOut} className="button-icon">
				<Minus size={circularButtonSize} className="button-icon-text" />
			</button>

			<button
				type="button"
				onClick={handleLocationRequest}
				disabled={isLocating}
				className="button-icon"
				style={{
					cursor: isLocating ? "not-allowed" : "pointer",
					opacity: isLocating ? 0.6 : 1,
				}}
			>
				<MapPin size={circularButtonSize} className="button-icon-text" />
			</button>

			<button
				type="button"
				onClick={handleSaveScreenshot}
				disabled={isSaving}
				className="button-icon"
				style={{
					cursor: isSaving ? "not-allowed" : "pointer",
					opacity: isSaving ? 0.6 : 1,
				}}
			>
				<Download size={circularButtonSize} className="button-icon-text" />
			</button>
		</div>
	);
};

export default ControlBar;
