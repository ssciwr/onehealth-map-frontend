import { ExperimentOutlined, UserOutlined } from "@ant-design/icons";
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
		// Dispatch custom event to trigger tour
		window.dispatchEvent(new CustomEvent("modalChoiceMade"));
	};

	const handleExpertClick = () => {
		viewingMode.isExpert = true;
		viewingMode.isCitizen = false;
		setShowModal(false);
		// Dispatch custom event to trigger tour
		window.dispatchEvent(new CustomEvent("modalChoiceMade"));
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
					<div className="expertise-modal-header">
						<Title className="expertise-modal-title" level={2}>
							Choose Your Experience
						</Title>
						<Text className="expertise-modal-subtitle">
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
				<div className="expertise-modal-content">
					<Card
						hoverable
						className="expertise-mode-card guided"
						onClick={handleCitizenClick}
						bodyStyle={{ padding: "24px" }}
						data-testid="guided-mode-card"
					>
						<div className="expertise-card-content">
							<div className="expertise-icon-container">
								<UserOutlined className="expertise-icon" />
							</div>
							<div className="expertise-text-container">
								<div className="expertise-title-row">
									<Title level={4} className="expertise-mode-title">
										Guided Mode
									</Title>
									<Tag color="blue" className="expertise-tag">
										RECOMMENDED
									</Tag>
								</div>
								<Text className="expertise-description">
									Interactive map with guided tour and simplified interface
								</Text>
							</div>
						</div>
					</Card>

					<Card
						hoverable
						className="expertise-mode-card expert"
						onClick={handleExpertClick}
						bodyStyle={{ padding: "24px" }}
						data-testid="expert-mode-card"
					>
						<div className="expertise-card-content">
							<div className="expertise-icon-container">
								<ExperimentOutlined className="expertise-icon" />
							</div>
							<div className="expertise-text-container">
								<Title level={4} className="expertise-mode-title expert">
									Expert Mode
								</Title>
								<Text className="expertise-description">
									Full interface with detailed methodology and advanced controls
								</Text>
							</div>
						</div>
					</Card>

					<div className="expertise-skip-container">
						<Button
							type="text"
							className="expertise-skip-button"
							onClick={() => {
								setShowModal(false);
							}}
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
