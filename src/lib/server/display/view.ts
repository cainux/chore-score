import { toBullets, squareState, weekComplete } from '$lib/chart';
import { displayWindow, londonParts } from '$lib/dates';
import { PREVIOUS_WEEK_LABEL, weekLabel } from '$lib/display/labels';
import type { DisplayView } from '$lib/display/view';
import {
	fetchChildren,
	fetchDayMarks,
	fetchTaskLists,
	markKey,
	taskListFor
} from '$lib/server/db/queries';
import { BULLETS_MAX } from '$lib/settings';

/**
 * The whole chart, resolved from D1 in one place.
 *
 * Two routes call this: `/display`, which the panel screenshots, and
 * `/admin/preview`, which a parent watches while editing. They render the same
 * `Panel.svelte` from the same view model, so the preview cannot drift from the
 * chart it is previewing — the divergence is impossible by construction rather
 * than by discipline (design.md D18).
 *
 * A second copy of this arithmetic is the failure this exists to prevent: it
 * would be right today and subtly wrong after the next change to `squareState`
 * or `toBullets`, wrong in the way that shows least and costs most trust.
 */
export async function buildDisplayView(db: D1Database, now: Date): Promise<DisplayView> {
	// One conversion for both values, so Europe/London is asked about once.
	const { date: today, time } = londonParts(now);
	const { previous, current } = displayWindow(now);

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
}
