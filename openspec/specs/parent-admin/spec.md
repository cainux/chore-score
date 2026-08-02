# parent-admin Specification

## Purpose
The page parents use to run the chart: marking today, correcting past days, and editing each child's task bullets. It is the only way data enters the system, and it is used almost exclusively from a phone.
## Requirements
### Requirement: The admin page covers the same two-week window

The admin page SHALL provide edit access to every date in the same two-week window the display shows — current week and previous week, Monday start — for every child. The admin page SHALL NOT be required to arrange that window the way the display does; it is laid out for a phone, not for the panel.

It SHALL, however, present the two weeks in the same order the display does, so that a parent moving between the two surfaces is not asked to re-learn which week is which.

#### Scenario: Both surfaces agree on which week comes first

- **WHEN** a parent opens the admin page
- **THEN** the week containing today is presented before the previous week, as on the display, and each week is identified as the current or the previous one

#### Scenario: Same dates as the display

- **WHEN** a parent opens the admin page
- **THEN** every date the display page shows for the same instant is editable, for every child

#### Scenario: The editable window advances with the week

- **WHEN** the London date crosses into a new week
- **THEN** the admin page's editable window advances to match the display, and the week that dropped off the display is no longer editable

### Requirement: A control submits the date it was rendered for

Every day mark control SHALL submit the date it was rendered for. The server SHALL apply the submitted date and SHALL NOT substitute the current London date at the time the request arrives.

This makes the page's behaviour match what the parent saw. A page rendered before midnight and used shortly after it records the day that was on screen, which is the day the parent was thinking about, rather than the one that has just begun.

A rendered date can only fall behind the current date and never run ahead of it, so a control rendered as today can never submit a future date.

#### Scenario: Tapping shortly after midnight

- **WHEN** the page is rendered at 23:50 on a Saturday and the parent selects the control for that date at 00:20 on the Sunday
- **THEN** the day mark is recorded against Saturday, the date the control was rendered for and displayed as

#### Scenario: The server does not re-derive the date

- **WHEN** a toggle request arrives carrying a date
- **THEN** the server acts on that date, having checked it is within the editable window and not in the future

### Requirement: The page refreshes when it returns after the date changes

When the admin page becomes visible again after being left, and the current London date no longer matches the date the page was rendered for, the page SHALL re-render so that its controls act on the current date.

The page SHALL NOT re-render while any task list field holds unsaved changes, because doing so would discard text the parent has typed.

Re-rendering also picks up day marks made by the other parent since the page was loaded. Where JavaScript is unavailable the page SHALL simply remain as rendered, which is safe because its controls carry their own dates.

#### Scenario: Returning to a page from the previous day

- **WHEN** a parent returns to an admin page that was rendered yesterday and has no unsaved task edits
- **THEN** the page re-renders and its controls act on the current date

#### Scenario: Unsaved task text is not discarded

- **WHEN** a parent returns to a stale admin page on which a task field has been edited but not saved
- **THEN** the page does not re-render and the typed text is preserved

#### Scenario: Returning on the same day

- **WHEN** a parent returns to an admin page rendered earlier the same day
- **THEN** no re-render is required

### Requirement: Day marks and task lists are edited on one page

The admin page SHALL expose today's marks, the correction window, and both children's task lists on a single page, requiring no navigation between them.

#### Scenario: Everything on one page

- **WHEN** a parent opens the admin page
- **THEN** they can mark today, correct a past date, and edit a task list without navigating to another page

### Requirement: Every editable day is directly selectable

Every editable date SHALL be an individually selectable control. Selecting a date that is not earned SHALL mark it earned; selecting a date that is earned SHALL clear it. A parent SHALL NOT have to choose a date from a separate picker, because the target date is always identified by the control being selected.

#### Scenario: Marking a day

- **WHEN** a parent selects an unmarked control for a child and date
- **THEN** that child's day mark for that date becomes earned

#### Scenario: Unmarking a day

- **WHEN** a parent selects an earned control for a child and date
- **THEN** that child's day mark for that date is cleared

#### Scenario: Correcting a mistake immediately

- **WHEN** a parent marks the wrong child and selects the same control again
- **THEN** the mark is cleared and no residual record remains

### Requirement: Past days within the window can be edited freely

The admin page SHALL allow marking and clearing any date in the displayed two-week window, with no restriction based on how long ago the date was. There SHALL be no locking, approval, or confirmation step for editing a past date.

#### Scenario: Backfilling a day from last week

- **WHEN** a parent selects the control for a date nine days in the past
- **THEN** that day mark is set, exactly as it would be for today

#### Scenario: Ticking after midnight on a freshly loaded page

- **WHEN** it is 00:30 London time, the page has been loaded since midnight, and a parent wants to record the day that has just ended
- **THEN** the parent selects yesterday's control in the correction window directly, and the mark is recorded against yesterday's date

### Requirement: Future days cannot be marked

The admin page SHALL NOT allow marking a date later than the current London date. Controls for future dates SHALL be presented as unavailable, and the server SHALL reject such a request independently of what the page presents.

#### Scenario: Tomorrow is not markable

- **WHEN** a parent attempts to select a control for a date after today
- **THEN** no day mark is recorded and the state is unchanged

#### Scenario: A forged request for a future date

- **WHEN** a request to mark a future date reaches the server without going through the page
- **THEN** the request is rejected and no day mark is recorded

### Requirement: Changes take effect without an explicit save

Toggling a day mark SHALL persist immediately. The admin page SHALL reflect the stored state after each toggle, and SHALL NOT rely on a separate save action for day marks.

#### Scenario: State survives a reload

- **WHEN** a parent toggles several day marks and then reloads the admin page
- **THEN** the reloaded page shows exactly the toggles that were made

#### Scenario: Toggle failure is visible

- **WHEN** a toggle cannot be persisted
- **THEN** the parent is shown that the change did not take effect, and the control does not remain in a state that misrepresents what is stored

### Requirement: Task lists are editable in place

The admin page SHALL let a parent edit each child's task list as free text directly on the page and save it, without navigating elsewhere. Unlike day marks, a task edit SHALL require an explicit save, so that partially typed text is never published to the display. The page SHALL indicate when a task list has unsaved changes.

#### Scenario: Editing one child's tasks

- **WHEN** a parent edits and saves the task list for one child
- **THEN** only that child's task list changes and the other child's is untouched

#### Scenario: Unsaved edits are not published

- **WHEN** a parent has typed into a task field but has not saved
- **THEN** the stored task list is unchanged and the display continues to show the previously saved text

#### Scenario: Unsaved changes are signalled

- **WHEN** a task field differs from the saved text
- **THEN** the page indicates that this child's task list has unsaved changes

#### Scenario: Clearing a task list

- **WHEN** a parent saves an empty task list for a child
- **THEN** that child's task list becomes empty and the display renders that child's block with no bullets

### Requirement: Child names are editable alongside their task lists

The admin page SHALL let a parent edit each child's display name in place, in the same per-child block as that child's task list, saved by the same explicit save action.

Names SHALL follow the same rule as task text: an edit takes effect only on save, so a partially typed name is never published to the display. The page SHALL indicate when a name has unsaved changes.

Name editing SHALL sit in the lower part of the page with the task editors rather than near the day-mark controls, because renaming is occasional and marking a day is not.

The field SHALL accept emoji by ordinary text entry, using the device keyboard, with no dedicated picker.

#### Scenario: Renaming a child

- **WHEN** a parent edits one child's name and saves
- **THEN** that child's name changes everywhere it appears, and the other child's name is untouched

#### Scenario: An unsaved name is not published

- **WHEN** a parent has typed into a name field but has not saved
- **THEN** the stored name is unchanged and the display continues to show the previous name

#### Scenario: Name and tasks save together

- **WHEN** a parent changes both a child's name and that child's task list and saves once
- **THEN** both changes are persisted together for that child

#### Scenario: An empty name is refused

- **WHEN** a parent saves a name that is empty or only whitespace
- **THEN** the name is not saved and the previous name is retained, because a nameless row on the chart cannot be identified

### Requirement: The task editor warns when a list is too long for the display

The admin page SHALL indicate when a child's task list exceeds what the display can show, at the point the parent is typing it.

The display cannot report this. It is a photograph with no viewer present and no means of complaint, and its only recourse is to clip. The admin page is the one surface where a person is present and able to act, so the limit is surfaced there.

The warning SHALL NOT block saving. A parent may knowingly keep a longer list, accepting that the surplus is clipped on the panel.

#### Scenario: A list grows past what fits

- **WHEN** a parent types a task list longer than the display can render
- **THEN** the page indicates that the surplus will not appear on the display

#### Scenario: The warning does not prevent saving

- **WHEN** a parent saves a task list that exceeds the display limit
- **THEN** the list is saved in full and the display clips it

### Requirement: The admin page is laid out for a phone

The admin page SHALL be designed for a phone-sized viewport as its primary target rather than adapted to one. Every selectable control SHALL meet a minimum touch target size of 44×44 CSS pixels. The page SHALL NOT require horizontal scrolling or precise pointing at any supported width.

#### Scenario: Controls are thumb-sized

- **WHEN** the admin page is opened at a 390 CSS pixel viewport width
- **THEN** every day mark control is at least 44×44 CSS pixels and is individually selectable without zooming

#### Scenario: No horizontal scrolling

- **WHEN** the admin page is opened at any supported viewport width
- **THEN** all content fits horizontally and the page scrolls only vertically

#### Scenario: The editable window is fully reachable

- **WHEN** a parent scrolls through the admin page
- **THEN** every date in the two-week window is reachable and selectable for both children

### Requirement: The display is not editable

The display page SHALL expose no means of changing any data. All mutation SHALL occur through the authenticated admin page.

#### Scenario: No mutation from the display route

- **WHEN** a request attempts to change a day mark or task list through the display route
- **THEN** the request is rejected and no data changes

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

