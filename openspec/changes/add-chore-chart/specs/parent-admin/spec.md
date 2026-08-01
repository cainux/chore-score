## Purpose

The page parents use to run the chart: toggling each child's day marks, including retroactively, and editing each child's task bullets. It is the only way data enters the system.

## ADDED Requirements

### Requirement: The admin page mirrors the display window

The admin page SHALL present the same two-week window as the display — previous week and current week, Monday start, one row per child — so that what a parent edits matches what is on the wall.

#### Scenario: Same weeks as the display

- **WHEN** a parent opens the admin page
- **THEN** the grid covers the previous week and the current week, matching the display page for the same instant

### Requirement: Every day square is directly toggleable

Each of the 14 day squares per child SHALL be an individually selectable control. Selecting a square that is not earned SHALL mark it earned; selecting a square that is earned SHALL clear it. A parent SHALL NOT have to choose a date from a separate control, because the target date is always identified by the square being selected.

#### Scenario: Marking a day

- **WHEN** a parent selects an unmarked square for a child
- **THEN** that child's day mark for that date becomes earned

#### Scenario: Unmarking a day

- **WHEN** a parent selects an earned square for a child
- **THEN** that child's day mark for that date is cleared

#### Scenario: Correcting a mistake immediately

- **WHEN** a parent marks the wrong child's square and selects it again
- **THEN** the mark is cleared and no residual record remains

### Requirement: Past days within the window can be edited freely

The admin page SHALL allow marking and clearing any date in the displayed two-week window, with no restriction based on how long ago the date was. There SHALL be no locking, approval, or confirmation step for editing a past date.

#### Scenario: Backfilling a day from last week

- **WHEN** a parent selects a square for a date nine days in the past
- **THEN** that day mark is set, exactly as it would be for today

#### Scenario: Ticking after midnight for the previous day

- **WHEN** it is 00:30 London time and a parent wants to record the day that has just ended
- **THEN** the parent selects yesterday's square directly and the mark is recorded against yesterday's date

### Requirement: Future days cannot be marked

The admin page SHALL NOT allow marking a date later than the current London date. Squares for future dates SHALL be presented as unavailable.

#### Scenario: Tomorrow is not markable

- **WHEN** a parent attempts to select a square for a date after today
- **THEN** no day mark is recorded and the state is unchanged

### Requirement: Changes take effect without an explicit save

Toggling a day mark SHALL persist immediately. The admin page SHALL reflect the stored state after each toggle, and SHALL NOT rely on a separate save action for day marks.

#### Scenario: State survives a reload

- **WHEN** a parent toggles several squares and then reloads the admin page
- **THEN** the reloaded page shows exactly the toggles that were made

#### Scenario: Toggle failure is visible

- **WHEN** a toggle cannot be persisted
- **THEN** the parent is shown that the change did not take effect, and the square does not remain in a state that misrepresents what is stored

### Requirement: Task lists are editable per child

The admin page SHALL let a parent edit each child's task list as free text and save it. Saved text SHALL become the child's current task list and SHALL appear on the display at its next refresh.

#### Scenario: Editing one child's tasks

- **WHEN** a parent edits and saves the task list for one child
- **THEN** only that child's task list changes and the other child's is untouched

#### Scenario: Clearing a task list

- **WHEN** a parent saves an empty task list for a child
- **THEN** that child's task list becomes empty and the display renders that child's block with no bullets

### Requirement: The admin page is usable on a phone

The admin page SHALL be operable on a phone-sized screen. Day squares SHALL be large enough to select accurately by touch, and the two-week grid SHALL remain usable without precise pointing.

#### Scenario: Toggling on a narrow screen

- **WHEN** the admin page is opened on a phone-width viewport
- **THEN** all 14 squares per child remain reachable and individually selectable

### Requirement: The display is not editable

The display page SHALL expose no means of changing any data. All mutation SHALL occur through the authenticated admin page.

#### Scenario: No mutation from the display route

- **WHEN** a request attempts to change a day mark or task list through the display route
- **THEN** the request is rejected and no data changes
