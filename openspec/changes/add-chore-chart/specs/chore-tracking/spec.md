## Purpose

Records whether each child met their daily expectations, anchored to London calendar dates, and derives the weekly trophy from those records. This is the source of truth that both the display and the admin pages read from.

## ADDED Requirements

### Requirement: Children are a fixed roster with editable names

The system SHALL track exactly the children configured for the household. Each child SHALL have a stable identifier, an editable display name, and a fixed position in the order.

Roster membership is configured at setup time: children SHALL NOT be created or removed through the running application, and their order SHALL NOT be editable. The display name SHALL be editable, because it is decoration rather than identity — parents change it to mark birthdays, holidays and other occasions.

A child's identifier SHALL NOT change when its name changes, so that existing day marks and task lists remain attached to the same child.

#### Scenario: Both children are present

- **WHEN** any page loads
- **THEN** the system returns both configured children in a stable, consistent order

#### Scenario: Renaming keeps the child's history

- **WHEN** a child's display name is changed
- **THEN** that child's day marks and task list are unaffected, because they are keyed to the identifier rather than the name

#### Scenario: Order does not follow the name

- **WHEN** a child's display name is changed
- **THEN** the order the children appear in is unchanged

### Requirement: Display names may contain emoji

A child's display name SHALL be stored and rendered as arbitrary Unicode text, including emoji, so that a parent can decorate it for a birthday or a holiday.

The system SHALL treat a name as a sequence of user-perceived characters when measuring its length, so that a multi-code-point emoji counts as one character rather than several. Names SHALL be limited to a length the display can render without disturbing its fixed layout.

#### Scenario: An emoji name round-trips

- **WHEN** a parent saves a name containing emoji
- **THEN** the stored name is byte-for-byte what was submitted, and both pages render it unchanged

#### Scenario: A composed emoji counts as one character

- **WHEN** a name contains an emoji built from several code points, such as one carrying a skin-tone or joining modifier
- **THEN** it counts as a single character against the name length limit

#### Scenario: An over-long name is rejected

- **WHEN** a parent submits a name longer than the display can accommodate
- **THEN** the name is not saved and the parent is told why

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

### Requirement: Times are stored and computed in UTC

The system SHALL represent every instant it stores, transports, or logs in UTC. It SHALL NOT store local times, timezone offsets, or naive timestamps. Calendar dates SHALL be stored as zone-free `YYYY-MM-DD` values, and all date arithmetic SHALL be performed in UTC so that no computed interval is affected by a daylight saving transition.

#### Scenario: A stored timestamp is UTC

- **WHEN** any timestamp is written to storage
- **THEN** it is expressed in UTC and carries no local offset

#### Scenario: Date arithmetic is unaffected by clock changes

- **WHEN** an interval of seven days is computed across a daylight saving transition
- **THEN** the result is exactly seven calendar days, not six or eight

#### Scenario: Timezone awareness is confined to one boundary

- **WHEN** the system needs to know anything other than the current London date and clock time
- **THEN** it operates purely on UTC values and zone-free date strings, with no reference to any named timezone

### Requirement: Dates are anchored to Europe/London

The system SHALL determine the current calendar date in the `Europe/London` timezone, regardless of the timezone of the server or the requesting client. A day SHALL begin at 00:00 London time and end at 23:59:59 London time. Everything downstream of this operates on zone-free calendar dates.

The system SHALL also derive the current London clock time, for the sole purpose of stating on the display when the page was rendered. The London date and the London clock time SHALL be produced by a single conversion performed at one place in the system, so that `Europe/London` is named exactly once. No other behaviour SHALL depend on a named timezone.

#### Scenario: Server running in UTC during British Summer Time

- **WHEN** the current instant is 23:30 UTC on 15 June, which is 00:30 London time on 16 June
- **THEN** the system treats the current London date as 16 June, and reports the current London clock time as 00:30

#### Scenario: One conversion serves both values

- **WHEN** the system resolves the current London date and the current London clock time for the same instant
- **THEN** both are derived from a single timezone conversion, and the two values describe the same moment

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

### Requirement: Week completion asks nothing about the current date

Week completion SHALL be determined from the stored day marks alone. The system SHALL NOT report any intermediate standing for a week — no notion of a week being still winnable, lost, or in progress — so no rule in this capability depends on the current London date.

A week's completion SHALL therefore be answered identically whether that week is in the past, in progress, or in the future.

#### Scenario: The same marks give the same answer all week

- **WHEN** a child has earned Monday and Tuesday of the current week and it is Wednesday
- **THEN** the week is reported as not complete, and that answer does not change as the day passes or as the current date moves on

#### Scenario: A past week is answered the same way as a current one

- **WHEN** completion is evaluated for a week whose dates all fall before the current London date
- **THEN** it is reported as complete if all 7 dates are marked and as not complete otherwise, by the same rule applied to the current week

#### Scenario: Backfilling completes a week

- **WHEN** a week is incomplete because one earlier date is unmarked, and a parent subsequently marks that date
- **THEN** that week becomes complete

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

### Requirement: Stored task text converts to bullets by a fixed rule

The system SHALL convert a stored task list into bullets by a single defined rule: split the text on line breaks, trim surrounding whitespace from each line, discard lines that are then empty, and remove a leading `-`, `*`, or `•` together with any whitespace following it. Each remaining line SHALL become exactly one bullet.

A marker that is immediately repeated SHALL NOT be treated as a marker. `--- break ---` is content, not a list item, and stripping one character from it would render `-- break ---` — neither the marker rule doing its job nor the text rendering as typed. A line consisting only of a marker SHALL produce no bullet.

An `*` SHALL be treated as a marker only when whitespace follows it. `* Piano` is a list item; `*Piano*` is emphasis, and stripping its opening character would leave an unmatched delimiter.

This requirement covers line structure only. What the text of a bullet means is a separate rule, applied when the bullet is rendered.

The stored text SHALL be preserved exactly as the parent saved it. The conversion SHALL apply when the list is rendered, so that reopening the editor shows what was typed rather than what was displayed.

#### Scenario: Blank lines do not become bullets

- **WHEN** a stored task list contains blank lines between entries
- **THEN** those blank lines produce no bullets, and only the non-empty lines are rendered

#### Scenario: A hand-typed dash is not doubled

- **WHEN** a parent saves a list whose lines begin with `- ` or `• `
- **THEN** each line renders as a single bullet with the marker removed, not as a bullet followed by a second marker

#### Scenario: A doubled marker is content

- **WHEN** a line begins with a repeated marker character, such as `--- break ---`
- **THEN** nothing is stripped and the line renders exactly as typed

#### Scenario: An asterisk opening emphasis is not a marker

- **WHEN** a line begins `*Piano*`
- **THEN** nothing is stripped, and the line is passed on with both delimiters intact

#### Scenario: An asterisk followed by a space is a marker

- **WHEN** a line begins `* Piano`
- **THEN** the asterisk and the space are removed, exactly as for `- Piano`

### Requirement: Task bullets support inline emphasis

The system SHALL interpret `*italic*`, `**bold**`, and `***bold italic***` within a bullet when it is rendered, and SHALL render the emphasised text in a correspondingly styled face.

The system SHALL NOT interpret any other markup. Links, headings, code, tables, block quotes, and nesting SHALL be rendered as typed. The display is a photograph on a wall: a link has nowhere to go, a heading has no document to structure, and every construct that spans lines fights a block whose height is fixed.

Delimiters that are not matched into a pair SHALL be rendered as typed, so that text written with no markup in mind is never altered. Underscores SHALL NOT be treated as delimiters, because they occur inside ordinary text far more often than they are meant as markup.

The stored text SHALL be unaffected: emphasis is applied when a bullet is drawn, so reopening the editor shows the delimiters as typed.

#### Scenario: Emphasising the part that matters

- **WHEN** a bullet reads `Homework Hopes (make sure to play the **F#**)`
- **THEN** `F#` is rendered in bold and the surrounding text is not, with no delimiters visible

#### Scenario: Arithmetic is not emphasis

- **WHEN** a bullet contains lone asterisks, such as `2 * 3 and 4 * 5`
- **THEN** every asterisk renders as typed and no part of the line is emphasised

#### Scenario: An unclosed delimiter is left alone

- **WHEN** a bullet contains an opening delimiter with no closing one
- **THEN** the delimiter renders as typed

#### Scenario: Underscores are literal

- **WHEN** a bullet contains `_underscores_`
- **THEN** they render as typed and no emphasis is applied

#### Scenario: The editor still shows the delimiters

- **WHEN** a parent saves a bullet containing `**bold**` and later reopens the editor
- **THEN** the field contains `**bold**`, not the rendered form

#### Scenario: Reopening the editor shows the stored text

- **WHEN** a parent saves a list and later reopens the editor
- **THEN** the field contains exactly the text that was saved, including any markers or spacing the conversion would have removed for display
