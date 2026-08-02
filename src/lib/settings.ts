/**
 * Every value that step 8.4 retunes, in one file.
 *
 * None of these can be decided before the chart is on the physical panel — how
 * a typeface survives 2-bit conversion, how many bullets fit at a legible size,
 * how long a name can be before it disturbs a fixed 80px gutter. But sections 6
 * and 7 cannot be written without a value for each. So they are provisional,
 * and they live together: 8.4 edits this file rather than hunting through the
 * display and admin code for scattered numbers.
 *
 * The typeface is not a domain rule and is here only to keep the retune in one
 * place.
 *
 * Type sizes and grey levels are the exception: they stay in the display page's
 * own stylesheet, next to the layout that has to absorb them. A font size here
 * and the line height it must divide into over there is how the two drift
 * apart. What lives here is anything a second file also has to agree with —
 * the bullet limits below are read by the admin page as well as the display.
 */

/**
 * Longest display name, in grapheme clusters.
 *
 * Counted as user-perceived characters, not UTF-16 units: a family emoji is
 * eight code units and one character, and a limit that counted the former would
 * reject a name that fits comfortably (design.md D15).
 *
 * Provisional. The real constraint is the 80px name gutter on the grid and the
 * 376px task-block headings, which 8.3 measures against real emoji names.
 */
export const NAME_MAX_GRAPHEMES = 16;

/**
 * Bullets the display renders before clipping.
 *
 * The hard number underneath both of these is **8 rendered lines** — the task
 * block is 200px of 25px line boxes (design.md D6). It is lines and not bullets
 * because bullets wrap: at 20px in a 376px column a bullet runs to about 38
 * characters, and a real one like `Exercise 11 part 2 - hands together (thumb
 * crossover)` takes two of the eight.
 *
 * So `MAX` is the ceiling for a list of short bullets, and the warning fires at
 * `COMFORTABLE` to leave room for the ones that wrap. Both were higher before
 * the type grew; on the panel, 16px read as too small to be worth the extra
 * lines it bought.
 *
 * The display clips as a backstop and the admin page warns past the comfortable
 * count without blocking the save (D12).
 */
export const BULLETS_COMFORTABLE = 6;
export const BULLETS_MAX = 8;

/**
 * The display typeface stack.
 *
 * Both faces are bundled and self-hosted, because the screenshot cannot afford
 * to lose a race with a third-party font (design.md D5). The monochrome emoji
 * face follows the text face so emoji in names render as line art rather than
 * as colour glyphs mangled into a smudge, or as tofu (D15).
 *
 * Provisional: 8.4 decides whether this survives 2-bit conversion at small
 * sizes or needs something heavier.
 */
export const DISPLAY_FONT_STACK = "'ChoreText', 'ChoreEmoji', sans-serif";
