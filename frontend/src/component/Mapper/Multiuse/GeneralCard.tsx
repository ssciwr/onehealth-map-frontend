import { Card } from "antd";
import type { CSSProperties, ReactNode } from "react";

interface GeneralCardProps {
	children: ReactNode;
	style?: CSSProperties;
}

const GeneralCard = ({ children, style }: GeneralCardProps) => (
	<Card
		style={{
			borderRadius: 16,
			boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
			border: "1px solid lightgray",
			margin: "10px",
			...style,
		}}
	>
		{children}
	</Card>
);

export default GeneralCard;
