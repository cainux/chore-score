import { NAME_MAX_GRAPHEMES } from './settings';

/**
 * Counts a name the way a person reads it.
 *
 * `.length` counts UTF-16 code units, so a family emoji scores 8 against a
 * limit meant to count 1 and a perfectly reasonable name gets refused
 * (design.md D15). `Intl.Segmenter` at grapheme granularity counts what a
 * reader would call a character.
 */
export function graphemeCount(name: string): number {
	const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
	return [...segmenter.segment(name)].length;
}

export type NameProblem = 'empty' | 'too-long';

/**
 * Validates a submitted display name.
 *
 * Rejects rather than truncates. Silently cutting a name is worse than refusing
 * it — a half-cut emoji is a replacement character on the kitchen wall, and
 * nobody can fix it from there.
 */
export function nameProblem(name: string): NameProblem | null {
	if (name.trim() === '') return 'empty';
	if (graphemeCount(name) > NAME_MAX_GRAPHEMES) return 'too-long';
	return null;
}

export function nameProblemMessage(problem: NameProblem): string {
	switch (problem) {
		case 'empty':
			return 'A name cannot be blank — a nameless row on the chart cannot be identified.';
		case 'too-long':
			return `A name can be at most ${NAME_MAX_GRAPHEMES} characters, so it fits the chart's fixed layout.`;
	}
}
