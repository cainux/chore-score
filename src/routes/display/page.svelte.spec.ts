import { render } from 'vitest-browser-svelte';
import { describe, expect, it } from 'vitest';
import Page from './+page.svelte';
import type { SquareState, TrophyState } from '$lib/chart';

// Rendered in real Chromium (the `client` project). Today is whatever day it
// actually is when the suite runs, so a screenshot cannot be relied on to show
// a future date — the three square states are only all reachable by handing the
// page constructed data.

type Square = { date: string; state: SquareState };

function week(states: SquareState[], trophy: TrophyState) {
	return {
		squares: states.map((state, i) => ({
			date: `2026-07-${String(27 + i).padStart(2, '0')}`,
			state
		})) satisfies Square[],
		trophy
	};
}

const EARNED_WEEK = Array<SquareState>(7).fill('earned');

function data(overrides: Partial<ReturnType<typeof baseData>> = {}) {
	return { ...baseData(), ...overrides };
}

function baseData() {
	return {
		today: '2026-07-29',
		time: '20:14',
		// Current week first, previous second — the order the server hands over,
		// and only the current one is dated.
		weeks: ['27 JUL–2 AUG', 'LAST WEEK'],
		rows: [
			{
				id: 'alice',
				name: 'Alice',
				bullets: ['Piano 15 mins daily', 'Reading log signed'],
				weeks: [
					week(['earned', 'earned', 'missed', 'not-yet', 'not-yet', 'not-yet', 'not-yet'], 'lost'),
					week(EARNED_WEEK, 'won')
				]
			},
			{
				id: 'ben',
				name: 'Ben',
				bullets: ['Spellings'],
				weeks: [
					week(
						['earned', 'earned', 'missed', 'not-yet', 'not-yet', 'not-yet', 'not-yet'],
						'winnable'
					),
					week(['earned', 'missed', 'earned', 'earned', 'missed', 'earned', 'earned'], 'lost')
				]
			}
		]
	};
}

describe('the display page', () => {
	it('renders one sticker row per child per week', async () => {
		const page = render(Page, { data: data() });
		// Two children x two weeks.
		expect(page.baseElement.querySelector('.grid')).not.toBeNull();
		expect(page.baseElement.querySelectorAll('.row')).toHaveLength(4);
	});

	it('renders 7 day squares in every week row', async () => {
		const page = render(Page, { data: data() });
		const rows = page.baseElement.querySelectorAll('.row');
		for (const row of rows) {
			expect(row.querySelectorAll('.cell')).toHaveLength(7);
		}
	});

	it('draws an earned day as a star', async () => {
		const page = render(Page, { data: data() });
		const first = page.baseElement.querySelectorAll('.cell')[0];
		expect(first.querySelector('svg')).not.toBeNull();
	});

	it('draws a missed day as an empty square, with no negative marking', async () => {
		const page = render(Page, { data: data() });
		// Rows are week-major: [current/Alice, current/Ben, prev/Alice, prev/Ben].
		const missed = page.baseElement.querySelectorAll('.row')[0].querySelectorAll('.cell')[2];
		expect(missed.querySelector('svg')).toBeNull();
		expect(missed.querySelector('.dot')).toBeNull();
		expect(missed.textContent?.trim()).toBe('');
	});

	it('draws a future day as a dot, distinct from a missed day', async () => {
		const page = render(Page, { data: data() });
		const notYet = page.baseElement.querySelectorAll('.row')[0].querySelectorAll('.cell')[3];
		expect(notYet.querySelector('.dot')).not.toBeNull();
		expect(notYet.querySelector('svg')).toBeNull();
	});

	it('gives every week row a trophy, so the slot is never empty', async () => {
		const page = render(Page, { data: data() });
		const rows = page.baseElement.querySelectorAll('.row');
		for (const row of rows) {
			expect(row.querySelector('.trophy-col svg')).not.toBeNull();
		}
	});

	it('fills the won trophy and leaves the others hollow', async () => {
		const page = render(Page, { data: data() });
		const rows = page.baseElement.querySelectorAll('.row');

		// Alice's previous week is won; Ben's previous week is lost. Both sit in
		// the second block now, so they are rows 2 and 3.
		const won = rows[2].querySelector('.trophy-col svg path')!;
		const lost = rows[3].querySelector('.trophy-col svg path')!;

		expect(won.getAttribute('fill')).toBe('#555555');
		expect(lost.getAttribute('fill')).toBe('none');
	});

	it('separates winnable from lost by grey level alone', async () => {
		const page = render(Page, { data: data() });
		const rows = page.baseElement.querySelectorAll('.row');

		// Ben's previous week is lost; his current week is still winnable.
		const lost = rows[3].querySelector('.trophy-col svg')!;
		const winnable = rows[1].querySelector('.trophy-col svg')!;

		expect(lost.getAttribute('stroke')).toBe('#AAAAAA');
		expect(winnable.getAttribute('stroke')).toBe('#555555');
		// Both hollow: the distinction here is level, not silhouette.
		expect(lost.querySelector('path')!.getAttribute('fill')).toBe('none');
		expect(winnable.querySelector('path')!.getAttribute('fill')).toBe('none');
	});

	it('dates the current week and names the previous one', async () => {
		const page = render(Page, { data: data() });
		const labels = [...page.baseElement.querySelectorAll('.week-label')].map((l) =>
			l.textContent?.trim()
		);
		expect(labels).toEqual(['27 JUL–2 AUG', 'LAST WEEK']);
	});

	it('stamps the render date and time', async () => {
		const page = render(Page, { data: data() });
		const stamp = page.baseElement.querySelector('.stamp')!;
		expect(stamp.textContent?.trim()).toBe('updated Wed 29 Jul 20:14');
	});

	it('draws the stamp darker than the grid lines, so it survives the panel', async () => {
		// At `#AAA` it dithered into a scatter of dots on the real panel and read
		// as a smudge. An illegible freshness signal is no freshness signal at all
		// (design.md D10).
		const page = render(Page, { data: data() });
		const grey = (colour: string) => Number(colour.match(/\d+/)![0]);

		const stamp = grey(getComputedStyle(page.baseElement.querySelector('.stamp')!).color);
		const rule = grey(getComputedStyle(page.baseElement.querySelector('.cell')!).borderTopColor);
		expect(stamp).toBeLessThan(rule);
	});

	it('renders each child bullets under their own name', async () => {
		const page = render(Page, { data: data() });
		const blocks = page.baseElement.querySelectorAll('.task-block');
		expect(blocks[0].querySelector('h2')?.textContent).toBe('Alice');
		expect(blocks[0].querySelectorAll('li')).toHaveLength(2);
		expect(blocks[1].querySelector('h2')?.textContent).toBe('Ben');
		expect(blocks[1].querySelectorAll('li')).toHaveLength(1);
	});

	it('keeps the layout intact for a child with no tasks', async () => {
		const empty = data();
		empty.rows[1].bullets = [];
		const page = render(Page, { data: empty });

		const blocks = page.baseElement.querySelectorAll('.task-block');
		expect(blocks[1].querySelector('h2')?.textContent).toBe('Ben');
		expect(blocks[1].querySelectorAll('li')).toHaveLength(0);
		// The grid is still where it was.
		expect(page.baseElement.querySelectorAll('.row')).toHaveLength(4);
	});

	it('does not let an over-long task list displace the grid or the stamp', async () => {
		const normal = render(Page, { data: data() });
		const normalGrid = normal.baseElement.querySelector('.grid')!.getBoundingClientRect();
		const normalStamp = normal.baseElement.querySelector('.stamp')!.getBoundingClientRect();
		normal.unmount();

		// Well past the limit, and every bullet long enough to wrap if it could.
		const flooded = data();
		flooded.rows[0].bullets = Array.from(
			{ length: 30 },
			(_, i) => `Task number ${i} which is deliberately long enough to wrap onto another line`
		);
		const page = render(Page, { data: flooded });

		const grid = page.baseElement.querySelector('.grid')!.getBoundingClientRect();
		const stamp = page.baseElement.querySelector('.stamp')!.getBoundingClientRect();
		const panel = page.baseElement.querySelector('.panel')!.getBoundingClientRect();

		expect(grid.top).toBe(normalGrid.top);
		expect(stamp.top).toBe(normalStamp.top);
		expect(grid.bottom).toBeLessThanOrEqual(panel.bottom);
		expect(stamp.bottom).toBeLessThanOrEqual(panel.bottom);
	});

	it('clips surplus bullets rather than shrinking the type', async () => {
		const normal = render(Page, { data: data() });
		const normalSize = getComputedStyle(normal.baseElement.querySelector('li')!).fontSize;
		normal.unmount();

		const flooded = data();
		flooded.rows[0].bullets = Array.from({ length: 30 }, (_, i) => `Task ${i}`);
		const page = render(Page, { data: flooded });

		// Same type size, fewer bullets visible — the opposite trade would cost
		// legibility on every bullet to fit one more.
		expect(getComputedStyle(page.baseElement.querySelector('li')!).fontSize).toBe(normalSize);

		const block = page.baseElement.querySelector('.task-block')!.getBoundingClientRect();
		const visible = [...page.baseElement.querySelectorAll('li')].filter(
			(li) => li.getBoundingClientRect().bottom <= block.bottom
		);
		expect(visible.length).toBeLessThan(30);
	});

	it('wraps a long bullet rather than cutting it off', async () => {
		// What the panel showed before: `Exercise 11 part 2 - hands together
		// (thumb cr…`, which tells a child less than nothing.
		const long = data();
		long.rows[0].bullets = ['Exercise 11 part 2 - hands together (thumb crossover), twice through'];
		const page = render(Page, { data: long });

		const li = page.baseElement.querySelector('li')!;
		const style = getComputedStyle(li);
		expect(style.textOverflow).not.toBe('ellipsis');
		expect(style.whiteSpace).not.toBe('nowrap');

		// Two line boxes, and the whole sentence still present.
		const lineHeight = Number.parseFloat(style.lineHeight);
		expect(li.getBoundingClientRect().height).toBeGreaterThan(lineHeight * 1.5);
		expect(li.textContent).toBe(long.rows[0].bullets[0]);
	});

	it('holds a clipped list to a whole number of lines', async () => {
		// A list cut through the middle of a line reads as a printing fault
		// rather than as a list that ran on.
		const flooded = data();
		flooded.rows[0].bullets = Array.from({ length: 20 }, (_, i) => `Task ${i}`);
		const page = render(Page, { data: flooded });

		const list = page.baseElement.querySelector('ul')!;
		const lineHeight = Number.parseFloat(getComputedStyle(list.querySelector('li')!).lineHeight);
		expect(list.getBoundingClientRect().height % lineHeight).toBe(0);
	});

	describe('inline emphasis', () => {
		function bulletHtml(text: string) {
			const one = data();
			one.rows[0].bullets = [text];
			return render(Page, { data: one }).baseElement.querySelector('li')!;
		}

		it('renders bold and italic runs', async () => {
			const li = bulletHtml('play the **F#** and *hold* it');
			const bold = li.querySelector('.bold')!;
			const italic = li.querySelector('.italic')!;

			expect(bold.textContent).toBe('F#');
			expect(getComputedStyle(bold).fontWeight).toBe('700');
			expect(italic.textContent).toBe('hold');
			expect(getComputedStyle(italic).fontStyle).toBe('italic');
		});

		it('leaves no gap where a delimiter was', async () => {
			// Whitespace between segments in the template would become whitespace
			// on the panel, opening `**bold**text` into `bold text`.
			expect(bulletHtml('**bold**text').textContent).toBe('boldtext');
		});

		it('renders unmatched asterisks as typed', async () => {
			expect(bulletHtml('2 * 3 and **unclosed').textContent).toBe('2 * 3 and **unclosed');
		});
	});

	it('renders an emoji name without disturbing anything around it', async () => {
		const plain = render(Page, { data: data() });
		const plainGrid = plain.baseElement.querySelector('.grid')!.getBoundingClientRect();
		plain.unmount();

		const decorated = data();
		decorated.rows[0].name = 'Alice 🎂';
		const page = render(Page, { data: decorated });

		expect(page.baseElement.querySelector('.name')?.textContent).toBe('Alice 🎂');

		// The grid, the task blocks and the stamp all stay put: a decorated name
		// must not move anything, on a canvas where positions are fixed.
		const grid = page.baseElement.querySelector('.grid')!.getBoundingClientRect();
		expect(grid.top).toBe(plainGrid.top);
		expect(grid.left).toBe(plainGrid.left);
		expect(page.baseElement.querySelectorAll('.cell')).toHaveLength(28);
	});

	it('renders no interactive controls at all', async () => {
		const page = render(Page, { data: data() });
		expect(page.baseElement.querySelectorAll('button, input, select, textarea, a')).toHaveLength(0);
	});
});
