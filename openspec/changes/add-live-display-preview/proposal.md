## Why

The admin page already links to `/display` so a parent can see what the panel will capture. On a desktop that preview is a second tab, and it goes stale the moment anything is edited in the first one — every change means switching tabs and reloading. What a parent actually wants while editing at a desk is the chart sitting open beside the admin page, following along.

The obvious way to get that is to let `/display` hydrate and subscribe. That is the one thing this change will not do. `/display` is what a headless browser screenshots every 15 minutes onto a panel that cannot report a fault: it holds its last captured image with no power, so a broken capture looks exactly like a working one until somebody happens to read the render stamp. Screenshot services commonly wait for the network to fall idle before capturing, and a page holding a live connection never does. The wall chart's page stays as it is, and the live behaviour goes somewhere the panel can never reach.

## What Changes

- **A new live preview route at `/admin/preview`**, behind the existing admin session gate, rendering the identical 800×480 canvas that `/display` renders. Unlike `/display` it runs client-side and re-reads its data whenever the admin page in another tab reports a change.
- **Two preview links at the foot of the admin page**, labelled **static** and **live**. The existing link to `/display` stays and keeps its meaning — exactly what the panel captures, rendered once, no JavaScript. The new one follows along as you edit.
- **The panel canvas becomes a shared component**, and the display page's data loading becomes a shared function. Both routes render the same markup from the same view model, so the preview cannot drift from the chart it is previewing. `/display`'s own output is unchanged.
- **Cross-tab updates by `BroadcastChannel`**, carrying no data. After a day toggle or a save completes, the admin page posts a bare notification; the preview tab responds by re-running its server load and re-reading D1. The message is a nudge, not a payload, so the preview always shows what the server would send the panel rather than a client-side reconstruction of it.
- **`/display` is pinned as JavaScript-free at the spec level.** The current wording forbids client-side behaviour that the final appearance *depends on*, which would not have prevented this feature from being built there. It becomes a statement that the route ships no client runtime at all.

Non-goals:

- **Updating across devices.** `BroadcastChannel` is same-origin and same-browser. A tablet in another room will not follow along. This is deliberate: cross-device would mean polling or a Durable Object broadcast, and the stated need is two tabs on one desktop.
- **Previewing unsaved text.** The live preview shows saved state only. Draft task text lives in the admin tab's memory and never reaches the server, so a second tab cannot see it. Watching a task list wrap as it is typed is a different feature and would have to live inside the admin page itself.
- **Changing how or how often the physical panel refreshes.** TRMNL's poll interval is its own.
- **A live render stamp.** The preview stamps when it last read the server, which is honest and which is what the shared component already produces. An idle preview tab showing an old time is accepted rather than worked around.

## Capabilities

### New Capabilities

None. The preview is a parent-facing tool on an existing surface, gated by an existing mechanism.

### Modified Capabilities

- `parent-admin`: adds the two labelled preview links and the live preview itself — what it renders, how faithful it must be to the panel, when it updates, and the limits it is allowed to have.
- `chart-display`: strengthens the read-only, self-contained requirement so that `/display` ships no client-side runtime at all, rather than merely not depending on one.
- `access-control`: the live preview sits behind the admin session and is not reachable with the display key, so the credential configured into a third party's plugin cannot land a screenshotter on a hydrating page.

## Impact

- **Extracted**: the panel markup and CSS out of `src/routes/display/+page.svelte` into a shared component; the display load body out of `src/routes/display/+page.server.ts` into a shared function. This is the only change to code that the wall chart depends on, and `e2e/display.e2e.ts` passing unchanged is the evidence it was behaviour-preserving.
- **New**: `src/routes/admin/preview/` — a page, its server load, and the channel listener.
- **Modified**: `src/routes/admin/+page.svelte` — posts to the channel after a successful toggle or save, and grows a second preview link.
- **Unchanged**: `hooks.server.ts`. `gateFor()` already routes `/admin/*` to the session gate, so the new route is protected without touching either gate. That is the reason the route lives under `/admin` rather than `/display`.
- **No new dependencies, no schema change, no new secrets, no server-side state.** `BroadcastChannel` is a browser API.
- **Fonts**: the preview loads the display's self-hosted `woff2` faces, which the admin page does not currently carry.
