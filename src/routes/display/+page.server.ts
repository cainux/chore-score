import { error } from '@sveltejs/kit';
import { buildDisplayView } from '$lib/server/display/view';
import type { PageServerLoad } from './$types';

/**
 * Everything the page needs, resolved on the server.
 *
 * The client here is a camera: it loads the page once, screenshots it and
 * throws it away, so anything that would render after the response completes
 * does not exist (design.md D5). There is no client-side fetching to be done.
 *
 * The chart itself is built by `buildDisplayView`, shared with `/admin/preview`
 * (design.md D18). What stays here is the binding guard, which is route-level.
 */
export const load: PageServerLoad = async ({ platform }) => {
	if (platform === undefined) error(500, 'Worker bindings are unavailable.');

	return buildDisplayView(platform.env.DB, new Date());
};
