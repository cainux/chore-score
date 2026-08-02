import { describe, expect, it } from 'vitest';
import { squareState, toBullets, trophyState } from './chart';
import { weekDates } from './dates';

// All pure, so all in node. The D1-backed half of the same rules — week
// completion — is tested in completion.workers.spec.ts.

const WEEK = weekDates('2026-07-27'); // Mon 27 Jul – Sun 2 Aug 2026
const WEDNESDAY = '2026-07-29';

/** Builds an isEarned predicate from a list of earned dates. */
const earnedOn = (dates: string[]) => (date: string) => dates.includes(date);

describe('squareState', () => {
	it('reports a marked day as earned', () => {
		expect(squareState('2026-07-28', WEDNESDAY, true)).toBe('earned');
	});

	it('reports an unmarked past day as missed', () => {
		expect(squareState('2026-07-28', WEDNESDAY, false)).toBe('missed');
	});

	it('reports an unmarked future day as not-yet', () => {
		expect(squareState('2026-07-30', WEDNESDAY, false)).toBe('not-yet');
	});

	it('reports unmarked today as missed rather than not-yet', () => {
		// The day is happening; a blank square is the honest picture of it.
		expect(squareState(WEDNESDAY, WEDNESDAY, false)).toBe('missed');
	});

	it('lets a marked future day still read as earned', () => {
		// Not reachable through the UI, which disables future controls, but the
		// resolver should not contradict the data it is given.
		expect(squareState('2026-07-30', WEDNESDAY, true)).toBe('earned');
	});
});

describe('trophyState', () => {
	it('reports a fully marked week as won', () => {
		expect(trophyState(WEEK, WEDNESDAY, earnedOn(WEEK))).toBe('won');
	});

	it('reports a fresh week with nothing marked as winnable', () => {
		expect(trophyState(WEEK, '2026-07-27', earnedOn([]))).toBe('winnable');
	});

	it('reports a week with an earlier missed day as lost', () => {
		// Monday unmarked, Tuesday earned, on Wednesday.
		expect(trophyState(WEEK, WEDNESDAY, earnedOn(['2026-07-28']))).toBe('lost');
	});

	it('stays lost once an earlier day is missed, however much follows', () => {
		expect(trophyState(WEEK, WEDNESDAY, earnedOn(['2026-07-28', WEDNESDAY]))).toBe('lost');
	});

	it('revives a lost week when the missing earlier date is backfilled', () => {
		const lost = trophyState(WEEK, WEDNESDAY, earnedOn(['2026-07-28']));
		const revived = trophyState(WEEK, WEDNESDAY, earnedOn(['2026-07-27', '2026-07-28']));
		expect(lost).toBe('lost');
		expect(revived).toBe('winnable');
	});

	it('reports an incomplete past week as lost, never winnable', () => {
		const later = '2026-08-10';
		expect(trophyState(WEEK, later, earnedOn(WEEK.slice(0, 6)))).toBe('lost');
	});

	it('reports a complete past week as won', () => {
		expect(trophyState(WEEK, '2026-08-10', earnedOn(WEEK))).toBe('won');
	});

	it('lets complete take precedence over the winnable window', () => {
		// Every date marked including ones still in the future.
		expect(trophyState(WEEK, '2026-07-27', earnedOn(WEEK))).toBe('won');
	});

	it('refuses a date list that is not a week', () => {
		expect(() => trophyState(WEEK.slice(0, 6), WEDNESDAY, earnedOn([]))).toThrow(/7 dates/);
	});

	// This is the flicker case, and the specific failure mode if trophyState were
	// built on squareState: there, today unmarked resolves to missed, which would
	// make the week read as lost all day and quietly revive after bedtime.
	it('does not flip to lost when every earlier day is marked and today is not', () => {
		const earlierDaysOnly = earnedOn(['2026-07-27', '2026-07-28']);
		expect(trophyState(WEEK, WEDNESDAY, earlierDaysOnly)).toBe('winnable');
	});

	it('stays winnable across the whole of an unmarked today', () => {
		// Same data every hour of the day: the state cannot depend on the clock,
		// only on which calendar date it is.
		const marked = earnedOn(['2026-07-27', '2026-07-28']);
		for (const today of [WEDNESDAY, WEDNESDAY, WEDNESDAY]) {
			expect(trophyState(WEEK, today, marked)).toBe('winnable');
		}
	});

	it('turns lost only once the unmarked day is genuinely past', () => {
		const marked = earnedOn(['2026-07-27', '2026-07-28']);
		expect(trophyState(WEEK, WEDNESDAY, marked)).toBe('winnable');
		expect(trophyState(WEEK, '2026-07-30', marked)).toBe('lost');
	});

	it('disagrees with squareState about today, which is the point', () => {
		const marked = earnedOn(['2026-07-27', '2026-07-28']);
		expect(squareState(WEDNESDAY, WEDNESDAY, false)).toBe('missed');
		expect(trophyState(WEEK, WEDNESDAY, marked)).toBe('winnable');
	});
});

describe('toBullets', () => {
	it('makes one bullet per non-empty line', () => {
		expect(toBullets('Piano 15 mins\nReading log signed')).toEqual([
			'Piano 15 mins',
			'Reading log signed'
		]);
	});

	it('drops blank lines between entries', () => {
		expect(toBullets('Piano\n\n\nReading log')).toEqual(['Piano', 'Reading log']);
	});

	it('drops whitespace-only lines', () => {
		expect(toBullets('Piano\n   \n\t\nReading log')).toEqual(['Piano', 'Reading log']);
	});

	it('trims surrounding whitespace', () => {
		expect(toBullets('  Piano  \n\tReading log\t')).toEqual(['Piano', 'Reading log']);
	});

	it('strips a hand-typed dash rather than doubling the marker', () => {
		expect(toBullets('- Piano\n- Reading log')).toEqual(['Piano', 'Reading log']);
	});

	it('strips an asterisk or a bullet character too', () => {
		expect(toBullets('* Piano\n• Reading log')).toEqual(['Piano', 'Reading log']);
	});

	it('strips a dash that is not followed by a space', () => {
		expect(toBullets('-Piano')).toEqual(['Piano']);
	});

	it('keeps an asterisk that is opening emphasis rather than a list', () => {
		// `*Piano*` is italic ($lib/markdown). Stripping the opening asterisk
		// would leave `Piano*` — an unmatched delimiter, so the parent gets a
		// stray asterisk on the wall instead of the emphasis they asked for.
		expect(toBullets('*Piano*')).toEqual(['*Piano*']);
		expect(toBullets('*Piano* daily')).toEqual(['*Piano* daily']);
	});

	it('still strips an asterisk used as a list marker', () => {
		// The distinction is Markdown's own: `* item` is a list, `*item*` is not.
		expect(toBullets('*\tPiano')).toEqual(['Piano']);
	});

	it('strips only the first marker', () => {
		expect(toBullets('- - Piano')).toEqual(['- Piano']);
	});

	it('drops a line that is nothing but a marker', () => {
		expect(toBullets('Piano\n-\nReading log')).toEqual(['Piano', 'Reading log']);
	});

	it('leaves a dash inside a line alone', () => {
		expect(toBullets('Piano - 15 mins')).toEqual(['Piano - 15 mins']);
	});

	it('leaves emphasis for the renderer and does not strip it here', () => {
		// This function is line structure only. What `**` means is decided when
		// the bullet is drawn, so the text arrives there intact.
		expect(toBullets('**Piano** and _reading_')).toEqual(['**Piano** and _reading_']);
	});

	it('leaves a doubled marker alone rather than half-eating it', () => {
		// Stripping unconditionally would render `-- break ---`, which is neither
		// the marker rule working nor the text rendering as typed.
		expect(toBullets('**Piano**')).toEqual(['**Piano**']);
		expect(toBullets('--- break ---')).toEqual(['--- break ---']);
	});

	it('does not interpret a Markdown link', () => {
		expect(toBullets('[Piano](https://example.com)')).toEqual(['[Piano](https://example.com)']);
	});

	it('returns nothing for an empty list', () => {
		expect(toBullets('')).toEqual([]);
	});

	it('returns nothing for a list of only whitespace', () => {
		expect(toBullets('  \n\n \t ')).toEqual([]);
	});

	it('handles CRLF line endings', () => {
		expect(toBullets('Piano\r\nReading log')).toEqual(['Piano', 'Reading log']);
	});

	it('keeps emoji in a bullet', () => {
		expect(toBullets('- Piano 🎹')).toEqual(['Piano 🎹']);
	});

	it('does not modify the stored text', () => {
		const body = '- Piano\n\n  Reading log  ';
		toBullets(body);
		expect(body).toBe('- Piano\n\n  Reading log  ');
	});
});
