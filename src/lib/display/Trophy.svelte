<script lang="ts">
	import type { TrophyState } from '$lib/chart';

	// The three states differ by fill first and grey level second, and that
	// ordering is load-bearing (design.md D13).
	//
	// Grey level is the first thing viewing distance destroys and the first thing
	// 2-bit conversion mangles. A lost week reading as a won one is the worst
	// misread available on this chart, so that distinction rests on silhouette —
	// solid against hollow — which survives both. Winnable against lost may rest
	// on level alone, because that question is asked deliberately at close range
	// rather than absorbed in passing.
	let { state, size = 26 }: { state: TrophyState; size?: number } = $props();

	const solid = $derived(state === 'won');
	const colour = $derived(state === 'lost' ? '#AAAAAA' : '#555555');

	// Both variants stroke. Dropping the stroke on the solid one and relying on
	// fill alone loses the handles — they are open paths with nothing to fill —
	// which leaves a cup-shaped blob with a base floating under it. The handles
	// are most of what makes this read as a trophy rather than a plant pot.
	const body = $derived(solid ? colour : 'none');
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="none"
	stroke={colour}
	stroke-width="2"
	stroke-linejoin="round"
	stroke-linecap="round"
	aria-hidden="true"
	focusable="false"
>
	<!-- Cup -->
	<path d="M7 3h10v6a5 5 0 0 1-10 0Z" fill={body} />
	<!-- Handles -->
	<path d="M7 4.5H4.5v2a3.5 3.5 0 0 0 3 3.4" />
	<path d="M17 4.5h2.5v2a3.5 3.5 0 0 1-3 3.4" />
	<!-- Stem -->
	<path d="M12 14v3.5" />
	<!-- Base -->
	<path d="M8 21h8l-1-3.5H9Z" fill={body} />
</svg>
