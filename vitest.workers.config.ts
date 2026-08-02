import path from 'node:path';
import { defineConfig } from 'vitest/config';
import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-pool-workers';

// Read in Node, applied inside workerd — see src/lib/server/db/testing.ts.
const migrations = await readD1Migrations(path.join(import.meta.dirname, 'migrations'));

// Standalone on purpose (design.md D9): extending ./vite.config.ts would drag
// the sveltekit() plugin into a runtime that has no business running it. The
// pool reads bindings straight from wrangler.jsonc, so `env.DB` in a test is a
// real D1 database inside real workerd — the two things every other test lane
// is structurally blind to.
export default defineConfig({
	plugins: [
		cloudflareTest({
			wrangler: { configPath: './wrangler.jsonc' }
		})
	],
	test: {
		name: 'workers',
		expect: { requireAssertions: true },
		include: ['src/**/*.workers.spec.ts'],
		provide: { migrations }
	}
});
