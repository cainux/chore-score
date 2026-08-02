-- The roster is fixed and configured out-of-band (design.md D11): children are
-- never created or removed through the running app, and the order is not
-- editable. Names are, so these are starting values rather than identity —
-- `sort_order` is what keeps the left-hand column the left-hand column.
--
-- Ids are stable and never change, so a rename leaves day marks and task lists
-- attached to the same child.

-- No task_lists rows are seeded. "This child has no task list yet" is a real
-- state the system has to report as empty rather than as an error, and seeding
-- blank rows would paper over the one case where that is exercised.

INSERT OR IGNORE INTO children (id, name, sort_order) VALUES
  ('alice', 'Alice', 1),
  ('ben',   'Ben',   2);
