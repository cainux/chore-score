import { error, redirect, type Handle } from '@sveltejs/kit';
import { adminSessionAccepted, displayKeyAccepted, gateFor } from '$lib/server/gates';
import { MissingSecretError, readSecrets } from '$lib/server/secrets';

export const LOGIN_PATH = '/admin/login';

/**
 * Two independent gates, one per route family (design.md D4).
 *
 * They do not overlap and neither stands in for the other. Both read their
 * secrets from Worker bindings, and a missing binding fails the request closed
 * rather than falling through to an insecure default.
 */
export const handle: Handle = async ({ event, resolve }) => {
	const gate = gateFor(event.url.pathname);
	if (gate === 'none') return resolve(event);

	const platform = event.platform;
	if (platform === undefined) {
		// No bindings at all: running somewhere the Worker environment does not
		// exist. Nothing gated can be served safely.
		error(500, 'Worker bindings are unavailable, so no gated route can be served.');
	}

	let secrets;
	try {
		secrets = readSecrets(platform.env as unknown as Record<string, unknown>);
	} catch (cause) {
		if (cause instanceof MissingSecretError) error(500, cause.message);
		throw cause;
	}

	if (gate === 'display') {
		// A parent's admin session is deliberately no help here.
		if (!displayKeyAccepted(event.request, secrets.displayKey)) {
			error(401, 'Not authorised.');
		}
		const response = await resolve(event);
		// TRMNL must never screenshot a cached copy of yesterday's chart.
		response.headers.set('Cache-Control', 'no-store');
		return response;
	}

	// The login page is the one admin route reachable without a session, or
	// there would be nowhere to enter the password.
	if (event.url.pathname === LOGIN_PATH) return resolve(event);

	// Likewise, the display key is deliberately no help here.
	if (!(await adminSessionAccepted(event.cookies, secrets.sessionSecret, new Date()))) {
		redirect(303, LOGIN_PATH);
	}

	return resolve(event);
};
