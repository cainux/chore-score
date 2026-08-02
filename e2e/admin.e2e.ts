import { expect, test, type Page } from '@playwright/test';

const ADMIN_PASSWORD = 'dev-admin-password';

// A phone, because that is what this page is for (design.md D8).
test.use({ viewport: { width: 390, height: 844 } });

test.beforeEach(async ({ page }) => {
	await page.goto('/admin/login');
	await page.getByLabel('Password').fill(ADMIN_PASSWORD);
	await page.getByRole('button', { name: 'Sign in' }).click();
	await expect(page).toHaveURL(/\/admin$/);
});

/** The today card for a child. */
const todayCard = (page: Page, name: string) =>
	page.locator('.today button').filter({ hasText: name });

/** A correction-grid control, addressed the way a screen reader would. */
const dayControl = (page: Page, label: string) => page.getByRole('button', { name: label });

test.describe('the page is laid out for a phone', () => {
	test('does not scroll horizontally at 390px', async ({ page }) => {
		const overflow = await page.evaluate(
			() => document.documentElement.scrollWidth - document.documentElement.clientWidth
		);
		expect(overflow).toBe(0);
	});

	test('gives every control at least a 44x44 touch target', async ({ page }) => {
		const controls = page.locator('button, input[type="text"], textarea');
		const count = await controls.count();
		expect(count).toBeGreaterThan(0);

		const undersized: string[] = [];
		for (let i = 0; i < count; i++) {
			const box = await controls.nth(i).boundingBox();
			if (box === null) continue;
			if (box.width < 44 || box.height < 44) {
				undersized.push(`${await controls.nth(i).evaluate((el) => el.outerHTML.slice(0, 60))}`);
			}
		}
		expect(undersized).toEqual([]);
	});

	test('shows both today controls without scrolling', async ({ page }) => {
		for (const name of ['Alice', 'Ben']) {
			const box = await todayCard(page, name).boundingBox();
			expect(box!.y + box!.height).toBeLessThanOrEqual(844);
		}
	});

	test('links to the wall display, and it opens without the header', async ({ page, context }) => {
		const link = page.getByRole('link', { name: 'Preview the wall display' });
		await expect(link).toBeVisible();

		const box = await link.boundingBox();
		expect(box!.height).toBeGreaterThanOrEqual(44);

		// The session alone is enough — this is the whole point of the link.
		const response = await context.request.get(await link.getAttribute('href')!);
		expect(response.status()).toBe(200);
	});

	test('names the date as a heading rather than as small print', async ({ page }) => {
		// A parent tapping by muscle memory will not read a caption (design.md D14).
		const heading = page.getByRole('heading', { level: 1 });
		await expect(heading).toContainText(/\w+day \d+ \w+/);
	});
});

test.describe('marking a day', () => {
	test('toggles today on and off, and the change survives a reload', async ({ page }) => {
		const card = todayCard(page, 'Alice');
		const wasEarned = (await card.getAttribute('aria-pressed')) === 'true';

		await card.click();
		await expect(card).toHaveAttribute('aria-pressed', String(!wasEarned));

		await page.reload();
		await expect(todayCard(page, 'Alice')).toHaveAttribute('aria-pressed', String(!wasEarned));

		// Put it back, so the suite leaves the data where it found it.
		await todayCard(page, 'Alice').click();
		await expect(todayCard(page, 'Alice')).toHaveAttribute('aria-pressed', String(wasEarned));
	});

	test('shows today in both surfaces, because they are one underlying mark', async ({ page }) => {
		const heading = await page.getByRole('heading', { level: 1 }).textContent();
		// "Sunday 2 August" -> the correction control reads "Alice, Sun 2 Aug".
		const [weekday, day, month] = heading!.trim().split(' ');
		const label = `Alice, ${weekday.slice(0, 3)} ${day} ${month.slice(0, 3)}`;

		const card = todayCard(page, 'Alice');
		const gridCell = dayControl(page, label);

		const before = await card.getAttribute('aria-pressed');
		await expect(gridCell).toHaveAttribute('aria-pressed', before!);

		await card.click();
		await expect(card).not.toHaveAttribute('aria-pressed', before!);
		// The correction grid followed, without a separate write.
		await expect(gridCell).not.toHaveAttribute('aria-pressed', before!);

		await card.click();
		await expect(card).toHaveAttribute('aria-pressed', before!);
	});

	test('marks a past day nine days ago exactly as it would today', async ({ page }) => {
		// Last week is the second block now that the current week leads.
		const lastWeek = page.locator('.corrections article').first().locator('.week').nth(1);
		const controls = lastWeek.locator('button:not([disabled])');
		const target = controls.first();
		const before = await target.getAttribute('aria-pressed');

		await target.click();
		await expect(target).not.toHaveAttribute('aria-pressed', before!);

		await page.reload();
		// The locator is lazy, so this is the same control resolved afresh.
		await expect(target).not.toHaveAttribute('aria-pressed', before!);

		await target.click();
		await expect(target).toHaveAttribute('aria-pressed', before!);
	});

	test('puts this week above last week, and today in the upper block', async ({ page }) => {
		const weeks = page.locator('.corrections article').first().locator('.week');
		expect(await weeks.count()).toBe(2);
		await expect(weeks.nth(0).locator('.week-name')).toHaveText('this');
		await expect(weeks.nth(1).locator('.week-name')).toHaveText('last');

		// And the labels are not merely in that order — today really is up there.
		const heading = await page.getByRole('heading', { level: 1 }).textContent();
		const [weekday, day, month] = heading!.trim().split(' ');
		const label = `Alice, ${weekday.slice(0, 3)} ${day} ${month.slice(0, 3)}`;

		await expect(weeks.nth(0).getByRole('button', { name: label })).toHaveCount(1);
		await expect(weeks.nth(1).getByRole('button', { name: label })).toHaveCount(0);
	});

	test('renders future days disabled', async ({ page }) => {
		const future = page.locator('.corrections button.future');
		for (let i = 0; i < (await future.count()); i++) {
			await expect(future.nth(i)).toBeDisabled();
		}
	});
});

test.describe('the server applies the submitted date', () => {
	test('writes the date the control carried, not the date on arrival', async ({ page }) => {
		// The property that matters (design.md D14). A request naming a specific
		// past date must land on that date — which is only true if the server does
		// not substitute its own idea of today.
		const controls = page.locator('.corrections button:not([disabled])');
		const target = controls.first();
		const label = await target.getAttribute('aria-label');
		const before = await target.getAttribute('aria-pressed');

		await target.click();
		await page.reload();

		const reloaded = page.getByRole('button', { name: label! });
		await expect(reloaded).not.toHaveAttribute('aria-pressed', before!);

		await reloaded.click();
		await expect(page.getByRole('button', { name: label! })).toHaveAttribute(
			'aria-pressed',
			before!
		);
	});

	test('rejects a forged request for a future date', async ({ page, request }) => {
		// On a Sunday the current week has no future dates left, so there is
		// nothing to forge against.
		const future = page.locator('.corrections button.future');
		test.skip((await future.count()) === 0, 'no future dates today — the week has ended');

		const label = await future.first().getAttribute('aria-label');

		const date = await page.evaluate(() => {
			const el = document.querySelector('.corrections button.future');
			return el?.closest('form')?.querySelector<HTMLInputElement>('[name=date]')?.value ?? null;
		});

		const cookies = await page.context().cookies();
		const session = cookies.find((c) => c.name === 'chore_session')!;

		const response = await request.post('/admin?/toggle', {
			headers: {
				origin: 'http://localhost:4173',
				cookie: `${session.name}=${session.value}`
			},
			form: { childId: 'alice', date: date!, earned: 'false' }
		});

		// Rejected, and nothing written.
		expect(await response.text()).toContain('future');
		await page.reload();
		await expect(page.getByRole('button', { name: label! })).toHaveAttribute(
			'aria-pressed',
			'false'
		);
	});
});

test.describe('names and task lists', () => {
	test('shows a Save button only once something differs', async ({ page }) => {
		const save = page.getByRole('button', { name: /^Save/ });
		await expect(save).toHaveCount(0);

		await page.locator('#tasks-alice').fill('Piano 15 mins daily\nSomething new');
		await expect(page.getByRole('button', { name: 'Save Alice' })).toBeVisible();
	});

	test('signals unsaved changes', async ({ page }) => {
		await page.locator('#tasks-alice').fill('Changed');
		await expect(page.getByText('Unsaved changes')).toBeVisible();
	});

	test('does not persist unsaved task text', async ({ page }) => {
		const original = await page.locator('#tasks-alice').inputValue();
		await page.locator('#tasks-alice').fill('This was never saved');

		await page.reload();
		await expect(page.locator('#tasks-alice')).toHaveValue(original);
	});

	test('saves one child without touching the other', async ({ page }) => {
		const bensTasks = await page.locator('#tasks-ben').inputValue();
		const alicesTasks = await page.locator('#tasks-alice').inputValue();

		await page.locator('#tasks-alice').fill('Piano\nReading\nBins');
		await page.getByRole('button', { name: 'Save Alice' }).click();
		await expect(page.getByRole('button', { name: 'Save Alice' })).toHaveCount(0);

		await page.reload();
		await expect(page.locator('#tasks-alice')).toHaveValue('Piano\nReading\nBins');
		await expect(page.locator('#tasks-ben')).toHaveValue(bensTasks);

		await page.locator('#tasks-alice').fill(alicesTasks);
		await page.getByRole('button', { name: 'Save Alice' }).click();
		await expect(page.getByRole('button', { name: 'Save Alice' })).toHaveCount(0);
	});

	test('warns about an over-long list without blocking the save', async ({ page }) => {
		const original = await page.locator('#tasks-alice').inputValue();

		await page
			.locator('#tasks-alice')
			.fill(Array.from({ length: 12 }, (_, i) => `Task ${i}`).join('\n'));
		await expect(page.getByText(/will not appear on the chart/)).toBeVisible();

		// The warning is advice, not a gate.
		await page.getByRole('button', { name: 'Save Alice' }).click();
		await page.reload();
		expect((await page.locator('#tasks-alice').inputValue()).split('\n')).toHaveLength(12);

		await page.locator('#tasks-alice').fill(original);
		await page.getByRole('button', { name: 'Save Alice' }).click();
		await expect(page.getByRole('button', { name: 'Save Alice' })).toHaveCount(0);
	});

	test('saves an emoji name and renders it back byte for byte', async ({ page }) => {
		await page.locator('#name-alice').fill('Alice 🎂');
		await page.getByRole('button', { name: /^Save/ }).click();

		await page.reload();
		await expect(page.locator('#name-alice')).toHaveValue('Alice 🎂');
		await expect(todayCard(page, 'Alice 🎂')).toBeVisible();

		await page.locator('#name-alice').fill('Alice');
		await page.getByRole('button', { name: /^Save/ }).click();
		await page.reload();
		await expect(page.locator('#name-alice')).toHaveValue('Alice');
	});

	test('refuses an empty name and keeps the previous one', async ({ page }) => {
		await page.locator('#name-alice').fill('   ');
		await page.getByRole('button', { name: /^Save/ }).click();

		await expect(page.getByRole('alert')).toContainText('cannot be blank');

		await page.reload();
		await expect(page.locator('#name-alice')).toHaveValue('Alice');
	});

	test('renames one child without disturbing the other or any day mark', async ({ page }) => {
		const bensName = await page.locator('#name-ben').inputValue();
		const marksBefore = await page.locator('.corrections button.earned').count();

		await page.locator('#name-alice').fill('Zoe');
		await page.getByRole('button', { name: /^Save/ }).click();
		await page.reload();

		await expect(page.locator('#name-alice')).toHaveValue('Zoe');
		await expect(page.locator('#name-ben')).toHaveValue(bensName);
		expect(await page.locator('.corrections button.earned').count()).toBe(marksBefore);

		await page.locator('#name-alice').fill('Alice');
		await page.getByRole('button', { name: /^Save/ }).click();
		await page.reload();
		await expect(page.locator('#name-alice')).toHaveValue('Alice');
	});
});
