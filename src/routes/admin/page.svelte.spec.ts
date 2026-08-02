import { render } from 'vitest-browser-svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Page from './+page.svelte';

// The staleness behaviour (design.md D14) needs a clock that can be moved, which
// rules out e2e — so it is tested here, where the date can be pinned.

const RENDERED_ON = '2026-08-01';

const invalidateAll = vi.hoisted(() => vi.fn());
vi.mock('$app/navigation', () => ({ invalidateAll }));
vi.mock('$app/forms', () => ({ enhance: () => ({ destroy() {} }) }));

function data(today = RENDERED_ON) {
	return {
		today,
		children: [
			{
				id: 'alice',
				name: 'Alice',
				tasks: 'Piano\nReading',
				todayEarned: false,
				weeks: [
					Array.from({ length: 7 }, (_, i) => ({
						date: `2026-07-${20 + i}`,
						earned: false,
						state: 'missed' as const,
						future: false
					})),
					Array.from({ length: 7 }, (_, i) => ({
						date: `2026-07-${27 + i}`,
						earned: false,
						state: 'missed' as const,
						future: false
					}))
				]
			}
		]
	};
}

/** Moves the system clock to a London instant well clear of midnight. */
function setToday(date: string) {
	vi.useFakeTimers();
	vi.setSystemTime(new Date(`${date}T12:00:00Z`));
}

afterEach(() => {
	vi.useRealTimers();
	invalidateAll.mockClear();
});

describe('returning to the admin page', () => {
	it('re-renders when the London date has moved on', async () => {
		setToday('2026-08-02');
		render(Page, { data: data(RENDERED_ON), form: null });

		window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
		expect(invalidateAll).toHaveBeenCalled();
	});

	it('does not re-render when it is still the same day', async () => {
		setToday(RENDERED_ON);
		render(Page, { data: data(RENDERED_ON), form: null });

		window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
		expect(invalidateAll).not.toHaveBeenCalled();
	});

	it('re-renders on a restored iOS tab, which never fires visibilitychange', async () => {
		setToday('2026-08-02');
		render(Page, { data: data(RENDERED_ON), form: null });

		// `persisted` is the back-forward cache case, and the one that matters.
		window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
		expect(invalidateAll).toHaveBeenCalled();
	});

	it('ignores a pageshow that is not a restore', async () => {
		setToday('2026-08-02');
		render(Page, { data: data(RENDERED_ON), form: null });

		window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: false }));
		expect(invalidateAll).not.toHaveBeenCalled();
	});

	it('does not discard unsaved task text, however stale the page is', async () => {
		setToday('2026-08-02');
		const page = render(Page, { data: data(RENDERED_ON), form: null });

		const tasks = page.baseElement.querySelector<HTMLTextAreaElement>('#tasks-alice')!;
		tasks.value = 'Half-typed, not saved';
		tasks.dispatchEvent(new Event('input', { bubbles: true }));

		window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));

		// A reload here would throw away the typing the Save button exists to
		// protect — so the stale page is left exactly as it is.
		expect(invalidateAll).not.toHaveBeenCalled();
		expect(tasks.value).toBe('Half-typed, not saved');
	});

	it('does not discard an unsaved name either', async () => {
		setToday('2026-08-02');
		const page = render(Page, { data: data(RENDERED_ON), form: null });

		const name = page.baseElement.querySelector<HTMLInputElement>('#name-alice')!;
		name.value = 'Alice 🎂';
		name.dispatchEvent(new Event('input', { bubbles: true }));

		window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
		expect(invalidateAll).not.toHaveBeenCalled();
	});

	it('resumes re-rendering once the edit is reverted', async () => {
		setToday('2026-08-02');
		const page = render(Page, { data: data(RENDERED_ON), form: null });

		const tasks = page.baseElement.querySelector<HTMLTextAreaElement>('#tasks-alice')!;
		tasks.value = 'Changed';
		tasks.dispatchEvent(new Event('input', { bubbles: true }));
		window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
		expect(invalidateAll).not.toHaveBeenCalled();

		// Typed back to what is stored: no longer dirty, so nothing to protect.
		tasks.value = 'Piano\nReading';
		tasks.dispatchEvent(new Event('input', { bubbles: true }));
		window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
		expect(invalidateAll).toHaveBeenCalled();
	});
});

describe('the controls carry their own date', () => {
	it('submits the rendered date, not whatever today has become', async () => {
		setToday('2026-08-02');
		const page = render(Page, { data: data(RENDERED_ON), form: null });

		// The card was rendered for 1 August and still says so, even though the
		// London date has since rolled over to the 2nd. That is the point: it
		// records the day the parent was looking at (design.md D14).
		const todayForm = page.baseElement.querySelector('.today form')!;
		const date = todayForm.querySelector<HTMLInputElement>('[name=date]')!;
		expect(date.value).toBe(RENDERED_ON);
	});

	it('gives every correction control its own date', async () => {
		setToday(RENDERED_ON);
		const page = render(Page, { data: data(RENDERED_ON), form: null });

		const dates = [...page.baseElement.querySelectorAll('.corrections [name=date]')].map(
			(input) => (input as HTMLInputElement).value
		);
		expect(dates).toHaveLength(14);
		expect(new Set(dates).size).toBe(14);
	});
});
