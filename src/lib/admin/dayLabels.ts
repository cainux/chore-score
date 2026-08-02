import type { DateString } from '$lib/dates';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = [
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

/** Monday-first initials for the correction grid header. */
export const WEEKDAY_INITIALS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function parts(date: DateString) {
	const [year, month, day] = date.split('-').map(Number);
	return { year, month, day };
}

/**
 * `Saturday 1 August` — the today card's own heading.
 *
 * Loud rather than small print, because pinning the date to the control is only
 * half the fix (design.md D14). A parent tapping by muscle memory will not read
 * a caption, but has a chance of registering a heading — which is what makes a
 * page left open since yesterday visibly wrong rather than silently wrong.
 */
export function longDate(date: DateString): string {
	const { year, month, day } = parts(date);
	const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
	return `${DAYS[weekday]} ${day} ${MONTHS[month - 1]}`;
}

/** `Mon 27 Jul`, for the accessible name of a correction-grid control. */
export function shortDate(date: DateString): string {
	const { year, month, day } = parts(date);
	const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
	return `${DAYS[weekday].slice(0, 3)} ${day} ${MONTHS[month - 1].slice(0, 3)}`;
}
