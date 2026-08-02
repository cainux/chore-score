import { defineConfig } from '@playwright/test';

// `wrangler dev` rather than `vite preview`. The auth gates read their secrets
// from Worker bindings, and `vite preview` is Node with no bindings at all —
// every gated route would fail closed with a 500 and the tests would pass for
// entirely the wrong reason. Secrets come from .dev.vars.
export default defineConfig({
	webServer: {
		command: 'npm run build && npx wrangler dev --port 4173',
		port: 4173,
		reuseExistingServer: !process.env.CI
	},
	testMatch: '**/*.e2e.{ts,js}',
	// One worker, because every test in this suite shares one D1 database. Run in
	// parallel and the admin tests toggle marks out from under each other — which
	// surfaces as a test failing on a value another file just changed, and is
	// nearly impossible to read as anything but a real bug.
	workers: 1
});
