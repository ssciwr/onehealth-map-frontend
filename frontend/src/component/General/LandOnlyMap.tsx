import React from "react";
import { GeoJSON, MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";

/** Although this has been added, the current NUTs equivalent version,hich parses NUTs/country regions from Lat/lon
 * grid data, does not require this, so it is deprecated and should be removed if we go that way.
 * @deprecated
 * @constructor
 */
const LandOnlyMap = () => {
	// Fix for default markers in react-leaflet
	React.useEffect(() => {
		L.Icon.Default.prototype._getIconUrl = undefined;
		L.Icon.Default.mergeOptions({
			iconRetinaUrl:
				"https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
			iconUrl:
				"https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
			shadowUrl:
				"https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
		});
	}, []);

	// Center on Europe/Africa region
	const center = [20, 15];
	const zoom = 3;

	// Create a simple world outline (very rough approximation)
	const worldOutline = {
		type: "FeatureCollection",
		features: [
			{
				type: "Feature",
				properties: { name: "Europe-Africa-Asia landmass" },
				geometry: {
					type: "Polygon",
					coordinates: [
						[
							[-10, 35],
							[40, 35],
							[40, 70],
							[180, 70],
							[180, -35],
							[40, -35],
							[20, -35],
							[20, -20],
							[10, -20],
							[10, 0],
							[-10, 0],
							[-10, 35],
						],
					],
				},
			},
		],
	};

	return (
		<div style={{ height: "600px", width: "100%", backgroundColor: "white" }}>
			<MapContainer
				center={center}
				zoom={zoom}
				style={{ height: "100%", width: "100%", backgroundColor: "white" }}
				maxBounds={[
					[-90, -180],
					[90, 180],
				]}
				maxBoundsViscosity={1.0}
			>
				{/* Use CartoDB Dark Matter which has clear borders */}
				<TileLayer
					url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
					attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
					subdomains="abcd"
					maxZoom={19}
					className="invert-filter"
				/>

				<style>{`
          .leaflet-container {
            background-color: white !important;
          }

          /* Invert the dark theme to make land white and show borders */
          .invert-filter {
            filter: invert(1) contrast(1.5) brightness(1.1);
          }

          /* Ensure the pane is white */
          .leaflet-tile-pane {
            background-color: white;
          }
        `}</style>
			</MapContainer>
		</div>
	);
};

export default LandOnlyMap;
