import type L from "leaflet";
import { Camera, Info, MapPin, Minus, Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { AboutContent } from "../../../static/Footer.tsx";

// Comprehensive type definitions for the screenshoter plugin
interface ScreenshotOptions {
	mimeType?: "image/png" | "image/jpeg" | "image/webp";
	quality?: number; // 0-1 for JPEG/WebP
	width?: number;
	height?: number;
	pixelRatio?: number;
}

interface SimpleMapScreenshoterOptions {
	hidden?: boolean;
	preventDownload?: boolean;
	cropImageByInnerWH?: boolean;
	hideElementsWithSelectors?: string[];
	mimeType?: "image/png" | "image/jpeg" | "image/webp";
	screenName?: () => string;
	domtoimageOptions?: {
		quality?: number;
		bgcolor?: string;
		width?: number;
		height?: number;
		style?: Record<string, string>;
		filter?: (node: Node) => boolean;
		cacheBust?: boolean;
		imagePlaceholder?: string;
		pixelRatio?: number;
	};
}

// Type declaration for the screenshoter plugin
declare module "leaflet" {
	interface SimpleMapScreenshoter extends L.Control {
		takeScreen(
			format?: "blob" | "canvas" | "img",
			options?: ScreenshotOptions,
		): Promise<Blob | string | HTMLCanvasElement>;
	}

	function simpleMapScreenshoter(
		options?: SimpleMapScreenshoterOptions,
	): SimpleMapScreenshoter;
}

interface ControlBarProps {
	map: L.Map | null;
}

const ControlBar = ({ map }: ControlBarProps) => {
	const [isLocating, setIsLocating] = useState<boolean>(false);
	const [isSaving, setIsSaving] = useState<boolean>(false);
	const [showInfo, setShowInfo] = useState<boolean>(false);
	const [screenshoter, setScreenshoter] =
		useState<L.SimpleMapScreenshoter | null>(null);

	// todo: Make this call a callback to set resolution to high detail right before screenshot (Artificially increase
	// zoom to cause this perhaps (a bit hacky but logical).
	useEffect(() => {
		if (map && !screenshoter) {
			if (typeof L.simpleMapScreenshoter === "function") {
				const initializeScreenshoter = () => {
					try {
						const screenshotPlugin = L.simpleMapScreenshoter({
							hidden: true,
							preventDownload: true,
							cropImageByInnerWH: true,
							hideElementsWithSelectors: [], // css classes, not needed fro now.
							mimeType: "image/png",
							screenName: () => `map-screenshot-${Date.now()}`,
						});

						screenshotPlugin.addTo(map);
						setScreenshoter(screenshotPlugin);
					} catch (error) {
						console.error("Error initializing screenshoter:", error);
					}
				};

				// Check if map is ready, otherwise wait for the load event
				if (map.getContainer() && map.getSize().x > 0 && map.getSize().y > 0) {
					initializeScreenshoter();
				} else {
					// sensible pre-screenshot set up..
					map.once("load", initializeScreenshoter);
					map.once("resize", initializeScreenshoter);
				}

				return () => {
					if (screenshoter) {
						try {
							map.removeControl(screenshoter);
						} catch (error) {
							console.error("Error removing screenshoter:", error);
						}
					}
				};
			}
		}
	}, [map, screenshoter]);

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

	const handleSaveScreenshot = async () => {
		if (!map || !screenshoter) {
			console.error("Map or screenshoter not initialized");
			return;
		}

		setIsSaving(true);

		try {
			// Ensure the map has rendered before taking screenshot
			await new Promise((resolve) => setTimeout(resolve, 100));

			// Take screenshot as blob
			const blob = (await screenshoter.takeScreen("blob", {
				mimeType: "image/png",
			})) as Blob;

			// Create download link
			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = `map-screenshot-${Date.now()}.png`;
			link.click();

			// Cleanup
			URL.revokeObjectURL(url);

			console.log("Screenshot saved successfully");
		} catch (error) {
			console.error("Error taking screenshot:", error);
			// You might want to show an error message to the user here
		} finally {
			setIsSaving(false);
		}
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
					disabled={isSaving || !screenshoter}
					className="button-icon light-box-shadow"
					style={{
						cursor: isSaving || !screenshoter ? "not-allowed" : "pointer",
						opacity: isSaving || !screenshoter ? 0.6 : 1,
					}}
					title={
						!screenshoter ? "Screenshot plugin not loaded" : "Take screenshot"
					}
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
