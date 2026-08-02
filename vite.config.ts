import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import adapter from '@sveltejs/adapter-cloudflare';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			// Cloudflare Workers + D1. There is no svelte.config.js in this project —
			// the adapter and compiler options live here.
			adapter: adapter()
		})
	],
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'client',
					browser: {
						enabled: true,
						provider: playwright(),
						instances: [{ browser: 'chromium', headless: true }]
					},
					include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					exclude: ['src/lib/server/**']
				}
			},

			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					// The workers pattern must be excluded here as well as included
					// there, or every workerd test runs a second time in node and
					// fails on its `cloudflare:test` import.
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}', 'src/**/*.workers.spec.ts']
				}
			},

			// Real workerd + D1 via Miniflare — see design.md D9 and
			// vitest.workers.config.ts for why it does not extend this file.
			'./vitest.workers.config.ts'
		]
	}
});
