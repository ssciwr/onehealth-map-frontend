import type { Page } from "@playwright/test";
import { test } from "@playwright/test";
import { setupApiMocksWithFs } from "./apiMocks";

/**
 * Global setup function to be called in test beforeEach hooks
 * This ensures API mocking is applied to all tests consistently
 */
export async function setupGlobalMocks(page: Page) {
	await setupApiMocksWithFs(page);
}

// Auto-apply to all tests by extending the base test
test.beforeEach(async ({ page }) => {
	await setupGlobalMocks(page);
});
