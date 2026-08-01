## Purpose

The page parents use to run the chart: marking today, correcting past days, and editing each child's task bullets. It is the only way data enters the system, and it is used almost exclusively from a phone.

## ADDED Requirements

### Requirement: The admin page covers the same two-week window

The admin page SHALL provide edit access to every date in the same two-week window the display shows — previous week and current week, Monday start — for every child. The admin page SHALL NOT be required to arrange that window the way the display does; it is laid out for a phone, not for the panel.

#### Scenario: Same dates as the display

- **WHEN** a parent opens the admin page
- **THEN** every date the display page shows for the same instant is editable, for every child

#### Scenario: The editable window advances with the week

- **WHEN** the London date crosses into a new week
- **THEN** the admin page's editable window advances to match the display, and the week that dropped off the display is no longer editable

### Requirement: Marking today is the primary action

The admin page SHALL present a dedicated control per child for today's day mark, distinct from the controls used to correct earlier dates. Those controls SHALL be reachable without scrolling on a phone-sized viewport and SHALL be the most prominent elements on the page, because marking today is the overwhelmingly common reason to open it.

#### Scenario: Marking tonight off

- **WHEN** a parent opens the admin page on a phone and wants to record that both children did everything today
- **THEN** both today controls are visible without scrolling, and one selection per child completes the task

#### Scenario: Today's control shows current state

- **WHEN** a child's day mark for today is already earned
- **THEN** that child's today control shows as earned, and selecting it clears the mark

#### Scenario: Today's control follows the date

- **WHEN** the London date changes while the page is open and the page is subsequently reloaded
- **THEN** the today controls act on the new date

#### Scenario: The today control names its date

- **WHEN** the today controls are rendered
- **THEN** each states the day it applies to prominently enough to be read without looking for it, rather than as secondary detail

### Requirement: A control submits the date it was rendered for

Every day mark control SHALL submit the date it was rendered for. The server SHALL apply the submitted date and SHALL NOT substitute the current London date at the time the request arrives.

This makes the page's behaviour match what the parent saw. A page rendered before midnight and used shortly after it records the day that was on screen, which is the day the parent was thinking about, rather than the one that has just begun.

A rendered date can only fall behind the current date and never run ahead of it, so a control rendered as today can never submit a future date.

#### Scenario: Tapping shortly after midnight

- **WHEN** the page is rendered at 23:50 on a Saturday and the parent selects a today control at 00:20 on the Sunday
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
- **THEN** the page re-renders and its today controls act on the current date

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

#### Scenario: Today is editable from either surface

- **WHEN** today's mark is changed using the today control
- **THEN** today's entry in the correction window reflects the same state, because both act on one underlying day mark

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

#### Scenario: Correction window stays reachable

- **WHEN** a parent scrolls past the today controls
- **THEN** every date in the two-week window is reachable and selectable for both children

### Requirement: The display is not editable

The display page SHALL expose no means of changing any data. All mutation SHALL occur through the authenticated admin page.

#### Scenario: No mutation from the display route

- **WHEN** a request attempts to change a day mark or task list through the display route
- **THEN** the request is rejected and no data changes
