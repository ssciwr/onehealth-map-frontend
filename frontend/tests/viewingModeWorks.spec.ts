import { expect, test } from "@playwright/test";

test("Map option appears when viewing /map", async ({ page }) => {
	await page.goto("http://localhost:5174/map?notour=true");

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
	await page.goto("http://localhost:5174/map/expert?notour=true");

	// Check that expert mode content is present
	await expect(page.locator("body")).toContainText("Expert Mode");
});
