import { secretsMatch } from './compare';

export const SESSION_COOKIE = 'chore_session';

/**
 * How long a session lasts.
 *
 * Long on purpose: the password exists to keep the page off the open web, not
 * to protect anything a parent would mind the other parent seeing, and being
 * asked to re-enter it while standing in the kitchen with a toothbrush in one
 * hand is the thing most likely to get the whole system abandoned.
 */
export const SESSION_MAX_AGE_SECONDS = 400 * 24 * 60 * 60;

/**
 * A session is an issued-at timestamp plus an HMAC over it.
 *
 * Signed rather than a random token in a table, so there is no session store to
 * create, expire or clean up (design.md D4). Verification is a signature check
 * and an expiry comparison, both of which are pure functions of the cookie and
 * the signing key.
 */
type Session = { issuedAt: number };

const encoder = new TextEncoder();

async function signingKey(secret: string): Promise<CryptoKey> {
	return crypto.subtle.importKey(
		'raw',
		encoder.encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign', 'verify']
	);
}

function toBase64Url(bytes: ArrayBuffer): string {
	return btoa(String.fromCharCode(...new Uint8Array(bytes)))
		.replaceAll('+', '-')
		.replaceAll('/', '_')
		.replaceAll('=', '');
}

async function sign(payload: string, secret: string): Promise<string> {
	const signature = await crypto.subtle.sign(
		'HMAC',
		await signingKey(secret),
		encoder.encode(payload)
	);
	return toBase64Url(signature);
}

/** Mints a cookie value for a session starting now. */
export async function issueSession(secret: string, now: Date): Promise<string> {
	const payload = String(now.getTime());
	return `${payload}.${await sign(payload, secret)}`;
}

/**
 * Verifies a cookie value, returning the session or `null`.
 *
 * Returns `null` for every kind of failure — malformed, wrong signature,
 * expired — because the caller has exactly one response to all of them and
 * distinguishing them would only ever be useful to someone probing.
 */
export async function readSession(
	cookie: string | undefined,
	secret: string,
	now: Date
): Promise<Session | null> {
	if (cookie === undefined) return null;

	const separator = cookie.lastIndexOf('.');
	if (separator <= 0) return null;

	const payload = cookie.slice(0, separator);
	const presented = cookie.slice(separator + 1);

	// Constant-time, same as the password: the signature is a secret derived
	// from the signing key, and a forger who can time a comparison against it
	// can construct one byte at a time.
	if (!secretsMatch(presented, await sign(payload, secret))) return null;

	const issuedAt = Number(payload);
	if (!Number.isSafeInteger(issuedAt)) return null;

	// A cookie issued in the future is either a tampered payload that happens to
	// verify — impossible without the key — or a clock that has moved backwards.
	// Neither is a session worth honouring.
	if (issuedAt > now.getTime()) return null;
	if (now.getTime() - issuedAt > SESSION_MAX_AGE_SECONDS * 1000) return null;

	return { issuedAt };
}

/** Cookie attributes. `Secure` and `HttpOnly` are not negotiable. */
export const SESSION_COOKIE_OPTIONS = {
	path: '/',
	httpOnly: true,
	secure: true,
	sameSite: 'lax',
	maxAge: SESSION_MAX_AGE_SECONDS
} as const;
