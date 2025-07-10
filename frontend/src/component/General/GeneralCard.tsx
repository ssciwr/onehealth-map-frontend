import { Card } from "antd";
import type { CSSProperties, ReactNode } from "react";

interface GeneralCardProps {
	children: ReactNode;
	style?: CSSProperties;
	bodyStyle?: CSSProperties;
}

const GeneralCard = ({ children, style, bodyStyle }: GeneralCardProps) => (
	<Card
		style={{
			borderRadius: 16,
			boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)",
			border: "1px solid lightgray",
			borderTop: "1px solid rgba(220, 220, 220, 0.5)",
			margin: "12px 20px", // match to the map padding.
			...style,
		}}
		styles={{
			body: {
				...bodyStyle,
			},
		}}
	>
		{children}
	</Card>
);

export default GeneralCard;
