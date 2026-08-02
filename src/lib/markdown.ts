/**
 * Inline emphasis in task text — the one piece of markup the display reads.
 *
 * `*italic*`, `**bold**`, `***both***`. Nothing else: no links, headings, code,
 * tables or nesting. This is a photograph on a kitchen wall, so a link has
 * nowhere to go, a heading has no document to structure, and every construct
 * that spans lines fights a block whose height is fixed in pixels. Emphasis is
 * the only one that earns its place — a parent wants **this one matters** to
 * look like it matters at two metres.
 *
 * **Asterisks only.** `_underscore_` is left literal, because underscores turn
 * up inside real text far more often than anyone means them as markup, and a
 * file name or a `F#_sharp` silently going italic on the wall is worse than an
 * asterisk that did not.
 *
 * Anything unmatched renders as typed: `2 * 3` is not the start of anything,
 * and `**` alone stays `**`. That is the property that keeps this safe to apply
 * to text nobody wrote with markup in mind.
 */
export type Segment = {
	text: string;
	bold: boolean;
	italic: boolean;
};

/**
 * One run of asterisks, some content, then the same run again.
 *
 * Two constraints, both load-bearing:
 *
 * - **The content cannot contain an asterisk.** It makes the match unambiguous
 *   with no backtracking rules to reason about, and a task bullet that needs a
 *   literal asterisk inside emphasis does not exist.
 * - **The content cannot begin or end with whitespace.** This is Markdown's own
 *   flanking rule, and without it `2 * 3 and 4 * 5` reads as an italic run
 *   between the two lone asterisks. Arithmetic in a task list is far more
 *   likely than someone opening emphasis with a trailing space.
 */
const EMPHASIS = /(\*{1,3})([^*\s](?:[^*]*[^*\s])?)\1/g;

/**
 * Splits one bullet into styled runs.
 *
 * Returns plain text as a single segment when there is no markup, which is the
 * overwhelmingly common case.
 */
export function inlineSegments(text: string): Segment[] {
	const segments: Segment[] = [];
	let plainFrom = 0;

	const add = (part: string, bold: boolean, italic: boolean) => {
		if (part !== '') segments.push({ text: part, bold, italic });
	};

	for (const match of text.matchAll(EMPHASIS)) {
		const [whole, delimiter, content] = match;
		add(text.slice(plainFrom, match.index), false, false);
		// One asterisk is italic, two are bold, three are both.
		add(content, delimiter.length >= 2, delimiter.length !== 2);
		plainFrom = match.index + whole.length;
	}
	add(text.slice(plainFrom), false, false);

	return segments;
}
