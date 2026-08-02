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
 * Whether a week earned its trophy: all 7 of its dates marked (design.md D13).
 *
 * **There is no notion of today here, and that is the whole point.** This
 * started as a three-state rule — won, still winnable, lost — which needed
 * today to say whether an unmarked date was a failure or simply hadn't happened
 * yet, and needed a *different* today rule from {@link squareState} to stop the
 * trophy flickering daily. The panel settled it: a hollow trophy did not read as
 * a trophy across a kitchen, so a week now either shows one or shows nothing,
 * and every question that needed today went with it.
 *
 * The 7-date guard stays. A short week silently returning `true` on `every` over
 * an empty array is exactly the kind of wrong that a wall chart displays
 * confidently for a week before anyone notices.
 */
export function weekComplete(
	dates: DateString[],
	isEarned: (date: DateString) => boolean
): boolean {
	if (dates.length !== 7) {
		throw new Error(`a week is 7 dates, got ${dates.length}`);
	}

	return dates.every(isEarned);
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
