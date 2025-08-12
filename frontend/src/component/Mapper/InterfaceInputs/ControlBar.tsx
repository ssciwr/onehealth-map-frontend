import { Modal, Spin } from "antd";
import L from "leaflet";
import {
	Camera,
	ChevronDown,
	ChevronUp,
	Database,
	ExternalLink,
	FileText,
	HelpCircle,
	Info,
	MapPin,
	Minus,
	Plus,
} from "lucide-react";
import { useEffect, useState } from "react";
import { isMobile } from "react-device-detect";
import { AboutContent } from "../../../static/Footer.tsx";
import ModelDetailsModal from "./ModelDetailsModal";

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

export const CONTROL_BAR_LOCATIONS = {
	BOTTOM_RIGHT: "bottom-right",
	TOP_LEFT: "top-left",
} as const;

type ControlBarLocation =
	(typeof CONTROL_BAR_LOCATIONS)[keyof typeof CONTROL_BAR_LOCATIONS];

interface ControlBarProps {
	map: L.Map | null;
	position?: ControlBarLocation;
	selectedModel?: string;
	onModelSelect?: (modelId: string) => void;
}

const ControlBar = ({
	map,
	position = CONTROL_BAR_LOCATIONS.BOTTOM_RIGHT,
	selectedModel,
	onModelSelect,
}: ControlBarProps) => {
	const [isLocating, setIsLocating] = useState<boolean>(false);
	const [isSaving, setIsSaving] = useState<boolean>(false);
	const [showInfo, setShowInfo] = useState<boolean>(false);
	const [showScreenshotErrorModal, setShowScreenshotErrorModal] =
		useState<boolean>(false);
	const [showLocationModal, setShowLocationModal] = useState<boolean>(false);
	const [screenshoter, setScreenshoter] =
		useState<L.SimpleMapScreenshoter | null>(null);
	const [currentTheme, setCurrentTheme] = useState<"default" | "branded">(
		"default",
	);
	const [isMinimized, setIsMinimized] = useState<boolean>(false);
	const [showModelDetails, setShowModelDetails] = useState<boolean>(false);
	const [models, setModels] = useState<
		Array<{
			id: string;
			virusType: string;
			modelName: string;
			title: string;
			description: string;
			emoji: string;
			icon: string;
			color: string;
			details: string;
		}>
	>([]);

	useEffect(() => {
		console.log("Show info:", showInfo);
	}, [showInfo]);

	// Apply theme to document root
	useEffect(() => {
		console.log("Applying theme to document:", currentTheme);
		document.documentElement.setAttribute("data-theme", currentTheme);
		console.log(
			"Document data-theme attribute:",
			document.documentElement.getAttribute("data-theme"),
		);
	}, [currentTheme]);

	// Load models for the modal
	useEffect(() => {
		const loadModels = async () => {
			const modelFiles = [
				"westNileModel1.yaml",
				"westNileModel2.yaml",
				"dengueModel1.yaml",
				"malariaModel1.yaml",
				"covidModel1.yaml",
				"zikaModel1.yaml",
			];

			const loadedModels: Array<{
				id: string;
				virusType: string;
				modelName: string;
				title: string;
				description: string;
				emoji: string;
				icon: string;
				color: string;
				details: string;
			}> = [];

			for (const filename of modelFiles) {
				try {
					const response = await fetch(`/modelsyaml/${filename}`);
					if (!response.ok) continue;

					const yamlText = await response.text();
					const lines = yamlText.split("\n");
					const result: Record<string, string> = {};

					for (const line of lines) {
						const trimmed = line.trim();
						if (trimmed && !trimmed.startsWith("#")) {
							const colonIndex = trimmed.indexOf(":");
							if (colonIndex > 0) {
								const key = trimmed.substring(0, colonIndex).trim();
								let value = trimmed.substring(colonIndex + 1).trim();
								if (
									(value.startsWith("'") && value.endsWith("'")) ||
									(value.startsWith('"') && value.endsWith('"'))
								) {
									value = value.slice(1, -1);
								}
								result[key] = value;
							}
						}
					}

					const model = {
						id: result.id || "",
						virusType: result["virus-type"] || "",
						modelName: result["model-name"] || "",
						title: result.title || "",
						description: result.description || "",
						emoji: result.emoji || "",
						icon: result.icon || "",
						color: result.color || "",
						details: result.details || "",
					};

					loadedModels.push(model);
				} catch (error) {
					console.error(`Error loading ${filename}:`, error);
				}
			}

			if (loadedModels.length === 0) {
				// Fallback model
				loadedModels.push({
					id: "west-nile-a17",
					virusType: "west-nile",
					modelName: "Model A17",
					title: "West Nile Virus",
					description: "Mosquito-borne disease affecting humans and animals",
					emoji: "🦟",
					icon: "Bug",
					color: "#754910",
					details:
						"Advanced climate model incorporating temperature, humidity, and precipitation data from NOAA weather stations.",
				});
			}

			setModels(loadedModels);
		};

		loadModels();
	}, []);

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

	const handleThemeToggle = () => {
		const newTheme = currentTheme === "default" ? "branded" : "default";
		console.log("Switching theme from", currentTheme, "to", newTheme);
		setCurrentTheme(newTheme);
	};

	const handleToggleMinimize = () => {
		setIsMinimized(!isMinimized);
	};

	const circularButtonSize = 18;

	// Get button styles - always purple
	const getButtonStyle = () => {
		return {
			backgroundColor: "#667eea",
			background: "#6d63c8",
		};
	};

	const getControlBarClasses = () => {
		const baseClass = isMobile
			? "control-bar control-bar-mobile"
			: "control-bar control-bar-desktop";
		if (isMobile) return baseClass;
		return position === CONTROL_BAR_LOCATIONS.BOTTOM_RIGHT
			? `${baseClass} control-bar-bottom-right`
			: `${baseClass} control-bar-top-left`;
	};

	const modals = (
		<div>
			<Modal
				title=""
				open={showInfo}
				onCancel={() => setShowInfo(false)}
				footer={null}
				width={400}
			>
				<AboutContent />
				<br />
				<button
					type="button"
					onClick={handleThemeToggle}
					style={{
						background: "none",
						border: "none",
						color: "inherit",
						textDecoration: "underline",
						cursor: "pointer",
					}}
				>
					Change Theme
				</button>
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

			<ModelDetailsModal
				isOpen={showModelDetails}
				onClose={() => setShowModelDetails(false)}
				models={models}
				selectedModelId={selectedModel || ""}
				onModelSelect={onModelSelect || (() => {})}
			/>
		</div>
	);

	if (isMobile) {
		// Mobile: circular buttons with minimize functionality
		return (
			<>
				<div data-testid="control-bar" className={getControlBarClasses()}>
					{!isMinimized ? (
						<>
							<button
								type="button"
								onClick={handleZoomIn}
								className="btn-icon"
								style={getButtonStyle()}
							>
								<Plus size={circularButtonSize} />
							</button>

							<button
								type="button"
								onClick={handleZoomOut}
								className="btn-icon"
								style={getButtonStyle()}
							>
								<Minus size={circularButtonSize} />
							</button>

							<button
								type="button"
								onClick={handleLocationRequest}
								disabled={isLocating}
								className="btn-icon"
								style={getButtonStyle()}
							>
								<MapPin size={circularButtonSize} />
							</button>

							<button
								type="button"
								onClick={handleSaveScreenshot}
								disabled={isSaving || !screenshoter}
								className="btn-icon"
								style={getButtonStyle()}
								title={
									!screenshoter
										? "Screenshot plugin not loaded"
										: "Take screenshot"
								}
							>
								<Camera size={circularButtonSize} />
							</button>
							<button
								type="button"
								onClick={() => setShowInfo(true)}
								className="btn-icon"
								style={getButtonStyle()}
							>
								<Info size={circularButtonSize} />
							</button>

							<button
								type="button"
								onClick={() => setShowModelDetails(true)}
								className="btn-icon"
								disabled={!selectedModel || models.length === 0}
								style={getButtonStyle()}
							>
								<FileText size={circularButtonSize} />
							</button>
						</>
					) : null}

					<button
						type="button"
						onClick={handleToggleMinimize}
						className="btn-icon minimize-button"
						style={getButtonStyle()}
					>
						{isMinimized ? (
							<ChevronDown size={circularButtonSize} />
						) : (
							<ChevronUp size={circularButtonSize} />
						)}
					</button>
				</div>
				{modals}
			</>
		);
	}

	// Desktop: horizontal layout with red buttons
	return (
		<>
			<div data-testid="control-bar" className="desktop-control-container">
				{/* Center buttons */}
				<div className="desktop-control-buttons">
					<button
						type="button"
						onClick={() => setShowModelDetails(true)}
						disabled={!selectedModel || models.length === 0}
						style={{
							display: "flex",
							alignItems: "center",
							gap: "8px",
							padding: "8px 20px",
							backgroundColor: "var(--primary)",
							border: "1px solid var(--primary)",
							borderRadius: "0.5rem",
							cursor: "pointer",
							fontSize: "18px",
							fontWeight: "500",
							color: "white",
							transition: "all 0.2s ease",
							opacity: !selectedModel || models.length === 0 ? 0.5 : 1,
							whiteSpace: "nowrap",
							minWidth: "fit-content",
						}}
						onMouseEnter={(e) => {
							if (selectedModel && models.length > 0) {
								e.currentTarget.style.backgroundColor = "#8a0000";
								e.currentTarget.style.borderColor = "var(--primary-hover)";
							}
						}}
						onMouseLeave={(e) => {
							e.currentTarget.style.backgroundColor = "var(--primary)";
							e.currentTarget.style.borderColor = "var(--primary)";
						}}
						title="View detailed information about disease models"
					>
						<Database size={16} />
						Model Info
					</button>

					<button
						type="button"
						onClick={handleSaveScreenshot}
						disabled={isSaving || !screenshoter}
						style={{
							display: "flex",
							alignItems: "center",
							gap: "8px",
							padding: "8px 20px",
							backgroundColor: "var(--primary)",
							border: "1px solid var(--primary)",
							borderRadius: "0.5rem",
							cursor: "pointer",
							fontSize: "18px",
							fontWeight: "500",
							color: "white",
							transition: "all 0.2s ease",
							opacity: isSaving || !screenshoter ? 0.5 : 1,
							whiteSpace: "nowrap",
							minWidth: "fit-content",
						}}
						onMouseEnter={(e) => {
							if (!isSaving && screenshoter) {
								e.currentTarget.style.backgroundColor = "#8a0000";
								e.currentTarget.style.borderColor = "var(--primary-hover)";
							}
						}}
						onMouseLeave={(e) => {
							e.currentTarget.style.backgroundColor = "var(--primary)";
							e.currentTarget.style.borderColor = "var(--primary)";
						}}
						title={
							!screenshoter
								? "Screenshot plugin not loaded"
								: "Capture map as image"
						}
					>
						<Camera size={16} />
						{isSaving ? "Saving..." : "Screenshot"}
						<ExternalLink size={16} />
					</button>

					<button
						type="button"
						onClick={() => setShowInfo(true)}
						style={{
							display: "flex",
							alignItems: "center",
							gap: "8px",
							padding: "8px 20px",
							backgroundColor: "var(--primary)",
							border: "1px solid var(--primary)",
							borderRadius: "0.5rem",
							cursor: "pointer",
							fontSize: "18px",
							fontWeight: "500",
							color: "white",
							transition: "all 0.2s ease",
							whiteSpace: "nowrap",
							minWidth: "fit-content",
						}}
						onMouseEnter={(e) => {
							e.currentTarget.style.backgroundColor = "#8a0000";
							e.currentTarget.style.borderColor = "var(--primary-hover)";
						}}
						onMouseLeave={(e) => {
							e.currentTarget.style.backgroundColor = "var(--primary)";
							e.currentTarget.style.borderColor = "var(--primary)";
						}}
						title="About this application and team"
					>
						<HelpCircle size={16} />
						About
					</button>
				</div>

				{/* Zoom controls on the right */}
				<div className="desktop-zoom-controls">
					<button
						type="button"
						onClick={handleZoomOut}
						className="desktop-control-btn desktop-zoom-btn desktop-zoom-left"
						title="Zoom Out"
					>
						<Minus size={18} />
					</button>
					<button
						type="button"
						onClick={handleLocationRequest}
						disabled={isLocating}
						className="desktop-control-btn desktop-zoom-btn desktop-zoom-center"
						title="My Location"
					>
						<MapPin size={18} />
					</button>
					<button
						type="button"
						onClick={handleZoomIn}
						className="desktop-control-btn desktop-zoom-btn desktop-zoom-right"
						title="Zoom In"
					>
						<Plus size={18} />
					</button>
				</div>
			</div>

			{modals}
		</>
	);
};

export default ControlBar;
