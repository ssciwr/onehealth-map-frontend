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
			padding: "40px 32px",
			borderRadius: "12px",
			background: "#ffffff",
			border: "none",
			boxShadow: "0 20px 60px rgba(0, 0, 0, 0.1)",
		},
		header: {
			background: "transparent",
			borderBottom: "none",
			padding: "0 0 32px 0",
		},
		body: {
			padding: 0,
		},
	};

	return (
		<>
			<Modal
				title={
					<div style={{ textAlign: "center" }}>
						<div
							style={{
								width: "64px",
								height: "64px",
								background: "linear-gradient(135deg, #1890ff 0%, #52c41a 100%)",
								borderRadius: "16px",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								margin: "0 auto 20px",
							}}
						>
							<BarChartOutlined style={{ fontSize: "32px", color: "white" }} />
						</div>
						<Title
							style={{
								color: "#1a1a1a",
								margin: "0 0 8px 0",
								fontSize: "24px",
								fontWeight: 600,
							}}
							level={2}
						>
							Choose Your Experience
						</Title>
						<Text style={{ color: "#666", fontSize: "16px" }}>
							Select how you'd like to explore the climate data
						</Text>
					</div>
				}
				open={showModal}
				footer={null}
				closable={false}
				centered
				width={520}
				styles={modalStyles}
			>
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						gap: "16px",
					}}
				>
					<Card
						hoverable
						style={{
							borderRadius: "8px",
							border: "2px solid #e8f4fd",
							background: "#f8fbff",
							cursor: "pointer",
							transition: "all 0.2s ease",
						}}
						onMouseEnter={(e) => {
							e.currentTarget.style.border = "2px solid #1890ff";
							e.currentTarget.style.transform = "translateY(-2px)";
							e.currentTarget.style.boxShadow =
								"0 4px 12px rgba(24, 144, 255, 0.15)";
						}}
						onMouseLeave={(e) => {
							e.currentTarget.style.border = "2px solid #e8f4fd";
							e.currentTarget.style.transform = "translateY(0px)";
							e.currentTarget.style.boxShadow = "none";
						}}
						onClick={handleCitizenClick}
						bodyStyle={{ padding: "24px" }}
					>
						<div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
							<div
								style={{
									background: "#1890ff",
									borderRadius: "8px",
									padding: "12px",
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
								}}
							>
								<UserOutlined style={{ fontSize: "20px", color: "white" }} />
							</div>
							<div style={{ flex: 1 }}>
								<div
									style={{
										display: "flex",
										alignItems: "center",
										gap: "10px",
										marginBottom: "6px",
									}}
								>
									<Title
										level={4}
										style={{ margin: 0, color: "#1a1a1a", fontSize: "18px" }}
									>
										Guided Mode
									</Title>
									<Tag
										color="blue"
										style={{
											borderRadius: "4px",
											fontSize: "11px",
											fontWeight: 500,
										}}
									>
										RECOMMENDED
									</Tag>
								</div>
								<Text
									style={{ color: "#666", fontSize: "15px", lineHeight: "1.4" }}
								>
									Interactive map with guided tour and simplified interface
								</Text>
							</div>
						</div>
					</Card>

					<Card
						hoverable
						style={{
							borderRadius: "8px",
							border: "2px solid #f0f0f0",
							background: "#ffffff",
							cursor: "pointer",
							transition: "all 0.2s ease",
						}}
						onMouseEnter={(e) => {
							e.currentTarget.style.border = "2px solid #722ed1";
							e.currentTarget.style.transform = "translateY(-2px)";
							e.currentTarget.style.boxShadow =
								"0 4px 12px rgba(114, 46, 209, 0.15)";
						}}
						onMouseLeave={(e) => {
							e.currentTarget.style.border = "2px solid #f0f0f0";
							e.currentTarget.style.transform = "translateY(0px)";
							e.currentTarget.style.boxShadow = "none";
						}}
						onClick={handleExpertClick}
						bodyStyle={{ padding: "24px" }}
					>
						<div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
							<div
								style={{
									background: "#722ed1",
									borderRadius: "8px",
									padding: "12px",
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
								}}
							>
								<ExperimentOutlined
									style={{ fontSize: "20px", color: "white" }}
								/>
							</div>
							<div style={{ flex: 1 }}>
								<Title
									level={4}
									style={{
										margin: "0 0 6px 0",
										color: "#1a1a1a",
										fontSize: "18px",
									}}
								>
									Expert Mode
								</Title>
								<Text
									style={{ color: "#666", fontSize: "15px", lineHeight: "1.4" }}
								>
									Full interface with detailed methodology and advanced controls
								</Text>
							</div>
						</div>
					</Card>

					<div
						style={{
							display: "flex",
							justifyContent: "center",
							marginTop: "24px",
						}}
					>
						<Button
							type="text"
							style={{ color: "#999", fontSize: "14px" }}
							onClick={() => setShowModal(false)}
						>
							Skip for now
						</Button>
					</div>
				</div>
			</Modal>

			<ClimateMap onMount={() => false} />
		</>
	);
});

export default MapWithModal;
