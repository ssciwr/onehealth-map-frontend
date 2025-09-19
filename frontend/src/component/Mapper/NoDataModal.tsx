import { Button, Modal } from "antd";
import { CalendarIcon } from "lucide-react";

interface NoDataModalProps {
	isOpen: boolean;
	onClose: () => void;
	onLoadCurrentYear: () => void;
	requestedYear: number;
	errorMessage?: string;
}

const NoDataModal = ({
	isOpen,
	onClose,
	onLoadCurrentYear,
	requestedYear,
	errorMessage,
}: NoDataModalProps) => {
	const currentYear = new Date().getFullYear();

	return (
		<Modal
			title={
				<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
					<CalendarIcon size={20} />
					<span>No Data Available</span>
				</div>
			}
			open={isOpen}
			onCancel={onClose}
			footer={[
				<Button key="cancel" onClick={onClose}>
					Cancel
				</Button>,
				<Button key="load-current" type="primary" onClick={onLoadCurrentYear}>
					Load Current Year ({currentYear})
				</Button>,
			]}
			centered
		>
			<p>
				Unfortunately, the year <strong>{requestedYear}</strong> does not have
				any data available.
			</p>
			<p>
				You can try loading the current year ({currentYear}) which may have more
				recent data, or select a different year from the timeline.
			</p>
			{errorMessage && (
				<p style={{ color: "#999", fontSize: "12px", marginTop: "16px" }}>
					{errorMessage}
				</p>
			)}
		</Modal>
	);
};

export default NoDataModal;
