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

// Alternative approach using fs if imports don't work
export async function setupApiMocksWithFs(page: Page) {
	const fs = await import("fs");
	const path = await import("path");

	// Mock the 2016 API endpoint
	await page.route(
		"**/api/cartesian?requested_time_point=2016-07-01&requested_variable_value=R0",
		async (route) => {
			try {
				const filePath = path.join(
					process.cwd(),
					MOCK_2016_FILE_PATH.substring(1),
				); // Remove leading slash
				const mockData = JSON.parse(fs.readFileSync(filePath, "utf-8"));
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

	// Mock the 2017 API endpoint
	await page.route(
		"**/api/cartesian?requested_time_point=2017-07-01&requested_variable_value=R0",
		async (route) => {
			try {
				const filePath = path.join(
					process.cwd(),
					MOCK_2017_FILE_PATH.substring(1),
				); // Remove leading slash
				const mockData = JSON.parse(fs.readFileSync(filePath, "utf-8"));
				await route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify(mockData),
				});
			} catch (error) {
				console.warn("Failed to load mock data for 2017:", error);
				await route.continue();
			}
		},
	);
}
