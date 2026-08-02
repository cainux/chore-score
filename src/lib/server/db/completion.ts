import type { DateString } from '$lib/dates';

/**
 * Which children earned every one of a week's 7 dates.
 *
 * Derived from the stored marks rather than recorded, so clearing a day revokes
 * the trophy and backfilling the last missing day awards it, both without any
 * further action (design.md D1).
 *
 * `COUNT(*) = 7` is safe against double counting because `day_marks` is keyed
 * on (child_id, date): a child cannot have two rows for one day.
 */
export async function completeWeeks(
	db: D1Database,
	dates: DateString[]
): Promise<ReadonlySet<string>> {
	if (dates.length !== 7) {
		throw new Error(`a week is 7 dates, got ${dates.length}`);
	}

	const placeholders = dates.map((_, i) => `?${i + 1}`).join(', ');
	const { results } = await db
		.prepare(
			`SELECT child_id FROM day_marks
			 WHERE date IN (${placeholders})
			 GROUP BY child_id
			 HAVING COUNT(*) = 7`
		)
		.bind(...dates)
		.all<{ child_id: string }>();

	return new Set(results.map((row) => row.child_id));
}
