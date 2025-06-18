import { Modal } from "antd";
import { observer } from "mobx-react-lite";
import type React from "react";
import { errorStore } from "../../stores/ErrorStore";

const GlobalErrorModal: React.FC = observer(() => {
	return (
		<Modal
			title={errorStore.currentError?.title || "Error"}
			open={errorStore.isVisible}
			onCancel={errorStore.hideError}
			onOk={errorStore.hideError}
			cancelButtonProps={{ style: { display: "none" } }}
			okText="OK"
			centered
			destroyOnHidden
		>
			<p>
				{errorStore.currentError?.message || "An unexpected error occurred."}
			</p>
		</Modal>
	);
});

export default GlobalErrorModal;
