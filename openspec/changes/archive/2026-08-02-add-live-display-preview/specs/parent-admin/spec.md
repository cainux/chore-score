## ADDED Requirements

### Requirement: The admin page offers two previews of the wall chart

The admin page SHALL provide, at the foot of its column, two links to the wall chart as the panel draws it: a **static** preview and a **live** one. Both SHALL be labelled with those words, so that a parent choosing between them is told the difference rather than left to discover it.

The static preview SHALL be the display route itself — the page the panel captures, rendered once, showing the data as it stood when the link was followed. It is the answer to "what will be on the wall".

The live preview SHALL be a separate page that follows the admin page as it is edited. It is the answer to "what will be on the wall once I finish".

Both links SHALL open away from the admin page rather than replacing it, so that scroll position and unsaved text survive following one.

#### Scenario: Both previews are offered

- **WHEN** a parent scrolls to the foot of the admin page
- **THEN** two preview links are present, one identified as static and one as live

#### Scenario: Following a preview does not lose work

- **WHEN** a parent has unsaved task text on the admin page and follows either preview link
- **THEN** the admin page is still present with its unsaved text and scroll position intact

### Requirement: The live preview renders the same chart as the panel

The live preview SHALL render the identical canvas the display route renders, from the same data, at the same fixed size — the same task blocks, the same two-week grid, the same square states, the same trophies and the same render stamp.

It SHALL NOT reconstruct the chart from anything the admin page holds locally. Its content SHALL come from the same server-side view of the data that the display route is served, so that a divergence between what the preview shows and what the panel will capture is not possible by construction.

A preview that can be subtly wrong is worse than no preview, because a parent who trusts it stops checking the wall.

#### Scenario: Preview and display agree

- **WHEN** the live preview and the display route are rendered from the same stored data
- **THEN** they show the same task text, the same day square states, and the same trophies

#### Scenario: Clipping behaves identically

- **WHEN** a child's task list is long enough to be clipped on the panel
- **THEN** the live preview clips it at the same point, because it lays the canvas out at its true fixed width regardless of how it is scaled to fit the viewer's window

### Requirement: The live preview follows edits made on the admin page

When a day mark is toggled or a child's name and tasks are saved on the admin page, the live preview SHALL update to reflect the change without the parent reloading it or interacting with it.

The preview SHALL update only after the change has been stored, never in anticipation of it. A failed edit SHALL leave the preview showing the stored state, because the preview's purpose is to show what the panel will capture and a change that did not save will not be captured.

The preview SHALL re-read the stored data rather than accept a description of the change, so that a notification cannot leave it holding a state the server never produced.

#### Scenario: A toggle reaches the preview

- **WHEN** a parent toggles a day mark on the admin page while the live preview is open alongside it
- **THEN** the preview shows the new state of that day square, without being reloaded

#### Scenario: A save reaches the preview

- **WHEN** a parent saves a change to a child's name or task list while the live preview is open alongside it
- **THEN** the preview shows the saved text laid out on the canvas, without being reloaded

#### Scenario: A failed edit does not reach the preview

- **WHEN** an edit on the admin page fails and nothing is stored
- **THEN** the live preview continues to show the stored state and does not show the attempted change

### Requirement: The live preview has a stated reach and shows stored state only

The live preview SHALL follow an admin page open in the same browser. It SHALL NOT be required to follow an admin page open on a different device or in a different browser; such a preview SHALL simply show the state it last read rather than behave incorrectly.

The live preview SHALL show stored state only. Task text that has been typed but not saved SHALL NOT appear in it.

Both limits are accepted rather than worked around. The preview exists for a parent editing at a desk with two tabs open, and previewing unsaved text is a different problem that a second tab cannot solve.

#### Scenario: Unsaved text does not appear

- **WHEN** a parent types into a task editor on the admin page without saving
- **THEN** the live preview continues to show the previously saved task list

#### Scenario: An edit from elsewhere does not corrupt the preview

- **WHEN** a change is made from a different device while the live preview is open
- **THEN** the preview continues to show the last state it read, correctly rendered, rather than a partial or inconsistent chart

### Requirement: The live preview does not edit

The live preview SHALL expose no means of changing any data, exactly as the display route does not. It is a rendering of the chart and nothing else.

#### Scenario: No controls on the preview

- **WHEN** the live preview is rendered
- **THEN** it contains no buttons, form fields, or toggles

### Requirement: The render stamp on the live preview names when it last read

The live preview's render stamp SHALL state when the preview last read the stored data, not the current time. A preview left open and untouched SHALL therefore show an increasingly old stamp.

This is accurate rather than a defect: the stamp says when the chart was produced, and on the preview that is when it was last read. The stamp exists to expose staleness on a panel that cannot report a fault, and a parent looking at a live browser tab is not in that position.

#### Scenario: An idle preview keeps its stamp

- **WHEN** the live preview has been open for some time with no edits made
- **THEN** its render stamp still names the time it last read the data, rather than advancing with the clock
