import { test, expect } from '@playwright/test';

test('Map option appears when viewing /map', async ({ page }) => {
    await page.goto('http://localhost:5174/map');

    // ensure user is prompted in modal to choose between learn mode and expert mode.
    await expect(page.locator('body')).toContainText('What view do you prefer?');
    await expect(page.locator('body')).toContainText('I want to learn/explore');
    await expect(page.locator('body')).toContainText('I want complete details as an expert');
    await page.locator('text=I want complete details as an expert').click();

    await expect(page.locator('body')).toContainText('Expert Mode');
});

test('Expert mode appears when viewing /map/expert', async ({ page }) => {
    await page.goto('http://localhost:5174/map/expert');

    // Check that expert mode content is present
    await expect(page.locator('body')).toContainText('Expert Mode');
});