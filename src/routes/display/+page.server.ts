import { error } from '@sveltejs/kit';
import { toBullets, squareState, weekComplete } from '$lib/chart';
import { displayWindow, londonParts } from '$lib/dates';
import { PREVIOUS_WEEK_LABEL, weekLabel } from '$lib/display/labels';
import {
	fetchChildren,
	fetchDayMarks,
	fetchTaskLists,
	markKey,
	taskListFor
} from '$lib/server/db/queries';
import { BULLETS_MAX } from '$lib/settings';
import type { PageServerLoad } from './$types';

/**
 * Everything the page needs, resolved on the server.
 *
 * The client here is a camera: it loads the page once, screenshots it and
 * throws it away, so anything that would render after the response completes
 * does not exist (design.md D5). There is no client-side fetching to be done.
 */
export const load: PageServerLoad = async ({ platform }) => {
	if (platform === undefined) error(500, 'Worker bindings are unavailable.');

	const now = new Date();
	// One conversion for both values, so Europe/London is asked about once.
	const { date: today, time } = londonParts(now);
	const { previous, current } = displayWindow(now);

	const db = platform.env.DB;
	const [children, marks, taskLists] = await Promise.all([
		fetchChildren(db),
		fetchDayMarks(db, previous[0], current[6]),
		fetchTaskLists(db)
	]);

	// Current week first, previous second (design.md D6). The week being played
	// is the one a passing glance is for; last week is the record it is measured
	// against, so it reads second.
	//
	// Only the current week is dated. The one behind it says "LAST WEEK", which
	// is always true — see PREVIOUS_WEEK_LABEL for why that is affordable here
	// and nowhere else on the page (design.md D10).
	const weeks = [
		{ dates: current, label: weekLabel(current) },
		{ dates: previous, label: PREVIOUS_WEEK_LABEL }
	];

	return {
		today,
		time,
		weeks: weeks.map((week) => week.label),
		rows: children.map((child) => ({
			id: child.id,
			name: child.name,
			// Clipped here rather than in CSS, so the surplus never reaches the
			// page at all and cannot push anything off the canvas (design.md D6).
			bullets: toBullets(taskListFor(taskLists, child.id)).slice(0, BULLETS_MAX),
			weeks: weeks.map((week) => ({
				squares: week.dates.map((date) => ({
					date,
					state: squareState(date, today, marks.has(markKey(child.id, date)))
				})),
				// Won or nothing — no partial states, so this asks nothing about
				// today (design.md D13).
				trophy: weekComplete(week.dates, (date) => marks.has(markKey(child.id, date)))
			}))
		}))
	};
};
