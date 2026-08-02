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
 * Labels a week by the dates it covers — `20–26 JUL`, or `27 JUL–2 AUG` when it
 * straddles a month.
 *
 * Dates rather than "LAST WEEK" / "THIS WEEK", and that is the whole point
 * (design.md D10). A relative label stays true forever, which is precisely the
 * problem: an e-ink panel holds its last image with no power, so a dead panel
 * and a live one are pixel-identical. A dated label goes visibly wrong.
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
