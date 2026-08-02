<script lang="ts">
	import '$lib/display/fonts.css';
	import { DISPLAY_FONT_STACK } from '$lib/settings';
</script>

<div class="panel" style:font-family={DISPLAY_FONT_STACK}>
	<p class="text">Chore chart</p>
	<p class="emoji">🎂 🎈 ⭐</p>
</div>

<style>
	:global(html),
	:global(body) {
		margin: 0;
		padding: 0;
		background: #ffffff;
	}

	/* Not responsive, by design: one viewer, one fixed canvas (design.md D6). */
	.panel {
		position: relative;
		box-sizing: border-box;
		width: 800px;
		height: 480px;
		padding: 16px;
		background: #ffffff;
		color: #000000;
		overflow: hidden;
	}

	.text {
		font-size: 24px;
		font-weight: 700;
	}

	.emoji {
		font-size: 24px;
	}
</style>
