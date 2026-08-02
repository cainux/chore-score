<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { longDate, shortDate, WEEKDAY_INITIALS } from '$lib/admin/dayLabels';
	import { toBullets } from '$lib/chart';
	import { londonToday } from '$lib/dates';
	import { notifyLive } from '$lib/live';
	import { graphemeCount } from '$lib/names';
	import { BULLETS_COMFORTABLE, NAME_MAX_GRAPHEMES } from '$lib/settings';
	import { SvelteMap } from 'svelte/reactivity';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// SvelteMap, not $state(new Map()). $state deep-proxies plain objects and
	// arrays; a Map's own methods are not reactive, so `.set()` on one would
	// mutate silently and never re-render — leaving an optimistic toggle
	// invisible, which is the whole feature.
	//
	// Optimistic state for day toggles, keyed "childId date". A toggle that fails
	// is removed again, so the control never sits in a state that misrepresents
	// what is stored.
	const optimistic = new SvelteMap<string, boolean>();
	let toggleError = $state<string | null>(null);

	// Draft name and task text per child. Absent means "not touched", which is
	// what distinguishes an unedited field from one edited back to its original.
	const drafts = new SvelteMap<string, { name: string; tasks: string }>();

	function draftFor(child: PageData['children'][number]) {
		return drafts.get(child.id) ?? { name: child.name, tasks: child.tasks };
	}

	function isDirty(child: PageData['children'][number]) {
		const draft = drafts.get(child.id);
		if (draft === undefined) return false;
		return draft.name !== child.name || draft.tasks !== child.tasks;
	}

	const anyDirty = $derived(data.children.some(isDirty));

	function earnedNow(childId: string, date: string, stored: boolean) {
		return optimistic.get(`${childId} ${date}`) ?? stored;
	}

	/**
	 * Re-render when the page comes back on a different day (design.md D14).
	 *
	 * Pinning the date to each control is right at five minutes of drift and
	 * wrong at five days, and phones keep backgrounded tabs alive for a long
	 * time. Reloading also picks up whatever the other parent did.
	 *
	 * Never while a task or name field holds unsaved changes: a reload would
	 * discard the typing the Save button exists to protect.
	 */
	function refreshIfStale() {
		if (anyDirty) return;
		if (londonToday(new Date()) === data.today) return;
		invalidateAll();
	}

	function onPageShow(event: PageTransitionEvent) {
		// `persisted` is the case that matters: an iOS tab restored from the back
		// -forward cache fires this and never fires visibilitychange.
		if (event.persisted) refreshIfStale();
	}
</script>

<svelte:window onpageshow={onPageShow} onvisibilitychange={refreshIfStale} />

<svelte:head>
	<title>Chore chart</title>
	<meta name="viewport" content="width=device-width, initial-scale=1" />
</svelte:head>

<main>
	<!-- The date is the heading, not a caption (design.md D14). -->
	<h1>{longDate(data.today)}</h1>

	{#if toggleError}
		<p class="error" role="alert">{toggleError}</p>
	{/if}

	<section class="today" aria-label="Today">
		{#each data.children as child (child.id)}
			{@const earned = earnedNow(child.id, data.today, child.todayEarned)}
			<form
				method="POST"
				action="?/toggle"
				use:enhance={() => {
					const key = `${child.id} ${data.today}`;
					optimistic.set(key, !earned);
					toggleError = null;
					return async ({ result, update }) => {
						if (result.type === 'failure') {
							optimistic.delete(key);
							toggleError = 'That change did not save. Try again.';
							return;
						}
						// Cleared only once the fresh data has landed. Dropping it first
						// leaves a window where the control falls back to the stale
						// server value, and a second tap inside that window submits the
						// wrong prior state.
						await update({ reset: false });
						optimistic.delete(key);
						// The live preview, if one is open in another tab. After the
						// write is known to have landed and only then: nudging earlier
						// is a race the preview loses, redrawing the old state and then
						// never hearing about the real one (design.md D19).
						notifyLive();
					};
				}}
			>
				<input type="hidden" name="childId" value={child.id} />
				<input type="hidden" name="date" value={data.today} />
				<input type="hidden" name="earned" value={String(earned)} />
				<button type="submit" class="card" class:earned aria-pressed={earned}>
					<span class="card-name">{child.name}</span>
					<span class="card-mark" aria-hidden="true">{earned ? '★' : '○'}</span>
					<span class="card-state">{earned ? 'done' : 'not yet'}</span>
				</button>
			</form>
		{/each}
	</section>

	<h2>Fix a past day</h2>

	<section class="corrections">
		{#each data.children as child (child.id)}
			<article>
				<h3>{child.name}</h3>
				<div class="weekdays" aria-hidden="true">
					<span class="week-name"></span>
					{#each WEEKDAY_INITIALS as initial, i (i)}
						<span class="slot">{initial}</span>
					{/each}
				</div>
				{#each child.weeks as week, w (w)}
					<div class="week">
						<span class="week-name">{w === 0 ? 'this' : 'last'}</span>
						{#each week as day (day.date)}
							{@const earned = earnedNow(child.id, day.date, day.earned)}
							<form
								method="POST"
								action="?/toggle"
								class="slot"
								use:enhance={() => {
									const key = `${child.id} ${day.date}`;
									optimistic.set(key, !earned);
									toggleError = null;
									return async ({ result, update }) => {
										if (result.type === 'failure') {
											optimistic.delete(key);
											toggleError = 'That change did not save. Try again.';
											return;
										}
										// See the today card above: clear after, not before, and
										// nudge the preview only once the write has landed.
										await update({ reset: false });
										optimistic.delete(key);
										notifyLive();
									};
								}}
							>
								<input type="hidden" name="childId" value={child.id} />
								<input type="hidden" name="date" value={day.date} />
								<input type="hidden" name="earned" value={String(earned)} />
								<button
									type="submit"
									class="day"
									class:earned
									class:future={day.future}
									disabled={day.future}
									aria-pressed={earned}
									aria-label="{child.name}, {shortDate(day.date)}"
								>
									<span aria-hidden="true">{earned ? '★' : day.future ? '·' : ''}</span>
								</button>
							</form>
						{/each}
					</div>
				{/each}
			</article>
		{/each}
	</section>

	<h2>Names and tasks</h2>

	<section class="editors">
		{#each data.children as child (child.id)}
			{@const draft = draftFor(child)}
			{@const bullets = toBullets(draft.tasks).length}
			{@const nameLength = graphemeCount(draft.name)}
			<form
				method="POST"
				action="?/save"
				use:enhance={() => {
					return async ({ result, update }) => {
						const saved = result.type !== 'failure';
						if (saved) drafts.delete(child.id);
						await update({ reset: false });
						// Only a save that actually stored something reaches the live
						// preview. A refused name leaves the preview showing what is
						// stored, which is what it is for (design.md D19).
						if (saved) notifyLive();
					};
				}}
			>
				<input type="hidden" name="childId" value={child.id} />

				<label for="name-{child.id}">Name</label>
				<input
					id="name-{child.id}"
					name="name"
					type="text"
					value={draft.name}
					oninput={(e) => drafts.set(child.id, { ...draft, name: e.currentTarget.value })}
				/>
				{#if nameLength > NAME_MAX_GRAPHEMES}
					<p class="warn">
						That name is {nameLength} characters. The chart fits {NAME_MAX_GRAPHEMES}.
					</p>
				{/if}

				<label for="tasks-{child.id}">Tasks</label>
				<p class="hint">One per line. <code>*italic*</code>, <code>**bold**</code>.</p>
				<textarea
					id="tasks-{child.id}"
					name="tasks"
					rows={Math.max(3, draft.tasks.split('\n').length + 1)}
					value={draft.tasks}
					oninput={(e) => drafts.set(child.id, { ...draft, tasks: e.currentTarget.value })}
				></textarea>

				{#if bullets > BULLETS_COMFORTABLE}
					<!-- Warns, never blocks: a parent may knowingly keep a longer list
					     and accept that the surplus is clipped on the panel (D12). -->
					<!-- prettier-ignore -->
					<p class="warn">{bullets} lines — the display fits about {BULLETS_COMFORTABLE}, and fewer when a line is long enough to wrap onto two, so the rest will not appear on the chart. You can still save it.</p>
				{/if}

				{#if form?.error && form?.childId === child.id}
					<p class="error" role="alert">{form.error}</p>
				{/if}

				{#if isDirty(child)}
					<p class="unsaved">Unsaved changes</p>
					<button type="submit">Save {child.name}</button>
				{/if}
			</form>
		{/each}
	</section>

	<!--
		Two previews, and the words "static" and "live" are the whole point of the
		labels: "preview" and "preview" tells a parent nothing about which to pick.

		The static one is the display route itself — exactly what the panel
		captures, rendered once, with no script. It has no viewport meta of its own
		— it is a fixed 800x480 canvas with exactly one real viewer (design.md D6)
		— so a phone scales the whole thing down to fit, which is what makes it
		previewable at all.

		The live one follows this page as it is edited, and its reach is one
		browser: the nudge travels by BroadcastChannel, which is same-origin and
		same-tab-group, so a tablet in another room will not follow along (design.md
		D21). It shows saved state only.

		Both open in a new tab so this page keeps its scroll position and any
		unsaved text.
	-->
	<div class="preview">
		<p>
			<a href={resolve('/display')} target="_blank" rel="noopener">Static preview</a>
			<span class="note">exactly what the panel captures, as things stand now</span>
		</p>
		<p>
			<a href={resolve('/admin/preview')} target="_blank" rel="noopener">Live preview</a>
			<span class="note">follows this page as you save, in this browser</span>
		</p>
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
		/* A single scrolling column, designed for a phone rather than adapted to
		   one (design.md D8). */
		max-width: 26rem;
		margin: 0 auto;
		padding: 1rem;
		/* Nothing here may require sideways movement. */
		overflow-x: hidden;
	}

	h1 {
		font-size: 1.4rem;
		margin: 0 0 1rem;
	}

	h2 {
		font-size: 1rem;
		font-weight: 600;
		color: #555555;
		margin: 2rem 0 0.75rem;
		border-top: 1px solid #dddddd;
		padding-top: 0.75rem;
	}

	h3 {
		font-size: 1rem;
		margin: 0 0 0.25rem;
	}

	/* ---- Today ---------------------------------------------------------- */

	.today {
		display: flex;
		gap: 0.75rem;
	}

	.today form {
		flex: 1 1 0;
	}

	.card {
		width: 100%;
		/* Both cards fit above the fold at a 390px viewport, and marking today is
		   one tap per child. */
		height: 170px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		border: 2px solid #111111;
		border-radius: 12px;
		background: #ffffff;
		font: inherit;
		cursor: pointer;
	}

	.card.earned {
		background: #111111;
		color: #ffffff;
	}

	.card-name {
		font-size: 1.1rem;
		font-weight: 700;
	}

	.card-mark {
		font-size: 2.5rem;
		line-height: 1;
	}

	.card-state {
		font-size: 0.9rem;
	}

	/* ---- Correction grid ------------------------------------------------- */

	.corrections article {
		margin-bottom: 1.25rem;
	}

	.weekdays,
	.week {
		display: flex;
		align-items: center;
		gap: 2px;
	}

	.week-name {
		width: 2.6rem;
		flex: 0 0 2.6rem;
		font-size: 0.8rem;
		color: #555555;
	}

	.weekdays .slot {
		font-size: 0.8rem;
		color: #555555;
		text-align: center;
	}

	.slot {
		flex: 1 1 0;
		/* Weeks stack rather than sitting side by side: 14 targets across 390px
		   would be 24px each, well under the minimum (design.md D8). */
		min-width: 44px;
	}

	.day {
		width: 100%;
		/* The minimum touch target, exactly. */
		min-width: 44px;
		min-height: 44px;
		border: 1px solid #999999;
		background: #ffffff;
		font-size: 1.2rem;
		line-height: 1;
		cursor: pointer;
	}

	.day.earned {
		background: #111111;
		color: #ffffff;
	}

	.day.future {
		color: #aaaaaa;
		background: #f4f4f4;
		cursor: default;
	}

	/* ---- Editors --------------------------------------------------------- */

	.editors form {
		margin-bottom: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	label {
		font-size: 0.85rem;
		color: #555555;
	}

	input[type='text'],
	textarea {
		width: 100%;
		box-sizing: border-box;
		font: inherit;
		padding: 0.5rem;
		min-height: 44px;
		border: 1px solid #999999;
		border-radius: 6px;
	}

	button[type='submit']:not(.card):not(.day) {
		min-height: 44px;
		font: inherit;
		border: 1px solid #111111;
		border-radius: 6px;
		background: #111111;
		color: #ffffff;
		cursor: pointer;
	}

	.warn {
		margin: 0;
		font-size: 0.85rem;
		color: #8a6100;
	}

	.hint {
		margin: -0.2rem 0 0;
		font-size: 0.8rem;
		color: #555555;
	}

	.hint code {
		font-size: 0.85rem;
	}

	.unsaved {
		margin: 0;
		font-size: 0.85rem;
		color: #555555;
	}

	.error {
		margin: 0;
		font-size: 0.9rem;
		color: #b00020;
	}

	.preview {
		margin: 2rem 0 3rem;
		border-top: 1px solid #dddddd;
		padding-top: 1rem;
	}

	.preview p {
		margin: 0;
		display: flex;
		flex-direction: column;
	}

	.preview a {
		display: inline-flex;
		align-items: center;
		/* The same minimum touch target as everything else on this page. */
		min-height: 44px;
		color: #111111;
	}

	.preview .note {
		/* Which link to follow, said once, rather than left to be discovered by
		   following the wrong one. */
		margin-top: -0.4rem;
		font-size: 0.85rem;
		color: #555555;
	}
</style>
