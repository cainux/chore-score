<script lang="ts">
	let { children } = $props();
</script>

<!--
	The display route has its own layout, deliberately not the root one.

	The client here is a camera: TRMNL's headless browser loads the page once,
	screenshots it and throws it away. Anything the root layout adds — a favicon
	link, app-wide chrome — is at best an extra request that buys nothing and at
	worst a race the screenshot can lose (design.md D5).
-->
{@render children()}
