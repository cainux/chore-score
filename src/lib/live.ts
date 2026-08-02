import { browser } from '$app/environment';

/**
 * The cross-tab nudge that keeps the live preview following the admin page.
 *
 * The name is written once, here, because two tabs disagreeing about it fails
 * silently: the preview simply never updates, and a preview that has quietly
 * stopped following looks exactly like one that is up to date.
 *
 * `BroadcastChannel` does not exist during SSR, and the preview page is
 * server-rendered before it hydrates — so nothing in this module touches the
 * constructor at import time, and both entry points are inert outside the
 * browser (design.md D17, Risks).
 */
const CHANNEL = 'chore-score';

/**
 * A channel to listen on, or `null` when there is no browser to listen in.
 *
 * The caller owns it and must `close()` it on teardown.
 */
export function openLiveChannel(): BroadcastChannel | null {
	if (!browser) return null;
	return new BroadcastChannel(CHANNEL);
}

/**
 * The posting side, opened on first use and kept for the life of the page.
 *
 * Lazily, so that merely importing this module during SSR touches nothing; and
 * once, so a nudge is never posted through a channel that is being closed in
 * the same breath.
 */
let poster: BroadcastChannel | null = null;

/**
 * Tells every other tab on this origin that the stored data has changed.
 *
 * The message carries nothing. The receiver re-reads from the server rather
 * than accepting a description of the change, so the preview can only ever show
 * a view model the server produced (design.md D17).
 *
 * `BroadcastChannel` does not deliver to the context that posted, so the admin
 * page cannot nudge itself into a reload and discard its own drafts.
 */
export function notifyLive(): void {
	if (!browser) return;
	poster ??= new BroadcastChannel(CHANNEL);
	poster.postMessage(null);
}
