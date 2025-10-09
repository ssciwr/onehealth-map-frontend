#!/usr/bin/env node

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const url = require("node:url");

const PORT = 8001;
const DATA_DIR = path.join(__dirname, "../../public/mockapidata");

// Define regions with their coordinate bounds [lat1, lon1, lat2, lon2]
const REGIONS = [
	{ name: "data_50_8_48_10", bounds: [50, 8, 48, 10] },
	{ name: "data_51_7_48_11", bounds: [51, 7, 48, 11] },
	{ name: "data_55_6_47_15", bounds: [55, 6, 47, 15] },
	{ name: "data_55_5_45_25", bounds: [55, 5, 45, 25] },
	{ name: "data_70_-10_35_40", bounds: [70, -10, 35, 40] },
	{ name: "data_90_-180_-90_180", bounds: [90, -180, -90, 180] },
];

function calculateOverlap(requestBounds, regionBounds) {
	const [reqLat1, reqLon1, reqLat2, reqLon2] = requestBounds;
	const [regLat1, regLon1, regLat2, regLon2] = regionBounds;

	// Calculate intersection bounds
	const intersectLat1 = Math.min(reqLat1, regLat1);
	const intersectLon1 = Math.max(reqLon1, regLon1);
	const intersectLat2 = Math.max(reqLat2, regLat2);
	const intersectLon2 = Math.min(reqLon2, regLon2);

	// Check if there's an intersection
	if (intersectLat1 <= intersectLat2 || intersectLon1 >= intersectLon2) {
		return 0;
	}

	// Calculate areas
	const intersectArea = Math.abs(
		(intersectLat1 - intersectLat2) * (intersectLon2 - intersectLon1),
	);
	const requestArea = Math.abs((reqLat1 - reqLat2) * (reqLon2 - reqLon1));

	return intersectArea / requestArea;
}

function findBestRegion(requestBounds) {
	// Sort regions by area (smallest first)
	const sortedRegions = REGIONS.sort((a, b) => {
		const areaA = Math.abs(
			(a.bounds[0] - a.bounds[2]) * (a.bounds[3] - a.bounds[1]),
		);
		const areaB = Math.abs(
			(b.bounds[0] - b.bounds[2]) * (b.bounds[3] - b.bounds[1]),
		);
		return areaA - areaB;
	});

	// Find the smallest region with >50% overlap
	for (const region of sortedRegions) {
		const overlap = calculateOverlap(requestBounds, region.bounds);
		if (overlap > 0.5) {
			return region;
		}
	}

	// If no region has >50% overlap, return the largest (global) region
	return sortedRegions[sortedRegions.length - 1];
}

function handleCartesianRequest(req, res) {
	if (req.method !== "POST") {
		res.writeHead(405, { "Content-Type": "application/json" });
		res.end(JSON.stringify({ error: "Method not allowed" }));
		return;
	}

	let body = "";
	req.on("data", (chunk) => {
		body += chunk.toString();
	});

	req.on("end", () => {
		try {
			const requestBounds = JSON.parse(body);

			if (!Array.isArray(requestBounds) || requestBounds.length !== 4) {
				res.writeHead(400, { "Content-Type": "application/json" });
				res.end(
					JSON.stringify({
						error:
							"Invalid coordinates format. Expected [lat1, lon1, lat2, lon2]",
					}),
				);
				return;
			}

			const bestRegion = findBestRegion(requestBounds);
			const dataFile = path.join(DATA_DIR, `${bestRegion.name}.json`);

			if (!fs.existsSync(dataFile)) {
				res.writeHead(404, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ error: "Data file not found" }));
				return;
			}

			const data = fs.readFileSync(dataFile, "utf8");

			res.writeHead(200, {
				"Content-Type": "application/json",
				"Access-Control-Allow-Origin": "*",
				"Access-Control-Allow-Methods": "POST, OPTIONS",
				"Access-Control-Allow-Headers": "Content-Type",
			});
			res.end(data);
		} catch (error) {
			res.writeHead(400, { "Content-Type": "application/json" });
			res.end(JSON.stringify({ error: "Invalid JSON in request body" }));
		}
	});
}

function handleOptionsRequest(req, res) {
	res.writeHead(200, {
		"Access-Control-Allow-Origin": "*",
		"Access-Control-Allow-Methods": "POST, OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type",
	});
	res.end();
}

const server = http.createServer((req, res) => {
	const parsedUrl = url.parse(req.url, true);

	if (req.method === "OPTIONS") {
		handleOptionsRequest(req, res);
		return;
	}

	if (parsedUrl.pathname === "/cartesian") {
		handleCartesianRequest(req, res);
		return;
	}

	res.writeHead(404, { "Content-Type": "application/json" });
	res.end(JSON.stringify({ error: "Not found" }));
});

server.listen(PORT, () => {
	console.log(`Mock API server running on http://localhost:${PORT}`);
	console.log("Available regions:");
	for (const region of REGIONS) {
		const [lat1, lon1, lat2, lon2] = region.bounds;
		console.log(`  ${region.name}: [${lat1}, ${lon1}, ${lat2}, ${lon2}]`);
	}
});
