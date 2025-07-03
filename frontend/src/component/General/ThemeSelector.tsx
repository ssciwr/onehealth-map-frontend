import { Button, Dropdown } from "antd";
import type { MenuProps } from "antd";
import { Palette } from "lucide-react";
import { useEffect, useState } from "react";

type Theme = "default" | "branded";

const ThemeSelector = () => {
	const [currentTheme, setCurrentTheme] = useState<Theme>("default");

	useEffect(() => {
		// Apply theme to document root
		document.documentElement.setAttribute("data-theme", currentTheme);
	}, [currentTheme]);

	const themeOptions: MenuProps["items"] = [
		{
			key: "default",
			label: (
				<div className="flex items-center gap-md">
					<div
						className="btn btn-primary"
						style={{
							padding: "4px 8px",
							fontSize: "12px",
							minWidth: "60px",
							height: "24px",
						}}
					>
						Filled
					</div>
					<span>Default (Filled buttons)</span>
				</div>
			),
			onClick: () => setCurrentTheme("default"),
		},
		{
			key: "branded",
			label: (
				<div className="flex items-center gap-md">
					<div
						className="btn btn-primary"
						style={{
							padding: "4px 8px",
							fontSize: "12px",
							minWidth: "60px",
							height: "24px",
						}}
						data-theme="branded"
					>
						Branded
					</div>
					<span>Branded Theme</span>
				</div>
			),
			onClick: () => setCurrentTheme("branded"),
		},
	];

	return (
		<Dropdown
			menu={{ items: themeOptions }}
			trigger={["click"]}
			placement="bottomRight"
		>
			<Button
				className="btn-secondary"
				style={{
					display: "inline-flex",
					alignItems: "center",
					gap: "8px",
					padding: "8px 12px",
				}}
			>
				<Palette size={16} />
				<span className="text-sm">
					{currentTheme === "default" ? "Filled" : "Branded"}
				</span>
			</Button>
		</Dropdown>
	);
};

export default ThemeSelector;
