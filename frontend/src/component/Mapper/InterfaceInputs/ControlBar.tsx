import { Modal, Spin } from "antd";
import L from "leaflet";
import { Camera, Info, MapPin, Minus, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { AboutContent } from "../../../static/Footer.tsx";

interface ScreenshotOptions {
	mimeType?: "image/png" | "image/jpeg" | "image/webp";
	quality?: number;
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
	const [showScreenshotErrorModal, setShowScreenshotErrorModal] =
		useState<boolean>(false);
	const [showLocationModal, setShowLocationModal] = useState<boolean>(false);
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
		setShowLocationModal(true);

		if (!navigator.geolocation) {
			console.error("Geolocation is not supported by this browser");
			setIsLocating(false);
			setShowLocationModal(false);
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
				setShowLocationModal(false);
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
				setShowLocationModal(false);
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

			const blob = (await screenshoter.takeScreen("blob", {
				mimeType: "image/png",
			})) as Blob;
			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = `map-screenshot-${Date.now()}.png`;
			link.click();

			URL.revokeObjectURL(url);

			console.log("Screenshot saved successfully");
		} catch {
			setShowScreenshotErrorModal(true);
		} finally {
			setIsSaving(false);
		}
	};

	const circularButtonSize = 24;

	return (
		<>
			<div
				data-testid="control-bar"
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

			<Modal
				title=""
				open={showInfo}
				onCancel={() => setShowInfo(false)}
				footer={null}
				width={400}
			>
				<AboutContent />
			</Modal>

			<Modal
				title="Screenshot Error"
				open={showScreenshotErrorModal}
				onOk={() => setShowScreenshotErrorModal(false)}
				onCancel={() => setShowScreenshotErrorModal(false)}
				okText="OK"
				cancelButtonProps={{ style: { display: "none" } }}
			>
				<p>Error saving screenshot. Please reload the map and try again.</p>
			</Modal>

			<Modal
				title="Finding Your Location"
				open={showLocationModal}
				footer={null}
				closable={false}
				centered
				width={300}
			>
				<div style={{ textAlign: "center", padding: "20px 0" }}>
					<Spin size="large" />
					<p style={{ marginTop: "16px", marginBottom: 0 }}>Zooming to you!</p>
				</div>
			</Modal>
		</>
	);
};

export default ControlBar;
