import type { Page } from "@playwright/test";

const MOCK_2016_FILE_PATH = "/tests/setup/MockResponse2258.json";
const MOCK_2017_FILE_PATH = "/tests/setup/MockResponse4823.json";

// Helper function to create route handler that loads mock data
async function createMockHandlerForYear(mockFilePath: string) {
	console.log("Now using normal mocks");
	const fs = await import("node:fs");
	const path = await import("node:path");
	return async (route) => {
		try {
			const filePath = path.default.join(
				process.cwd(),
				mockFilePath.substring(1),
			);

			// Check if file exists first
			const fileExists = fs.default.existsSync(filePath);

			if (!fileExists) {
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
		} catch (error) {
			console.error(
				`[DEBUG] Error in mock handler for ${mockFilePath}:`,
				error,
			);
			await route.continue();
		}
	};
}

// SEts up mocks for all routes
export async function setupApiMocksWithFs(page: Page) {
	const mock2016Handler = await createMockHandlerForYear(MOCK_2016_FILE_PATH);
	const mock2017Handler = await createMockHandlerForYear(MOCK_2017_FILE_PATH);

	// Mock the 2016-07 API endpoint (baseline)
	await page.route(
		"**/api/cartesian?requested_time_point=2016-07-01&requested_variable_value=R0",
		mock2016Handler,
	);

	// Mock the 2016-08 API endpoint (month navigation test)
	await page.route(
		"**/api/cartesian?requested_time_point=2016-08-01&requested_variable_value=R0",
		mock2017Handler,
	);

	// Mock the 2017-07 API endpoint (year navigation test)
	await page.route(
		"**/api/cartesian?requested_time_point=2017-07-01&requested_variable_value=R0",
		mock2017Handler,
	);
}
