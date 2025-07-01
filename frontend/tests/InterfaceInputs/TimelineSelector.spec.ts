// tests/map-color-change-comprehensive.spec.js
import { expect, test } from "@playwright/test";
import { skipIfMobile } from "../utils";

test.describe("Comprehensive Grid Color Analysis - Desktop Only", () => {
	test.beforeEach(async ({ page }) => {
		await page.setViewportSize({ width: 1280, height: 720 });
	});

	test("comprehensive grid color analysis across multiple years", async ({
		page,
		browserName,
	}) => {
		await skipIfMobile(page);
		test.skip(
			browserName !== "chromium",
			"This test only runs on Chromium due to SVG rendering differences with react leaflet",
		);
		// we need both as Mobile Chromium seemed to run with the above condition if we did not also skip mobile.

		await page.goto("http://localhost:5174/map/citizen?notour=true");

		// Wait for components to load
		await page.waitForSelector('[data-testid="timeline-selector"]', {
			timeout: 10000,
		});
		await page.waitForSelector(".leaflet-container", { timeout: 20000 });
		await page.waitForTimeout(10000);

		// Helper function to get colors from grid path elements
		async function getGridColors() {
			// Wait for leaflet SVG path elements to appear - try both selectors, increased time for CI.
			try {
				await page.waitForSelector('path.leaflet-interactive[fill*="#"]', {
					timeout: 60000,
				});
			} catch (e) {
				// Fallback for different path structure
				await page.waitForSelector('path[fill*="#"]', { timeout: 60000 });
			}

			// Try both selectors to find grid elements
			let gridCells = page.locator('path.leaflet-interactive[fill*="#"]');

			let count = await gridCells.count();

			// If no leaflet-interactive paths found, try general path selector
			if (count === 0) {
				gridCells = page.locator('path[fill*="#"]');
				count = await gridCells.count();
			}

			const colors = [];

			console.log(`Found ${count} grid path elements`);

			// Sample grid cells
			const sampleSize = Math.min(count, 8);
			for (let i = 0; i < sampleSize; i++) {
				const color = await gridCells.nth(i).getAttribute("fill");
				if (color && color !== "transparent") {
					colors.push(color);
				}
			}
			return colors;
		}

		// Helper function to set year using slider
		async function setYear(targetYear) {
			const yearSlider = page.locator(
				'[data-testid="timeline-selector"] .ant-slider',
			);
			await expect(yearSlider).toBeVisible();
			const sliderBox = await yearSlider.boundingBox();

			if (sliderBox) {
				// Calculate position based on year (1960-2100 range)
				const yearRange = 2100 - 1960;
				const targetPosition = (targetYear - 1960) / yearRange;
				const clickX = sliderBox.x + sliderBox.width * targetPosition;

				await page.mouse.click(clickX, sliderBox.y + sliderBox.height / 2);
				console.log(`Set year to ${targetYear}`);
				await page.waitForTimeout(4000); // Wait longer for data reload
			}
		}

		// Test multiple years
		const testYears = [2030, 2025, 2035];
		const yearColorMaps = new Map();

		for (const year of testYears) {
			await setYear(year);
			const colors = await getGridColors();
			yearColorMaps.set(year, colors);
			expect(colors.length).toBeGreaterThan(0);
		}

		// Assert colors are different between years
		const colors2030 = yearColorMaps.get(2030);
		const colors2025 = yearColorMaps.get(2025);
		const colors2035 = yearColorMaps.get(2035);

		expect(JSON.stringify(colors2030)).not.toBe(JSON.stringify(colors2025));
		expect(JSON.stringify(colors2025)).not.toBe(JSON.stringify(colors2035));

		// Validate hex color format
		yearColorMaps.forEach((colors, year) => {
			for (const color of colors) {
				expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
			}
		});
	});

	// TODO: Test model-specific year ranges
	// test("shows correct year options for selected model", async ({ page }) => {
	// 	await page.goto("http://localhost:5174/map/citizen?notour=true");
	// 	await page.waitForSelector('[data-testid="timeline-selector"]');
	//
	// 	// Select specific model from dropdown
	// 	await page.click('[data-testid="model-selector"]');
	// 	await page.click('[data-testid="model-option-climate-model-a"]');
	//
	// 	// Assert timeline shows only valid years for this model (e.g. 2020-2040)
	// 	const timelineSelector = page.locator('[data-testid="timeline-selector"]');
	// 	expect(await timelineSelector.getAttribute('data-min-year')).toBe('2020');
	// 	expect(await timelineSelector.getAttribute('data-max-year')).toBe('2040');
	// });
});
