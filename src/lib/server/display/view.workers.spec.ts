import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { buildDisplayView } from './view';
import { saveTaskList } from '$lib/server/db/mutations';
import { withSchema } from '$lib/server/db/testing';
import { PREVIOUS_WEEK_LABEL } from '$lib/display/labels';
import { BULLETS_MAX } from '$lib/settings';

// The `workers` lane rather than `server`, for both of the reasons that lane
// exists (design.md D9): this reads D1, and it resolves the London date through
// `londonParts`, which is the one ICU-dependent thing in the codebase. A node
// test would have full ICU and no D1 and so could not see either.
//
// What it pins is that one function now feeds both `/display` and
// `/admin/preview` (design.md D18) — so a mistake here is a mistake on the wall,
// not only in the preview.

// A Wednesday, mid-BST. The window it produces is Mon 27 Jul – Sun 2 Aug, with
// Mon 20 – Sun 26 Jul behind it.
const NOW = new Date('2026-07-29T19:14:00Z');
const CURRENT = ['27', '28', '29', '30', '31']
	.map((d) => `2026-07-${d}`)
	.concat('2026-08-01', '2026-08-02');
const PREVIOUS = ['20', '21', '22', '23', '24', '25', '26'].map((d) => `2026-07-${d}`);

const mark = (childId: string, date: string) =>
	env.DB.prepare('INSERT INTO day_marks (child_id, date) VALUES (?1, ?2)')
		.bind(childId, date)
		.run();

const setTasks = (childId: string, body: string) => saveTaskList(env.DB, childId, body, NOW);

describe('buildDisplayView', () => {
	withSchema();

	it('puts the current week first and names the one behind it', async () => {
		// design.md D6 and D10: the week being played is what a passing glance is
		// for, and only it is dated — the dated label is what can go visibly wrong
		// on a panel that holds its last image with no power.
		const view = await buildDisplayView(env.DB, NOW);

		expect(view.weeks).toEqual(['27 JUL–2 AUG', PREVIOUS_WEEK_LABEL]);
		expect(view.rows[0].weeks[0].squares.map((s) => s.date)).toEqual(CURRENT);
		expect(view.rows[0].weeks[1].squares.map((s) => s.date)).toEqual(PREVIOUS);
	});

	it('stamps the London date and time from a single conversion', async () => {
		const view = await buildDisplayView(env.DB, NOW);

		expect(view.today).toBe('2026-07-29');
		// 19:14 UTC is 20:14 in London in July.
		expect(view.time).toBe('20:14');
	});

	it('resolves each square against today', async () => {
		await mark('alice', '2026-07-27');
		const view = await buildDisplayView(env.DB, NOW);
		const week = view.rows.find((row) => row.id === 'alice')!.weeks[0];

		expect(week.squares.map((s) => s.state)).toEqual([
			'earned',
			'missed',
			// Today, unmarked, reads as missed rather than not-yet: the day is
			// happening and an empty square is the honest picture of it.
			'missed',
			'not-yet',
			'not-yet',
			'not-yet',
			'not-yet'
		]);
	});

	it('clips a long task list at BULLETS_MAX, before it reaches the page', async () => {
		// Dropped server-side rather than hidden in CSS, so the surplus cannot push
		// anything off a canvas that does not scroll (design.md D6).
		const lines = Array.from({ length: BULLETS_MAX + 5 }, (_, i) => `Task ${i}`);
		await setTasks('alice', lines.join('\n'));

		const view = await buildDisplayView(env.DB, NOW);
		const alice = view.rows.find((row) => row.id === 'alice')!;

		expect(alice.bullets).toHaveLength(BULLETS_MAX);
		expect(alice.bullets[0]).toBe('Task 0');
		expect(alice.bullets.at(-1)).toBe(`Task ${BULLETS_MAX - 1}`);
	});

	it('awards a trophy for a complete week and for nothing less', async () => {
		// Won or nothing (design.md D13). Alice's previous week is complete; Ben's
		// is one day short, which is the case that has to stay empty.
		for (const date of PREVIOUS) await mark('alice', date);
		for (const date of PREVIOUS.slice(0, 6)) await mark('ben', date);

		const view = await buildDisplayView(env.DB, NOW);
		const alice = view.rows.find((row) => row.id === 'alice')!;
		const ben = view.rows.find((row) => row.id === 'ben')!;

		expect(alice.weeks[1].trophy).toBe(true);
		expect(ben.weeks[1].trophy).toBe(false);
		// Neither current week is complete — it has not finished happening.
		expect(alice.weeks[0].trophy).toBe(false);
	});

	it('keeps the roster order and gives every child both weeks', async () => {
		const view = await buildDisplayView(env.DB, NOW);

		expect(view.rows.map((row) => row.id)).toEqual(['alice', 'ben']);
		for (const row of view.rows) {
			expect(row.weeks).toHaveLength(2);
			expect(row.weeks.every((week) => week.squares.length === 7)).toBe(true);
		}
	});
});
