## 1. Extract the shared canvas and view model

The whole group is a behaviour-preserving refactor of the page the wall depends on. Nothing here should change a single pixel of `/display`.

- [x] 1.1 Run `pnpm test` and record the baseline, so a later failure can be attributed
- [x] 1.2 Move the display load body into a shared view builder taking `(db, now)` and returning today's shape unchanged (D18); leave the `platform === undefined` guard in the route
- [x] 1.3 Point `src/routes/display/+page.server.ts` at the builder; it becomes a thin caller
- [x] 1.4 Create `src/lib/display/Panel.svelte` holding the `.panel` element, its contents, all of its CSS, and the `fonts.css` import, with props matching the builder's return type (D18)
- [x] 1.5 Reduce `src/routes/display/+page.svelte` to the `html`/`body` reset, the `<svelte:head>` title, the `width=800` viewport meta, and `<Panel />`
- [x] 1.6 Keep the design.md citations attached to the code they explain — the comments about the reserved trophy column, the stamp band and the flush-segment rule move with the markup they annotate
- [x] 1.7 Confirm `e2e/display.e2e.ts` passes **unmodified**; if a test needs editing, the extraction changed behaviour and must be reworked (Risks)
- [x] 1.8 `pnpm check` and `pnpm lint` clean

## 2. The live channel

- [x] 2.1 Add a small module owning the channel name and a browser-guarded way to obtain a channel, so the name is written once and `BroadcastChannel` is never touched during SSR (Risks)
- [x] 2.2 Give it a notify helper that is a no-op outside the browser
- [x] 2.3 Unit-test the module in the `client` project (`*.svelte.spec.ts`): a posted nudge reaches a second channel on the same name, and no message is delivered back to the posting context (D19)

## 3. The preview route

- [x] 3.1 Add `src/routes/admin/preview/+page.server.ts` calling the same view builder as `/display` (D18)
- [x] 3.2 Add `src/routes/admin/preview/+page.svelte` rendering `<Panel />` with a heading identifying it as the live preview, and no controls of any kind (spec: the live preview does not edit)
- [x] 3.3 Wrap the canvas in a scale-to-fit container using `transform: scale()` with `transform-origin: top left`, sized to the scaled result, so layout still happens at the true 800px (D20)
- [x] 3.4 Subscribe to the channel inside a browser-only effect, calling `invalidateAll()` on each message, with teardown on unmount (D17)
- [x] 3.5 Leave the render stamp exactly as the shared component produces it (D22)
- [x] 3.6 Verify no `csr` or `prerender` override is needed — `/display/+layout.ts` does not apply here, and the root default is what this route wants (D16); there is no root `+layout.ts`, so the defaults (`csr` on, `prerender` off) apply

## 4. Wire the admin page

- [x] 4.1 In the `?/toggle` enhance handler, post the nudge after `await update()` resolves and only when the result is not a failure (D19) — both toggle handlers, the today card and the correction grid
- [x] 4.2 In the `?/save` enhance handler, do the same
- [x] 4.3 Replace the single preview link at the foot of the page with two, labelled **static** and **live**, both opening in a new tab with `rel="noopener"` (spec: the admin page offers two previews)
- [x] 4.4 Keep the existing comment explaining why the static preview is previewable at all, and add one for the live link's reach

## 5. Tests

- [x] 5.1 `Panel.svelte` component test in the `client` project: given a known view model it renders the expected rows, square states and trophies — the old `display/page.svelte.spec.ts` moved wholesale to `$lib/display/Panel.svelte.spec.ts`, since every assertion in it was about the canvas; the route keeps a short spec for what is left of it
- [x] 5.2 Server test that the shared view builder returns what the display route returned before — the two-week order, the bullet clipping at `BULLETS_MAX`, and the trophy rule. **Placed in the `workers` lane, not `server`**: it reads D1 and resolves the London date through `londonParts`, and CLAUDE.md requires both to be tested against real workerd (design.md D9)
- [x] 5.3 e2e: the display key does **not** open `/admin/preview` (spec: access-control), extending `e2e/gates.e2e.ts`
- [x] 5.4 e2e: an authenticated parent opens `/admin/preview` and the canvas renders
- [x] 5.5 e2e in one browser context, two pages: toggle a day on `/admin`, assert the square changes on `/admin/preview` without reloading it
- [x] 5.6 e2e, same setup: save a task list on `/admin`, assert the text appears on the preview canvas
- [x] 5.7 e2e: `/admin/preview` contains no buttons, inputs or form fields
- [x] 5.8 e2e or unit assertion that `/display` still delivers no client application script, covering the hardened chart-display requirement — added to `e2e/display.e2e.ts` **after** 1.7 had already been verified against that file unmodified, so the extraction's evidence stands

Both cross-tab tests (5.5, 5.6) were checked against a deliberately broken `notifyLive()` and fail without the nudge, so neither passes decoratively.

## 6. Close out

- [x] 6.1 Full `pnpm test`, `pnpm check`, `pnpm lint` green — 211 unit (server 115, client 37, workers 59) and 61 e2e, up from 200 and 52
- [x] 6.2 Update `CLAUDE.md`: the two routes now share `Panel.svelte` and a view builder, `/admin/preview` exists and why it is not under `/display`, and the decision series continues at D16 in this change's `design.md`
- [x] 6.3 Check the preview against the real thing — open `/admin` and `/admin/preview` side by side, edit, and confirm the canvas matches what `/display` renders. **The two captures are the same PNG byte for byte.**
- [x] 6.4 Deploy, then confirm the panel's next capture is unchanged from the one before it (the extraction's real acceptance test). **Deployed** (version `891ab995`, `chores.oha.me` still attached); production gates verified closed — `/display` 401s without the key and `/admin/preview` redirects to the login. **The wall then captured cleanly and drew the same chart as before**, which is the evidence that moving the canvas into a shared component changed nothing the panel can see.
- [x] 6.5 Record anything the desk or the panel overturned in `design.md` alongside the original reasoning rather than replacing it — see "What the desk found"; nothing was overturned, D16–D22 stand
