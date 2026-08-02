/**
 * Compares two secrets without leaking the correct one through timing.
 *
 * A plain `===` returns as soon as it finds a differing byte, so a wrong value
 * sharing a longer prefix with the real one takes measurably longer to reject.
 * Repeated over enough requests that recovers the secret a character at a time.
 *
 * Lengths are compared first and openly, because the length is not the secret
 * and a variable-length XOR would leak it anyway.
 */
export function secretsMatch(submitted: string, expected: string): boolean {
	const a = new TextEncoder().encode(submitted);
	const b = new TextEncoder().encode(expected);
	if (a.length !== b.length) return false;

	// Accumulate every difference rather than returning on the first, so the
	// work done is the same whichever byte differs.
	let difference = 0;
	for (let i = 0; i < a.length; i++) difference |= a[i] ^ b[i];
	return difference === 0;
}
