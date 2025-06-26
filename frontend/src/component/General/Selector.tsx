import { ChevronDown } from "lucide-react";
import type React from "react";
import { useState } from "react";

interface SelectorItem {
	id: string;
	title: string;
	description: string;
	emoji?: string;
	icon?: React.ComponentType<{ size?: number; className?: string }>;
	color?: string;
}

interface SelectorProps {
	items: SelectorItem[];
	selectedId: string;
	onSelect: (id: string) => void;
	title: string;
	description: string;
	buttonText?: string;
	footerText?: string;
	footerAction?: React.ReactNode;
	className?: string;
	style?: React.CSSProperties;
}

const Selector: React.FC<SelectorProps> = ({
	items,
	selectedId,
	onSelect,
	title,
	description,
	buttonText,
	footerText,
	footerAction,
	className = "",
	style = {},
}) => {
	const [isOpen, setIsOpen] = useState(false);

	const selectedItem = items.find((item) => item.id === selectedId);

	const handleSelect = (id: string) => {
		onSelect(id);
		setIsOpen(false);
	};

	return (
		<span className={`model-selector ${className}`} style={style}>
			<button
				type="button"
				className="model-selector-button header-font-size"
				onClick={() => setIsOpen(!isOpen)}
			>
				<div className="flex items-center gap-sm">
					{selectedItem?.emoji && (
						<span className="white-icon-bg"> {selectedItem.emoji}</span>
					)}
					{selectedItem?.icon && (
						<selectedItem.icon className="icon" size={18} />
					)}
					<span>{buttonText || selectedItem?.title || "Select Option"}</span>
					<ChevronDown
						className={`chevron ${isOpen ? "open" : ""}`}
						size={16}
					/>
				</div>
			</button>

			{isOpen && (
				<div className="model-dropdown">
					<div className="model-header">
						<h3>{title}</h3>
						<p className="model-description">{description}</p>
					</div>

					<div className="virus-list">
						{items.map((item) => (
							<button
								type="button"
								key={item.id}
								className={`virus-item ${selectedId === item.id ? "selected" : ""}`}
								onClick={() => handleSelect(item.id)}
							>
								<div className="virus-icon" style={{ color: item.color }}>
									{item.emoji ? (
										<div className="emoji-container">
											<span className="virus-emoji">&nbsp;{item.emoji}</span>
										</div>
									) : item.icon ? (
										<item.icon size={24} />
									) : null}
								</div>
								<div className="virus-info">
									<h4>{item.title}</h4>
									<p>{item.description}</p>
								</div>
							</button>
						))}
					</div>

					{(footerText || footerAction) && (
						<div className="model-footer">
							{footerText && <span>{footerText}</span>}
							{footerAction}
						</div>
					)}
				</div>
			)}
		</span>
	);
};

export default Selector;
