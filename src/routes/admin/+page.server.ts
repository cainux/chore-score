import { error, fail } from '@sveltejs/kit';
import { squareState } from '$lib/chart';
import { displayWindow, londonToday } from '$lib/dates';
import { nameProblem, nameProblemMessage } from '$lib/names';
import { clearDay, markDay, renameChild, saveTaskList } from '$lib/server/db/mutations';
import {
	fetchChildren,
	fetchDayMarks,
	fetchTaskLists,
	markKey,
	taskListFor
} from '$lib/server/db/queries';
import type { Actions, PageServerLoad } from './$types';

function db(platform: App.Platform | undefined): D1Database {
	if (platform === undefined) error(500, 'Worker bindings are unavailable.');
	return platform.env.DB;
}

export const load: PageServerLoad = async ({ platform }) => {
	const now = new Date();
	const today = londonToday(now);
	const { previous, current } = displayWindow(now);

	const database = db(platform);
	const [children, marks, taskLists] = await Promise.all([
		fetchChildren(database),
		fetchDayMarks(database, previous[0], current[6]),
		fetchTaskLists(database)
	]);

	return {
		// The date the page was rendered for. Every control carries it, and 7.9
		// compares it against the current date when the page comes back.
		today,
		children: children.map((child) => ({
			id: child.id,
			name: child.name,
			tasks: taskListFor(taskLists, child.id),
			// Today's own control, kept separate from the correction grid because
			// marking today is the overwhelmingly common reason to open this page.
			todayEarned: marks.has(markKey(child.id, today)),
			weeks: [previous, current].map((dates) =>
				dates.map((date) => ({
					date,
					earned: marks.has(markKey(child.id, date)),
					state: squareState(date, today, marks.has(markKey(child.id, date))),
					// Rendered disabled, and rejected server-side regardless.
					future: date > today
				}))
			)
		}))
	};
};

export const actions: Actions = {
	/**
	 * Toggles one day mark.
	 *
	 * The date comes from the control, and the server applies *that* date rather
	 * than re-deriving today (design.md D14). Without this the page has a silent
	 * bug at the moment it is most used: a parent recording that today went fine,
	 * tapping at 00:20, would write Sunday while looking at a card that says
	 * Saturday — and nothing would catch it, because at 00:20 Sunday is not a
	 * future date.
	 */
	toggle: async ({ request, platform }) => {
		const form = await request.formData();
		const childId = form.get('childId');
		const date = form.get('date');
		const earned = form.get('earned') === 'true';

		if (typeof childId !== 'string' || typeof date !== 'string') {
			return fail(400, { childId: null, error: 'Malformed request.' });
		}

		const now = new Date();
		const today = londonToday(now);
		const { previous, current } = displayWindow(now);
		const editable = new Set([...previous, ...current]);

		// Checked against the current date, not the rendered one: a forged request
		// does not get to pick its own window.
		if (!editable.has(date)) {
			return fail(400, { childId, error: 'That date is outside the editable window.' });
		}
		if (date > today) {
			return fail(400, { childId, error: 'A future day cannot be marked.' });
		}

		const database = db(platform);
		if (earned) {
			await clearDay(database, childId, date);
		} else {
			await markDay(database, childId, date);
		}

		return { toggled: { childId, date, earned: !earned } };
	},

	/**
	 * Saves one child's name and task list together.
	 *
	 * One child at a time and both fields at once, because they share a single
	 * Save button — a parent who changes both and saves once expects both to
	 * persist.
	 */
	save: async ({ request, platform }) => {
		const form = await request.formData();
		const childId = form.get('childId');
		const name = form.get('name');
		const tasks = form.get('tasks');

		if (typeof childId !== 'string' || typeof name !== 'string' || typeof tasks !== 'string') {
			return fail(400, { childId: null, error: 'Malformed request.' });
		}

		const problem = nameProblem(name);
		if (problem !== null) {
			// Refused rather than truncated, and nothing is written — including the
			// task list, so a save is all or nothing.
			return fail(400, { childId, error: nameProblemMessage(problem) });
		}

		const database = db(platform);
		const now = new Date();
		await renameChild(database, childId, name);
		await saveTaskList(database, childId, tasks, now);

		return { saved: childId };
	}
};
