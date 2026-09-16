## Why

The children's task lists have outgrown the display's seven-line budget. `improve-bullet-legibility` (design.md D28) chose to spend the eighth line rather than defend it, because real lists rendered in 5 and 6 lines, and it wrote down the lever to pull if the limit ever started to bite: the grid rows are 72px tall around 42px cells, so each row is mostly empty space. The limit now bites. Surplus is clipped off the bottom of the list, which means instructions go missing from the wall and nobody is told.

The tracking has more room than it needs. The instructions don't have enough. The fix is to move space from one to the other without shrinking anything a child reads.

## What Changes

- Grid rows shrink from 72px to **42px**, the height of the cells themselves. The two children's rows now sit directly on top of each other, so the grid reads as one table instead of two separate rows. That frees 60px.
- The task list grows from **7 to 9 lines** at the unchanged 22px/28px setting (196px → 252px), and the task band grows from 230px to 286px. The last 4px of freed space is left as clearance above the render stamp.
- `BULLETS_MAX` goes from 7 to 9 and `BULLETS_COMFORTABLE` from 5 to 7. As before, that keeps two lines spare for bullets that wrap (D6, D28).
- Unchanged: the 42px day cells and stars, the trophy slot, both weeks, the week labels, the weekday letters, the type sizes and weights, and the reserved stamp band.
- This is a rebalance of the fixed layout, not a new layout. Two larger redesigns were considered and deliberately not taken: a compact grid with smaller stars, and moving each child's tracker into their task column (see design.md).

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `chart-display`: the task-block requirement gains an explicit priority. When the fixed canvas has to be divided, the task list's line budget comes before empty space in the sticker grid. The day squares keep their size.

## Impact

- `src/lib/display/Panel.svelte`: `.row` height, `.tasks` height, `.task-block ul` height, and the comments explaining those numbers.
- `src/lib/settings.ts`: `BULLETS_MAX`, `BULLETS_COMFORTABLE`, and their doc comment.
- The admin warning in `src/routes/admin/+page.svelte` already reads `BULLETS_COMFORTABLE`, so only its wording needs checking.
- Tests: the existing layout tests assert relationships (a whole number of lines, grid and stamp within 480, bullets clipped at `BULLETS_MAX`), not hard-coded pixel values, so they should pass unchanged. A test that the grid doesn't overlap the stamp band is worth adding, because this change moves the grid closer to it.
- Verification on the physical panel is required: whether the touching row borders read as one table after 2-bit conversion can't be settled at a desk.
- No data, storage, route, or auth changes.
