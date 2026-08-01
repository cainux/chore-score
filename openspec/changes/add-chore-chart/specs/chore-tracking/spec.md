## Purpose

Records whether each child met their daily expectations, anchored to London calendar dates, and derives the weekly trophy from those records. This is the source of truth that both the display and the admin pages read from.

## ADDED Requirements

### Requirement: Children are a fixed roster

The system SHALL track exactly the children configured for the household. Each child SHALL have a display name and a stable identifier. Children are configured at setup time and are not created or removed through the running application.

#### Scenario: Both children are present

- **WHEN** any page loads
- **THEN** the system returns both configured children in a stable, consistent order

### Requirement: A day mark is all-or-nothing per child

The system SHALL record, for each child and each calendar date, a single boolean day mark meaning "this child did everything expected of them on this day". The system SHALL NOT track individual tasks, per-task completion, or partial credit.

#### Scenario: A day is marked earned

- **WHEN** a day mark is set for a child on a given date
- **THEN** the system stores exactly one earned record for that child and date

#### Scenario: A day is cleared

- **WHEN** a day mark is cleared for a child on a given date
- **THEN** the system stores no earned record for that child and date, and the day is indistinguishable from one that was never marked

#### Scenario: Marking the same day twice is idempotent

- **WHEN** a day mark is set for a child and date that is already earned
- **THEN** the stored state is unchanged and no duplicate record exists

### Requirement: Dates are anchored to Europe/London

The system SHALL interpret every calendar date, day boundary, and week boundary in the `Europe/London` timezone, regardless of the timezone of the server or the requesting client. A day SHALL begin at 00:00 London time and end at 23:59:59 London time.

#### Scenario: Server running in UTC during British Summer Time

- **WHEN** the current instant is 23:30 UTC on 15 June, which is 00:30 London time on 16 June
- **THEN** the system treats the current London date as 16 June

#### Scenario: Clock change day has the correct number of days

- **WHEN** a week contains a British Summer Time transition
- **THEN** that week still contains exactly 7 dates and each date is marked independently

### Requirement: Weeks start on Monday

The system SHALL group dates into weeks that begin on Monday and end on the following Sunday, in London time. The system SHALL be able to resolve the current week and the immediately preceding week from any given instant.

#### Scenario: Sunday belongs to the week that started on the preceding Monday

- **WHEN** the current London date is a Sunday
- **THEN** the current week is the 7-day span beginning on the Monday 6 days earlier

#### Scenario: Monday starts a fresh week

- **WHEN** the current London date is a Monday
- **THEN** the current week begins on that date, and the previous week is the 7-day span ending on the preceding Sunday

### Requirement: A complete week earns a trophy

The system SHALL treat a week as complete for a child when that child has an earned day mark on all 7 dates of that week. A week with 6 or fewer earned days SHALL NOT be complete. Trophy status SHALL be derived from the stored day marks rather than recorded separately, so that changing a day mark immediately changes trophy status.

#### Scenario: All seven days earned

- **WHEN** a child has earned day marks on all 7 dates of a week
- **THEN** that week is reported as complete for that child

#### Scenario: One day missing

- **WHEN** a child has earned day marks on 6 of the 7 dates of a week
- **THEN** that week is reported as not complete for that child

#### Scenario: Backfilling the last missing day completes the week

- **WHEN** a child is missing exactly one day of a past week and that day is subsequently marked earned
- **THEN** that week becomes complete for that child without any further action

#### Scenario: Clearing a day revokes a trophy

- **WHEN** a child's week is complete and one of its day marks is subsequently cleared
- **THEN** that week is reported as not complete for that child

### Requirement: A partial current week is never complete

The system SHALL only report the current week as complete once all 7 of its dates are earned, including dates that have not yet occurred. Future dates within the current week SHALL be reported as not yet earned rather than as missed.

#### Scenario: Mid-week with a perfect record so far

- **WHEN** it is Wednesday and a child has earned Monday, Tuesday and Wednesday
- **THEN** the current week is reported as not complete, and Thursday through Sunday are reported as not yet occurred

### Requirement: History is retained indefinitely

The system SHALL retain all day marks indefinitely, including those for dates no longer shown on the display. Day marks older than the displayed window SHALL remain queryable.

#### Scenario: A mark from a previous month survives

- **WHEN** a day mark was recorded three months ago and many weeks have since rolled over
- **THEN** that day mark is still stored and can be retrieved

### Requirement: Task lists are current free text per child

The system SHALL store one free-text task list per child, consisting of plain-text bullet lines. The task list SHALL represent the child's current expectations only: it SHALL NOT be versioned by week, SHALL NOT roll over or reset on any schedule, and SHALL retain its content until a parent edits it.

#### Scenario: Task list persists across a week boundary

- **WHEN** a new week begins
- **THEN** each child's task list is unchanged from what it was before the week boundary

#### Scenario: Editing replaces the list

- **WHEN** a parent saves a new task list for a child
- **THEN** the child's previous task list is replaced and only the new content is stored

#### Scenario: A child with no tasks set

- **WHEN** a child's task list has never been set
- **THEN** the system reports an empty list rather than an error
