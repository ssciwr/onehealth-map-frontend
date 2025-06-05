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

	const circularButtonSize = 20;

	return (
		<div
			style={{
				position: "fixed",
				right: "6vw",
				top: "50%",
				transform: "translateY(-50%)",
				zIndex: 9000,
				display: "flex",
				flexDirection: "column",
				gap: "4px",
			}}
		>
			<button
				type="button"
				onClick={handleZoomIn}
				style={{
					width: "50px",
					height: "50px",
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
				<Plus size={circularButtonSize} style={{ color: "#333", opacity: 1 }} />
			</button>

			<button
				type="button"
				onClick={handleZoomOut}
				style={{
					width: "50px",
					height: "50px",
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
				<Minus
					size={circularButtonSize}
					style={{ color: "#333", opacity: 1 }}
				/>
			</button>

			<button
				type="button"
				onClick={handleLocationRequest}
				disabled={isLocating}
				style={{
					width: "50px",
					height: "50px",
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
				<MapPin
					size={circularButtonSize}
					style={{ color: "#333", opacity: 1 }}
				/>
			</button>
		</div>
	);
};

export default ControlBar;
