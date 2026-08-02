import type { DateString } from '$lib/dates';

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
	'January',
	'February',
	'March',
	'April',
	'May',
	'June',
	'July',
	'August',
	'September',
	'October',
	'November',
	'December'
];

/** Monday-first initials for the weekday header row. */
export const WEEKDAY_INITIALS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function parts(date: DateString): { year: number; month: number; day: number } {
	const [year, month, day] = date.split('-').map(Number);
	return { year, month, day };
}

/** The weekday of a zone-free date, 0 = Sunday. UTC arithmetic, never local. */
function weekday(date: DateString): number {
	const { year, month, day } = parts(date);
	return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

/**
 * The right-hand week's label.
 *
 * Relative rather than dated, unlike the current week. A relative label stays
 * true forever, which is exactly what D10 warns about — an e-ink panel holds
 * its last image with no power, so a dead panel and a live one are
 * pixel-identical, and a label that can never go wrong cannot expose that.
 *
 * It is affordable on this one label because the staleness signal does not rest
 * on it: the current week keeps its dates and the render stamp keeps its date
 * and time, so two independent parts of the page still go visibly wrong. And
 * "which dates was that week" is a question nobody asks of the week that has
 * already finished — what they want to know is whether it was a good one.
 */
export const PREVIOUS_WEEK_LABEL = 'LAST WEEK';

/**
 * Labels a week by the dates it covers — `20–26 JUL`, or `27 JUL–2 AUG` when it
 * straddles a month.
 *
 * Dates rather than "THIS WEEK", and that is the whole point (design.md D10):
 * this is the label carrying the staleness signal, so it has to be one that can
 * go visibly wrong.
 */
export function weekLabel(dates: DateString[]): string {
	const first = parts(dates[0]);
	const last = parts(dates[6]);

	if (first.month === last.month) {
		return `${first.day}–${last.day} ${MONTHS[first.month - 1]}`;
	}
	return `${first.day} ${MONTHS[first.month - 1]}–${last.day} ${MONTHS[last.month - 1]}`;
}

/**
 * The render stamp: `updated Sat 2 Aug 20:14`.
 *
 * The date carries the weight here. A screenshot cannot say "5 minutes ago" —
 * it has no idea when it will be looked at — so the reader has to do the
 * arithmetic, and nobody glancing at a wall works out whether 47 minutes is
 * within the poll interval. The date reads as wrong without any arithmetic at
 * all, and the day name is what makes it instant. The time is there because it
 * is the only thing that catches same-day staleness.
 */
export function renderStamp(date: DateString, time: string): string {
	const { month, day } = parts(date);
	const dayName = DAY_NAMES[weekday(date)];
	const monthName = MONTH_NAMES[month - 1].slice(0, 3);
	return `updated ${dayName} ${day} ${monthName} ${time}`;
}
