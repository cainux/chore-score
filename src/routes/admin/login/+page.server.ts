import { fail, redirect, type Actions } from '@sveltejs/kit';
import { secretsMatch } from '$lib/server/compare';
import { readSecrets } from '$lib/server/secrets';
import { issueSession, SESSION_COOKIE, SESSION_COOKIE_OPTIONS } from '$lib/server/session';

export const actions: Actions = {
	default: async ({ request, cookies, platform }) => {
		if (platform === undefined) {
			return fail(500, { error: 'Worker bindings are unavailable.' });
		}

		const secrets = readSecrets(platform.env as unknown as Record<string, unknown>);
		const submitted = (await request.formData()).get('password');

		// One message for every failure. Saying which part was wrong — that the
		// password was close, that the field was empty — only ever helps someone
		// who does not already know it.
		if (typeof submitted !== 'string' || !secretsMatch(submitted, secrets.adminPassword)) {
			return fail(401, { error: 'That password was not recognised.' });
		}

		cookies.set(
			SESSION_COOKIE,
			await issueSession(secrets.sessionSecret, new Date()),
			SESSION_COOKIE_OPTIONS
		);

		redirect(303, '/admin');
	}
};
