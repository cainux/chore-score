import type { DateString } from './dates';

/**
 * How one day square renders.
 *
 * - `earned` — a filled star.
 * - `missed` — a past or current date with no mark, drawn blank. No cross, no
 *   negative marking: a bad week should read as sparse rather than as a public
 *   telling-off.
 * - `not-yet` — a date later than today, drawn as a faint dot.
 */
export type SquareState = 'earned' | 'missed' | 'not-yet';

/**
 * How one week's trophy renders (design.md D13).
 *
 * - `won` — all 7 dates marked. Solid fill.
 * - `winnable` — nothing before today is unmarked. Hollow, dark.
 * - `lost` — some date before today is unmarked. Hollow, faint.
 *
 * The slot is never empty, so the row rhythm never changes.
 */
export type TrophyState = 'won' | 'winnable' | 'lost';

/**
 * Resolves one day square.
 *
 * Today counts as missed when unmarked, not as not-yet. The day is happening;
 * an empty square is the honest picture of it, and it fills in when the parent
 * ticks it off in the evening.
 */
export function squareState(date: DateString, today: DateString, earned: boolean): SquareState {
	if (earned) return 'earned';
	return date > today ? 'not-yet' : 'missed';
}

/**
 * Resolves one week's trophy.
 *
 * **Deliberately not built on {@link squareState}, and not the same rule.**
 * A week is lost when a date *strictly before* today is unmarked; today does
 * not count against it until it is over. Reusing the square resolver — where
 * today unmarked reads as missed — would make the trophy flicker every single
 * day:
 *
 * ```
 *   Wednesday morning   today unmarked → lost      faint
 *   Wednesday 8pm       parent ticks   → winnable  dark
 *   Thursday morning    today unmarked → lost      faint
 * ```
 *
 * Lost all day, quietly revived after bedtime when neither child is looking,
 * which is precisely when the trophy is supposed to be doing its job. Same
 * data, two questions, two rules.
 */
export function trophyState(
	dates: DateString[],
	today: DateString,
	isEarned: (date: DateString) => boolean
): TrophyState {
	if (dates.length !== 7) {
		throw new Error(`a week is 7 dates, got ${dates.length}`);
	}

	// Complete takes precedence over both other states, including for a week
	// entirely in the future that nobody could have marked yet.
	if (dates.every(isEarned)) return 'won';

	// Strictly before today. A week wholly in the past therefore has every date
	// examined and can only come out won or lost, never winnable.
	return dates.some((date) => date < today && !isEarned(date)) ? 'lost' : 'winnable';
}

/**
 * Converts stored task text to bullets (design.md D12).
 *
 * Split on line breaks, trim, drop what is then empty, strip a leading `-`, `*`
 * or `•` and the space after it. Both stripping rules correct near-certain
 * human behaviour: a parent who leaves a blank line between entries would
 * otherwise get an empty bullet on a canvas with no room for one, and a parent
 * who types `- Piano` — which is simply how people write lists — would
 * otherwise get `• - Piano` on the kitchen wall, where nobody can fix it
 * without walking to their phone.
 *
 * **This function is line structure only.** Inline emphasis is a separate rule
 * applied when a bullet is drawn — see `$lib/markdown`. Keeping them apart is
 * what lets the marker rule below stay a statement about the first character of
 * a line, with no opinion about what the rest of it means.
 *
 * The stored text is never modified — this runs at render, so reopening the
 * editor shows what was typed rather than what was displayed.
 */
export function toBullets(body: string): string[] {
	return body
		.split(/\r\n|\r|\n/)
		.map((line) => line.trim())
		.filter((line) => line !== '')
		.map(stripMarker)
		.filter((line) => line !== '');
}

/**
 * Removes one leading list marker, unless it is immediately repeated, and
 * unless a leading asterisk is opening emphasis rather than a list.
 *
 * The repeat exception is what keeps `--- break ---` literal. Stripping
 * unconditionally would leave `-- break ---` on the wall — neither the marker
 * rule doing its job nor the text rendering as typed, and the panel offers
 * nobody a way to complain about it.
 *
 * The asterisk exception is the same problem arriving from the other side. Now
 * that `*Piano*` means italic (`$lib/markdown`), stripping the opening asterisk
 * would leave `Piano*` — an unmatched delimiter that then renders literally, so
 * the parent sees a stray asterisk instead of the emphasis they asked for. An
 * asterisk is therefore a list marker only when whitespace follows it, which is
 * also Markdown's own rule for `* item`.
 */
function stripMarker(line: string): string {
	const marker = line[0];
	if (marker !== '-' && marker !== '*' && marker !== '•') return line;
	if (line[1] === marker) return line;
	// A lone `*` has nothing to emphasise, so it stays a marker and the line
	// falls away as empty.
	if (marker === '*' && line.length > 1 && !/\s/.test(line[1])) return line;
	return line.slice(1).replace(/^[ \t]+/, '');
}
