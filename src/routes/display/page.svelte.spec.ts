import { render } from 'vitest-browser-svelte';
import { describe, expect, it } from 'vitest';
import Page from './+page.svelte';
import type { SquareState } from '$lib/chart';
import type { DisplayView, DisplayWeek } from '$lib/display/view';

// The canvas itself is covered once, in `$lib/display/Panel.svelte.spec.ts`.
// What is left on this route is what belongs to the page rather than to the
// chart, so that is what this file asserts (design.md D18).

function week(first: number, states: SquareState[], trophy: boolean): DisplayWeek {
	return {
		squares: states.map((state, i) => ({
			date: `2026-07-${String(first + i).padStart(2, '0')}`,
			state
		})),
		trophy
	};
}

const VIEW: DisplayView = {
	today: '2026-07-29',
	time: '20:14',
	weeks: ['27 JUL–2 AUG', 'LAST WEEK'],
	rows: [
		{
			id: 'alice',
			name: 'Alice',
			bullets: ['Piano 15 mins daily'],
			weeks: [
				week(27, ['earned', 'earned', 'missed', 'not-yet', 'not-yet', 'not-yet', 'not-yet'], false),
				week(20, Array<SquareState>(7).fill('earned'), true)
			]
		}
	]
};

describe('the display page', () => {
	it('hands its loaded data straight to the shared canvas', async () => {
		// The whole route: the panel, and nothing of its own inside it.
		const page = render(Page, { data: VIEW });

		expect(page.baseElement.querySelector('.panel')).not.toBeNull();
		expect(page.baseElement.querySelector('.task-block h2')?.textContent).toBe('Alice');
		expect(page.baseElement.querySelectorAll('.cell')).toHaveLength(14);
		expect(page.baseElement.querySelector('.stamp')?.textContent?.trim()).toBe(
			'updated Wed 29 Jul 20:14'
		);
	});

	it('renders no interactive controls at all', async () => {
		const page = render(Page, { data: VIEW });
		expect(page.baseElement.querySelectorAll('button, input, select, textarea, a')).toHaveLength(0);
	});
});
