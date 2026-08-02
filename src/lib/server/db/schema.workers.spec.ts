import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { withSchema } from './testing';

describe('migrated schema', () => {
	withSchema();

	it('creates the three tables', async () => {
		const { results } = await env.DB.prepare(
			"SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('children', 'day_marks', 'task_lists') ORDER BY name"
		).all<{ name: string }>();
		expect(results.map((r: { name: string }) => r.name)).toEqual([
			'children',
			'day_marks',
			'task_lists'
		]);
	});

	it('starts each test with empty tables', async () => {
		const { results } = await env.DB.prepare('SELECT COUNT(*) AS n FROM children').all<{
			n: number;
		}>();
		expect(results[0].n).toBe(0);

		await env.DB.prepare("INSERT INTO children (id, name, sort_order) VALUES ('x', 'X', 1)").run();
	});

	it('does not see the row the previous test inserted', async () => {
		const { results } = await env.DB.prepare('SELECT COUNT(*) AS n FROM children').all<{
			n: number;
		}>();
		expect(results[0].n).toBe(0);
	});
});
