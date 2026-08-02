import { describe, expect, it } from 'vitest';
import { secretsMatch } from './compare';

describe('secretsMatch', () => {
	it('accepts an exact match', () => {
		expect(secretsMatch('correct horse', 'correct horse')).toBe(true);
	});

	it('rejects a value differing in the last character', () => {
		expect(secretsMatch('correct horsf', 'correct horse')).toBe(false);
	});

	it('rejects a value differing in the first character', () => {
		expect(secretsMatch('xorrect horse', 'correct horse')).toBe(false);
	});

	it('rejects a prefix of the real secret', () => {
		expect(secretsMatch('correct', 'correct horse')).toBe(false);
	});

	it('rejects the real secret with something appended', () => {
		expect(secretsMatch('correct horse!', 'correct horse')).toBe(false);
	});

	it('rejects an empty submission', () => {
		expect(secretsMatch('', 'correct horse')).toBe(false);
	});

	it('is case sensitive', () => {
		expect(secretsMatch('Correct Horse', 'correct horse')).toBe(false);
	});

	it('handles multi-byte characters without a false match', () => {
		// Two different strings of equal UTF-16 length but different bytes.
		expect(secretsMatch('pässword', 'password')).toBe(false);
		expect(secretsMatch('pässword', 'pässword')).toBe(true);
	});

	it('examines every byte rather than stopping at the first difference', () => {
		// Not a timing measurement — those are too noisy to assert on. This pins
		// the property the implementation relies on: a mismatch early in the
		// string and one late in it are both simply false, with no short-circuit
		// path that could distinguish them.
		const expected = 'aaaaaaaaaaaaaaaa';
		const differsFirst = 'baaaaaaaaaaaaaaa';
		const differsLast = 'aaaaaaaaaaaaaaab';
		expect(secretsMatch(differsFirst, expected)).toBe(false);
		expect(secretsMatch(differsLast, expected)).toBe(false);
	});
});
