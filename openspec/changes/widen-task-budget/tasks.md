## 1. Layout

- [x] 1.1 In `src/lib/display/Panel.svelte`, set `.row` height from 72px to 42px (D31, D32) and update the grid comments to say why the rows are exactly the cell height.
- [x] 1.2 Set `.task-block ul` height from 196px to 252px (9 × 28) and `.tasks` height from 230px to 286px. Update the comments that cite "Exactly 7 lines" and the 20px→22px history so they name 9 lines and cite D31.
- [x] 1.3 In `src/lib/settings.ts`, set `BULLETS_MAX` to 9 and `BULLETS_COMFORTABLE` to 7 (D33), and update the doc comment's "7 rendered lines", "196px" and "7/5" references.
- [x] 1.4 Confirm the admin warning in `src/routes/admin/+page.svelte` still reads correctly with the new constant (it interpolates `BULLETS_COMFORTABLE`; no wording change expected).
- [x] 1.5 Update the D6 layout sketch reference in any remaining code comment that cites 72px rows or 230px task band (`grep -rn '72px\|230\|196' src`).

## 2. Tests

- [x] 2.1 Add an e2e test in `e2e/display.e2e.ts` that the grid's bounding box does not overlap the render stamp's.
- [x] 2.2 Add a client test in `src/lib/display/Panel.svelte.spec.ts` that a list of nine one-line bullets is drawn in full: the ninth `li`'s bottom is within the list's bottom edge.
- [x] 2.3 Add a client test that a grid row is no taller than its day cell (the spec's "no empty space at the expense of task lines" scenario).
- [x] 2.4 Run `pnpm check`, `pnpm lint`, and `pnpm test`; existing relational layout tests (whole-number line clip, grid/stamp within 480, `BULLETS_MAX` clip) should pass unchanged. 214 unit (server + client + workers) and 61 e2e pass on the merge.

## 3. Verify on the panel

- [ ] 3.1 Check `/admin/preview` against the longest real task list, confirming it now renders without clipping (or with less).
- [ ] 3.2 Deploy with `pnpm run deploy` and force a panel refresh.
- [ ] 3.3 Capture the panel (raw TRMNL PNG preferred, as in `strengthen-bullet-emphasis`) and confirm: the two children's rows read as separate rows of one table with the shared 2px border; stars and trophy are unchanged in legibility; all task lines shown are whole; the stamp is intact and clear of the grid.
- [ ] 3.4 Record what the capture showed in `design.md` under a "What the panel found" section. If the merged border fails, apply the D32 fallback, record which one was taken and why, and re-verify.

## 4. Sync and close out

- [ ] 4.1 Sync the delta spec to `openspec/specs/chart-display/spec.md`.
- [ ] 4.2 Archive the change.
