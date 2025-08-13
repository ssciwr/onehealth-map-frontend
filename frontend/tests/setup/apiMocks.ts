import type { Page } from "@playwright/test";

const MOCK_2016_FILE_PATH = "/tests/setup/MockResponse2258.json";
const MOCK_2017_FILE_PATH = "/tests/setup/MockResponse4823.json";

interface MockResponse {
	result: {
		"latitude, longitude, var_value": number[][];
	};
}

export async function setupApiMocks(page: Page) {
	const mockData = (await import(MOCK_2017_FILE_PATH)) as MockResponse;

	await page.route(
		"**/api/cartesian?requested_time_point=2016-07-01&requested_variable_value=R0",
		async (route) => {
			try {
				const mockData = (await import(MOCK_2016_FILE_PATH)) as MockResponse;
				await route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify(mockData),
				});
			} catch (error) {
				console.warn("Failed to load mock data for 2016:", error);
				await route.continue();
			}
		},
	);

	const returnFakeAlternateData = async (route) => {
		try {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify(mockData),
			});
		} catch (error) {
			console.warn("Failed to load mock data for 2017:", error);
			await route.continue();
		}
	};

	await page.route(
		"**/api/cartesian?requested_time_point=2016-08-01&requested_variable_value=R0",
		async (route) => {
			console.log("2016-08 route hit.");
			return await returnFakeAlternateData(route);
		},
	);

	// Mock the alternative data endpoint, this is either 2017 or the 8th month (august) instead of July for the month test.
	await page.route(
		"**/api/cartesian?requested_time_point=2017-07-01&requested_variable_value=R0",
		async (route) => {
			return await returnFakeAlternateData(route);
		},
	);
}

// Helper function to create route handler that loads mock data
async function createMockHandler(mockFilePath: string) {
	console.log(`[DEBUG] Creating mock handler for: ${mockFilePath}`);

	const fs = await import("node:fs");
	const path = await import("node:path");

	console.log("[DEBUG] fs module:", typeof fs, Object.keys(fs));
	console.log("[DEBUG] path module:", typeof path, Object.keys(path));

	return async (route) => {
		console.log(`[DEBUG] Mock handler called for: ${route.request().url()}`);
		try {
			const filePath = path.default.join(
				process.cwd(),
				mockFilePath.substring(1),
			);
			console.log(`[DEBUG] Attempting to read file: ${filePath}`);

			// Check if file exists first
			const fileExists = fs.default.existsSync(filePath);
			console.log(`[DEBUG] File exists: ${fileExists}`);

			if (!fileExists) {
				console.error(`[DEBUG] File not found: ${filePath}`);
				await route.continue();
				return;
			}

			const mockData = JSON.parse(fs.default.readFileSync(filePath, "utf-8"));
			console.log(
				"[DEBUG] Successfully loaded mock data, keys:",
				Object.keys(mockData),
			);

			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify(mockData),
			});
			console.log("[DEBUG] Successfully fulfilled route with mock data");
		} catch (error) {
			console.error(
				`[DEBUG] Error in mock handler for ${mockFilePath}:`,
				error,
			);
			console.error("[DEBUG] Error stack:", error.stack);
			await route.continue();
		}
	};
}

// Alternative approach using fs if imports don't work
export async function setupApiMocksWithFs(page: Page) {
	console.log("[DEBUG] Setting up API mocks with FS approach");
	console.log(`[DEBUG] Current working directory: ${process.cwd()}`);
	console.log(`[DEBUG] MOCK_2016_FILE_PATH: ${MOCK_2016_FILE_PATH}`);
	console.log(`[DEBUG] MOCK_2017_FILE_PATH: ${MOCK_2017_FILE_PATH}`);

	const mock2016Handler = await createMockHandler(MOCK_2016_FILE_PATH);
	const mock2017Handler = await createMockHandler(MOCK_2017_FILE_PATH);

	// Mock the 2016-07 API endpoint (baseline)
	console.log("[DEBUG] Setting up route for 2016-07-01");
	await page.route(
		"**/api/cartesian?requested_time_point=2016-07-01&requested_variable_value=R0",
		mock2016Handler,
	);

	// Mock the 2016-08 API endpoint (month navigation test)
	console.log("[DEBUG] Setting up route for 2016-08-01");
	await page.route(
		"**/api/cartesian?requested_time_point=2016-08-01&requested_variable_value=R0",
		mock2017Handler,
	);

	// Mock the 2017-07 API endpoint (year navigation test)
	console.log("[DEBUG] Setting up route for 2017-07-01");
	await page.route(
		"**/api/cartesian?requested_time_point=2017-07-01&requested_variable_value=R0",
		mock2017Handler,
	);

	console.log("[DEBUG] All API mocks setup complete");
}
