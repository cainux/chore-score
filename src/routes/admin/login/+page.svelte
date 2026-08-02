<script lang="ts">
	let { form } = $props();
</script>

<svelte:head>
	<title>Chore chart</title>
	<meta name="viewport" content="width=device-width, initial-scale=1" />
</svelte:head>

<main>
	<h1>Chore chart</h1>

	<form method="POST">
		<label for="password">Password</label>
		<!-- svelte-ignore a11y_autofocus -->
		<input
			id="password"
			name="password"
			type="password"
			autocomplete="current-password"
			autofocus
			required
		/>
		<button type="submit">Sign in</button>
	</form>

	{#if form?.error}
		<p class="error" role="alert">{form.error}</p>
	{/if}
</main>

<style>
	main {
		max-width: 24rem;
		margin: 3rem auto;
		padding: 0 1rem;
		font-family: system-ui, sans-serif;
	}

	form {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	input,
	button {
		font-size: 1rem;
		/* The phone-first minimum touch target. */
		min-height: 44px;
		padding: 0 0.75rem;
	}

	.error {
		color: #b00020;
	}
</style>
