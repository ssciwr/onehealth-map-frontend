import { test } from "@playwright/test";

export const skipIfMobile = async (page) => {
	const userAgent = await page.evaluate(() => navigator.userAgent);
	test.skip(
		userAgent.includes("Mobile") ||
			userAgent.includes("Android") ||
			userAgent.includes("iPhone"),
		"Skipping on mobile devices",
	);
};
