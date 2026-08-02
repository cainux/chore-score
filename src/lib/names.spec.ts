import { describe, expect, it } from 'vitest';
import { graphemeCount, nameProblem } from './names';
import { NAME_MAX_GRAPHEMES } from './settings';

describe('graphemeCount', () => {
	it('counts plain characters', () => {
		expect(graphemeCount('Alice')).toBe(5);
	});

	it('counts a simple emoji as one', () => {
		// Two UTF-16 code units, one character to a reader.
		expect('🎂'.length).toBe(2);
		expect(graphemeCount('🎂')).toBe(1);
	});

	it('counts a skin-tone emoji as one', () => {
		expect(graphemeCount('👍🏽')).toBe(1);
	});

	it('counts a ZWJ family emoji as one', () => {
		// Eight code units. Counting those against the limit would refuse a name
		// that occupies the space of a single character on the chart.
		const family = '👩‍👩‍👧‍👦';
		expect(family.length).toBeGreaterThan(7);
		expect(graphemeCount(family)).toBe(1);
	});

	it('counts a flag as one', () => {
		expect(graphemeCount('🏴󠁧󠁢󠁷󠁬󠁳󠁿')).toBe(1);
	});

	it('counts a combining accent with its base as one', () => {
		expect(graphemeCount('é')).toBe(1);
	});

	it('counts a decorated name the way it reads', () => {
		expect(graphemeCount('Alice 🎂')).toBe(7);
	});

	it('counts an empty string as nothing', () => {
		expect(graphemeCount('')).toBe(0);
	});
});

describe('nameProblem', () => {
	it('accepts an ordinary name', () => {
		expect(nameProblem('Alice')).toBeNull();
	});

	it('accepts a name decorated with emoji', () => {
		expect(nameProblem('Alice 🎂')).toBeNull();
	});

	it('refuses an empty name', () => {
		expect(nameProblem('')).toBe('empty');
	});

	it('refuses a whitespace-only name', () => {
		expect(nameProblem('   \t ')).toBe('empty');
	});

	it('accepts a name exactly at the limit', () => {
		expect(nameProblem('a'.repeat(NAME_MAX_GRAPHEMES))).toBeNull();
	});

	it('refuses a name one character over', () => {
		expect(nameProblem('a'.repeat(NAME_MAX_GRAPHEMES + 1))).toBe('too-long');
	});

	it('measures the limit in graphemes, not code units', () => {
		// Well over the limit by .length, comfortably under it by grapheme.
		const emojiName = '👩‍👩‍👧‍👦'.repeat(3);
		expect(emojiName.length).toBeGreaterThan(NAME_MAX_GRAPHEMES);
		expect(nameProblem(emojiName)).toBeNull();
	});
});
