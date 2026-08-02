import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { clearDay, markDay, renameChild, saveTaskList } from './mutations';
import { fetchChildren, fetchDayMarks, fetchTaskLists, markKey, taskListFor } from './queries';
import { withSchema } from './testing';

const WEEK = { from: '2026-07-27', to: '2026-08-02' };

async function rowCount(table: string): Promise<number> {
	const { results } = await env.DB.prepare(`SELECT COUNT(*) AS n FROM ${table}`).all<{
		n: number;
	}>();
	return results[0].n;
}

describe('markDay', () => {
	withSchema();

	it('records exactly one row for a child and date', async () => {
		await markDay(env.DB, 'alice', '2026-07-29');
		expect(await rowCount('day_marks')).toBe(1);
	});

	it('is idempotent — marking twice leaves one row and no error', async () => {
		await markDay(env.DB, 'alice', '2026-07-29');
		await markDay(env.DB, 'alice', '2026-07-29');
		expect(await rowCount('day_marks')).toBe(1);

		const marks = await fetchDayMarks(env.DB, WEEK.from, WEEK.to);
		expect(marks.has(markKey('alice', '2026-07-29'))).toBe(true);
	});

	it('marks one child without touching the other', async () => {
		await markDay(env.DB, 'alice', '2026-07-29');
		const marks = await fetchDayMarks(env.DB, WEEK.from, WEEK.to);
		expect(marks.has(markKey('ben', '2026-07-29'))).toBe(false);
	});
});

describe('clearDay', () => {
	withSchema();

	it('leaves no row behind', async () => {
		await markDay(env.DB, 'alice', '2026-07-29');
		await clearDay(env.DB, 'alice', '2026-07-29');
		expect(await rowCount('day_marks')).toBe(0);
	});

	it('leaves a cleared day indistinguishable from one never marked', async () => {
		await markDay(env.DB, 'alice', '2026-07-29');
		await clearDay(env.DB, 'alice', '2026-07-29');

		const marks = await fetchDayMarks(env.DB, WEEK.from, WEEK.to);
		expect(marks.has(markKey('alice', '2026-07-29'))).toBe(false);
		expect(marks.has(markKey('alice', '2026-07-30'))).toBe(false);
	});

	it('is a no-op on a day that was never marked', async () => {
		await clearDay(env.DB, 'alice', '2026-07-29');
		expect(await rowCount('day_marks')).toBe(0);
	});

	it('clears one child without touching the other', async () => {
		await markDay(env.DB, 'alice', '2026-07-29');
		await markDay(env.DB, 'ben', '2026-07-29');
		await clearDay(env.DB, 'alice', '2026-07-29');

		const marks = await fetchDayMarks(env.DB, WEEK.from, WEEK.to);
		expect(marks.has(markKey('ben', '2026-07-29'))).toBe(true);
	});

	it('survives a mark-clear-mark cycle', async () => {
		await markDay(env.DB, 'alice', '2026-07-29');
		await clearDay(env.DB, 'alice', '2026-07-29');
		await markDay(env.DB, 'alice', '2026-07-29');
		expect(await rowCount('day_marks')).toBe(1);
	});
});

describe('saveTaskList', () => {
	withSchema();

	const now = new Date('2026-08-01T20:00:00Z');

	it('inserts when the child has never had a list', async () => {
		await saveTaskList(env.DB, 'alice', 'Piano', now);
		expect(taskListFor(await fetchTaskLists(env.DB), 'alice')).toBe('Piano');
	});

	it('replaces rather than appending on a second save', async () => {
		await saveTaskList(env.DB, 'alice', 'Piano', now);
		await saveTaskList(env.DB, 'alice', 'Spellings', now);

		expect(taskListFor(await fetchTaskLists(env.DB), 'alice')).toBe('Spellings');
		expect(await rowCount('task_lists')).toBe(1);
	});

	it('stores the text verbatim, markers and blank lines included', async () => {
		const body = '- Piano 15 mins\n\n* Reading log\n  Bins out  ';
		await saveTaskList(env.DB, 'alice', body, now);
		expect(taskListFor(await fetchTaskLists(env.DB), 'alice')).toBe(body);
	});

	it('accepts an empty list', async () => {
		await saveTaskList(env.DB, 'alice', 'Piano', now);
		await saveTaskList(env.DB, 'alice', '', now);
		expect(taskListFor(await fetchTaskLists(env.DB), 'alice')).toBe('');
	});

	it('leaves the other child untouched', async () => {
		await saveTaskList(env.DB, 'ben', 'Spellings', now);
		await saveTaskList(env.DB, 'alice', 'Piano', now);
		expect(taskListFor(await fetchTaskLists(env.DB), 'ben')).toBe('Spellings');
	});

	it('records the update time in UTC', async () => {
		await saveTaskList(env.DB, 'alice', 'Piano', now);
		const { results } = await env.DB.prepare(
			"SELECT updated_at FROM task_lists WHERE child_id = 'alice'"
		).all<{ updated_at: string }>();
		expect(results[0].updated_at).toBe('2026-08-01T20:00:00.000Z');
	});
});

describe('renameChild', () => {
	withSchema();

	it('changes the name', async () => {
		await renameChild(env.DB, 'alice', 'Alice 🎂');
		const children = await fetchChildren(env.DB);
		expect(children[0].name).toBe('Alice 🎂');
	});

	it('round-trips an emoji name unchanged', async () => {
		// A composed emoji: several code points that must come back byte for byte.
		const name = 'Ben 👩‍👩‍👧‍👦🎈';
		await renameChild(env.DB, 'ben', name);
		const children = await fetchChildren(env.DB);
		expect(children[1].name).toBe(name);
	});

	it('keeps the id, so day marks stay attached', async () => {
		await markDay(env.DB, 'alice', '2026-07-29');
		await renameChild(env.DB, 'alice', 'Zoe');

		const children = await fetchChildren(env.DB);
		expect(children[0].id).toBe('alice');

		const marks = await fetchDayMarks(env.DB, WEEK.from, WEEK.to);
		expect(marks.has(markKey('alice', '2026-07-29'))).toBe(true);
	});

	it('keeps the task list attached', async () => {
		await saveTaskList(env.DB, 'alice', 'Piano', new Date('2026-08-01T20:00:00Z'));
		await renameChild(env.DB, 'alice', 'Zoe');
		expect(taskListFor(await fetchTaskLists(env.DB), 'alice')).toBe('Piano');
	});

	it('does not move the child in the order', async () => {
		// 'Zoe' would sort last alphabetically; sort_order must win.
		await renameChild(env.DB, 'alice', 'Zoe');
		const children = await fetchChildren(env.DB);
		expect(children.map((c) => c.id)).toEqual(['alice', 'ben']);
	});

	it('leaves the other child alone', async () => {
		await renameChild(env.DB, 'alice', 'Zoe');
		const children = await fetchChildren(env.DB);
		expect(children[1].name).toBe('Ben');
	});
});
