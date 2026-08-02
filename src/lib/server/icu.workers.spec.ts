import { describe, expect, it } from 'vitest';

// Does workerd carry full ICU data for named timezones?
//
// Every other test lane — node, Chromium, the Playwright preview — has ICU and
// would pass this without telling us anything about production (design.md D9).
// Hence a permanent assertion in the one runtime where the answer is in doubt,
// rather than a check run once by hand.
//
// The clock time is the sensitive half. A wrong BST offset moves it in all 24
// hours of the day, but moves the date in only one of them.
//
// This is the sole exception to the rule that `Europe/London` appears in one
// place: `londonParts` does not exist yet (task 2.1). Task 2.4 folds this file
// into the `londonParts` spec and the second occurrence goes with it.
describe('workerd ICU support for Europe/London', () => {
	const parts = (iso: string) =>
		Object.fromEntries(
			new Intl.DateTimeFormat('en-GB', {
				timeZone: 'Europe/London',
				year: 'numeric',
				month: '2-digit',
				day: '2-digit',
				hour: '2-digit',
				minute: '2-digit',
				hour12: false
			})
				.formatToParts(new Date(iso))
				.map((p) => [p.type, p.value])
		);

	it('applies the +01:00 offset during British Summer Time', () => {
		const p = parts('2026-06-15T23:30:00Z');
		expect(`${p.year}-${p.month}-${p.day}`).toBe('2026-06-16');
		expect(`${p.hour}:${p.minute}`).toBe('00:30');
	});

	it('applies no offset during GMT', () => {
		const p = parts('2026-01-15T23:30:00Z');
		expect(`${p.year}-${p.month}-${p.day}`).toBe('2026-01-15');
		expect(`${p.hour}:${p.minute}`).toBe('23:30');
	});

	it('switches offset at the March transition', () => {
		// BST begins 01:00 UTC on the last Sunday in March — 29 March 2026.
		const before = parts('2026-03-29T00:59:00Z');
		const after = parts('2026-03-29T01:00:00Z');
		expect(`${before.hour}:${before.minute}`).toBe('00:59');
		expect(`${after.hour}:${after.minute}`).toBe('02:00');
	});

	it('switches offset at the October transition', () => {
		// BST ends 01:00 UTC on the last Sunday in October — 25 October 2026.
		const before = parts('2026-10-25T00:59:00Z');
		const after = parts('2026-10-25T01:00:00Z');
		expect(`${before.hour}:${before.minute}`).toBe('01:59');
		expect(`${after.hour}:${after.minute}`).toBe('01:00');
	});
});
