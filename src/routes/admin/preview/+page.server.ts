import { error } from '@sveltejs/kit';
import { buildDisplayView } from '$lib/server/display/view';
import type { PageServerLoad } from './$types';

/**
 * The same chart the panel is served, built by the same function (design.md
 * D18).
 *
 * This runs again on every nudge from the admin tab, because the preview
 * re-reads rather than accepting a description of what changed (design.md D17).
 * So what is on screen is always a view model the server produced, through the
 * code path `/display` uses.
 */
export const load: PageServerLoad = async ({ platform }) => {
	if (platform === undefined) error(500, 'Worker bindings are unavailable.');

	return buildDisplayView(platform.env.DB, new Date());
};
