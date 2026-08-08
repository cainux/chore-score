## 1. Letterform-stress test card (D29)

- [ ] 1.1 Build a test card with at least two emphasis rows at each weight candidate under consideration: a wide-letterform row (e.g. "One Man went to Mow") and a round-letterform row (e.g. "Dozen a Day"), each paired with plain body text at the shipped 22px/400 for comparison.
- [ ] 1.2 Deploy the test card to a spike route (following the precedent of `spike/bullet-weight` in `improve-bullet-legibility`).
- [ ] 1.3 Force a panel refresh and capture the physical panel.

## 2. Measure candidates (D30)

- [ ] 2.1 Measure per-row modal stem width for `.bold` at weight 600, separately for the wide-letterform row and the round-letterform row.
- [ ] 2.2 Measure per-row modal stem width for `.bold` at weight 500 with letter-spacing added, separately for both rows.
- [ ] 2.3 If neither candidate alone separates both rows cleanly, measure the combination (weight 600 + letter-spacing).
- [ ] 2.4 Record the measured tables in `design.md` under D30, and state which setting is chosen and why — in the style of D26/D27's tables.

## 3. Implement the chosen setting

- [ ] 3.1 Update `.bold` in `src/lib/display/Panel.svelte` to the chosen weight and/or letter-spacing.
- [ ] 3.2 If weight 600 is chosen, add the `inter-600` (and `inter-600-italic`, for `***bold italic***`) font files to `src/lib/display/fonts.css` and `static/fonts/`, updating the provenance table per the convention `fonts.css` documents; if weight 600 is not chosen, confirm no unused font file was added.
- [ ] 3.3 Update `src/lib/display/Panel.svelte.spec.ts` assertions to the new weight/spacing value, including the "weighs emphasised text heavier than the body around it" test.

## 4. Verify against real content

- [ ] 4.1 Deploy to production and force a panel refresh.
- [ ] 4.2 Capture the physical panel and confirm both `**Dozen a Day**` and `**One Man went to Mow**` now render with a visibly greater stem width than the body text around them.
- [ ] 4.3 Record the real-content capture's numbers in `design.md`, in the style of the prior change's "What the panel found" section, noting any gap between the spike's prediction and the real-content result.

## 5. Sync and close out

- [ ] 5.1 Run `pnpm check`, `pnpm lint`, `pnpm test`.
- [ ] 5.2 Sync the delta spec in `specs/chart-display/spec.md` to `openspec/specs/chart-display/spec.md`.
- [ ] 5.3 Archive the change.
