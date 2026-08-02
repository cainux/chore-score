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

const DAY_MS = 86_400_000;

/**
 * Parses `YYYY-MM-DD` to the UTC midnight of that calendar date.
 *
 * Not `new Date(string)`: that is only specified for well-formed input, and a
 * malformed date would silently become an Invalid Date that propagates as NaN
 * through every subsequent calculation.
 */
function toUtcMs(date: DateString): number {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
	if (match === null) throw new Error(`not a YYYY-MM-DD date: ${date}`);

	const [, year, month, day] = match;
	const ms = Date.UTC(Number(year), Number(month) - 1, Number(day));

	// Date.UTC rolls overflow forward — month 13 becomes January of the next
	// year — so a round trip is what actually rejects 2026-02-30.
	if (fromUtcMs(ms) !== date) throw new Error(`not a real calendar date: ${date}`);
	return ms;
}

/** Formats a UTC millisecond instant back to `YYYY-MM-DD`. */
function fromUtcMs(ms: number): DateString {
	return new Date(ms).toISOString().slice(0, 10);
}

/** Adds a whole number of days to a date. UTC has no DST, so a day is a day. */
export function addDays(date: DateString, days: number): DateString {
	return fromUtcMs(toUtcMs(date) + days * DAY_MS);
}

/**
 * The Monday of the week containing `date`.
 *
 * Weeks run Monday to Sunday, so a Sunday belongs to the Monday six days
 * before it rather than to the one the next day.
 */
export function weekStart(date: DateString): DateString {
	const ms = toUtcMs(date);
	// getUTCDay is 0 for Sunday; shift so Monday is 0 and Sunday is 6.
	const offset = (new Date(ms).getUTCDay() + 6) % 7;
	return fromUtcMs(ms - offset * DAY_MS);
}

/** The 7 dates of the week beginning on `monday`, Monday first. */
export function weekDates(monday: DateString): DateString[] {
	const ms = toUtcMs(monday);
	return Array.from({ length: 7 }, (_, i) => fromUtcMs(ms + i * DAY_MS));
}

/** The two weeks both pages show: the previous week and the current one. */
export type DisplayWindow = {
	today: DateString;
	previous: DateString[];
	current: DateString[];
};

/**
 * The two-week window, derived from the instant on every request so the weeks
 * roll over without anyone doing anything.
 */
export function displayWindow(now: Date): DisplayWindow {
	const today = londonToday(now);
	const thisMonday = weekStart(today);
	return {
		today,
		previous: weekDates(addDays(thisMonday, -7)),
		current: weekDates(thisMonday)
	};
}
