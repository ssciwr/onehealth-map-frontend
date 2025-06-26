import { expect, test } from "@playwright/test";

test("Map option appears when viewing /map", async ({ page }) => {
	await page.goto("http://localhost:5174/map");

	// First, dismiss the onboarding tour if it appears
	try {
		// Wait for and dismiss the tour
		const skipTourButton = page.locator('button:has-text("Skip Tour")');

		// Wait for the skip button and click it
		await skipTourButton.waitFor({ timeout: 5000 });
		await skipTourButton.click();

		// Wait for the tour content to disappear
		await expect(page.locator("text=Choose Disease to model")).not.toBeVisible({
			timeout: 5000,
		});
	} catch (error) {
		// Tour might not appear, continue with test
		console.log("No tour found, continuing with test");
	}

	// ensure user is prompted in modal to choose between learn mode and expert mode.
	await expect(page.locator("text=Choose Your Experience")).toBeVisible({
		timeout: 10000,
	});
	await expect(page.locator("body")).toContainText("Guided");
	await expect(page.locator("body")).toContainText("Expert");

	await page.locator("text=Expert").first().click();

	await expect(page.locator("body")).toContainText("Expert Mode");
});

test("Expert mode appears when viewing /map/expert", async ({ page }) => {
	await page.goto("http://localhost:5174/map/expert");

	// Check that expert mode content is present
	await expect(page.locator("body")).toContainText("Expert Mode");
});
