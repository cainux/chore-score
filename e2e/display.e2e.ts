import { expect, test } from '@playwright/test';

const DISPLAY_KEY = 'dev-display-key';
const BASE_URL = 'http://localhost:4173';

test.use({
	extraHTTPHeaders: { 'x-display-key': DISPLAY_KEY },
	viewport: { width: 800, height: 480 }
});

test.describe('the display page makes no external requests', () => {
	test('requests nothing off its own origin', async ({ page }) => {
		const requested: string[] = [];
		page.on('request', (request) => requested.push(request.url()));

		await page.goto('/display');
		await page.evaluate(() => document.fonts.ready);

		const external = requested.filter((url) => !url.startsWith(BASE_URL));
		expect(external).toEqual([]);
	});

	test('serves both bundled fonts from this app', async ({ page }) => {
		const requested: string[] = [];
		page.on('request', (request) => requested.push(request.url()));

		await page.goto('/display');
		await page.evaluate(() => document.fonts.ready);

		expect(requested.some((url) => url.endsWith('/fonts/inter-700.woff2'))).toBe(true);
		expect(requested.some((url) => url.endsWith('/fonts/noto-emoji-400.woff2'))).toBe(true);
	});

	test('actually applies the bundled text face rather than a fallback', async ({ page }) => {
		await page.goto('/display');
		await page.evaluate(() => document.fonts.ready);

		// A loaded face means the file arrived and parsed; a fallback would leave
		// the set empty while the page still looked plausible in a screenshot.
		const loaded = await page.evaluate(() =>
			[...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family)
		);
		expect(loaded).toContain('ChoreText');
	});

	test('renders emoji from the bundled monochrome face', async ({ page }) => {
		await page.goto('/display');
		await page.evaluate(() => document.fonts.ready);

		const loaded = await page.evaluate(() =>
			[...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family)
		);
		expect(loaded).toContain('ChoreEmoji');
	});
});
