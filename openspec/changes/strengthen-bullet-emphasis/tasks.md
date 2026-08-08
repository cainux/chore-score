## 1. Letterform-stress test card (D29)

- [x] 1.1 Build a test card with at least two emphasis rows at each weight candidate under consideration: a wide-letterform row (e.g. "One Man went to Mow") and a round-letterform row (e.g. "Dozen a Day"), each paired with plain body text at the shipped 22px/400 for comparison. Built as `src/lib/display/SpikeCard.svelte` on branch `spike/bullet-emphasis-weight` (local only, not pushed — never merges to main), comparing all four D30 candidates (500, 600, 500+spacing, 600+spacing) against both phrases in one capture.
- [x] 1.2 Deploy the test card to a spike route (following the precedent of `spike/bullet-weight` in `improve-bullet-legibility`). Deployed `spike/bullet-emphasis-weight` straight to `chores.oha.me` (this app has one route; there is no separate spike environment), overriding `/display` temporarily.
- [x] 1.3 Force a panel refresh and capture the physical panel. Captured two ways: a phone photo, and — better — the raw 800×480 2-bit PNG pulled directly from TRMNL's own asset storage (the exact bitmap its pipeline produced, no camera lighting/lens artifacts).

## 2. Measure candidates (D30)

- [x] 2.1 Measure per-row modal stem width for `.bold` at weight 600, separately for the wide-letterform row and the round-letterform row. Both flip cleanly to modal 3px (55.2% / 53.4%) against body's modal 2px.
- [x] 2.2 Measure per-row modal stem width for `.bold` at weight 500 with letter-spacing added, separately for both rows. Identical run-length distribution to non-spaced 500 — letter-spacing does not affect stem width at all, as expected once measured.
- [x] 2.3 If neither candidate alone separates both rows cleanly, measure the combination (weight 600 + letter-spacing). Not needed: 600 alone separates both rows cleanly, and letter-spacing has no bearing on the stem-width mechanism, so a combination adds nothing over 600 alone.
- [x] 2.4 Record the measured tables in `design.md` under D30, and state which setting is chosen and why — in the style of D26/D27's tables. Recorded, including a revision to the D29 hypothesis: the raw bitmap shows both phrases modal-2px at 500 (not a letterform-dependent split as predicted) and both modal-3px at 600.

## 3. Implement the chosen setting

- [x] 3.1 Update `.bold` in `src/lib/display/Panel.svelte` to the chosen weight and/or letter-spacing.
- [x] 3.2 If weight 600 is chosen, add the `inter-600` (and `inter-600-italic`, for `***bold italic***`) font files to `src/lib/display/fonts.css` and `static/fonts/`, updating the provenance table per the convention `fonts.css` documents; if weight 600 is not chosen, confirm no unused font file was added. Removed `inter-500.woff2`/`inter-500-italic.woff2` too — nothing uses weight 500 anywhere on this page once `.bold` moves to 600.
- [x] 3.3 Update `src/lib/display/Panel.svelte.spec.ts` assertions to the new weight/spacing value, including the "weighs emphasised text heavier than the body around it" test. That test needed no change — it already asserts a relationship, not a hard-coded weight, so it caught nothing when the value changed. Only the one hard-coded `'500'` assertion needed updating, to `'600'`. `pnpm check`, `pnpm lint`, and all three unit projects (115+38+59) pass.

## 4. Verify against real content

- [x] 4.1 Deploy to production and force a panel refresh.
- [x] 4.2 Capture the physical panel and confirm both `**Dozen a Day**` and `**One Man went to Mow**` now render with a visibly greater stem width than the body text around them. Confirmed both ways: a phone photo (both read clearly bold) and the raw TRMNL capture (both modal 3px against three different body lines all modal 2px).
- [x] 4.3 Record the real-content capture's numbers in `design.md`, in the style of the prior change's "What the panel found" section, noting any gap between the spike's prediction and the real-content result. No gap this time — the spike card used the real phrases verbatim, so the numbers matched to one decimal place; recorded why that differs from D25-D28's own experience of a softer real-content result.

## 5. Sync and close out

- [ ] 5.1 Run `pnpm check`, `pnpm lint`, `pnpm test`.
- [ ] 5.2 Sync the delta spec in `specs/chart-display/spec.md` to `openspec/specs/chart-display/spec.md`.
- [ ] 5.3 Archive the change.
