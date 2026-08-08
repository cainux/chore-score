## 1. Font assets

- [x] 1.1 Copy `inter-latin-500-normal.woff2` and `inter-latin-500-italic.woff2` from `node_modules/@fontsource/inter/files/` to `static/fonts/inter-500.woff2` and `static/fonts/inter-500-italic.woff2`
- [x] 1.2 Delete `static/fonts/inter-700-italic.woff2`, which no weight uses once emphasis is 500 (design.md D27)
- [x] 1.3 Update the provenance table and the refresh commands in `static/fonts/README.md` to match the new file set
- [x] 1.4 Add `@font-face` blocks for 500 upright and 500 italic in `src/lib/display/fonts.css`, and remove the 700 italic block; keep the comment's reasoning about supplied rather than synthesised italics

## 2. Display rendering

- [x] 2.1 In `src/lib/display/Panel.svelte`, change `.task-block li` to `font-size: 22px` and `line-height: 28px`
- [x] 2.2 Change `.task-block ul` height from 200px to 196px — 7 whole line boxes of 28px, preserving the existing rule that a clipped list ends on a fully drawn line
- [x] 2.3 Change `.bold` from `font-weight: 700` to `font-weight: 500`
- [x] 2.4 Update the comments on those rules to cite the stem-width reasoning (design.md D25–D27) rather than the superseded "20px reads well enough" note
- [x] 2.5 Confirm the task band still totals 230px (24px heading + 6px margin + 196px list = 226px, within the band) and that the grid and stamp positions are unchanged

## 3. Settings and the admin warning

- [x] 3.1 In `src/lib/settings.ts`, change `BULLETS_MAX` from 8 to 7 and `BULLETS_COMFORTABLE` from 6 to 5
- [x] 3.2 Rewrite the doc comment on those constants: the hard number is now 7 rendered lines of 28px, and a bullet runs to about 34 characters rather than 38
- [x] 3.3 Correct the `DISPLAY_FONT_STACK` note claiming the typeface "survives 2-bit conversion at every size the chart uses" — record what the measurement found and cite design.md D25, following the archives' practice of correcting alongside rather than replacing
- [x] 3.4 Verify the admin page's over-length warning fires at the new comfortable count and that current production content (5 bullets each) does not trigger it — confirmed: the warning fires on strict `>`, both children have 5 bullets, `5 > 5` is false

## 4. Tests

- [x] 4.1 Update `src/lib/display/Panel.svelte.spec.ts` assertions that depend on bullet type size, line budget, or the emphasis weight — only the hard-coded `fontWeight: '700'` assertion needed changing, to `'500'`
- [x] 4.2 Add a test asserting emphasised text renders at a heavier weight than body text, expressed as a relationship rather than a hard-coded 700, so a future weight change cannot silently collapse the two (design.md D27)
- [x] 4.3 Check whether any e2e test asserts the 8-bullet limit or the 200px list height and update it — none do; the italic-face-count assertion (`toHaveLength(2)`) still holds since 400-italic and 500-italic replace 400-italic and 700-italic
- [x] 4.4 Run `pnpm check`, `pnpm lint`, and `pnpm test` and confirm all lanes pass — 0 errors, 0 warnings, 272/272 tests pass (115 server + 38 client + 59 workers + 60 e2e)

## 5. Verify on the panel

- [x] 5.1 Deploy and force a panel refresh
- [x] 5.2 Photograph the result and confirm against **real task content**, not a synthetic sentence — confirmed against Tilly's and Ally's real lists
- [x] 5.3 Re-measure stem widths from the new capture and confirm the single-pixel population is gone at bullet size — down from 19% to 4%, modal stem consistently 2px; not zero the way the synthetic test card was, and that gap is recorded rather than smoothed over
- [x] 5.4 Confirm a bullet containing `**bold**` still reads as emphasised on the wall — yes perceptually; measured separation is real but softer than the test card predicted (see design.md)
- [x] 5.5 Record what the panel said in design.md — including anything it overturned — added "What the panel found, deployed against real content" after D28

## 6. Clean up

- [x] 6.1 Delete the `spike/bullet-weight` branch once its measurements are captured in design.md
