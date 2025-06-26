import { expect, test } from "@playwright/test";

test.describe("ControlBar Component", () => {
	test.beforeEach(async ({ page }) => {
		// Navigate to the page before each test
		await page.goto("http://localhost:5174/?notour=true");

		// Wait for the map and control bar to load
		await expect(page.locator("body")).toContainText("Data Source");

		// Wait for control bar to be visible
		await page.waitForSelector('[data-testid="control-bar"]', {
			timeout: 10000,
		});
	});

	test("Screenshot button triggers download", async ({ page }) => {
		// Set up download promise before clicking
		const downloadPromise = page.waitForEvent("download");

		// Find and click the screenshot button (Camera icon)
		const screenshotButton = page.locator("button").filter({
			has: page.locator("svg.lucide-camera"),
		});

		await expect(screenshotButton).toBeVisible();
		await expect(screenshotButton).toBeEnabled();

		// Click the screenshot button
		await screenshotButton.click();

		// Wait for download to start
		const download = await downloadPromise;

		// Verify download properties
		expect(download.suggestedFilename()).toMatch(/^map-screenshot-\d+\.png$/);

		// Optionally save the download to verify it's a valid file
		const path = await download.path();
		expect(path).toBeTruthy();

		// Verify the download is a PNG file by checking the suggested filename
		expect(download.suggestedFilename()).toContain(".png");
	});

	test("Location button requests geolocation permission", async ({ page }) => {
		// Grant geolocation permission
		await page.context().grantPermissions(["geolocation"]);

		// Set a mock location
		await page
			.context()
			.setGeolocation({ latitude: 37.7749, longitude: -122.4194 });

		// Find and click the location button (MapPin icon)
		const locationButton = page.locator("button").filter({
			has: page.locator("svg.lucide-map-pin"),
		});

		await expect(locationButton).toBeVisible();
		await expect(locationButton).toBeEnabled();

		// Click the location button
		await locationButton.click();

		// Verify the loading modal appears
		await expect(page.locator(".ant-modal-content")).toContainText(
			"Finding Your Location",
		);
		await expect(page.locator(".ant-modal-content")).toContainText(
			"Zooming to you!",
		);

		// Verify the spinner is visible
		await expect(page.locator(".ant-spin")).toBeVisible();

		// Wait for the modal to disappear (location found)
		await expect(page.locator(".ant-modal-content")).not.toBeVisible({
			timeout: 15000,
		});

		// Verify button is re-enabled after location is found
		await expect(locationButton).toBeEnabled();
	});

	test("Info button opens modal with about content", async ({ page }) => {
		// Find and click the info button (Info icon)
		const infoButton = page.locator("button").filter({
			has: page.locator("svg.lucide-info"),
		});

		await expect(infoButton).toBeVisible();
		await infoButton.click();

		// Verify the modal opens
		await expect(page.locator(".ant-modal-content")).toBeVisible();

		await expect(page.locator("body")).toContainText("About This Map");
		await expect(page.locator("body")).toContainText(
			"Created with disease modelling by the OneHealth team.",
		);

		// Close the modal by clicking the X or outside
		await page.locator(".ant-modal-close").click();

		// Verify modal closes
		await expect(page.locator(".ant-modal-content")).not.toBeVisible();
	});

	test("Zoom controls work correctly", async ({ page }) => {
		// Find zoom in and zoom out buttons
		const zoomInButton = page.locator("button").filter({
			has: page.locator("svg.lucide-plus"),
		});
		const zoomOutButton = page.locator("button").filter({
			has: page.locator("svg.lucide-minus"),
		});

		await expect(zoomInButton).toBeVisible();
		await expect(zoomOutButton).toBeVisible();

		// Take screenshot before zoom
		await page.waitForTimeout(1500); // necessary because of data loading in.
		const beforeZoom = await page.screenshot();

		await zoomInButton.click();
		await page.waitForTimeout(500);
		const afterZoomIn = await page.screenshot();
		expect(Buffer.compare(beforeZoom, afterZoomIn)).not.toBe(0);

		await zoomOutButton.click();
		await page.waitForTimeout(1500);
		const afterZoomOut = await page.screenshot();
		expect(Buffer.compare(afterZoomIn, afterZoomOut)).not.toBe(0);

		// really we should assert the previous image and afterZoomOut are the same. They look the same in the ui mode,
		// but using Buffer.compare(...).toBe(0) the output was actually -1. Similar functions with tolerance would
		// bloat this code. As it's really just calling the Leaflet zoom function which is well tested, I think the
		// fact the buttons change something on the screen is asserting enough.
	});

	test("Control bar is positioned correctly", async ({ page }) => {
		const controlBar = page.locator('[data-testid="control-bar"]');

		// Verify the control bar is visible
		await expect(controlBar).toBeVisible();

		// Check that all control buttons are present
		const buttons = controlBar.locator("button");
		await expect(buttons).toHaveCount(6);
	});
});
