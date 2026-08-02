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

	it('seeds the roster, so a test has children to hang marks off', async () => {
		const { results } = await env.DB.prepare(
			'SELECT id, sort_order FROM children ORDER BY sort_order'
		).all<{ id: string; sort_order: number }>();
		expect(results).toEqual([
			{ id: 'alice', sort_order: 1 },
			{ id: 'ben', sort_order: 2 }
		]);
	});

	it('seeds no task list, since "not set yet" is a state that must work', async () => {
		const { results } = await env.DB.prepare('SELECT COUNT(*) AS n FROM task_lists').all<{
			n: number;
		}>();
		expect(results[0].n).toBe(0);
	});

	it('rolls back what a test writes', async () => {
		const { results } = await env.DB.prepare('SELECT COUNT(*) AS n FROM day_marks').all<{
			n: number;
		}>();
		expect(results[0].n).toBe(0);

		await env.DB.prepare(
			"INSERT INTO day_marks (child_id, date) VALUES ('alice', '2026-08-01')"
		).run();
	});

	it('does not see the row the previous test inserted', async () => {
		const { results } = await env.DB.prepare('SELECT COUNT(*) AS n FROM day_marks').all<{
			n: number;
		}>();
		expect(results[0].n).toBe(0);
	});
});
