<script lang="ts">
	import Panel from '$lib/display/Panel.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Chore chart</title>
	<!--
		For previewing on a phone, and inert for the panel.

		The screenshotter renders at an 800x480 desktop viewport, where viewport
		meta is ignored outright — so this cannot change what TRMNL captures. A
		mobile browser does honour it, and `width=800` makes it lay the fixed
		canvas out at its true width and scale the whole thing down to the screen.
		Without it a phone lays out at its own width and crops to the left third,
		hiding the second week, one trophy and the render stamp.

		Note this is a width, not `device-width`: the canvas stays exactly 800x480
		(design.md D6). Nothing here is responsive.
	-->
	<meta name="viewport" content="width=800" />
</svelte:head>

<Panel view={data} />

<style>
	:global(html),
	:global(body) {
		margin: 0;
		padding: 0;
		background: #ffffff;
	}
</style>
