import { secretsMatch } from './compare';
import { readSession, SESSION_COOKIE } from './session';

/** The header the TRMNL Screenshot plugin is configured to send. */
export const DISPLAY_KEY_HEADER = 'x-display-key';

/**
 * Does this request carry the display key?
 *
 * The panel cannot log in — there is no interactive auth possible on a device
 * that is a camera pointed at a URL — so the display route is gated on a shared
 * secret in a header instead of a session.
 */
export function displayKeyAccepted(request: Request, displayKey: string): boolean {
	const presented = request.headers.get(DISPLAY_KEY_HEADER);
	if (presented === null) return false;
	return secretsMatch(presented, displayKey);
}

/** Does this request carry a valid admin session? */
export async function adminSessionAccepted(
	cookies: { get(name: string): string | undefined },
	sessionSecret: string,
	now: Date
): Promise<boolean> {
	return (await readSession(cookies.get(SESSION_COOKIE), sessionSecret, now)) !== null;
}

/**
 * The two gates are asymmetric, and the asymmetry is the point (design.md D4).
 *
 * A signed-in parent may open /display without the header, so the wall chart can
 * be previewed from a phone. That grants nothing: the session already carries
 * read and write access to every name, task and mark on that page, so a
 * read-only rendering of the same data is not a new capability.
 *
 * The display key does **not** work in the other direction and must never start
 * to. It lives in a third party's plugin configuration and goes out on every
 * poll, so treating it as proof of anything beyond "may read the chart" would
 * turn a widely-transmitted value into a way to edit the chart.
 */
export function gateFor(pathname: string): 'display' | 'admin' | 'none' {
	if (pathname === '/display' || pathname.startsWith('/display/')) return 'display';
	if (pathname === '/admin' || pathname.startsWith('/admin/')) return 'admin';
	return 'none';
}
