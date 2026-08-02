import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';

// Proves the `workers` project is wired up: tests run in workerd and the
// bindings in wrangler.jsonc reach them.
describe('workers test harness', () => {
	it('runs in workerd', () => {
		expect(navigator.userAgent).toBe('Cloudflare-Workers');
	});

	it('has the D1 binding from wrangler.jsonc', async () => {
		const { results } = await env.DB.prepare('SELECT 1 AS one').all<{ one: number }>();
		expect(results).toEqual([{ one: 1 }]);
	});
});
