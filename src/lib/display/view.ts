import type { SquareState } from '$lib/chart';
import type { DateString } from '$lib/dates';

/**
 * The shape of the chart, as the server hands it over.
 *
 * These types live outside `$lib/server` on purpose. `Panel.svelte` is rendered
 * by two routes and must name what it is given, but it is client-reachable code
 * and may not import from the server tree — so the type lives here and the
 * function that produces it lives in `$lib/server/display/view`.
 */

export type DisplaySquare = { date: DateString; state: SquareState };

export type DisplayWeek = {
	squares: DisplaySquare[];
	/** Won or nothing — there are no partial states (design.md D13). */
	trophy: boolean;
};

export type DisplayRow = {
	id: string;
	name: string;
	bullets: string[];
	weeks: DisplayWeek[];
};

export type DisplayView = {
	today: DateString;
	time: string;
	/** Week labels, current first (design.md D6). */
	weeks: string[];
	rows: DisplayRow[];
};
