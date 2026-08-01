## Purpose

The read-only page rendered onto the kitchen e-ink display. It shows each child's current tasks and a two-week sticker grid, and must stay legible from across a room on an 800×480 2-bit greyscale panel.

## ADDED Requirements

### Requirement: The display page is read-only and self-contained

The display page SHALL present information only. It SHALL contain no interactive controls, no links intended to be followed, and no client-side behaviour required to produce its final appearance. The page SHALL be fully rendered by the server so that a screenshot taken immediately after the response is complete captures the finished chart.

#### Scenario: Screenshot captures a complete page

- **WHEN** the display page is requested and screenshotted as soon as the HTML response finishes loading
- **THEN** the captured image shows the complete chart with all task text, stickers and headings present

#### Scenario: No interactive controls are rendered

- **WHEN** the display page is rendered
- **THEN** it contains no buttons, form fields, or toggles

### Requirement: The display shows two weeks, previous and current

The display SHALL show exactly two weeks side by side: the previous week on the left and the current week on the right, each running Monday to Sunday. The window SHALL be derived from the current London date on every request, so that the displayed weeks advance automatically without any manual action.

#### Scenario: Week rollover happens automatically

- **WHEN** the London date crosses from Sunday into Monday
- **THEN** the next render shows the just-finished week as the previous week and a fresh empty week as the current week, and the older week is no longer shown

#### Scenario: Both weeks are labelled

- **WHEN** the display page is rendered
- **THEN** each week is labelled so a viewer can tell which is the previous week and which is the current one

### Requirement: One row per child

The display SHALL render one sticker row per child, with the children's rows adjacent so their weeks can be compared. Each row SHALL contain 14 day squares, 7 for the previous week and 7 for the current week, in Monday-to-Sunday order.

#### Scenario: Two children produce two rows

- **WHEN** the display page is rendered for a household with two children
- **THEN** exactly two sticker rows are shown, each labelled with the child's name

### Requirement: Day squares have three visually distinct states

Each day square SHALL render in exactly one of three states:

- **Earned** — a filled star, drawn in black.
- **Missed** — a past or current date with no day mark, drawn as an empty white square with no cross, mark, or other negative indicator.
- **Not yet** — a date later than the current London date, drawn as a light grey dot.

The earned, missed, and not-yet states SHALL be distinguishable from one another at a glance on the target display.

#### Scenario: A missed day shows nothing

- **WHEN** a past date has no day mark for a child
- **THEN** its square is blank white and carries no cross or other negative marking

#### Scenario: A future day is distinct from a missed day

- **WHEN** the current week contains dates later than today
- **THEN** those squares render as light grey dots, visually distinct from the blank white squares of missed days

#### Scenario: Today is not treated as future

- **WHEN** the current London date has no day mark for a child
- **THEN** that square renders as missed, not as not-yet

### Requirement: The same sticker is used for every earned day

The display SHALL use one single sticker shape for every earned day. It SHALL NOT vary the sticker by day, child, or at random, so that a complete row is recognisable at a glance.

#### Scenario: A full week reads as uniform

- **WHEN** a child has earned all 7 days of a week
- **THEN** all 7 squares show the identical sticker shape

### Requirement: A completed week shows a trophy

The display SHALL render a trophy at the end of a child's week row when that child completed all 7 days of that week. No trophy SHALL be rendered for an incomplete week, including a current week that is still in progress.

#### Scenario: Previous week completed

- **WHEN** a child earned all 7 days of the previous week
- **THEN** a trophy appears at the end of that child's previous-week row

#### Scenario: Current week in progress

- **WHEN** it is Thursday and a child has earned every day so far this week
- **THEN** no trophy appears on the current-week row

### Requirement: Each child's task bullets appear above the grid

The display SHALL render each child's current task list as a bulleted block above the sticker grid, with the two children's blocks laid out side by side and each block labelled with its child's name.

#### Scenario: Tasks are shown per child

- **WHEN** each child has a different task list
- **THEN** each child's own bullets appear under that child's name

#### Scenario: A child with an empty task list

- **WHEN** a child has no task list set
- **THEN** that child's block renders with its heading and no bullets, and the page layout remains intact

### Requirement: The layout targets the TRMNL OG panel

The display page SHALL be laid out for an 800×480 viewport and SHALL fit within it without scrolling or clipping. Content SHALL NOT overflow the viewport when task lists are at their expected length.

#### Scenario: Rendered at target size

- **WHEN** the page is rendered in an 800×480 viewport
- **THEN** all content is within the viewport bounds and nothing is cut off

#### Scenario: Long task lists degrade gracefully

- **WHEN** a child's task list is longer than the space allotted to it
- **THEN** the task block is constrained so that the sticker grid remains fully visible

### Requirement: Rendering is legible in 2-bit greyscale

The display page SHALL restrict itself to the four grey levels the panel can reproduce and SHALL avoid visual treatments that degrade on e-ink: it SHALL NOT rely on colour to convey meaning, SHALL use hairline-free borders, and SHALL use type sizes and weights that remain readable after conversion.

#### Scenario: Converted to the panel's palette

- **WHEN** the rendered page is reduced to four grey levels
- **THEN** all text remains readable and all three day-square states remain distinguishable

#### Scenario: Fonts do not depend on a third party

- **WHEN** the page is rendered with no access to any external font host
- **THEN** the intended typeface is still applied, because font assets are served by the application itself
