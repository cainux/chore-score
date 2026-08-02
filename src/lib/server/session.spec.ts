import { describe, expect, it } from 'vitest';
import {
	issueSession,
	readSession,
	SESSION_COOKIE_OPTIONS,
	SESSION_MAX_AGE_SECONDS
} from './session';

const SECRET = 'session-signing-key';
const NOW = new Date('2026-08-02T20:00:00Z');

describe('issueSession', () => {
	it('produces a payload and a signature', async () => {
		const cookie = await issueSession(SECRET, NOW);
		expect(cookie).toMatch(/^\d+\.[A-Za-z0-9_-]+$/);
	});

	it('does not put the password or the key in the cookie', async () => {
		const cookie = await issueSession(SECRET, NOW);
		expect(cookie).not.toContain(SECRET);
	});
});

describe('readSession', () => {
	it('accepts a cookie it just issued', async () => {
		const cookie = await issueSession(SECRET, NOW);
		expect(await readSession(cookie, SECRET, NOW)).toEqual({ issuedAt: NOW.getTime() });
	});

	it('accepts one issued yesterday', async () => {
		const cookie = await issueSession(SECRET, new Date('2026-08-01T20:00:00Z'));
		expect(await readSession(cookie, SECRET, NOW)).not.toBeNull();
	});

	it('rejects a missing cookie', async () => {
		expect(await readSession(undefined, SECRET, NOW)).toBeNull();
	});

	it('rejects an empty cookie', async () => {
		expect(await readSession('', SECRET, NOW)).toBeNull();
	});

	it('rejects a cookie with no signature', async () => {
		expect(await readSession(String(NOW.getTime()), SECRET, NOW)).toBeNull();
	});

	it('rejects a tampered timestamp', async () => {
		const cookie = await issueSession(SECRET, NOW);
		const [, signature] = cookie.split('.');
		const forged = `${NOW.getTime() + 1}.${signature}`;
		expect(await readSession(forged, SECRET, NOW)).toBeNull();
	});

	it('rejects a tampered signature', async () => {
		const cookie = await issueSession(SECRET, NOW);
		const [payload, signature] = cookie.split('.');
		const flipped = signature[0] === 'A' ? 'B' : 'A';
		expect(await readSession(`${payload}.${flipped}${signature.slice(1)}`, SECRET, NOW)).toBeNull();
	});

	it('rejects a cookie signed with a different key', async () => {
		const cookie = await issueSession('some other key', NOW);
		expect(await readSession(cookie, SECRET, NOW)).toBeNull();
	});

	it('rejects a wholly invented value', async () => {
		expect(await readSession('let-me-in', SECRET, NOW)).toBeNull();
	});

	it('rejects a non-numeric payload even when correctly signed', async () => {
		// Signed with the real key, so only the payload check can catch it.
		const cookie = await issueSession(SECRET, NOW);
		const signature = cookie.split('.')[1];
		expect(await readSession(`admin.${signature}`, SECRET, NOW)).toBeNull();
	});

	it('rejects a session past its expiry', async () => {
		const issued = new Date(NOW.getTime() - (SESSION_MAX_AGE_SECONDS + 1) * 1000);
		const cookie = await issueSession(SECRET, issued);
		expect(await readSession(cookie, SECRET, NOW)).toBeNull();
	});

	it('accepts a session on the last day before expiry', async () => {
		const issued = new Date(NOW.getTime() - (SESSION_MAX_AGE_SECONDS - 60) * 1000);
		const cookie = await issueSession(SECRET, issued);
		expect(await readSession(cookie, SECRET, NOW)).not.toBeNull();
	});

	it('rejects a session issued in the future', async () => {
		const cookie = await issueSession(SECRET, new Date('2026-09-01T00:00:00Z'));
		expect(await readSession(cookie, SECRET, NOW)).toBeNull();
	});
});

describe('SESSION_COOKIE_OPTIONS', () => {
	it('keeps the cookie away from client script and off plain HTTP', async () => {
		expect(SESSION_COOKIE_OPTIONS.httpOnly).toBe(true);
		expect(SESSION_COOKIE_OPTIONS.secure).toBe(true);
	});

	it('uses SameSite=Lax', async () => {
		expect(SESSION_COOKIE_OPTIONS.sameSite).toBe('lax');
	});

	it('lasts long enough not to prompt during routine daily use', async () => {
		expect(SESSION_COOKIE_OPTIONS.maxAge).toBeGreaterThan(30 * 24 * 60 * 60);
	});
});
