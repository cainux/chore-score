## Why

Two kids (aged 6 and 10) need a visible, low-friction way to see whether they have kept up with their chores, homework and piano practice. A paper chart on the fridge works but goes stale and gets lost. We already have a TRMNL OG e-ink display in the kitchen, so the chart can live there permanently and update itself.

The point is ambient visibility: the chart is on the wall where the whole family walks past it. Tracking is a side effect, not the goal.

## What Changes

This is a greenfield project — the repository is currently empty apart from OpenSpec scaffolding. Everything here is new.

- **A read-only display page** sized for the TRMNL OG (800×480, 2-bit greyscale), fetched and screenshotted by TRMNL's Screenshot plugin. It shows each child's task bullets plus a two-week sticker grid (last week and this week, Monday start). Because an e-ink panel cannot signal its own failure, the page also dates its week labels and stamps when it was rendered, so a stale chart is identifiable as stale.
- **A parent-only admin page** with the same two-week grid, but every square is tappable to toggle a sticker on or off, including days in the past. It also edits each child's task bullet list. Every control carries the date it was rendered for, so a tap that lands after midnight records the day the parent was looking at.
- **A sticker model** where one row per child means a day is all-or-nothing: the sticker records "did everything expected of them today", judged by a parent. There is no per-task tracking.
- **A weekly trophy** awarded when a child earns a sticker on all 7 days of a week. It shows in three states — won, still winnable, and lost — so the goal is visible during the week rather than only once it is decided. The app records that the trophy was earned and displays it; it does not know or track what the actual prize is.
- **Access control**: the admin page is behind a single shared password used by both parents. The display page is unauthenticated (TRMNL cannot log in) but is gated on a secret HTTP header that the Screenshot plugin sends.
- **Stack**: SvelteKit deployed to Cloudflare Workers with D1 for storage. Chosen because the display page must be server-rendered, publicly reachable, and free of cold starts that would make TRMNL's screenshot time out.

Non-goals for this change:

- Any interface for the children. They do not use devices; the wall display is their entire view of the system.
- Per-task checkboxes, task schedules, or task history. Task lists are free text that a parent edits whenever they like.
- Reward catalogues, point balances, or redemption tracking.
- Notifications, reminders, or nagging.
- Per-child user accounts.

## Capabilities

### New Capabilities

- `chore-tracking`: The underlying model — children, day marks, London-anchored week boundaries, and the 7/7 rule that earns a weekly trophy.
- `chart-display`: The read-only page rendered on the TRMNL e-ink display: layout, the two-week grid, square states, and the constraints that make it legible at 800×480 in 2-bit greyscale.
- `parent-admin`: The password-protected page where parents toggle day marks (including retroactively) and edit each child's task bullets.
- `access-control`: The shared-password session for admin and the secret-header gate for the display route.

### Modified Capabilities

None — there are no existing specs.

## Impact

- **New repository content**: a SvelteKit application, its Cloudflare adapter configuration, and D1 schema migrations. No existing code is affected.
- **New external dependencies**: Cloudflare Workers and D1 (already in use by the author for other projects); a TRMNL OG device configured with the Screenshot plugin pointed at the display URL with a custom header.
- **Operational surface**: one Cloudflare Worker, one D1 database, two secrets (the shared admin password and the display header value).
- **Timezone risk**: Workers run in UTC while all dates in this system are `Europe/London`. Day and week boundaries must be computed explicitly rather than inherited from the runtime.
