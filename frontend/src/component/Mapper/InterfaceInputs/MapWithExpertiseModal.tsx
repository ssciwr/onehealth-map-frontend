import { ExperimentOutlined, UserOutlined } from "@ant-design/icons";
import { Button, Modal, Typography } from "antd";
import { observer } from "mobx-react-lite";
import { useEffect, useState } from "react";
import { viewingMode } from "../../../stores/ViewingModeStore.ts";
import EnhancedClimateMap from "../EnhancedClimateMap.tsx";

const { Title } = Typography;

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

	return (
		<>
			<Modal
				title={<Title level={3}>What view do you prefer?</Title>}
				open={showModal}
				footer={null}
				closable={false}
				centered
				width={400}
			>
				<div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
					<Button
						type="primary"
						size="large"
						icon={<UserOutlined />}
						onClick={handleCitizenClick}
						block
					>
						I want to learn/explore
					</Button>
					<Button
						type="default"
						size="large"
						icon={<ExperimentOutlined />}
						onClick={handleExpertClick}
						block
					>
						I want complete details as an expert
					</Button>
				</div>
			</Modal>

			<EnhancedClimateMap onMount={() => false} />
		</>
	);
});

export default MapWithModal;
