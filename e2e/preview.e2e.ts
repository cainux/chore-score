import { expect, test, type Page } from '@playwright/test';

const ADMIN_PASSWORD = 'dev-admin-password';

// A desktop, because two tabs side by side is the whole reason this route
// exists (design.md D21).
test.use({ viewport: { width: 1280, height: 900 } });

async function signIn(page: Page) {
	await page.goto('/admin/login');
	await page.getByLabel('Password').fill(ADMIN_PASSWORD);
	await page.getByRole('button', { name: 'Sign in' }).click();
	await expect(page).toHaveURL(/\/admin$/);
}

/** Alice's row in the current week — the grid is week-major. */
const aliceCurrentWeek = (page: Page) => page.locator('.row').first();

/** The admin page's correction-grid control for today's date, for a given child. */
async function todayControl(page: Page, name: string) {
	const heading = await page.getByRole('heading', { level: 1 }).textContent();
	// "Sunday 2 August" -> the correction control reads "Alice, Sun 2 Aug".
	const [weekday, day, month] = heading!.trim().split(' ');
	return page.getByRole('button', {
		name: `${name}, ${weekday.slice(0, 3)} ${day} ${month.slice(0, 3)}`
	});
}

test.describe('the live preview renders the panel canvas', () => {
	test.beforeEach(async ({ page }) => {
		await signIn(page);
	});

	test('draws the same 800x480 canvas the panel is served', async ({ page }) => {
		await page.goto('/admin/preview');

		// Laid out at its true width whatever the window is doing, because that is
		// what makes the clipping faithful (design.md D20).
		const box = await page.locator('.panel').boundingBox();
		expect(box?.width).toBe(800);
		expect(box?.height).toBe(480);

		// The whole chart, not a fragment of it: two children, two weeks each.
		expect(await page.locator('.row').count()).toBe(4);
		expect(await page.locator('.cell').count()).toBe(28);
		await expect(page.locator('.stamp')).toContainText('updated');
	});

	test('exposes no way to change anything', async ({ page }) => {
		// It is a rendering of the chart and nothing else — exactly as the display
		// route is. Editing happens on the admin page.
		await page.goto('/admin/preview');
		await expect(page.locator('.panel')).toBeVisible();

		expect(await page.locator('button, input, select, textarea, [contenteditable]').count()).toBe(
			0
		);
		expect(await page.locator('form').count()).toBe(0);
	});

	test('scales from the top left, so the canvas stays anchored', async ({ page }) => {
		await page.goto('/admin/preview');

		const origin = await page
			.locator('.canvas')
			.evaluate((el) => getComputedStyle(el).transformOrigin);
		// `0px 0px` — anything else and the canvas drifts as the scale changes.
		expect(origin.startsWith('0px 0px')).toBe(true);
	});
});

test.describe('the live preview follows the admin page', () => {
	test('shows a day toggled in another tab, without being reloaded', async ({ context }) => {
		const admin = await context.newPage();
		await signIn(admin);

		const preview = await context.newPage();
		await preview.goto('/admin/preview');
		await expect(preview.locator('.panel')).toBeVisible();

		const stars = aliceCurrentWeek(preview).locator('.cell svg');
		const before = await stars.count();

		const cell = await todayControl(admin, 'Alice');
		const wasEarned = (await cell.getAttribute('aria-pressed')) === 'true';
		await cell.click();
		await expect(cell).toHaveAttribute('aria-pressed', String(!wasEarned));

		// No reload, no interaction with the preview at all: the nudge crosses the
		// BroadcastChannel and the preview re-reads the server (design.md D17).
		await expect(stars).toHaveCount(wasEarned ? before - 1 : before + 1);

		// Put it back, so the next test in the shared database starts where this
		// one found things.
		await cell.click();
		await expect(stars).toHaveCount(before);

		await admin.close();
		await preview.close();
	});

	test('shows saved task text laid out on the canvas', async ({ context }) => {
		const admin = await context.newPage();
		await signIn(admin);

		const preview = await context.newPage();
		await preview.goto('/admin/preview');
		await expect(preview.locator('.panel')).toBeVisible();

		const tasks = admin.locator('#tasks-alice');
		const original = await tasks.inputValue();
		const marker = `Feed the cat ${Date.now()}`;

		await tasks.fill(marker);
		await admin.getByRole('button', { name: /^Save Alice/ }).click();

		await expect(preview.locator('.task-block').first()).toContainText(marker);

		await tasks.fill(original);
		await admin.getByRole('button', { name: /^Save Alice/ }).click();
		await expect(preview.locator('.task-block').first()).not.toContainText(marker);

		await admin.close();
		await preview.close();
	});

	test('does not show text that was typed but never saved', async ({ context }) => {
		// The preview shows stored state only. Draft text lives in the admin tab's
		// memory and never reaches the server, so a second tab cannot see it.
		const admin = await context.newPage();
		await signIn(admin);

		const preview = await context.newPage();
		await preview.goto('/admin/preview');
		await expect(preview.locator('.panel')).toBeVisible();

		const unsaved = `Never saved ${Date.now()}`;
		await admin.locator('#tasks-alice').fill(unsaved);
		await expect(admin.getByText('Unsaved changes').first()).toBeVisible();

		await expect(preview.locator('.panel')).not.toContainText(unsaved);

		await admin.close();
		await preview.close();
	});
});
