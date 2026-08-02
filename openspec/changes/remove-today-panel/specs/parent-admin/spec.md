## MODIFIED Requirements

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

## REMOVED Requirements

### Requirement: Marking today is the primary action

**Reason**: The dedicated today control duplicated a control the correction grid already provides — today's date is always the first, non-future, non-disabled cell in the current week's row, and posts to the same toggle action. In practice the correction grid is what gets used for today's mark too, so the separate control added a second mechanism nothing needed.

**Migration**: A parent marks today by selecting today's cell in the correction grid, the same way any other date in the two-week window is marked. No data or storage change: the day-mark toggle behavior, its editable-window rule, and its future-date rejection are unchanged and still apply to today's cell.

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
