import fs from "node:fs";
import path from "node:path";
import type { Page } from "@playwright/test";

const MOCK_2016_FILE_PATH = "/tests/setup/MockResponse2258.json";
const MOCK_2017_FILE_PATH = "/tests/setup/MockResponse4823.json";
const CURRENT_YEAR = new Date().getFullYear();
const NEXT_YEAR = CURRENT_YEAR + 1;

// Helper function to create route handler that loads mock data
async function createMockHandlerForYear(mockFilePath: string) {
	return async (route) => {
		try {
			const filePath = path.join(process.cwd(), mockFilePath.substring(1));

			// Check if file exists first
			const fileExists = fs.existsSync(filePath);

			if (!fileExists) {
				await route.continue();
				return;
			}

			const mockData = JSON.parse(fs.readFileSync(filePath, "utf-8"));

			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify(mockData),
			});
		} catch (error) {
			await route.continue();
		}
	};
}

// Sets up mocks for all routes
export async function setupApiMocksWithFs(page: Page) {
	const mock2016Handler = await createMockHandlerForYear(MOCK_2016_FILE_PATH);
	const mock2017Handler = await createMockHandlerForYear(MOCK_2017_FILE_PATH);

	// Mock the 2016-07 API endpoint (baseline)
	await page.route(
		`**/api/cartesian?requested_time_point=${CURRENT_YEAR}-07-01&requested_variable_type=R0`,
		mock2016Handler,
	);

	// Mock the 2016-08 API endpoint (month navigation test)
	await page.route(
		`**/api/cartesian?requested_time_point=${CURRENT_YEAR}-08-01&requested_variable_type=R0`,
		mock2017Handler,
	);

	// Mock the 2017-07 API endpoint (year navigation test)
	await page.route(
		`**/api/cartesian?requested_time_point=${NEXT_YEAR}-07-01&requested_variable_type=R0`,
		mock2017Handler,
	);
}
