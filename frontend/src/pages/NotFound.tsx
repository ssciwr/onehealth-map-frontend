import { Button } from "antd";
import { HomeIcon, MapPinIcon } from "lucide-react";
import { Link } from "react-router-dom";
import GeneralCard from "../component/General/GeneralCard.tsx";
import Footer from "../static/Footer.tsx";
import Header from "../static/Header.tsx";
import "../component/General/general.css";

export default () => (
	<div className="not-found-container">
		<div className="not-found-header">
			<img
				src="/images/oneHealthLogoOnlySymbols.png"
				alt="OneHealth Logo"
				className="not-found-logo"
			/>
			<h1 className="not-found-header-title">OneHealth</h1>
		</div>
		<div className="horizontal-margin-on-medium-up">
			<GeneralCard style={{ marginTop: "60px" }}>
				<div className="not-found-content">
					<h1 className="not-found-title">404</h1>
					<h2 className="not-found-subtitle">Page Not Found</h2>
					<p className="not-found-description">
						The page you're looking for doesn't exist.
					</p>
					<div className="not-found-buttons">
						<Link to={"/"}>
							<Button
								size="large"
								icon={<HomeIcon />}
								className="not-found-secondary-button"
							>
								Go Home
							</Button>
						</Link>
						<Link to={"/map"}>
							<Button
								type="primary"
								size="large"
								icon={<MapPinIcon />}
								className="not-found-primary-button"
							>
								View Climate Map
							</Button>
						</Link>
					</div>
				</div>
			</GeneralCard>
		</div>
		<Footer />
	</div>
);
