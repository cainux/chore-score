<script lang="ts">
	import '$lib/display/fonts.css';
	import Star from '$lib/display/Star.svelte';
	import Trophy from '$lib/display/Trophy.svelte';
	import { renderStamp, WEEKDAY_INITIALS } from '$lib/display/labels';
	import type { DisplayView } from '$lib/display/view';
	import { inlineSegments } from '$lib/markdown';
	import { DISPLAY_FONT_STACK } from '$lib/settings';

	/**
	 * The chart itself: the 800x480 canvas and nothing around it.
	 *
	 * Shared by `/display`, which the panel screenshots, and `/admin/preview`,
	 * which a parent watches while editing. Both hand it the same view model from
	 * the same builder, which is what makes a preview that disagrees with the wall
	 * impossible rather than merely unlikely (design.md D18).
	 *
	 * The `fonts.css` import lives here so the component carries its own
	 * dependency. That is also the only way the preview's text can wrap where the
	 * panel's does.
	 *
	 * What belongs to the route rather than to the canvas — the `html`/`body`
	 * reset, the page title, the viewport meta — deliberately stays outside.
	 */
	let { view }: { view: DisplayView } = $props();

	const stamp = $derived(renderStamp(view.today, view.time));
</script>

<!--
	Fixed 800x480, expressed in absolute pixels (design.md D6). Not responsive,
	because it has exactly one viewer and a fluid layout on a single fixed
	viewport only adds ways for the chart to be subtly wrong.
-->
<div class="panel" style:font-family={DISPLAY_FONT_STACK}>
	<div class="tasks">
		{#each view.rows as row (row.id)}
			<section class="task-block">
				<h2>{row.name}</h2>
				<ul>
					{#each row.bullets as bullet, i (i)}
						<!--
							The segments must sit flush against each other. Whitespace
							between them in this template becomes whitespace on the panel,
							which would open `**bold**text` up into `bold text`.
						-->
						<!-- prettier-ignore -->
						<li>{#each inlineSegments(bullet) as part, p (p)}<span class:bold={part.bold} class:italic={part.italic}>{part.text}</span>{/each}</li>
					{/each}
				</ul>
			</section>
		{/each}
	</div>

	<hr />

	<div class="grid">
		{#each view.weeks as label, week (label)}
			<div class="week" class:first={week === 0}>
				<div class="week-label">{label}</div>
				<div class="weekdays">
					{#each WEEKDAY_INITIALS as initial, i (i)}
						<span class="col">{initial}</span>
					{/each}
					<span class="trophy-col"></span>
				</div>

				{#each view.rows as row (row.id)}
					<div class="row">
						{#if week === 0}
							<span class="name">{row.name}</span>
						{/if}
						{#each row.weeks[week].squares as square (square.date)}
							<span class="col cell">
								{#if square.state === 'earned'}
									<Star />
								{:else if square.state === 'not-yet'}
									<span class="dot"></span>
								{/if}
							</span>
						{/each}
						<!--
							The column is always here; the trophy is not. It is drawn only
							for a week that was won, and the reserved width is what keeps
							the two week blocks aligned when it is not (design.md D13).
						-->
						<span class="trophy-col">
							{#if row.weeks[week].trophy}
								<Trophy />
							{/if}
						</span>
					</div>
				{/each}
			</div>
		{/each}
	</div>

	<!--
		Absolutely positioned against the bottom edge, in a band reserved rather
		than shared. The task blocks grow into the layout's slack, so a stamp that
		merely sat below them would be pushed off the canvas by a long enough task
		list — losing the freshness signal at exactly the moment the chart is most
		likely to be wrong (design.md D6, D10).
	-->
	<div class="stamp">{stamp}</div>
</div>

<style>
	.panel {
		position: relative;
		box-sizing: border-box;
		width: 800px;
		height: 480px;
		padding: 16px;
		background: #ffffff;
		color: #000000;
		/* Nothing may spill onto a canvas that cannot scroll. */
		overflow: hidden;
	}

	/* ---- Task blocks ---------------------------------------------------- */

	.tasks {
		display: flex;
		gap: 16px;
		/* Capped so an over-long list cannot displace the grid below it. Surplus
		   bullets are already dropped server-side; this is the backstop, and it
		   matters more now that a long bullet wraps rather than being cut off. */
		height: 230px;
		overflow: hidden;
	}

	.task-block {
		width: 376px;
		overflow: hidden;
	}

	.task-block h2 {
		margin: 0 0 6px;
		font-size: 24px;
		line-height: 24px;
		font-weight: 700;
		/* A long name must not reflow the fixed column. */
		white-space: nowrap;
		overflow: hidden;
	}

	/* Still a list in the markup, but drawn without markers or indent. On the
	   panel the bullet glyphs added a column of dots that read as clutter next to
	   the star grid below, and cost 22px of the 376px column — which a wrapping
	   bullet spends on a second line (design.md D12). Each task simply gets its
	   own line, which is all the marker was conveying. */
	.task-block ul {
		margin: 0;
		padding-left: 0;
		list-style: none;
		/* Exactly 8 lines at the line height below. A whole number of them, so a
		   clipped list ends on a line that is fully drawn rather than on one
		   sliced through the middle. */
		height: 200px;
		overflow: hidden;
	}

	.task-block li {
		font-size: 20px;
		line-height: 25px;
		/* Wrapped, not cut off: a bullet ending in "(thumb cr…" tells a child
		   less than nothing. Type size is still fixed — surplus is clipped rather
		   than shrunk, because shrinking costs legibility on every bullet to fit
		   one more. */
		overflow-wrap: anywhere;
	}

	/* Inline emphasis, the only markup the display reads ($lib/markdown). */
	.bold {
		font-weight: 700;
	}

	.italic {
		font-style: italic;
	}

	hr {
		margin: 6px 0 8px;
		border: none;
		border-top: 1px solid #aaaaaa;
	}

	/* ---- Two-week grid --------------------------------------------------- */

	.grid {
		display: flex;
		gap: 20px;
	}

	.week-label {
		height: 20px;
		font-size: 14px;
		font-weight: 700;
		color: #555555;
		letter-spacing: 0.04em;
	}

	.weekdays,
	.row {
		display: flex;
		align-items: center;
	}

	.weekdays {
		height: 22px;
		font-size: 13px;
		color: #555555;
	}

	.row {
		height: 72px;
	}

	/* The name gutter belongs to the first week only; the second week's columns
	   sit flush, which is what keeps both blocks the same width. */
	.week.first .week-label,
	.week.first .weekdays {
		padding-left: 80px;
	}

	.name {
		width: 80px;
		flex: 0 0 80px;
		font-size: 16px;
		font-weight: 700;
		white-space: nowrap;
		overflow: hidden;
	}

	.col {
		width: 42px;
		flex: 0 0 42px;
		text-align: center;
	}

	.cell {
		height: 42px;
		display: grid;
		place-items: center;
		/* Solid rule at the panel's light grey — no hairlines to dither. */
		border: 1px solid #aaaaaa;
		box-sizing: border-box;
	}

	.trophy-col {
		width: 32px;
		flex: 0 0 32px;
		display: grid;
		place-items: center;
	}

	/* A future date: distinct from a missed day's blank white square, and never
	   mistakable for a sticker. */
	.dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: #aaaaaa;
	}

	/* ---- Render stamp ---------------------------------------------------- */

	/* `#555`, not the `#AAA` this started at. On the panel `#AAA` dithered into a
	   scatter of dots that read as a smudge rather than as text — and an
	   illegible freshness signal is no freshness signal at all (design.md D10).
	   Still quiet enough not to compete: it is small, grey, and in a corner. */
	.stamp {
		position: absolute;
		right: 16px;
		bottom: 8px;
		height: 16px;
		font-size: 14px;
		line-height: 16px;
		color: #555555;
	}
</style>
