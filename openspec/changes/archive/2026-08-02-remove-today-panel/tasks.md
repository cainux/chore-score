## 1. Remove the today cards

- [x] 1.1 Delete the `.today` section from `src/routes/admin/+page.svelte` (the two star card forms) and the `<h2>Fix a past day</h2>` heading immediately above the correction grid. No replacement heading — the grid sits directly under the `<h1>` date.
- [x] 1.2 Delete the now-unused CSS rules for `.today`, `.card`, `.card.earned`, `.card-name`, `.card-mark`, `.card-state`.
- [x] 1.3 Remove `todayEarned` from the `load` function's per-child mapping in `src/routes/admin/+page.server.ts` — nothing reads it once 1.1 is done.

## 2. Update tests

- [x] 2.1 In `src/routes/admin/page.svelte.spec.ts`, rewrite the "submits the rendered date, not whatever today has become" test to select today's cell in the correction grid (the first, non-future cell in the current week's row) instead of `.today form`.
- [x] 2.2 Remove `todayEarned` from the test fixture's child data in the same file, and check the rest of the suite for any other reference to the removed section. Widened in practice: `e2e/admin.e2e.ts` and `e2e/preview.e2e.ts` both had real dependencies on `.today` that this task didn't originally name — a `todayCard` helper, a "shows both today controls without scrolling" test (deleted, since it tested the removed requirement directly), a "shows today in both surfaces" test (deleted, since there's only one surface now), and several toggle/emoji-name assertions rewritten to use a `todayControl` helper against the correction grid instead. See design.md's "What apply found."
- [x] 2.3 Run `pnpm test:unit --run --project client` and confirm the admin suite passes with no leftover reference to `.today`.

## 3. Verify in the browser

- [x] 3.1 Run the app (`pnpm dev` or `pnpm run run`, per project convention) and open `/admin` on a phone-sized viewport: confirm the page opens directly into the correction grid with no today cards and no "Fix a past day" heading, and that toggling today's cell still marks/clears correctly and reaches the display and live preview.
- [x] 3.2 Run `pnpm check` and `pnpm lint`.
- [x] 3.3 Run `pnpm test` (unit + e2e) end to end.

## 4. Close out

- [ ] 4.1 Run `/opsx:archive` (or the `openspec-archive-change` skill) once 1–3 are done, to sync the `parent-admin` delta into `openspec/specs/parent-admin/spec.md` and file this change under `openspec/changes/archive/`.
