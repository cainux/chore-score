import { describe, expect, it } from 'vitest';
import { inlineSegments } from './markdown';

/** The rendered string, so a test can assert nothing was lost or invented. */
const flatten = (text: string) =>
	inlineSegments(text)
		.map((s) => s.text)
		.join('');

describe('inline emphasis', () => {
	it('leaves plain text as a single run', () => {
		expect(inlineSegments('Piano 15 mins daily')).toEqual([
			{ text: 'Piano 15 mins daily', bold: false, italic: false }
		]);
	});

	it('reads one asterisk as italic', () => {
		expect(inlineSegments('*Piano*')).toEqual([{ text: 'Piano', bold: false, italic: true }]);
	});

	it('reads two as bold', () => {
		expect(inlineSegments('**Piano**')).toEqual([{ text: 'Piano', bold: true, italic: false }]);
	});

	it('reads three as both', () => {
		expect(inlineSegments('***Piano***')).toEqual([{ text: 'Piano', bold: true, italic: true }]);
	});

	it('keeps the surrounding text', () => {
		expect(inlineSegments('play the **F#** twice')).toEqual([
			{ text: 'play the ', bold: false, italic: false },
			{ text: 'F#', bold: true, italic: false },
			{ text: ' twice', bold: false, italic: false }
		]);
	});

	it('handles several runs in one bullet', () => {
		expect(inlineSegments('**one** and *two*')).toEqual([
			{ text: 'one', bold: true, italic: false },
			{ text: ' and ', bold: false, italic: false },
			{ text: 'two', bold: false, italic: true }
		]);
	});

	it('emits no empty segments between adjacent runs', () => {
		// The display renders these flush against each other, so a stray empty
		// segment would be harmless — but an assertion here is cheaper than
		// wondering later.
		expect(inlineSegments('**a****b**')).toEqual([
			{ text: 'a', bold: true, italic: false },
			{ text: 'b', bold: true, italic: false }
		]);
	});

	describe('anything unmatched renders as typed', () => {
		it('leaves a lone asterisk alone', () => {
			expect(inlineSegments('2 * 3 stars')).toEqual([
				{ text: '2 * 3 stars', bold: false, italic: false }
			]);
		});

		it('does not pair two lone asterisks across a sentence', () => {
			// The flanking rule earning its place: without it this is an italic
			// run from the first asterisk to the second.
			expect(inlineSegments('2 * 3 and 4 * 5')).toEqual([
				{ text: '2 * 3 and 4 * 5', bold: false, italic: false }
			]);
		});

		it('will not open emphasis on a space', () => {
			expect(inlineSegments('* not a run *')).toEqual([
				{ text: '* not a run *', bold: false, italic: false }
			]);
		});

		it('leaves an unclosed run alone', () => {
			expect(inlineSegments('**not closed')).toEqual([
				{ text: '**not closed', bold: false, italic: false }
			]);
		});

		it('leaves an empty run alone', () => {
			expect(flatten('**** and **')).toBe('**** and **');
		});

		it('does not read underscores as markup', () => {
			// Deliberate: underscores turn up in real text far more often than
			// anyone means them as markup.
			expect(inlineSegments('_Piano_ and __Reading__')).toEqual([
				{ text: '_Piano_ and __Reading__', bold: false, italic: false }
			]);
		});
	});

	it('only ever removes asterisks', () => {
		// The property that makes this safe to run over text nobody wrote with
		// markup in mind: whatever it decides about the delimiters, not one other
		// character is dropped or introduced.
		const withoutStars = (s: string) => s.replaceAll('*', '');
		const samples = [
			'plain',
			'*a*',
			'**a** b **c**',
			'a * b',
			'***a***',
			'trailing *',
			'* leading',
			'Exercise 11 part 2 - hands together (thumb crossover)',
			''
		];
		for (const sample of samples) {
			expect(withoutStars(flatten(sample))).toBe(withoutStars(sample));
		}
	});

	it('is not confused by being called repeatedly', () => {
		// The pattern is a module-level global regex, which carries a lastIndex.
		expect(inlineSegments('**a**')).toEqual(inlineSegments('**a**'));
	});
});
