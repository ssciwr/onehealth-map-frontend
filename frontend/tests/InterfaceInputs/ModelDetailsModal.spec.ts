import { expect, test } from "@playwright/test";

test.describe("ModelDetailsModal", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("http://localhost:5174/map/expert?notour=true");
	});

	test("Model details dropdown should open and allow the user to view all models", async ({
		page,
	}, testInfo) => {
		const dropdownTrigger = page
			.locator('button:has-text("Data Source")')
			.first() // pre-load
			.or(
				page.locator('button:has-text("West Nile Virus - Model A17")').first(),
			) // once loaded
			.or(page.locator('button:has-text("West Nile Virus - Mo...")').first()); // mobile
		// so the data loads in at different speeds when you use parallel tests, the West NIle is the default one.
		// Data Source only shows until it loads in.

		await expect(dropdownTrigger).toBeVisible();
		await dropdownTrigger.click();

		await page.waitForTimeout(1000);

		const viewAllModelsOption = page.locator(
			'text="View Details & Compare Models"',
		);

		// only desktop has the quick switch preview, mobile goes right to the modal due to spacing concerns.
		if (await viewAllModelsOption.isVisible()) {
			await viewAllModelsOption.click();
		}

		const modal = page.locator('[data-testid="model-details-modal"]');

		await expect(modal).toBeVisible();

		// Step 4: Verify modal title
		const modalTitle = page.locator('text="Disease Model Details"');
		await expect(modalTitle).toBeVisible();

		await expect(page.locator('text="Available Models"')).toBeVisible();

		// Only run this assertion on non-mobile devices
		if (!testInfo.project.name.toLowerCase().includes("mobile")) {
			const subtitleElement = page.locator(
				'text="Compare and select disease models for climate analysis"',
			);

			// Check if element exists and is not hidden
			await expect(subtitleElement).toBeAttached();
			const isHidden = await subtitleElement.getAttribute("hidden");

			if (isHidden === null || isHidden === "false") {
				await expect(subtitleElement).toBeVisible();
			}
		}
	});
});
