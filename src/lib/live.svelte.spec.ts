import { describe, expect, it } from 'vitest';
import { notifyLive, openLiveChannel } from './live';

// Real Chromium (the `client` project), because `BroadcastChannel` is the thing
// under test and node's implementation is a different one.

/** Resolves with the message data, or rejects if none arrives. */
function nextMessage(channel: BroadcastChannel, ms = 500): Promise<unknown> {
	return new Promise((resolve, reject) => {
		const timer = setTimeout(() => reject(new Error('no message within the timeout')), ms);
		channel.addEventListener(
			'message',
			(event) => {
				clearTimeout(timer);
				resolve(event.data);
			},
			{ once: true }
		);
	});
}

/** Resolves `true` if nothing arrives within the window. */
function silentFor(channel: BroadcastChannel, ms = 200): Promise<boolean> {
	return new Promise((resolve) => {
		const heard = () => resolve(false);
		channel.addEventListener('message', heard, { once: true });
		setTimeout(() => {
			channel.removeEventListener('message', heard);
			resolve(true);
		}, ms);
	});
}

describe('the live channel', () => {
	it('delivers a nudge to a listener on the same name', async () => {
		// The name is the whole contract between the two tabs, and it is written
		// once so they cannot disagree about it. This is what proves the notifying
		// half and the listening half agree.
		const listener = openLiveChannel()!;
		try {
			const arrived = nextMessage(listener);
			notifyLive();
			await expect(arrived).resolves.toBeNull();
		} finally {
			listener.close();
		}
	});

	it('carries no payload, because the receiver re-reads instead', async () => {
		// D17: a message describing the change would be a second way for the chart
		// to be computed, and the one that could go wrong invisibly.
		const listener = openLiveChannel()!;
		try {
			const arrived = nextMessage(listener);
			notifyLive();
			expect(await arrived).toBeNull();
		} finally {
			listener.close();
		}
	});

	it('does not deliver back to the channel that posted', async () => {
		// The platform property D19 leans on: the admin tab cannot nudge itself
		// into a reload and throw away the draft text the Save button exists to
		// protect. Posted through a channel this test holds, so it can watch the
		// poster as well as the listener.
		const poster = openLiveChannel()!;
		const listener = openLiveChannel()!;
		try {
			const posterHeard = silentFor(poster);
			const listenerHeard = nextMessage(listener);
			poster.postMessage(null);

			await expect(listenerHeard).resolves.toBeNull();
			expect(await posterHeard).toBe(true);
		} finally {
			poster.close();
			listener.close();
		}
	});
});
