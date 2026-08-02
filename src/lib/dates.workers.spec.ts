import { describe, expect, it } from 'vitest';
import { londonParts, londonToday } from './dates';

// These run in workerd rather than node because `londonParts` is the one
// function in the system that depends on the runtime having full ICU data for
// named timezones (design.md D9). Node, Chromium and the Playwright preview all
// have it, so a passing test in any of those lanes says nothing about
// production. This is the lane where the answer is in doubt.
//
// The clock time is asserted alongside the date throughout: a wrong BST offset
// moves the time in all 24 hours of the day but moves the date in only one.
describe('londonParts in workerd', () => {
	it('resolves 23:30 UTC in June to the next London date at 00:30', () => {
		expect(londonParts(new Date('2026-06-15T23:30:00Z'))).toEqual({
			date: '2026-06-16',
			time: '00:30'
		});
	});

	it('renders the midnight hour as 00 rather than 24', () => {
		// hour12: false can resolve to a 1-24 cycle in some ICU builds, which
		// would print 00:30 as 24:30 — in the exact hour this function exists for.
		expect(londonParts(new Date('2026-06-15T23:00:00Z')).time).toBe('00:00');
	});

	it('applies no offset during GMT', () => {
		expect(londonParts(new Date('2026-01-15T23:30:00Z'))).toEqual({
			date: '2026-01-15',
			time: '23:30'
		});
	});

	it('switches offset at the March transition', () => {
		// BST begins 01:00 UTC on the last Sunday in March — 29 March 2026.
		expect(londonParts(new Date('2026-03-29T00:59:00Z')).time).toBe('00:59');
		expect(londonParts(new Date('2026-03-29T01:00:00Z')).time).toBe('02:00');
	});

	it('switches offset at the October transition', () => {
		// BST ends 01:00 UTC on the last Sunday in October — 25 October 2026.
		expect(londonParts(new Date('2026-10-25T00:59:00Z')).time).toBe('01:59');
		expect(londonParts(new Date('2026-10-25T01:00:00Z')).time).toBe('01:00');
	});

	it('rolls the date an hour before UTC does during BST', () => {
		expect(londonToday(new Date('2026-06-15T22:59:00Z'))).toBe('2026-06-15');
		expect(londonToday(new Date('2026-06-15T23:00:00Z'))).toBe('2026-06-16');
	});

	it('rolls the date with UTC during GMT', () => {
		expect(londonToday(new Date('2026-01-15T23:59:00Z'))).toBe('2026-01-15');
		expect(londonToday(new Date('2026-01-16T00:00:00Z'))).toBe('2026-01-16');
	});
});
