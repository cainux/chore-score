import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { weekDates } from '$lib/dates';
import { completeWeeks } from './completion';
import { clearDay, markDay } from './mutations';
import { withSchema } from './testing';

// In the workers project because completion is a D1 query — the COUNT(*) = 7 is
// the thing being tested, not a reimplementation of it in JavaScript.
describe('completeWeeks', () => {
	withSchema();

	const week = weekDates('2026-07-27');

	async function markAll(childId: string, dates: string[]) {
		for (const date of dates) await markDay(env.DB, childId, date);
	}

	it('reports a child with all 7 days as complete', async () => {
		await markAll('alice', week);
		expect(await completeWeeks(env.DB, week)).toEqual(new Set(['alice']));
	});

	it('does not report a child with 6 of 7', async () => {
		await markAll('alice', week.slice(0, 6));
		expect(await completeWeeks(env.DB, week)).toEqual(new Set());
	});

	it('reports neither child when nothing is marked', async () => {
		expect(await completeWeeks(env.DB, week)).toEqual(new Set());
	});

	it('reports both children independently', async () => {
		await markAll('alice', week);
		await markAll('ben', week.slice(0, 3));
		expect(await completeWeeks(env.DB, week)).toEqual(new Set(['alice']));
	});

	it('completes a week when the last missing day is backfilled', async () => {
		await markAll('alice', week.slice(0, 6));
		expect(await completeWeeks(env.DB, week)).toEqual(new Set());

		await markDay(env.DB, 'alice', week[6]);
		expect(await completeWeeks(env.DB, week)).toEqual(new Set(['alice']));
	});

	it('revokes the trophy when a day of a complete week is cleared', async () => {
		await markAll('alice', week);
		await clearDay(env.DB, 'alice', week[3]);
		expect(await completeWeeks(env.DB, week)).toEqual(new Set());
	});

	it('does not count days outside the week towards it', async () => {
		// Six days of this week plus one from the next must not total seven.
		await markAll('alice', week.slice(0, 6));
		await markDay(env.DB, 'alice', '2026-08-03');
		expect(await completeWeeks(env.DB, week)).toEqual(new Set());
	});

	it('is not fooled by a perfect record so far in a current week', async () => {
		// Nothing here knows what "today" is: an unfinished week is simply a week
		// with fewer than 7 marks, which is the same as an incomplete past one.
		await markAll('alice', week.slice(0, 4));
		expect(await completeWeeks(env.DB, week)).toEqual(new Set());
	});

	it('refuses a date list that is not a week', async () => {
		await expect(completeWeeks(env.DB, week.slice(0, 6))).rejects.toThrow(/7 dates/);
	});
});
