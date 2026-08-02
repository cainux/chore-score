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

	test('serves the text face from this app', async ({ page }) => {
		const requested: string[] = [];
		page.on('request', (request) => requested.push(request.url()));

		await page.goto('/display');
		await page.evaluate(() => document.fonts.ready);

		expect(requested.some((url) => url.endsWith('/fonts/inter-700.woff2'))).toBe(true);
	});

	test('declares the emoji face against its own origin', async ({ page }) => {
		// It is not fetched here — no name carries an emoji, see below — so what
		// matters is that when one does, the glyphs come from this app rather than
		// from whatever the screenshotting browser happens to carry.
		await page.goto('/display');

		const sources = await page.evaluate(() =>
			[...document.styleSheets]
				.flatMap((sheet) => [...sheet.cssRules])
				.filter((rule): rule is CSSFontFaceRule => rule instanceof CSSFontFaceRule)
				.map(
					(rule) =>
						`${rule.style.getPropertyValue('font-family')} ${rule.style.getPropertyValue('src')}`
				)
		);

		const emoji = sources.find((s) => s.includes('ChoreEmoji'));
		expect(emoji).toBeDefined();
		expect(emoji).toContain('/fonts/noto-emoji-400.woff2');
		expect(emoji).not.toMatch(/https?:\/\/(?!localhost)/);
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

	test('does not fetch the 464K emoji face when no name carries an emoji', async ({ page }) => {
		// The mitigation D15's cost note relies on: a browser fetches a webfont
		// only when a character needs it, so the big file costs nothing on the
		// renders where nobody has decorated a name.
		const requested: string[] = [];
		page.on('request', (request) => requested.push(request.url()));

		await page.goto('/display');
		await page.evaluate(() => document.fonts.ready);

		expect(requested.some((url) => url.includes('noto-emoji'))).toBe(false);
	});
});

test.describe('the display page fits its panel', () => {
	test('fits 800x480 exactly, with nothing cut off and nothing scrollable', async ({ page }) => {
		await page.goto('/display');
		await page.evaluate(() => document.fonts.ready);

		const box = await page.locator('.panel').boundingBox();
		expect(box?.width).toBe(800);
		expect(box?.height).toBe(480);

		const overflow = await page.evaluate(() => ({
			x: document.documentElement.scrollWidth - document.documentElement.clientWidth,
			y: document.documentElement.scrollHeight - document.documentElement.clientHeight
		}));
		expect(overflow).toEqual({ x: 0, y: 0 });
	});

	test('keeps the grid within the canvas', async ({ page }) => {
		await page.goto('/display');
		await page.evaluate(() => document.fonts.ready);

		const grid = await page.locator('.grid').boundingBox();
		expect(grid!.y + grid!.height).toBeLessThanOrEqual(480);
		expect(grid!.x + grid!.width).toBeLessThanOrEqual(800);
	});

	test('keeps the render stamp in its reserved band at the bottom right', async ({ page }) => {
		await page.goto('/display');
		await page.evaluate(() => document.fonts.ready);

		const stamp = await page.locator('.stamp').boundingBox();
		expect(stamp!.y + stamp!.height).toBeLessThanOrEqual(480);
		// Bottom right, not merely on the canvas somewhere.
		expect(stamp!.y).toBeGreaterThan(400);
		expect(stamp!.x + stamp!.width).toBeGreaterThan(600);
	});

	test('is complete with JavaScript disabled', async ({ browser }) => {
		// The real client runs a headless browser to take one photograph. If any
		// of this depended on script, the capture could catch the page mid-build.
		const context = await browser.newContext({
			javaScriptEnabled: false,
			viewport: { width: 800, height: 480 },
			extraHTTPHeaders: { 'x-display-key': DISPLAY_KEY }
		});
		const page = await context.newPage();
		await page.goto('/display');

		await expect(page.locator('.panel')).toBeVisible();
		expect(await page.locator('.row').count()).toBe(4);
		expect(await page.locator('.cell').count()).toBe(28);
		await expect(page.locator('.stamp')).toContainText('updated');
		await expect(page.locator('.week-label').first()).not.toBeEmpty();

		await context.close();
	});

	test('lays out at 800 on a phone, so a preview shows the whole chart', async ({ browser }) => {
		// A parent previewing from a phone must see the second week, both trophies
		// and the render stamp. Without the viewport meta the phone lays out at
		// its own width and crops to the left third of the canvas.
		//
		// This cannot affect what TRMNL captures: the screenshotter renders at an
		// 800x480 desktop viewport, where viewport meta is ignored — which the
		// sibling test below keeps honest.
		const context = await browser.newContext({
			viewport: { width: 390, height: 844 },
			isMobile: true,
			hasTouch: true,
			deviceScaleFactor: 3,
			extraHTTPHeaders: { 'x-display-key': DISPLAY_KEY }
		});
		const page = await context.newPage();
		await page.goto('/display');
		await page.evaluate(() => document.fonts.ready);

		const layout = await page.evaluate(() => ({
			width: document.documentElement.clientWidth,
			overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
		}));
		expect(layout).toEqual({ width: 800, overflow: 0 });

		// The far edge of the canvas is present, not cropped away.
		await expect(page.locator('.stamp')).toBeVisible();
		expect(await page.locator('.week-label').count()).toBe(2);
		expect(await page.locator('.trophy-col svg').count()).toBe(4);

		await context.close();
	});

	test('screenshots at exactly 800x480', async ({ page }) => {
		await page.goto('/display');
		await page.evaluate(() => document.fonts.ready);

		const shot = await page.screenshot();
		// PNG dimensions live at byte 16 of the IHDR chunk, big-endian.
		const width = shot.readUInt32BE(16);
		const height = shot.readUInt32BE(20);
		expect({ width, height }).toEqual({ width: 800, height: 480 });
	});
});
