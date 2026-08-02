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
 * The two gates do not overlap, and that is deliberate (design.md D4).
 *
 * An authenticated parent hitting /display without the header is rejected, and
 * the header does not grant admin. They protect different things for different
 * reasons: the header keeps a page that cannot authenticate off the open web,
 * the session keeps write access to the two parents. Letting either stand in
 * for the other would mean the display key — which lives in a third party's
 * plugin configuration and is sent on every poll — could also edit the chart.
 */
export function gateFor(pathname: string): 'display' | 'admin' | 'none' {
	if (pathname === '/display' || pathname.startsWith('/display/')) return 'display';
	if (pathname === '/admin' || pathname.startsWith('/admin/')) return 'admin';
	return 'none';
}
