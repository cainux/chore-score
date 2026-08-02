import { applyD1Migrations, env, reset, type D1Migration } from 'cloudflare:test';
import { beforeEach, inject } from 'vitest';

// `migrations` is provided by vitest.workers.config.ts, which reads the SQL
// files in Node — workerd has no filesystem to read them from.
declare module 'vitest' {
	interface ProvidedContext {
		migrations: D1Migration[];
	}
}

/**
 * Gives every test in the calling file empty tables that actually exist.
 *
 * The pool isolates D1 per file rather than per test, and a file opens against
 * a database carrying no schema at all, so the tables have to be created here.
 * `reset()` drops them rather than truncating, which is why the migrations are
 * reapplied on each test rather than once up front.
 */
export function withSchema(): void {
	beforeEach(async () => {
		await reset();
		await applyD1Migrations(env.DB, inject('migrations'));
	});
}
