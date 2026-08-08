import { render } from 'vitest-browser-svelte';
import { describe, expect, it } from 'vitest';
import Panel from './Panel.svelte';
import type { DisplayView, DisplayWeek } from './view';
import type { SquareState } from '$lib/chart';

// The canvas both `/display` and `/admin/preview` render, tested once, here.
// The two routes hand it the same view model from the same builder, so what
// this file asserts holds for the panel on the wall and for the preview a
// parent is watching (design.md D18).
//
// Rendered in real Chromium (the `client` project). Today is whatever day it
// actually is when the suite runs, so a screenshot cannot be relied on to show
// a future date — the three square states are only all reachable by handing the
// canvas constructed data.

function week(states: SquareState[], trophy: boolean): DisplayWeek {
	return {
		squares: states.map((state, i) => ({
			date: `2026-07-${String(27 + i).padStart(2, '0')}`,
			state
		})),
		trophy
	};
}

const EARNED_WEEK = Array<SquareState>(7).fill('earned');

function view(overrides: Partial<DisplayView> = {}): DisplayView {
	return { ...baseView(), ...overrides };
}

function baseView(): DisplayView {
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
					week(['earned', 'earned', 'missed', 'not-yet', 'not-yet', 'not-yet', 'not-yet'], false),
					// The only won week in the fixture, so exactly one trophy is on the
					// page and the assertions below can name its row.
					week(EARNED_WEEK, true)
				]
			},
			{
				id: 'ben',
				name: 'Ben',
				bullets: ['Spellings'],
				weeks: [
					week(['earned', 'earned', 'missed', 'not-yet', 'not-yet', 'not-yet', 'not-yet'], false),
					week(['earned', 'missed', 'earned', 'earned', 'missed', 'earned', 'earned'], false)
				]
			}
		]
	};
}

describe('the panel canvas', () => {
	it('renders one sticker row per child per week', async () => {
		const page = render(Panel, { view: view() });
		// Two children x two weeks.
		expect(page.baseElement.querySelector('.grid')).not.toBeNull();
		expect(page.baseElement.querySelectorAll('.row')).toHaveLength(4);
	});

	it('renders 7 day squares in every week row', async () => {
		const page = render(Panel, { view: view() });
		const rows = page.baseElement.querySelectorAll('.row');
		for (const row of rows) {
			expect(row.querySelectorAll('.cell')).toHaveLength(7);
		}
	});

	it('draws an earned day as a star', async () => {
		const page = render(Panel, { view: view() });
		const first = page.baseElement.querySelectorAll('.cell')[0];
		expect(first.querySelector('svg')).not.toBeNull();
	});

	it('draws a missed day as an empty square, with no negative marking', async () => {
		const page = render(Panel, { view: view() });
		// Rows are week-major: [current/Alice, current/Ben, prev/Alice, prev/Ben].
		const missed = page.baseElement.querySelectorAll('.row')[0].querySelectorAll('.cell')[2];
		expect(missed.querySelector('svg')).toBeNull();
		expect(missed.querySelector('.dot')).toBeNull();
		expect(missed.textContent?.trim()).toBe('');
	});

	it('draws a future day as a dot, distinct from a missed day', async () => {
		const page = render(Panel, { view: view() });
		const notYet = page.baseElement.querySelectorAll('.row')[0].querySelectorAll('.cell')[3];
		expect(notYet.querySelector('.dot')).not.toBeNull();
		expect(notYet.querySelector('svg')).toBeNull();
	});

	it('draws a trophy on a complete week and on no other', async () => {
		const page = render(Panel, { view: view() });
		const rows = page.baseElement.querySelectorAll('.row');

		// Rows are week-major: [current/Alice, current/Ben, prev/Alice, prev/Ben].
		// Only Alice's previous week is complete.
		const withTrophy = [...rows].map((row) => row.querySelector('.trophy-col svg') !== null);
		expect(withTrophy).toEqual([false, false, true, false]);
	});

	it('draws the trophy in the same solid black as the stars it sums up', async () => {
		// It was `#555` on the first panel build and read as the faded mark in a
		// row of black stars — the reward looking weaker than the days that earned
		// it. Grey is also what 2-bit conversion mangles first (design.md D13).
		const page = render(Panel, { view: view() });
		const trophy = page.baseElement.querySelectorAll('.row')[2].querySelector('.trophy-col svg')!;
		const star = page.baseElement.querySelector('.cell svg')!;

		expect(trophy.getAttribute('stroke')).toBe('#000000');
		expect(trophy.querySelector('path')!.getAttribute('fill')).toBe('#000000');
		expect(star.getAttribute('fill')).toBe('#000000');
	});

	it('keeps both week blocks aligned when a row has no trophy', async () => {
		// The trophy column is reserved, not conditional: an empty slot must not
		// let the second week slide left on a canvas with fixed positions.
		const page = render(Panel, { view: view() });
		const rows = page.baseElement.querySelectorAll('.row');
		const widths = [...rows].map(
			(row) => row.querySelector('.trophy-col')!.getBoundingClientRect().width
		);

		expect(new Set(widths).size).toBe(1);
		expect(widths[0]).toBeGreaterThan(0);
	});

	it('dates the current week and names the previous one', async () => {
		const page = render(Panel, { view: view() });
		const labels = [...page.baseElement.querySelectorAll('.week-label')].map((l) =>
			l.textContent?.trim()
		);
		expect(labels).toEqual(['27 JUL–2 AUG', 'LAST WEEK']);
	});

	it('stamps the render date and time', async () => {
		const page = render(Panel, { view: view() });
		const stamp = page.baseElement.querySelector('.stamp')!;
		expect(stamp.textContent?.trim()).toBe('updated Wed 29 Jul 20:14');
	});

	it('draws the stamp darker than the grid lines, so it survives the panel', async () => {
		// At `#AAA` it dithered into a scatter of dots on the real panel and read
		// as a smudge. An illegible freshness signal is no freshness signal at all
		// (design.md D10).
		const page = render(Panel, { view: view() });
		const grey = (colour: string) => Number(colour.match(/\d+/)![0]);

		const stamp = grey(getComputedStyle(page.baseElement.querySelector('.stamp')!).color);
		const rule = grey(getComputedStyle(page.baseElement.querySelector('.cell')!).borderTopColor);
		expect(stamp).toBeLessThan(rule);
	});

	it('renders each child bullets under their own name', async () => {
		const page = render(Panel, { view: view() });
		const blocks = page.baseElement.querySelectorAll('.task-block');
		expect(blocks[0].querySelector('h2')?.textContent).toBe('Alice');
		expect(blocks[0].querySelectorAll('li')).toHaveLength(2);
		expect(blocks[1].querySelector('h2')?.textContent).toBe('Ben');
		expect(blocks[1].querySelectorAll('li')).toHaveLength(1);
	});

	it('draws the tasks as plain lines, with no bullet markers or indent', async () => {
		// On the panel the markers read as a column of clutter next to the star
		// grid, and the indent cost width a wrapping task spends on a second line
		// (design.md D12).
		const page = render(Panel, { view: view() });
		const list = page.baseElement.querySelector('.task-block ul')!;
		const style = getComputedStyle(list);

		expect(style.listStyleType).toBe('none');
		expect(Number.parseFloat(style.paddingLeft)).toBe(0);

		// The text starts at the block's own left edge, not indented past it.
		const block = page.baseElement.querySelector('.task-block')!.getBoundingClientRect();
		expect(list.querySelector('li')!.getBoundingClientRect().left).toBe(block.left);
	});

	it('keeps the layout intact for a child with no tasks', async () => {
		const empty = view();
		empty.rows[1].bullets = [];
		const page = render(Panel, { view: empty });

		const blocks = page.baseElement.querySelectorAll('.task-block');
		expect(blocks[1].querySelector('h2')?.textContent).toBe('Ben');
		expect(blocks[1].querySelectorAll('li')).toHaveLength(0);
		// The grid is still where it was.
		expect(page.baseElement.querySelectorAll('.row')).toHaveLength(4);
	});

	it('does not let an over-long task list displace the grid or the stamp', async () => {
		const normal = render(Panel, { view: view() });
		const normalGrid = normal.baseElement.querySelector('.grid')!.getBoundingClientRect();
		const normalStamp = normal.baseElement.querySelector('.stamp')!.getBoundingClientRect();
		normal.unmount();

		// Well past the limit, and every bullet long enough to wrap if it could.
		const flooded = view();
		flooded.rows[0].bullets = Array.from(
			{ length: 30 },
			(_, i) => `Task number ${i} which is deliberately long enough to wrap onto another line`
		);
		const page = render(Panel, { view: flooded });

		const grid = page.baseElement.querySelector('.grid')!.getBoundingClientRect();
		const stamp = page.baseElement.querySelector('.stamp')!.getBoundingClientRect();
		const panel = page.baseElement.querySelector('.panel')!.getBoundingClientRect();

		expect(grid.top).toBe(normalGrid.top);
		expect(stamp.top).toBe(normalStamp.top);
		expect(grid.bottom).toBeLessThanOrEqual(panel.bottom);
		expect(stamp.bottom).toBeLessThanOrEqual(panel.bottom);
	});

	it('clips surplus bullets rather than shrinking the type', async () => {
		const normal = render(Panel, { view: view() });
		const normalSize = getComputedStyle(normal.baseElement.querySelector('li')!).fontSize;
		normal.unmount();

		const flooded = view();
		flooded.rows[0].bullets = Array.from({ length: 30 }, (_, i) => `Task ${i}`);
		const page = render(Panel, { view: flooded });

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
		const long = view();
		long.rows[0].bullets = ['Exercise 11 part 2 - hands together (thumb crossover), twice through'];
		const page = render(Panel, { view: long });

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
		const flooded = view();
		flooded.rows[0].bullets = Array.from({ length: 20 }, (_, i) => `Task ${i}`);
		const page = render(Panel, { view: flooded });

		const list = page.baseElement.querySelector('ul')!;
		const lineHeight = Number.parseFloat(getComputedStyle(list.querySelector('li')!).lineHeight);
		expect(list.getBoundingClientRect().height % lineHeight).toBe(0);
	});

	describe('inline emphasis', () => {
		function bulletHtml(text: string) {
			const one = view();
			one.rows[0].bullets = [text];
			return render(Panel, { view: one }).baseElement.querySelector('li')!;
		}

		it('renders bold and italic runs', async () => {
			const li = bulletHtml('play the **F#** and *hold* it');
			const bold = li.querySelector('.bold')!;
			const italic = li.querySelector('.italic')!;

			expect(bold.textContent).toBe('F#');
			expect(getComputedStyle(bold).fontWeight).toBe('600');
			expect(italic.textContent).toBe('hold');
			expect(getComputedStyle(italic).fontStyle).toBe('italic');
		});

		it('weighs emphasised text heavier than the body around it', async () => {
			// A relationship, not a hard-coded weight: the panel rasterises text
			// with anti-aliasing off, so what matters is that emphasis and body
			// round to different stem widths after conversion, not that emphasis
			// is any particular number. A body weight raised to meet or pass this
			// value would silently stop reading as emphasised (design.md D27,
			// improve-bullet-legibility).
			const li = bulletHtml('play the **F#** and hold it');
			const body = li.querySelector('span:not(.bold)')!;
			const bold = li.querySelector('.bold')!;

			expect(Number(getComputedStyle(bold).fontWeight)).toBeGreaterThan(
				Number(getComputedStyle(body).fontWeight)
			);
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
		const plain = render(Panel, { view: view() });
		const plainGrid = plain.baseElement.querySelector('.grid')!.getBoundingClientRect();
		plain.unmount();

		const decorated = view();
		decorated.rows[0].name = 'Alice 🎂';
		const page = render(Panel, { view: decorated });

		expect(page.baseElement.querySelector('.name')?.textContent).toBe('Alice 🎂');

		// The grid, the task blocks and the stamp all stay put: a decorated name
		// must not move anything, on a canvas where positions are fixed.
		const grid = page.baseElement.querySelector('.grid')!.getBoundingClientRect();
		expect(grid.top).toBe(plainGrid.top);
		expect(grid.left).toBe(plainGrid.left);
		expect(page.baseElement.querySelectorAll('.cell')).toHaveLength(28);
	});

	it('renders no interactive controls at all', async () => {
		const page = render(Panel, { view: view() });
		expect(page.baseElement.querySelectorAll('button, input, select, textarea, a')).toHaveLength(0);
	});
});
