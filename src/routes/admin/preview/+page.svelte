<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import Panel from '$lib/display/Panel.svelte';
	import { openLiveChannel } from '$lib/live';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// The canvas is 800x480 and stays 800x480 (design.md D6, D20). What varies is
	// how much of the window there is to put it in.
	const WIDTH = 800;
	const HEIGHT = 480;
	// Room for the page's own margins, so the canvas is not flush to the edge.
	const MARGIN = 32;

	// 800 until the browser says otherwise, which is also what the server renders
	// with — a desktop is the case this exists for, and its natural scale is 1.
	let windowWidth = $state(WIDTH + MARGIN);

	const scale = $derived(Math.min(1, (windowWidth - MARGIN) / WIDTH));

	/**
	 * Follow the admin tab (design.md D17).
	 *
	 * The message carries nothing, so this re-runs the server load rather than
	 * patching anything locally. `$effect` runs only in the browser, and
	 * `openLiveChannel` refuses outside it as well — `BroadcastChannel` does not
	 * exist while this page is being server-rendered.
	 *
	 * Torn down on unmount, so a channel is not left listening for a page that
	 * has gone.
	 */
	$effect(() => {
		const channel = openLiveChannel();
		if (channel === null) return;

		const nudged = () => {
			invalidateAll();
		};
		channel.addEventListener('message', nudged);

		return () => {
			channel.removeEventListener('message', nudged);
			channel.close();
		};
	});
</script>

<svelte:window bind:innerWidth={windowWidth} />

<svelte:head>
	<title>Live preview</title>
	<meta name="viewport" content="width=device-width, initial-scale=1" />
</svelte:head>

<main>
	<h1>Live preview</h1>
	<p class="hint">
		The wall chart as it stands now, following the admin page as you edit it. Saved changes only,
		and only from this browser.
	</p>

	<!--
		Scaled with a transform, never made responsive (design.md D20). `transform`
		applies after layout, so the chart still lays out at its true 800px and
		text wraps and clips exactly where the panel wraps and clips it — which is
		the one thing hardest to judge from the editor and the main reason to look
		at a preview at all.

		The wrapper is sized to the scaled result because a transform does not
		change the space an element occupies; without it a shrunken canvas would
		still reserve the full 800x480 and leave a hole underneath.
	-->
	<div class="fit" style:width="{WIDTH * scale}px" style:height="{HEIGHT * scale}px">
		<div class="canvas" style:transform="scale({scale})">
			<Panel view={data} />
		</div>
	</div>
</main>

<style>
	:global(body) {
		margin: 0;
		background: #ffffff;
		color: #111111;
		font-family: system-ui, sans-serif;
	}

	main {
		padding: 1rem;
	}

	h1 {
		font-size: 1.1rem;
		margin: 0 0 0.25rem;
	}

	.hint {
		margin: 0 0 1rem;
		font-size: 0.85rem;
		color: #555555;
	}

	.fit {
		overflow: hidden;
	}

	.canvas {
		/* Scaling from the top left, so the canvas stays anchored where the
		   wrapper puts it rather than drifting as the scale changes. */
		transform-origin: top left;
		/* A border, because the panel's own white edge is the same white as the
		   page and the chart would otherwise have no visible extent. */
		width: 800px;
		height: 480px;
		outline: 1px solid #dddddd;
	}
</style>
