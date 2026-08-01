## 1. Prove the risky assumption first

The scaffold exists (SvelteKit, TypeScript, vitest, Playwright, eslint, prettier). What remains is pointing it at Cloudflare and building the harness that can actually see the ICU risk — see design.md D9 for why the Wrangler config and schema live in this section rather than in section 3.

- [ ] 1.1 Switch `adapter-auto` to `adapter-cloudflare`; note the adapter is configured inline in `vite.config.ts`, as this project has no `svelte.config.js`
- [ ] 1.2 Add `wrangler.jsonc` with `main`, `assets`, and a `compatibility_date`; confirm `wrangler dev` serves the app
- [ ] 1.3 Create the D1 database and add its binding to `wrangler.jsonc`
- [ ] 1.4 Write the migration creating `children`, `day_marks`, and `task_lists` per design.md D1
- [ ] 1.5 Add the `workers` vitest project per design.md D9, standalone rather than extending `vite.config.ts`, matching `src/**/*.workers.spec.ts` — and add that same pattern to the `server` project's `exclude` so the files do not also run in Node
- [ ] 1.6 Establish empirically whether D1 state is isolated between tests in the installed version; if it is not, settle the cleanup convention before any data-layer test is written
- [ ] 1.7 Write the ICU check as a `*.workers.spec.ts` test pinning a known BST instant, so Workers' timezone support is asserted on every run rather than observed once
- [ ] 1.8 If 1.7 fails, implement the hand-rolled BST fallback (last Sunday in March to last Sunday in October) described in design.md, and note the deviation
- [ ] 1.9 Delete the scaffolding placeholders (`src/routes/demo/`, `src/lib/vitest-examples/`, `src/lib/index.ts`, the stock `+page.svelte`); note that removing the demo e2e leaves Playwright with no tests and a non-zero exit until the first real one lands

## 2. Date module — UTC only, with one London-aware function

- [ ] 2.1 Implement `londonToday(now)` returning a `YYYY-MM-DD` string — the single function permitted to reference a named timezone
- [ ] 2.2 Implement `weekStart(date)` returning the Monday of the week containing a given date, using UTC-anchored arithmetic on zone-free date strings
- [ ] 2.3 Implement `weekDates(monday)` returning the 7 dates of a week, and `displayWindow(now)` returning the previous and current week
- [ ] 2.4 Test 23:30 UTC in June resolves to the next London date — in the `workers` project, since it exercises ICU. Test that Sunday belongs to the preceding Monday's week and that a week spanning each BST transition still contains exactly 7 dates — in the `server` project, since these are pure string arithmetic with no runtime dependency
- [ ] 2.5 Add a lint rule or test asserting that `Europe/London` appears in exactly one place, and that no local-time API (`getDate`, `getDay`, `getHours`, `getMonth`, `getFullYear`) is used anywhere in the codebase

## 3. Database

The database, its binding, and the schema migration land in section 1 because the test harness depends on them. What remains is data.

- [ ] 3.1 Seed the two `children` rows with names and sort order
- [ ] 3.2 Implement queries: fetch children, fetch day marks for a date range, fetch task lists
- [ ] 3.3 Implement mutations: `INSERT OR IGNORE` a mark, `DELETE` a mark, upsert a task list — and test in the `workers` project that marking twice is idempotent and clearing leaves no row
- [ ] 3.4 Import data-layer modules directly and hand them `env.DB` rather than driving the worker over `SELF.fetch()` — see design.md D9

## 4. Domain rules

- [ ] 4.1 Implement week completion as `COUNT(*) = 7` over a week's dates per child
- [ ] 4.2 Implement day-square state resolution: earned / missed / not-yet, treating today as missed rather than not-yet when unmarked
- [ ] 4.3 Test that a current week with a perfect record so far is not complete, and that clearing one day of a complete week revokes the trophy — in the `workers` project, since completion is a D1 query. Test square-state resolution in the `server` project, since it is pure

## 5. Access control

- [ ] 5.1 Add Worker secret bindings for the admin password and the display header value; fail closed with a clear error when either is missing
- [ ] 5.2 Implement constant-time secret comparison and use it for both gates
- [ ] 5.3 Implement the display gate in `hooks.server.ts`: reject requests to `/display` lacking the expected header value
- [ ] 5.4 Implement the admin session cookie — HMAC-signed with an issued-at timestamp, `HttpOnly`, `Secure`, `SameSite=Lax`, long expiry
- [ ] 5.5 Implement the admin gate in `hooks.server.ts` plus a password form; reject tampered cookies and give no hint on a wrong password
- [ ] 5.6 Test that an admin session does not open `/display`, and that the display header does not open `/admin`

## 6. Display page

- [ ] 6.1 Add the bundled `woff2` font and its `@font-face` rule; confirm no external requests are made by the page
- [ ] 6.2 Build the star and trophy as inline SVG at the sizes given in design.md D6
- [ ] 6.3 Implement the fixed 800×480 layout: two task blocks above, two-week grid below, using the pixel budget in design.md D6
- [ ] 6.4 Render day squares in the three states using the grey levels in design.md D7
- [ ] 6.5 Render the trophy at the end of any completed week row, and never on an incomplete one
- [ ] 6.6 Constrain the task blocks so an over-long list cannot push the grid off screen
- [ ] 6.7 Set `Cache-Control: no-store` on the display response
- [ ] 6.8 Verify the page is complete with JavaScript disabled and screenshots correctly at exactly 800×480 in a headless browser

## 7. Admin page — single page, phone-first

- [ ] 7.1 Implement the toggle form action, keyed by child and date; re-check server-side that the target date is not in the future and reject it if so
- [ ] 7.2 Build the "today" section — one large card per child at the top of the page, showing today's state and toggling it in one tap, sized so both fit above the fold at a 390px viewport
- [ ] 7.3 Build the "fix a past day" section — stacked week rows per child, 44×44 minimum touch targets, future dates rendered disabled
- [ ] 7.4 Wire both surfaces to the same underlying day mark so a today toggle re-renders the correction grid and vice versa
- [ ] 7.5 Add `use:enhance` for optimistic toggling, reverting the control and surfacing an error when the POST fails
- [ ] 7.6 Build the in-place task editors — one auto-growing textarea per child, with a Save button that appears only when the field differs from the stored text
- [ ] 7.7 Implement the task save form action, one child at a time
- [ ] 7.8 Verify no horizontal scrolling and no control below 44×44 at 390px width
- [ ] 7.9 Test that toggles survive a reload, that unsaved task text is not persisted, and that editing one child's tasks leaves the other untouched

## 8. Deploy and validate on the real panel

- [ ] 8.1 Deploy to a Workers preview URL with secrets set and the migration applied
- [ ] 8.2 Point the TRMNL Screenshot plugin at the preview URL with the custom header; confirm it captures successfully
- [ ] 8.3 Check the capture on the physical panel: are the squares legible at kitchen distance, does the font survive 2-bit conversion, are the three square states distinguishable
- [ ] 8.4 Adjust type sizes, weights, and grey levels based on what the panel actually shows; decide the typeface open question here
- [ ] 8.5 Promote to the production URL and set the TRMNL refresh interval
- [ ] 8.6 Enter real task lists for both children and confirm a full round trip: toggle a square on the phone, see it appear on the wall
