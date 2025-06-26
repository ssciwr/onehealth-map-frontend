import {
	BarChartOutlined,
	ExperimentOutlined,
	UserOutlined,
} from "@ant-design/icons";
import { Button, Card, Modal, Tag, Typography } from "antd";
import { observer } from "mobx-react-lite";
import { useEffect, useState } from "react";
import { viewingMode } from "../../../stores/ViewingModeStore.ts";
import ClimateMap from "../ClimateMap.tsx";

const { Title, Text } = Typography;

const MapWithModal = observer(() => {
	const [showModal, setShowModal] = useState(true);

	useEffect(() => {
		// Set default to citizen
		viewingMode.isCitizen = true;
		viewingMode.isExpert = false;
	}, []);

	const handleCitizenClick = () => {
		// Already default, just close modal
		setShowModal(false);
	};

	const handleExpertClick = () => {
		viewingMode.isExpert = true;
		viewingMode.isCitizen = false;
		setShowModal(false);
	};

	const modalStyles = {
		content: {
			padding: "32px 24px",
			borderRadius: "16px",
			background: "linear-gradient(135deg, #db3c1c 0%, #4c1d4b 50%, #2e86ab 100%)",
			border: "none",
		},
		header: {
			background: "transparent",
			borderBottom: "none",
			padding: "0 0 24px 0",
		},
		body: {
			padding: 0,
		},
	};

	return (
		<>
			<Modal
				title={
					<div style={{ textAlign: "center", color: "white" }}>
						<BarChartOutlined
							style={{ fontSize: "48px", marginBottom: "16px", color: "white" }}
						/>
						<Title
							style={{
								color: "white",
								margin: 0,
								fontSize: "28px",
								fontWeight: 600,
							}}
							level={2}
						>
							Choose Your Experience
						</Title>
						<Text style={{ color: "rgba(255,255,255,0.8)", fontSize: "16px" }}>
							Select how you'd like to explore the platform
						</Text>
					</div>
				}
				open={showModal}
				footer={null}
				closable={false}
				centered
				width={480}
				styles={modalStyles}
			>
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						gap: "16px",
						marginTop: "24px",
					}}
				>
					<Card
						hoverable
						style={{
							borderRadius: "12px",
							border: "none",
							background: "rgba(255,255,255,0.95)",
							backdropFilter: "blur(10px)",
							cursor: "pointer",
						}}
						onClick={handleCitizenClick}
						bodyStyle={{ padding: "20px" }}
					>
						<div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
							<div
								style={{
									background:
										"linear-gradient(135deg, #db3c1c 0%, #39a97e 100%)",
									borderRadius: "12px",
									padding: "12px",
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
								}}
							>
								<UserOutlined style={{ fontSize: "24px", color: "white" }} />
							</div>
							<div style={{ flex: 1 }}>
								<div
									style={{
										display: "flex",
										alignItems: "center",
										gap: "8px",
										marginBottom: "4px",
									}}
								>
									<Title level={4} style={{ margin: 0, color: "#1a1a1a" }}>
										Guided
									</Title>
									<Tag
										color="blue"
										style={{ borderRadius: "12px", fontSize: "10px" }}
									>
										RECOMMENDED
									</Tag>
								</div>
								<Text style={{ color: "#666", fontSize: "14px" }}>
									Interactive map with predictions for future years
								</Text>
							</div>
						</div>
					</Card>

					<Card
						hoverable
						style={{
							borderRadius: "12px",
							border: "none",
							background: "rgba(255,255,255,0.95)",
							backdropFilter: "blur(10px)",
							cursor: "pointer",
						}}
						onClick={handleExpertClick}
						bodyStyle={{ padding: "20px" }}
					>
						<div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
							<div
								style={{
									background:
										"linear-gradient(135deg, #4c1d4b 0%, #2e86ab 100%)",
									borderRadius: "12px",
									padding: "12px",
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
								}}
							>
								<ExperimentOutlined
									style={{ fontSize: "24px", color: "white" }}
								/>
							</div>
							<div style={{ flex: 1 }}>
								<Title
									level={4}
									style={{ margin: 0, color: "#1a1a1a", marginBottom: "4px" }}
								>
									Expert
								</Title>
								<Text style={{ color: "#666", fontSize: "14px" }}>
									Complete map with more detailed methodology for each model.
								</Text>
							</div>
						</div>
					</Card>

					<div
						style={{
							display: "flex",
							justifyContent: "center",
							marginTop: "16px",
						}}
					>
						<Button
							type="text"
							style={{ color: "rgba(255,255,255,0.7)", fontSize: "14px" }}
							onClick={() => setShowModal(false)}
						>
							Maybe Later
						</Button>
					</div>
				</div>
			</Modal>

			<ClimateMap onMount={() => false} />
		</>
	);
});

export default MapWithModal;
