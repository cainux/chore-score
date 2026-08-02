import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { fetchChildren, fetchDayMarks, fetchTaskLists, markKey, taskListFor } from './queries';
import { withSchema } from './testing';

// Data-layer modules are imported directly and handed env.DB rather than driven
// over SELF.fetch() (design.md D9): the point is to exercise real D1 semantics,
// not to re-test routing that Playwright already covers.
describe('fetchChildren', () => {
	withSchema();

	it('returns the roster in configured order', async () => {
		const children = await fetchChildren(env.DB);
		expect(children).toEqual([
			{ id: 'alice', name: 'Alice', sortOrder: 1 },
			{ id: 'ben', name: 'Ben', sortOrder: 2 }
		]);
	});

	it('orders by sort_order rather than by name', async () => {
		// Rename the first child so alphabetical order would reverse the two.
		await env.DB.prepare("UPDATE children SET name = 'Zoe' WHERE id = 'alice'").run();
		const children = await fetchChildren(env.DB);
		expect(children.map((c) => c.id)).toEqual(['alice', 'ben']);
	});
});

describe('fetchDayMarks', () => {
	withSchema();

	const mark = (childId: string, date: string) =>
		env.DB.prepare('INSERT INTO day_marks (child_id, date) VALUES (?1, ?2)')
			.bind(childId, date)
			.run();

	it('is empty when nothing has been earned', async () => {
		const marks = await fetchDayMarks(env.DB, '2026-07-27', '2026-08-02');
		expect(marks.size).toBe(0);
	});

	it('reports a mark as present for the right child and date', async () => {
		await mark('alice', '2026-07-29');
		const marks = await fetchDayMarks(env.DB, '2026-07-27', '2026-08-02');
		expect(marks.has(markKey('alice', '2026-07-29'))).toBe(true);
		expect(marks.has(markKey('ben', '2026-07-29'))).toBe(false);
		expect(marks.has(markKey('alice', '2026-07-30'))).toBe(false);
	});

	it('includes both ends of the range', async () => {
		await mark('alice', '2026-07-27');
		await mark('alice', '2026-08-02');
		const marks = await fetchDayMarks(env.DB, '2026-07-27', '2026-08-02');
		expect(marks.size).toBe(2);
	});

	it('excludes dates outside the range', async () => {
		await mark('alice', '2026-07-26');
		await mark('alice', '2026-08-03');
		const marks = await fetchDayMarks(env.DB, '2026-07-27', '2026-08-02');
		expect(marks.size).toBe(0);
	});

	it('keeps marks that have scrolled off the displayed window queryable', async () => {
		await mark('alice', '2026-05-04');
		const marks = await fetchDayMarks(env.DB, '2026-05-04', '2026-05-10');
		expect(marks.has(markKey('alice', '2026-05-04'))).toBe(true);
	});
});

describe('fetchTaskLists', () => {
	withSchema();

	it('reports a child who has never had a list as empty rather than missing', async () => {
		const lists = await fetchTaskLists(env.DB);
		expect(taskListFor(lists, 'alice')).toBe('');
	});

	it('returns stored text verbatim', async () => {
		const body = '- Piano 15 mins\n\n  Reading log signed  ';
		await env.DB.prepare(
			"INSERT INTO task_lists (child_id, body, updated_at) VALUES ('alice', ?1, '2026-08-01T20:00:00Z')"
		)
			.bind(body)
			.run();

		const lists = await fetchTaskLists(env.DB);
		expect(taskListFor(lists, 'alice')).toBe(body);
	});

	it('keeps the two lists apart', async () => {
		await env.DB.prepare(
			"INSERT INTO task_lists (child_id, body, updated_at) VALUES ('ben', 'Spellings', '2026-08-01T20:00:00Z')"
		).run();

		const lists = await fetchTaskLists(env.DB);
		expect(taskListFor(lists, 'ben')).toBe('Spellings');
		expect(taskListFor(lists, 'alice')).toBe('');
	});
});
