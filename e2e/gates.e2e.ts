import { expect, test, type APIRequestContext, type APIResponse } from '@playwright/test';

// The gates live in hooks.server.ts and read Worker bindings, so this is the
// lane that can actually exercise them: a real build, in real workerd, driven
// over HTTP the way TRMNL and a phone will drive it.
//
// Values match .dev.vars, which wrangler dev loads.
const DISPLAY_KEY = 'dev-display-key';
const ADMIN_PASSWORD = 'dev-admin-password';
const BASE_URL = 'http://localhost:4173';

/**
 * Posts the login form.
 *
 * The Origin header is not optional: without it SvelteKit's CSRF protection
 * rejects the request with a 403 before the action runs, and a test comparing
 * two identical 403s would pass without ever reaching the code it names.
 */
function postLogin(
	request: APIRequestContext,
	password: string,
	headers: Record<string, string> = {}
): Promise<APIResponse> {
	return request.post('/admin/login', {
		headers: { origin: BASE_URL, ...headers },
		form: { password },
		maxRedirects: 0
	});
}

/** The session cookie a response hands out, if any. */
function sessionCookieIn(response: APIResponse): string | undefined {
	return response
		.headersArray()
		.find((h) => h.name.toLowerCase() === 'set-cookie' && h.value.startsWith('chore_session='))
		?.value;
}

test.describe('the display gate', () => {
	test('serves the chart to a request carrying the key', async ({ request }) => {
		const response = await request.get('/display', {
			headers: { 'x-display-key': DISPLAY_KEY }
		});
		expect(response.status()).toBe(200);
	});

	test('rejects a request with no key', async ({ request }) => {
		const response = await request.get('/display');
		expect(response.status()).toBe(401);
	});

	test('rejects a request with the wrong key', async ({ request }) => {
		const response = await request.get('/display', {
			headers: { 'x-display-key': 'not-the-key' }
		});
		expect(response.status()).toBe(401);
	});

	test('returns no chart data when rejected', async ({ request }) => {
		const response = await request.get('/display');
		expect(await response.text()).not.toContain('Chore chart');
	});

	test('sets Cache-Control: no-store, so TRMNL never captures a cached chart', async ({
		request
	}) => {
		const response = await request.get('/display', {
			headers: { 'x-display-key': DISPLAY_KEY }
		});
		expect(response.headers()['cache-control']).toBe('no-store');
	});
});

test.describe('the admin gate', () => {
	test('sends an unauthenticated visitor to the login page', async ({ page }) => {
		await page.goto('/admin');
		await expect(page).toHaveURL(/\/admin\/login$/);
	});

	test('shows no chart data before signing in', async ({ request }) => {
		const response = await request.get('/admin', { maxRedirects: 0 });
		expect(response.status()).toBe(303);
		expect(await response.text()).not.toContain('admin');
	});

	test('admits the correct password', async ({ page }) => {
		await page.goto('/admin/login');
		await page.getByLabel('Password').fill(ADMIN_PASSWORD);
		await page.getByRole('button', { name: 'Sign in' }).click();
		await expect(page).toHaveURL(/\/admin$/);
	});

	test('keeps the session across a reload', async ({ page }) => {
		await page.goto('/admin/login');
		await page.getByLabel('Password').fill(ADMIN_PASSWORD);
		await page.getByRole('button', { name: 'Sign in' }).click();
		await expect(page).toHaveURL(/\/admin$/);

		await page.reload();
		await expect(page).toHaveURL(/\/admin$/);
	});

	test('refuses the wrong password without hinting at what was wrong', async ({ page }) => {
		await page.goto('/admin/login');
		await page.getByLabel('Password').fill('not-the-password');
		await page.getByRole('button', { name: 'Sign in' }).click();

		await expect(page.getByRole('alert')).toHaveText('That password was not recognised.');
		await expect(page).toHaveURL(/\/admin\/login$/);
	});

	test('gives the same response for an empty password as for a wrong one', async ({ request }) => {
		const wrong = await postLogin(request, 'not-the-password');
		const empty = await postLogin(request, '');

		// Identical bodies, and neither hands out a session. The status is not
		// asserted because SvelteKit renders a failed action as a 200 page for a
		// non-JS form post — the refusal is in the body, not the status line.
		expect(await empty.text()).toBe(await wrong.text());
		expect(await wrong.text()).toContain('not recognised');
		expect(sessionCookieIn(wrong)).toBeUndefined();
		expect(sessionCookieIn(empty)).toBeUndefined();
	});

	test('issues the session cookie HttpOnly, Secure and SameSite=Lax', async ({ context, page }) => {
		await page.goto('/admin/login');
		await page.getByLabel('Password').fill(ADMIN_PASSWORD);
		await page.getByRole('button', { name: 'Sign in' }).click();
		await expect(page).toHaveURL(/\/admin$/);

		const session = (await context.cookies()).find((c) => c.name === 'chore_session');
		expect(session).toBeDefined();
		expect(session?.httpOnly).toBe(true);
		expect(session?.secure).toBe(true);
		expect(session?.sameSite).toBe('Lax');
	});

	test('treats a tampered cookie as unauthenticated', async ({ context, page }) => {
		await page.goto('/admin/login');
		await page.getByLabel('Password').fill(ADMIN_PASSWORD);
		await page.getByRole('button', { name: 'Sign in' }).click();
		await expect(page).toHaveURL(/\/admin$/);

		const cookies = await context.cookies();
		const session = cookies.find((c) => c.name === 'chore_session');
		await context.clearCookies();
		await context.addCookies([{ ...session!, value: `${Date.now()}.forged-signature` }]);

		await page.goto('/admin');
		await expect(page).toHaveURL(/\/admin\/login$/);
	});
});

// design.md D4: the two mechanisms are independent, and neither stands in for
// the other. If either of these ever passes, the display key — which lives in a
// third party's plugin config and is sent on every poll — has become a way to
// edit the chart, or a parent's session has become a way to bypass the header.
test.describe('the gates do not overlap', () => {
	test('an admin session does not open the display route', async ({ page, context }) => {
		await page.goto('/admin/login');
		await page.getByLabel('Password').fill(ADMIN_PASSWORD);
		await page.getByRole('button', { name: 'Sign in' }).click();
		await expect(page).toHaveURL(/\/admin$/);

		// Same browser context, so the session cookie is sent with this request.
		const response = await context.request.get('/display');
		expect(response.status()).toBe(401);
	});

	test('the display header does not open the admin page', async ({ request }) => {
		const response = await request.get('/admin', {
			headers: { 'x-display-key': DISPLAY_KEY },
			maxRedirects: 0
		});
		expect(response.status()).toBe(303);
		expect(response.headers()['location']).toContain('/admin/login');
	});

	test('the display header does not authenticate a login POST', async ({ request }) => {
		const response = await postLogin(request, 'not-the-password', {
			'x-display-key': DISPLAY_KEY
		});
		expect(await response.text()).toContain('not recognised');
		expect(sessionCookieIn(response)).toBeUndefined();
	});
});
