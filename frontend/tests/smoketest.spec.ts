import { expect, test } from "@playwright/test";

test("Frontend loads in browser", async ({ page }) => {
	await page.goto("http://localhost:5174/?notour=true");

	await expect(page.locator("body")).toContainText("Data Source");
});
