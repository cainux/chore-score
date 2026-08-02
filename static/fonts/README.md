# Bundled fonts

Self-hosted because the display page must make **zero external requests**
(design.md D5). The TRMNL Screenshot plugin captures whatever is on screen when
it fires, so any resource fetched from a third party is a race the screenshot
can lose — and losing it means a fallback font or a row of tofu boxes on the
kitchen wall until the next refresh, with no way to notice from the panel.

They are committed rather than copied at build time so that `static/` is
complete in a fresh clone.

| File                     | Source                                                   | Size |
| ------------------------ | -------------------------------------------------------- | ---- |
| `inter-400.woff2`        | `@fontsource/inter` — `inter-latin-400-normal`            | 24K  |
| `inter-700.woff2`        | `@fontsource/inter` — `inter-latin-700-normal`            | 24K  |
| `inter-400-italic.woff2` | `@fontsource/inter` — `inter-latin-400-italic`            | 25K  |
| `inter-700-italic.woff2` | `@fontsource/inter` — `inter-latin-700-italic`            | 26K  |
| `noto-emoji-400.woff2`   | `@fontsource/noto-emoji` — `noto-emoji-emoji-400-normal`  | 464K |

To refresh them after a package update:

```sh
cp node_modules/@fontsource/inter/files/inter-latin-400-normal.woff2 static/fonts/inter-400.woff2
cp node_modules/@fontsource/inter/files/inter-latin-700-normal.woff2 static/fonts/inter-700.woff2
cp node_modules/@fontsource/inter/files/inter-latin-400-italic.woff2 static/fonts/inter-400-italic.woff2
cp node_modules/@fontsource/inter/files/inter-latin-700-italic.woff2 static/fonts/inter-700-italic.woff2
cp node_modules/@fontsource/noto-emoji/files/noto-emoji-emoji-400-normal.woff2 static/fonts/noto-emoji-400.woff2
```

## Why the italics are drawn rather than synthesised

`*emphasis*` in a task bullet uses them. Left to itself the browser shears the
upright face, and a sheared stroke reduced to four grey levels is exactly the
detail a 2-bit panel drops — the emphasis stops reading as emphasis. They cost
nothing on renders that do not use them, on the same "fetched only when a
character needs it" rule as the emoji face.

## Why Noto Emoji and not Noto Color Emoji

Colour glyphs reduced to four grey levels at name size become an indistinct dark
smudge. Noto Emoji is the monochrome family — single-colour outline artwork,
which is what a 2-bit panel can actually reproduce (design.md D15).

## On the 464K

It is the one genuinely large asset here, and D15 flags it against the
cold-start concern. Two things keep it from mattering:

- **It is only downloaded when it is used.** A browser fetches a webfont when a
  character needs it, so with no emoji in either name the panel never requests
  this file at all. It costs 464K on the renders where a parent has actually
  decorated a name, and nothing on the rest.
- **It is served from the static asset binding**, not by the Worker, so fetching
  it does not invoke any code.

It cannot be subset ahead of time, because the names are arbitrary. If it ever
does prove too heavy, subsetting to a chosen range of common emoji is the
retreat — at the price of tofu for anything outside it.

## Typeface choice is provisional

Inter is a placeholder chosen for a tall x-height and sturdy strokes at small
sizes. The real decision is an open question in design.md, settled at task 8.4
against the physical panel. It is referenced through `DISPLAY_FONT_STACK` in
`src/lib/settings.ts` so that swap is a one-line change.
