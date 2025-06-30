import { expect, test } from "@playwright/test";

test("Expert mode can be selected from modal on /map", async ({ page }) => {
	await page.goto("http://localhost:5174/map?notour=true");

	// Wait for initial data loading to complete
	await page.waitForTimeout(15000);

	// Wait for modal to appear
	await expect(page.locator("text=Choose Your Experience")).toBeVisible({
		timeout: 10000,
	});
	await expect(page.locator("body")).toContainText("Guided Mode");
	await expect(page.locator("body")).toContainText("Expert Mode");

	// Click the expert mode card using data-testid
	await page.getByTestId("expert-mode-card").click();

	// Wait for modal to close
	await page.waitForTimeout(2000);

	// Verify expert mode is active
	await expect(page.locator("text=Choose Your Experience")).not.toBeVisible();
	await expect(page.locator("body")).toContainText("Expert Mode", {
		timeout: 10000,
	});
});

test("Expert mode appears when viewing /map/expert", async ({ page }) => {
	await page.goto("http://localhost:5174/map/expert?notour=true");

	// Check that expert mode content is present
	await expect(page.locator("body")).toContainText("Expert Mode", {
		timeout: 10000,
	});
});
