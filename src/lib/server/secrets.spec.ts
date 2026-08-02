import { describe, expect, it } from 'vitest';
import { MissingSecretError, readSecrets } from './secrets';

const COMPLETE = {
	ADMIN_PASSWORD: 'correct horse',
	DISPLAY_KEY: 'display-key',
	SESSION_SECRET: 'session-secret'
};

describe('readSecrets', () => {
	it('returns all three when configured', () => {
		expect(readSecrets(COMPLETE)).toEqual({
			adminPassword: 'correct horse',
			displayKey: 'display-key',
			sessionSecret: 'session-secret'
		});
	});

	it.each(Object.keys(COMPLETE))('fails closed when %s is absent', (name) => {
		const env: Record<string, unknown> = { ...COMPLETE };
		delete env[name];
		expect(() => readSecrets(env)).toThrow(MissingSecretError);
	});

	it('treats an empty string as absent', () => {
		// A binding declared but never set is the likeliest way to get here, and
		// an empty secret would otherwise be a password anyone can guess.
		expect(() => readSecrets({ ...COMPLETE, ADMIN_PASSWORD: '' })).toThrow(MissingSecretError);
	});

	it('names the missing secret and how to set it', () => {
		expect(() => readSecrets({ ...COMPLETE, DISPLAY_KEY: undefined })).toThrow(
			/DISPLAY_KEY.*wrangler secret put/s
		);
	});

	it('does not accept a non-string binding', () => {
		expect(() => readSecrets({ ...COMPLETE, SESSION_SECRET: 12345 })).toThrow(MissingSecretError);
	});
});
