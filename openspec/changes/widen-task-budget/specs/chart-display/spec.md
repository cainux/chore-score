## MODIFIED Requirements

### Requirement: Each child's tasks appear above the grid

The display SHALL render each child's current task list above the sticker grid, one task per line, with the two children's blocks laid out side by side and each block labelled with its child's name.

Tasks SHALL be drawn as plain lines with no bullet marker and no indent. On the panel a column of markers reads as clutter beside the star grid, and the indent costs column width that a wrapping task spends on a further line. The line break alone separates one task from the next.

A task too long for the width of its block SHALL wrap onto a further line rather than being cut off mid-word. Truncating a task to `(thumb cr…` conveys less than omitting it, because it reads as a fault in the chart rather than as an instruction.

When the fixed canvas is divided between the task blocks and the sticker grid, the task blocks' line budget SHALL take precedence over empty space in the grid. The grid SHALL give up space around its day squares before a task line is given up, and SHALL NOT shrink the day squares themselves to do so. Task lines are what a child reads to know what is expected of them; the air between the grid's rows carries no information.

#### Scenario: Tasks are shown per child

- **WHEN** each child has a different task list
- **THEN** each child's own tasks appear under that child's name

#### Scenario: No marker precedes a task

- **WHEN** the display renders a child's task list
- **THEN** each task begins at the left edge of its block with no bullet, dash or other marker before it

#### Scenario: A child with an empty task list

- **WHEN** a child has no task list set
- **THEN** that child's block renders with its heading and no task lines, and the page layout remains intact

#### Scenario: A task longer than its column

- **WHEN** a task is too long to fit on one line of its block
- **THEN** it continues onto the next line with its text complete, rather than being truncated or marked with an ellipsis

#### Scenario: The grid carries no empty space at the expense of task lines

- **WHEN** the display page is rendered
- **THEN** each child's grid row is no taller than its day squares, and the day squares keep the size at which the stickers were verified legible on the panel

#### Scenario: Nine lines of tasks fit
- **WHEN** a child's task list fills nine lines at the display's task type size
- **THEN** all nine lines are drawn in full, and the sticker grid and render stamp remain fully visible and do not overlap
