/**
 * The two secrets, read from Worker bindings.
 *
 * Neither has a default. An app that falls back to a known value when its
 * secret is missing is worse than one that refuses to start: it looks healthy
 * while being open, and nothing about a working page says which of the two it
 * is. So a missing secret is an error at the point of use, and the gate that
 * needed it rejects the request.
 */
export type Secrets = {
	/** Shared password for the admin area. */
	adminPassword: string;
	/** Value the TRMNL Screenshot plugin must send to reach /display. */
	displayKey: string;
	/** Key the admin session cookie is signed with. */
	sessionSecret: string;
};

export class MissingSecretError extends Error {
	constructor(name: string) {
		super(
			`${name} is not configured. Set it with \`wrangler secret put ${name}\`, or in .dev.vars for local development.`
		);
		this.name = 'MissingSecretError';
	}
}

function required(env: Record<string, unknown>, name: string): string {
	const value = env[name];
	if (typeof value !== 'string' || value === '') throw new MissingSecretError(name);
	return value;
}

/**
 * Reads all three secrets, throwing on the first one missing.
 *
 * Read together rather than lazily per gate so that a misconfigured deployment
 * fails on any request rather than only on the one route that happens to need
 * the absent value.
 */
export function readSecrets(env: Record<string, unknown>): Secrets {
	return {
		adminPassword: required(env, 'ADMIN_PASSWORD'),
		displayKey: required(env, 'DISPLAY_KEY'),
		sessionSecret: required(env, 'SESSION_SECRET')
	};
}
