import { describe, expect, it } from 'vitest';
import { addDays, displayWindow, weekDates, weekStart } from './dates';

// Everything here is pure string arithmetic over zone-free dates, with no clock,
// no zone and nothing to mock — which is the whole point of confining the
// timezone question to londonParts. It runs in node because it has no runtime
// dependency and workerd startup is not free (design.md D9).

describe('weekStart', () => {
	it('puts Sunday in the week that began on the preceding Monday', () => {
		// 2 August 2026 is a Sunday.
		expect(weekStart('2026-08-02')).toBe('2026-07-27');
	});

	it('leaves a Monday where it is', () => {
		expect(weekStart('2026-07-27')).toBe('2026-07-27');
	});

	it('resolves every day of one week to the same Monday', () => {
		const mondays = weekDates('2026-07-27').map(weekStart);
		expect(new Set(mondays)).toEqual(new Set(['2026-07-27']));
	});

	it('rejects a malformed date rather than returning an invalid one', () => {
		expect(() => weekStart('nope')).toThrow(/YYYY-MM-DD/);
	});

	it('rejects a date that does not exist', () => {
		// Date.UTC would roll this forward to 2 March in silence.
		expect(() => weekStart('2026-02-30')).toThrow(/not a real calendar date/);
	});
});

describe('weekDates', () => {
	it('returns 7 consecutive dates, Monday first', () => {
		expect(weekDates('2026-07-27')).toEqual([
			'2026-07-27',
			'2026-07-28',
			'2026-07-29',
			'2026-07-30',
			'2026-07-31',
			'2026-08-01',
			'2026-08-02'
		]);
	});

	it('still contains exactly 7 dates across the spring transition', () => {
		// BST begins on Sunday 29 March 2026, inside this week.
		const week = weekDates('2026-03-23');
		expect(week).toHaveLength(7);
		expect(week.at(-1)).toBe('2026-03-29');
	});

	it('still contains exactly 7 dates across the autumn transition', () => {
		// BST ends on Sunday 25 October 2026, inside this week.
		const week = weekDates('2026-10-19');
		expect(week).toHaveLength(7);
		expect(week.at(-1)).toBe('2026-10-25');
	});

	it('crosses a year boundary without losing a day', () => {
		const week = weekDates('2026-12-28');
		expect(week).toEqual([
			'2026-12-28',
			'2026-12-29',
			'2026-12-30',
			'2026-12-31',
			'2027-01-01',
			'2027-01-02',
			'2027-01-03'
		]);
	});
});

describe('addDays', () => {
	it('adds across a month boundary', () => {
		expect(addDays('2026-07-31', 1)).toBe('2026-08-01');
	});

	it('subtracts across a year boundary', () => {
		expect(addDays('2027-01-01', -1)).toBe('2026-12-31');
	});

	it('handles a leap day', () => {
		expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
	});

	it('is exact across the spring transition', () => {
		// 23 hours of real time, but seven calendar days either way.
		expect(addDays('2026-03-25', 7)).toBe('2026-04-01');
		expect(addDays('2026-04-01', -7)).toBe('2026-03-25');
	});
});

describe('displayWindow', () => {
	it('returns the previous week then the current one', () => {
		const window = displayWindow(new Date('2026-08-02T12:00:00Z'));
		expect(window.today).toBe('2026-08-02');
		expect(window.previous.at(0)).toBe('2026-07-20');
		expect(window.previous.at(-1)).toBe('2026-07-26');
		expect(window.current.at(0)).toBe('2026-07-27');
		expect(window.current.at(-1)).toBe('2026-08-02');
	});

	it('rolls both weeks forward when Sunday becomes Monday', () => {
		const sunday = displayWindow(new Date('2026-08-02T12:00:00Z'));
		const monday = displayWindow(new Date('2026-08-03T12:00:00Z'));
		expect(monday.previous).toEqual(sunday.current);
		expect(monday.current.at(0)).toBe('2026-08-03');
	});

	it('shows 14 distinct dates', () => {
		const { previous, current } = displayWindow(new Date('2026-08-02T12:00:00Z'));
		expect(new Set([...previous, ...current]).size).toBe(14);
	});
});
