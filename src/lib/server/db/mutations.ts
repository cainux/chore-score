import type { DateString } from '$lib/dates';

/**
 * Records that a child earned a day.
 *
 * `INSERT OR IGNORE` rather than an upsert: with absence as the only "not
 * earned" state (design.md D1) there is no column to update, so marking an
 * already-earned day is a no-op by construction rather than by a check.
 */
export async function markDay(db: D1Database, childId: string, date: DateString): Promise<void> {
	await db
		.prepare('INSERT OR IGNORE INTO day_marks (child_id, date) VALUES (?1, ?2)')
		.bind(childId, date)
		.run();
}

/**
 * Clears a child's day.
 *
 * `DELETE` leaves no residue, so a cleared day is indistinguishable from one
 * that was never marked — which is what the spec requires of it.
 */
export async function clearDay(db: D1Database, childId: string, date: DateString): Promise<void> {
	await db
		.prepare('DELETE FROM day_marks WHERE child_id = ?1 AND date = ?2')
		.bind(childId, date)
		.run();
}

/** Replaces a child's task list, storing the text exactly as submitted. */
export async function saveTaskList(
	db: D1Database,
	childId: string,
	body: string,
	now: Date
): Promise<void> {
	await db
		.prepare(
			`INSERT INTO task_lists (child_id, body, updated_at) VALUES (?1, ?2, ?3)
			 ON CONFLICT (child_id) DO UPDATE SET body = excluded.body, updated_at = excluded.updated_at`
		)
		.bind(childId, body, now.toISOString())
		.run();
}

/**
 * Changes a child's display name.
 *
 * The id is untouched, so day marks and task lists stay attached across a
 * rename — the name is decoration, not identity (design.md D15).
 */
export async function renameChild(db: D1Database, childId: string, name: string): Promise<void> {
	await db.prepare('UPDATE children SET name = ?1 WHERE id = ?2').bind(name, childId).run();
}
