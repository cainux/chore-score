<script lang="ts">
	// Drawn only for a week that was actually won, so there is one variant and no
	// state prop (design.md D13).
	//
	// Solid black, the same ink as the star. It was `#555` on the first panel
	// build, and next to a row of black stars it read as the faded one — a week
	// where every day was earned looking weaker than the days that earned it.
	// Grey is also the first thing 2-bit conversion mangles, and this is the
	// mark the chart most needs to survive being glanced at.
	let { size = 26 }: { size?: number } = $props();

	// Filled *and* stroked. Fill alone loses the handles — they are open paths
	// with nothing to fill — which leaves a cup-shaped blob with a base floating
	// under it. The handles are most of what makes this read as a trophy rather
	// than a plant pot.
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="none"
	stroke="#000000"
	stroke-width="2"
	stroke-linejoin="round"
	stroke-linecap="round"
	aria-hidden="true"
	focusable="false"
>
	<!-- Cup -->
	<path d="M7 3h10v6a5 5 0 0 1-10 0Z" fill="#000000" />
	<!-- Handles -->
	<path d="M7 4.5H4.5v2a3.5 3.5 0 0 0 3 3.4" />
	<path d="M17 4.5h2.5v2a3.5 3.5 0 0 1-3 3.4" />
	<!-- Stem -->
	<path d="M12 14v3.5" />
	<!-- Base -->
	<path d="M8 21h8l-1-3.5H9Z" fill="#000000" />
</svg>
