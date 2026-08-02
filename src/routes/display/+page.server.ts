import { error } from '@sveltejs/kit';
import { toBullets, squareState, trophyState } from '$lib/chart';
import { displayWindow, londonParts } from '$lib/dates';
import { weekLabel } from '$lib/display/labels';
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

	const weeks = [previous, current].map((dates) => ({ dates, label: weekLabel(dates) }));

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
				// Deliberately its own rule, not derived from the squares above
				// (design.md D13).
				trophy: trophyState(week.dates, today, (date) => marks.has(markKey(child.id, date)))
			}))
		}))
	};
};
