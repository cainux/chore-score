<script lang="ts">
	// Inline SVG, not an image file: nothing on this page may be a separate
	// request the screenshot could lose (design.md D5).
	//
	// A single five-pointed star, filled solid black, used for every earned day
	// without variation — a full week has to be recognisable as a shape at a
	// glance, which it would not be if the sticker changed by day or child.
	//
	// 26px inside a 42px cell (design.md D6), which at ~0.2mm per pixel is about
	// 5mm of star in an 8.6mm square.
	let { size = 26 }: { size?: number } = $props();
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="#000000"
	aria-hidden="true"
	focusable="false"
>
	<path
		d="M12 1.6 15.09 8.4 22.4 9.2 17 14.2 18.5 21.5 12 17.8 5.5 21.5 7 14.2 1.6 9.2 8.91 8.4Z"
	/>
</svg>
