# chart-display Specification

## Purpose
The read-only page rendered onto the kitchen e-ink display. It shows each child's current tasks and a two-week sticker grid, and must stay legible from across a room on an 800×480 2-bit greyscale panel.
## Requirements
### Requirement: The display page is read-only and self-contained

The display page SHALL present information only. It SHALL contain no interactive controls, no links intended to be followed, and no client-side behaviour required to produce its final appearance. The page SHALL be fully rendered by the server so that a screenshot taken immediately after the response is complete captures the finished chart.

#### Scenario: Screenshot captures a complete page

- **WHEN** the display page is requested and screenshotted as soon as the HTML response finishes loading
- **THEN** the captured image shows the complete chart with all task text, stickers and headings present

#### Scenario: No interactive controls are rendered

- **WHEN** the display page is rendered
- **THEN** it contains no buttons, form fields, or toggles

### Requirement: The display shows two weeks, current and previous

The display SHALL show exactly two weeks side by side: the current week on the left and the previous week on the right, each running Monday to Sunday. The window SHALL be derived from the current London date on every request, so that the displayed weeks advance automatically without any manual action.

The current week leads because it is the week being played, and it is what almost every glance at the chart is asking about. The previous week is the record it is measured against, so it reads second.

#### Scenario: The week in progress is the one read first

- **WHEN** the display page is rendered
- **THEN** the left-hand week is the one containing the current London date, and the right-hand week is the one before it

#### Scenario: Week rollover happens automatically

- **WHEN** the London date crosses from Sunday into Monday
- **THEN** the next render shows the just-finished week as the previous week and a fresh empty week as the current week, and the older week is no longer shown

#### Scenario: The current week is labelled with its dates

- **WHEN** the display page is rendered
- **THEN** the current week is labelled with the calendar dates it covers

#### Scenario: The previous week is named rather than dated

- **WHEN** the display page is rendered
- **THEN** the previous week is labelled with a relative name, because the dates of a week that has already finished are not what a viewer wants from it

#### Scenario: Labels do not remain true when the chart is stale

- **WHEN** a rendered chart is viewed some weeks after it was produced
- **THEN** the current week's label names dates that no longer match the current week, rather than remaining accurate indefinitely

### Requirement: The display states when it was rendered

The display SHALL show the London date and clock time at which it was rendered, positioned in the bottom right of the canvas and styled so it does not compete with the chart itself.

This exists because the panel cannot signal failure. It holds its last captured image with no power, so a stale chart is visually identical to a current one. The stamp, together with the current week's dated label, is the only means by which a viewer can tell that what they are looking at is out of date. At least one dated element SHALL therefore remain on the page.

The space the stamp occupies SHALL be reserved, so that no amount of task list content can displace it.

#### Scenario: The stamp reflects render time

- **WHEN** the display page is rendered
- **THEN** it shows the London date and clock time of that render

#### Scenario: A stale capture is identifiable

- **WHEN** a capture of the display is viewed a day after it was produced
- **THEN** its stamp names the earlier date, making the staleness apparent without reference to any other source

#### Scenario: The stamp survives long task lists

- **WHEN** both children have task lists at the maximum length the layout permits
- **THEN** the stamp remains visible in the bottom right and is not pushed off the canvas

### Requirement: One row per child

The display SHALL render one sticker row per child, with the children's rows adjacent so their weeks can be compared. Each row SHALL contain 14 day squares, 7 for the current week and 7 for the previous week, in Monday-to-Sunday order within each week.

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

### Requirement: A trophy marks a complete week, and nothing marks an incomplete one

A week row SHALL end with a trophy when and only when the child earned all 7 of that week's dates. An incomplete week SHALL show an empty slot — there is no partial, hollow or faint trophy, and no state that depends on today.

The trophy SHALL be drawn solid in the same black as the day stickers. It is the summary of a row of black stars and SHALL NOT read as fainter than the days that earned it, at viewing distance or after 2-bit conversion.

The slot's width SHALL be reserved whether or not a trophy occupies it, so that an incomplete week does not shift the columns beside it.

Both the previous week and the current week SHALL use this treatment.

#### Scenario: Previous week completed

- **WHEN** a child earned all 7 days of the previous week
- **THEN** a solid black trophy appears at the end of that child's previous-week row

#### Scenario: Current week in progress

- **WHEN** it is Thursday and a child has earned every day so far this week
- **THEN** the current-week row's trophy slot is empty, because the week is not yet complete

#### Scenario: An incomplete past week shows nothing

- **WHEN** a child missed one or more days of the previous week
- **THEN** that row's trophy slot is empty rather than holding a faint trophy

#### Scenario: An empty slot does not move the chart

- **WHEN** one week row has a trophy and another does not
- **THEN** the day squares and week blocks stay in the same positions in both rows

#### Scenario: The trophy survives the panel

- **WHEN** the rendered chart is reduced to four grey levels and viewed from across a room
- **THEN** a trophy is unmistakably present and as strong as the stars in its row

### Requirement: Each child's tasks appear above the grid

The display SHALL render each child's current task list above the sticker grid, one task per line, with the two children's blocks laid out side by side and each block labelled with its child's name.

Tasks SHALL be drawn as plain lines with no bullet marker and no indent. On the panel a column of markers reads as clutter beside the star grid, and the indent costs column width that a wrapping task spends on a further line. The line break alone separates one task from the next.

#### Scenario: Tasks are shown per child

- **WHEN** each child has a different task list
- **THEN** each child's own tasks appear under that child's name

#### Scenario: No marker precedes a task

- **WHEN** the display renders a child's task list
- **THEN** each task begins at the left edge of its block with no bullet, dash or other marker before it

A task too long for the width of its block SHALL wrap onto a further line rather than being cut off mid-word. Truncating a task to `(thumb cr…` conveys less than omitting it, because it reads as a fault in the chart rather than as an instruction.

#### Scenario: A child with an empty task list

- **WHEN** a child has no task list set
- **THEN** that child's block renders with its heading and no task lines, and the page layout remains intact

#### Scenario: A task longer than its column

- **WHEN** a task is too long to fit on one line of its block
- **THEN** it continues onto the next line with its text complete, rather than being truncated or marked with an ellipsis

### Requirement: The layout targets the TRMNL OG panel

The display page SHALL be laid out for an 800×480 viewport and SHALL fit within it without scrolling or clipping. Content SHALL NOT overflow the viewport when task lists are at their expected length.

#### Scenario: Rendered at target size

- **WHEN** the page is rendered in an 800×480 viewport
- **THEN** all content is within the viewport bounds and nothing is cut off

#### Scenario: Long task lists degrade gracefully

- **WHEN** a child's task list is longer than the space allotted to it
- **THEN** the task block is constrained so that the sticker grid and the render stamp both remain fully visible, and the surplus is clipped rather than shrunk or overflowed

#### Scenario: A clipped list ends on a whole line

- **WHEN** a task list is clipped for length
- **THEN** the last line still shown is drawn in full rather than cut through horizontally

#### Scenario: Two children only

- **WHEN** the display page is laid out
- **THEN** it assumes exactly two children by design, and the roster size is a layout concern rather than a runtime configuration

### Requirement: Rendering is legible in 2-bit greyscale

The display page SHALL restrict itself to the four grey levels the panel can reproduce and SHALL avoid visual treatments that degrade on e-ink: it SHALL NOT rely on colour to convey meaning, SHALL use hairline-free borders, and SHALL use type sizes and weights that remain readable after conversion.

Text SHALL NOT be set in the lightest grey the palette offers. At that level the panel dithers glyphs into a scatter of dots that reads as a smudge rather than as text. The lightest grey is for rules and dots, whose shape survives it.

Emphasised text SHALL be drawn from a supplied face rather than left to be synthesised by the renderer, because a synthesised slant loses its distinction at this bit depth.

#### Scenario: Converted to the panel's palette

- **WHEN** the rendered page is reduced to four grey levels
- **THEN** all text remains readable and all three day-square states remain distinguishable

#### Scenario: The render stamp is legible on the panel

- **WHEN** the stamp is rendered
- **THEN** it is drawn darker than the grid lines, so that it survives conversion as readable text

#### Scenario: Fonts do not depend on a third party

- **WHEN** the page is rendered with no access to any external font host
- **THEN** the intended typeface is still applied, because font assets are served by the application itself

#### Scenario: Italics are supplied, not synthesised

- **WHEN** a bullet contains emphasis rendered in italic
- **THEN** the glyphs come from an italic face served by the application

### Requirement: Emoji in names render from a bundled monochrome font

Child names may contain emoji. The display SHALL render them from a monochrome emoji font bundled and served by the application, alongside the text typeface.

A colour emoji font SHALL NOT be relied on. Colour glyphs reduced to four grey levels at name size become indistinct, and falling back to whichever emoji font the screenshotting browser happens to carry reintroduces exactly the external dependency the self-hosted typeface exists to remove — with tofu boxes on the kitchen wall as the failure mode.

A name containing emoji SHALL NOT change the position or size of anything else on the canvas.

#### Scenario: An emoji name renders as line art

- **WHEN** a child's name contains an emoji and the page is reduced to four grey levels
- **THEN** the emoji renders as a legible monochrome glyph rather than as an indistinct dark shape

#### Scenario: No emoji font is available from the system

- **WHEN** the page is rendered by a browser carrying no emoji font of its own
- **THEN** emoji in names still render, because the font is served by the application

#### Scenario: An emoji name does not disturb the layout

- **WHEN** a child's name contains emoji, both in its grid row label and in its task block heading
- **THEN** the sticker grid, the task blocks and the render stamp all stay in their fixed positions

