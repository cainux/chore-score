-- Initial schema (design.md D1).
--
-- `day_marks` has one row per earned day and no boolean column: "not earned"
-- is the absence of a row. That makes marking idempotent via INSERT OR IGNORE
-- and clearing residue-free via DELETE, with no tri-state to reason about.
-- The weekly trophy is derived (COUNT(*) = 7 over a week's dates), never stored.

CREATE TABLE children (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  sort_order INTEGER NOT NULL
);

CREATE TABLE day_marks (
  child_id TEXT NOT NULL REFERENCES children(id),
  date     TEXT NOT NULL,          -- 'YYYY-MM-DD', always a London calendar date
  PRIMARY KEY (child_id, date)
);

CREATE TABLE task_lists (
  child_id   TEXT PRIMARY KEY REFERENCES children(id),
  body       TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL         -- ISO-8601 UTC
);
