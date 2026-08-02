## 1. Prove the risky assumption first

The scaffold exists (SvelteKit, TypeScript, vitest, Playwright, eslint, prettier). What remains is pointing it at Cloudflare and building the harness that can actually see the ICU risk — see design.md D9 for why the Wrangler config and schema live in this section rather than in section 3.

- [ ] 1.1 Switch `adapter-auto` to `adapter-cloudflare`; note the adapter is configured inline in `vite.config.ts`, as this project has no `svelte.config.js`
- [ ] 1.2 Add `wrangler.jsonc` with `main`, `assets`, and a `compatibility_date`; confirm `wrangler dev` serves the app
- [ ] 1.3 Create the D1 database and add its binding to `wrangler.jsonc`
- [ ] 1.4 Write the migration creating `children`, `day_marks`, and `task_lists` per design.md D1
- [ ] 1.4a Install `@cloudflare/vitest-pool-workers` — it is not currently a dependency, though `pnpm-workspace.yaml` already allows the `workerd` build for it. The release line peering `vitest ^4.1` pins the `wrangler` and `miniflare` versions already in the lockfile, so it should resolve without moving anything else; check that it does
- [ ] 1.5 Add the `workers` vitest project per design.md D9, standalone rather than extending `vite.config.ts`, matching `src/**/*.workers.spec.ts` — and add that same pattern to the `server` project's `exclude` so the files do not also run in Node
- [ ] 1.6 Establish empirically whether D1 state is isolated between tests in the installed version; if it is not, settle the cleanup convention before any data-layer test is written
- [ ] 1.6a Settle how the schema migration is applied inside the pool so D1 tests start against real tables — the mechanism belongs with whatever 1.6 concludes about isolation, since the two together decide what a test can assume on entry
- [ ] 1.7 Write the ICU check as a `*.workers.spec.ts` test pinning a known BST instant, asserting both the London date and the London clock time, so Workers' timezone support is asserted on every run rather than observed once — the time is the more sensitive probe, since a wrong offset shifts it every hour of the day
- [ ] 1.8 If 1.7 fails, implement the hand-rolled BST fallback (last Sunday in March to last Sunday in October) described in design.md, and note the deviation
- [ ] 1.9 Delete the scaffolding placeholders (`src/routes/demo/`, `src/lib/vitest-examples/`, `src/lib/index.ts`, the stock `+page.svelte`); note that removing the demo e2e leaves Playwright with no tests and a non-zero exit until the first real one lands

## 2. Date module — UTC only, with one London-aware function

- [ ] 2.1 Implement `londonParts(now)` returning `{ date, time }` from a single `Intl.DateTimeFormat` `formatToParts` call — the only place a named timezone may appear — with `londonToday(now)` as a thin wrapper returning the date (design.md D2)
- [ ] 2.2 Implement `weekStart(date)` returning the Monday of the week containing a given date, using UTC-anchored arithmetic on zone-free date strings
- [ ] 2.3 Implement `weekDates(monday)` returning the 7 dates of a week, and `displayWindow(now)` returning the previous and current week
- [ ] 2.4 Test 23:30 UTC in June resolves to the next London date and a 00:30 clock time — in the `workers` project, since it exercises ICU. Test that Sunday belongs to the preceding Monday's week and that a week spanning each BST transition still contains exactly 7 dates — in the `server` project, since these are pure string arithmetic with no runtime dependency
- [ ] 2.5 Add a lint rule or test asserting that `Europe/London` appears in exactly one place, and that no local-time API (`getDate`, `getDay`, `getHours`, `getMonth`, `getFullYear`) is used anywhere in the codebase — including inside `londonParts`, which reads from `formatToParts`

## 3. Database

The database, its binding, and the schema migration land in section 1 because the test harness depends on them. What remains is data.

- [ ] 3.1 Seed the two `children` rows with names and sort order
- [ ] 3.2 Implement queries: fetch children, fetch day marks for a date range, fetch task lists
- [ ] 3.3 Implement mutations: `INSERT OR IGNORE` a mark, `DELETE` a mark, upsert a task list, update a child's name — and test in the `workers` project that marking twice is idempotent, that clearing leaves no row, and that a rename preserves the child's id, day marks and task list
- [ ] 3.4 Import data-layer modules directly and hand them `env.DB` rather than driving the worker over `SELF.fetch()` — see design.md D9

## 4. Domain rules

- [ ] 4.1 Implement week completion as `COUNT(*) = 7` over a week's dates per child
- [ ] 4.2 Implement day-square state resolution: earned / missed / not-yet, treating today as missed rather than not-yet when unmarked
- [ ] 4.3 Implement week winnability per design.md D13: lost when any date **strictly before** today is unmarked, still winnable otherwise, complete taking precedence over both — deliberately not the same rule as 4.2, and not built on it
- [ ] 4.4 Implement task-text-to-bullets conversion per design.md D12: split on line breaks, trim, drop empties, strip a leading `-`/`*`/`•`; plain text only, no Markdown, stored text left untouched
- [ ] 4.5 Test that a current week with a perfect record so far is not complete, and that clearing one day of a complete week revokes the trophy — in the `workers` project, since completion is a D1 query. Test square-state resolution, winnability, and bullet conversion in the `server` project, since they are pure
- [ ] 4.6 Test the winnability flicker case specifically: with every earlier day marked and today unmarked, the week is still winnable and does not flip to lost — the failure mode if 4.3 is built on 4.2
- [ ] 4.7 Put every value that step 8.4 will retune into one module with provisional settings: the name length limit in graphemes (7.7, 7.13), the bullet limit (6.8), and the display typeface (6.1). Sections 6 and 7 cannot be written without a value for each, but none can be decided before the panel is in front of you — so the point is that 8.4 edits one file rather than hunting for scattered numbers. The typeface is not a domain rule and sits here only to keep the retune in one place

## 5. Access control

- [ ] 5.1 Add Worker secret bindings for the admin password and the display header value; fail closed with a clear error when either is missing
- [ ] 5.2 Implement constant-time secret comparison and use it for both gates
- [ ] 5.3 Implement the display gate in `hooks.server.ts`: reject requests to `/display` lacking the expected header value
- [ ] 5.4 Implement the admin session cookie — HMAC-signed with an issued-at timestamp, `HttpOnly`, `Secure`, `SameSite=Lax`, long expiry
- [ ] 5.5 Implement the admin gate in `hooks.server.ts` plus a password form; reject tampered cookies and give no hint on a wrong password
- [ ] 5.6 Test that an admin session does not open `/display`, and that the display header does not open `/admin`

## 6. Display page

- [ ] 6.1 Add the bundled text `woff2` and its `@font-face` rule; confirm no external requests are made by the page
- [ ] 6.1a Bundle **Noto Emoji** (the monochrome family, not Noto Color Emoji) as a second self-hosted `woff2` and put it in the font stack after the text face, so emoji in names render as line art rather than falling back to a system font (design.md D15); check the payload size against the cold-start concern
- [ ] 6.2 Build the star as inline SVG, plus the trophy in solid and outline variants, at the sizes given in design.md D6
- [ ] 6.3 Implement the fixed 800×480 layout: two task blocks above, two-week grid below, using the pixel budget in design.md D6
- [ ] 6.4 Render day squares in the three states using the grey levels in design.md D7
- [ ] 6.5 Render the trophy in all three states per design.md D13 — solid `#555` won, outline `#555` winnable, outline `#AAA` lost — on both week rows, so the slot is never empty
- [ ] 6.6 Label each week with the dates it covers rather than "last week" / "this week" (design.md D10)
- [ ] 6.7 Render the `updated <date> <time>` stamp bottom right, absolutely positioned in its reserved 16px band so task content cannot displace it
- [ ] 6.8 Constrain the task blocks so an over-long list cannot push the grid or the stamp off screen; clip surplus bullets rather than shrinking type, and settle the bullet limit (~8 comfortable, ~10 maximum) against rendered height, not typed lines
- [ ] 6.9 Set `Cache-Control: no-store` on the display response
- [ ] 6.10 Verify the page is complete with JavaScript disabled and screenshots correctly at exactly 800×480 in a headless browser

## 7. Admin page — single page, phone-first

- [ ] 7.1 Implement the toggle form action, keyed by child and date; apply the date the control submits rather than re-deriving today server-side (design.md D14), and re-check that it is within the editable window and not in the future
- [ ] 7.2 Build the "today" section — one large card per child at the top of the page, showing today's state and toggling it in one tap, sized so both fit above the fold at a 390px viewport; the day name is the card's own heading, not a caption
- [ ] 7.3 Build the "fix a past day" section — stacked week rows per child, 44×44 minimum touch targets, future dates rendered disabled
- [ ] 7.4 Wire both surfaces to the same underlying day mark so a today toggle re-renders the correction grid and vice versa
- [ ] 7.5 Add `use:enhance` for optimistic toggling, reverting the control and surfacing an error when the POST fails
- [ ] 7.6 Build the in-place per-child editors — a name field plus an auto-growing task textarea, with one Save button per child that appears only when either field differs from what is stored
- [ ] 7.7 Implement the per-child save form action covering name and task list together, one child at a time; reject an empty or whitespace-only name and reject a name over the length limit, measuring with `Intl.Segmenter` at grapheme granularity rather than `.length` (design.md D15)
- [ ] 7.8 Warn in the editor when a list exceeds what the display can show (design.md D12); the warning must not block saving
- [ ] 7.9 Re-render on return when the rendered date no longer matches the current London date, skipping the re-render whenever a task field is dirty (design.md D14); trigger on `pageshow`/`persisted` as well as `visibilitychange`, since a restored iOS tab is the case that matters
- [ ] 7.10 Verify no horizontal scrolling and no control below 44×44 at 390px width
- [ ] 7.11 Test that toggles survive a reload, that unsaved task text is not persisted, and that editing one child's tasks leaves the other untouched
- [ ] 7.12 Test that a control rendered for one date still writes that date after the London date has moved on, and that returning to a stale page with unsaved task text neither reloads nor loses the text
- [ ] 7.13 Test renaming: an emoji name round-trips byte-for-byte, a composed emoji counts as one character against the limit, an empty name is refused, and a rename leaves the other child and all day marks untouched

## 8. Deploy and validate on the real panel

- [ ] 8.1 Deploy to a Workers preview URL with secrets set and the migration applied
- [ ] 8.2 Point the TRMNL Screenshot plugin at the preview URL with the custom header; confirm it captures successfully
- [ ] 8.3 Check the capture on the physical panel: are the squares legible at kitchen distance, does the font survive 2-bit conversion, are the three square states distinguishable, is a solid trophy unmistakable from a hollow one across the room, does the faint trophy stay clear of the `#AAA` grid lines around it, and does a monochrome emoji in a name read as a picture at name size
- [ ] 8.4 Adjust type sizes, weights, and grey levels based on what the panel actually shows; decide the typeface open question here, whether the won trophy needs to be black rather than `#555`, whether the render stamp is legible at `#AAA` or needs `#555`, and settle the name length limit against real emoji names — the provisional values are collected in the module from task 4.7
- [ ] 8.5 Promote to the production URL and set the TRMNL refresh interval — settle it together with the render stamp, since an overnight sleep makes a healthy chart show last night's time every morning (design.md D10)
- [ ] 8.6 Enter real task lists for both children and confirm a full round trip: toggle a square on the phone, see it appear on the wall — expect both children to show a faint trophy for last week on the first render, since it has no data
