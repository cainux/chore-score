/**
 * Dates and times are UTC everywhere in this system. Calendar dates are
 * zone-free `YYYY-MM-DD` strings and arithmetic is done in UTC, so no interval
 * changes length across a daylight saving transition.
 *
 * `londonParts` below is the single deliberate exception, and the only place in
 * the codebase permitted to name a timezone (design.md D2).
 */

/** A zone-free calendar date, `YYYY-MM-DD`. */
export type DateString = string;

/**
 * Resolves an instant to the household's wall clock.
 *
 * This is the only timezone-aware function in the system. The chart hangs in a
 * UK kitchen, so its day has to end when that kitchen's day ends: during BST,
 * London midnight is 23:00 UTC the day before, and without this the app would
 * disagree with the wall clock for the hour after midnight, seven months a year.
 *
 * Both values come from one `formatToParts` call rather than two functions, so
 * `Europe/London` is named exactly once. `date` decides which day it is; `time`
 * exists for exactly one consumer, the render stamp on the display (D10).
 */
export function londonParts(now: Date): { date: DateString; time: string } {
	const parts = new Intl.DateTimeFormat('en-GB', {
		timeZone: 'Europe/London',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		// h23 rather than hour12: false — the latter can resolve to a 1–24 cycle,
		// which renders 00:30 as 24:30.
		hourCycle: 'h23'
	}).formatToParts(now);

	const at = (type: Intl.DateTimeFormatPartTypes) => {
		const part = parts.find((p) => p.type === type);
		if (part === undefined) throw new Error(`londonParts: no ${type} in formatted output`);
		return part.value;
	};

	return {
		date: `${at('year')}-${at('month')}-${at('day')}`,
		time: `${at('hour')}:${at('minute')}`
	};
}

/** The current London calendar date. A thin wrapper over {@link londonParts}. */
export function londonToday(now: Date): DateString {
	return londonParts(now).date;
}
