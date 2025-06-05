import type L from "leaflet";
import { MapPin, Minus, Plus } from "lucide-react";
import { useState } from "react";

interface ControlBarProps {
	map: L.Map | null;
}

const ControlBar = ({ map }: ControlBarProps) => {
	const [isLocating, setIsLocating] = useState<boolean>(false);

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
	// Eventually, this should go onthe right with right: '10px' when doing that design.
	// And the distance should be proportion of page to work well on mobile.
	return (
		<div
			style={{
				position: "fixed",
				left: "4vw",
				top: "50%",
				transform: "translateY(-50%)",
				zIndex: 9000,
				display: "flex",
				flexDirection: "column",
				gap: "4px",
			}}
		>
			<button
				onClick={handleZoomIn}
				style={{
					width: "40px",
					height: "40px",
					backgroundColor: "rgba(255, 255, 255, 0.75)",
					border: "none",
					borderRadius: "50%",
					boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
					cursor: "pointer",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					padding: 0,
				}}
			>
				<Plus size={20} style={{ color: "#333", opacity: 1 }} />
			</button>

			<button
				onClick={handleZoomOut}
				style={{
					width: "40px",
					height: "40px",
					backgroundColor: "rgba(255, 255, 255, 0.75)",
					border: "none",
					borderRadius: "50%",
					boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
					cursor: "pointer",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					padding: 0,
				}}
			>
				<Minus size={20} style={{ color: "#333", opacity: 1 }} />
			</button>

			<button
				onClick={handleLocationRequest}
				disabled={isLocating}
				style={{
					width: "40px",
					height: "40px",
					backgroundColor: "rgba(255, 255, 255, 0.75)",
					border: "none",
					borderRadius: "50%",
					boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
					cursor: isLocating ? "not-allowed" : "pointer",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					padding: 0,
					opacity: isLocating ? 0.6 : 1,
				}}
			>
				<MapPin size={20} style={{ color: "#333", opacity: 1 }} />
			</button>
		</div>
	);
};

export default ControlBar;
