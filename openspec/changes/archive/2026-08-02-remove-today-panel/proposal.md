## Why

The admin page's dedicated "today" cards were built on the assumption that marking today is the overwhelmingly common reason to open the page, and so deserved the largest, most prominent controls, separate from the correction grid. In actual use, the site's only parent doesn't use them — today's mark is made through the correction grid instead, which already has a fully functional, non-future, non-disabled control for today's date in the current week row. The cards duplicate a control the grid already provides, and removing them simplifies the page down to one mechanism instead of two.

## What Changes

- Remove the two "today" star cards from the admin page (`src/routes/admin/+page.svelte`), and their CSS.
- Remove the `<h2>Fix a past day</h2>` heading above the correction grid — it no longer only fixes past days, it's the only day-marking mechanism, and no replacement heading is added.
- Remove `todayEarned` from the admin page's server load, since nothing reads it once the cards are gone.
- **BREAKING** (spec-level, not code-level): drop the "Marking today is the primary action" requirement and its scenarios from the `parent-admin` spec, since there is no longer a dedicated today control distinct from the correction grid.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `parent-admin`: remove the requirement that today's mark have a dedicated, most-prominent control separate from the correction grid; today's mark is now made exclusively through the same per-date controls used for past days.

## Impact

- **Code**: `src/routes/admin/+page.svelte`, `src/routes/admin/+page.server.ts`, `src/routes/admin/page.svelte.spec.ts`.
- **Specs**: `openspec/specs/parent-admin/spec.md` (delta only; no other capability's requirements change).
- **No impact** on `chore-tracking`, `chart-display`, `access-control`, the `/display` route, or the day-mark storage/toggle mechanism — the underlying `?/toggle` action and its rules are unchanged; only which UI surface exposes "mark today" changes.
