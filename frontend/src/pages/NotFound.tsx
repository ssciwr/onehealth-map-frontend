import { Button } from "antd";
import { MapPinIcon } from "lucide-react";
import { Link } from "react-router-dom";
import GeneralCard from "../component/General/GeneralCard.tsx";
import Footer from "../static/Footer.tsx";
import Header from "../static/Header.tsx";

export default () => (
	<div>
		<Header />
		<div className="horizontal-margin-on-medium-up">
			<GeneralCard>
				<h1>404: This page was not found</h1>
				<p>Looking for our Map?</p>
				<Link to={"/map"}>
					<Button type="primary" size="large" icon={<MapPinIcon />} block>
						View Map
					</Button>
				</Link>
			</GeneralCard>
		</div>
		<Footer />
	</div>
);
