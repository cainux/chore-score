## Why

`improve-bullet-legibility` (archived 2026-08-08, design.md D25-D28) shipped `.bold` at weight 500 on the strength of a measurement showing emphasis and body separate cleanly after 1-bit rasterisation. A fresh panel photo shows two bullets under the same child, both marked up with `**...**`, both at the shipped weight and size: `**One Man went to Mow**` reads clearly bold, `**Dozen a Day**` is indistinguishable from plain body text. Same weight, same size, same panel, same capture. The existing chart-display spec already requires emphasis to render "with a visibly greater stem width than the text around it" — that requirement is being violated for some content today.

## What Changes

- Re-open the emphasis weight/spacing decision from design.md D27, this time measuring against content chosen to stress the failure mode rather than a single representative sentence.
- Working theory to validate on the physical panel: stem-width rounding after 1-bit rasterisation is per-glyph, not per-weight, so a word dense in wide letterforms (M, W, N) rounds up to a heavier stem at a given weight while a word of mostly round, thin-stemmed letters (o, e, a, z) can round back down at the same weight. D27's own real-content measurement already showed this pairing sits near a rounding boundary (47% of stems at 2px vs 36% at 3px) rather than cleanly flipping; this is that boundary's two edges.
- Candidate fixes to measure, per the D25/D26 method (synthetic test card, then real-content capture, both on the physical panel — not a desk model):
  - Push `.bold` from weight 500 to 600, trading on D25's standalone finding that 22px/600 concentrates more strongly at a 3px stem (71%) than 500 does (60%).
  - Add letter-spacing to `.bold` runs, which is a whole-pixel layout property rather than something the rasteriser rounds per letterform, and so should not be sensitive to which letters happen to make up the emphasised run.
  - Either may turn out to need the other; do not assume the answer before measuring.
- `**Dozen a Day**` and `**One Man went to Mow**` become the standing real-content test pair for this class of check, since they are now a known natural example of both edges of the boundary.

## Capabilities

### Modified Capabilities

- `chart-display`: tighten the "Emphasis survives 1-bit rasterisation" requirement so it holds regardless of the letterform composition of the emphasised run, not just for representative content — and record whatever weight/spacing setting the panel measurement lands on.

## Impact

- `src/lib/display/Panel.svelte` (`.bold` rule) and possibly `src/lib/display/fonts.css` (a new `@font-face` weight, if 600 is chosen and not already shipped as a variable/static asset).
- `src/lib/display/Panel.svelte.spec.ts` — existing emphasis-weight assertions will need updating to whatever setting this change lands on.
- No data or storage changes; this is a rendering-only change, same as its predecessor.
