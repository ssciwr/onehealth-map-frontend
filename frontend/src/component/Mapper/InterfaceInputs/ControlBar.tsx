import type L from "leaflet";
import { Camera, Info, MapPin, Minus, Plus, X } from "lucide-react";
import { useState } from "react";
import { AboutContent } from "../../../static/Footer.tsx";

interface ControlBarProps {
	map: L.Map | null;
}

const ControlBar = ({ map }: ControlBarProps) => {
	const [isLocating, setIsLocating] = useState<boolean>(false);
	const [isSaving, setIsSaving] = useState<boolean>(false);
	const [showInfo, setShowInfo] = useState<boolean>(false);

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

	const circularButtonSize = 24;

	return (
		<>
			<div
				style={{
					position: "fixed",
					right: "30px",
					top: "50%",
					transform: "translateY(-50%)",
					zIndex: 600, // 600-700 now reserved for control elements on map. 1000 for modals. 300-400 for map layers.
					display: "flex",
					flexDirection: "column",
					gap: "4px",
					backgroundColor: "rgba(255,255,255,0.35)",
					borderRadius: "30px",
					padding: "4px",
				}}
			>
				<button
					type="button"
					onClick={handleZoomIn}
					className="button-icon light-box-shadow"
				>
					<Plus size={circularButtonSize} className="button-icon-text" />
				</button>

				<button
					type="button"
					onClick={handleZoomOut}
					className="button-icon light-box-shadow"
				>
					<Minus size={circularButtonSize} className="button-icon-text" />
				</button>

				<button
					type="button"
					onClick={handleLocationRequest}
					disabled={isLocating}
					className="button-icon light-box-shadow"
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
					className="button-icon light-box-shadow"
					style={{
						backgroundColor: "black", // disabled until it works.
						cursor: isSaving ? "not-allowed" : "pointer",
						opacity: isSaving ? 0.6 : 1,
					}}
				>
					<Camera size={circularButtonSize} className="button-icon-text" />
				</button>

				<button
					type="button"
					onClick={() => setShowInfo(true)}
					className="button-icon light-box-shadow"
				>
					<Info size={circularButtonSize} className="button-icon-text" />
				</button>
			</div>

			{/* Info Modal */}
			{showInfo && (
				<div
					style={{
						position: "fixed",
						top: 0,
						left: 0,
						right: 0,
						bottom: 0,
						backgroundColor: "rgba(0, 0, 0, 0.5)",
						zIndex: 1000,
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						padding: "20px",
					}}
				>
					<div
						style={{
							backgroundColor: "white",
							borderRadius: "8px",
							padding: "24px",
							maxWidth: "400px",
							width: "100%",
							position: "relative",
							boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
						}}
					>
						<button
							type="button"
							onClick={() => setShowInfo(false)}
							style={{
								position: "absolute",
								top: "12px",
								right: "12px",
								background: "none",
								border: "none",
								cursor: "pointer",
								padding: "4px",
								color: "#666",
							}}
						>
							<X size={20} />
						</button>

						<AboutContent />
					</div>
				</div>
			)}
		</>
	);
};

export default ControlBar;
