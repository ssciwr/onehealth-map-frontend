const AdvancedLegend = () => {
	return (
		<div
			style={{
				position: "absolute",
				bottom: "120px",
				left: "22px",
				backgroundColor: "white",
				borderRadius: "16px",
				padding: "15px",
				boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
				zIndex: 500,
			}}
		>
			<h4
				style={{
					margin: "0 0 10px 0",
					fontSize: "14px",
					fontWeight: "bold",
					color: "#1e293b",
				}}
			>
				Susceptibility Level
			</h4>
			<div
				style={{
					display: "grid",
					gridTemplateColumns: "1fr 1fr",
					gap: "10px",
				}}
			>
				<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
					<div
						style={{
							width: "20px",
							height: "15px",
							backgroundColor: "#4c1d4b",
						}}
					/>
					<span style={{ fontSize: "12px", color: "#64748b" }}>
						Low (0-20%)
					</span>
				</div>
				<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
					<div
						style={{
							width: "20px",
							height: "15px",
							backgroundColor: "#2e86ab",
						}}
					/>
					<span style={{ fontSize: "12px", color: "#64748b" }}>
						High (61-85%)
					</span>
				</div>
				<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
					<div
						style={{
							width: "20px",
							height: "15px",
							backgroundColor: "#663399",
						}}
					/>
					<span style={{ fontSize: "12px", color: "#64748b" }}>
						Medium (21-60%)
					</span>
				</div>
				<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
					<div
						style={{
							width: "20px",
							height: "15px",
							backgroundColor: "#39a97e",
						}}
					/>
					<span style={{ fontSize: "12px", color: "#64748b" }}>
						Critical (86-100%)
					</span>
				</div>
			</div>
		</div>
	);
};

export default AdvancedLegend;
