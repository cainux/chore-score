# Deploying

Everything below is for the **preview** deployment, which is task 8.1 in
`openspec/changes/add-chore-chart/tasks.md`. Promoting to production is 8.5, and
deliberately comes after the chart has been checked on the physical panel.

Run these yourself — they publish to a real Cloudflare account and set live
secrets, so nothing here is automated.

## Once, before the first deploy

### 1. Generate the three secrets

None of these should be typed by hand except the admin password, which two
people have to be able to remember and enter on a phone.

```sh
# Admin password: pick something you and the other parent will actually type.
# It is the only one a human enters, so favour memorable over random.

# Display key: never typed by a person — it goes into TRMNL's plugin config
# once and is sent as a header on every poll.
openssl rand -base64 32

# Session signing key: never typed either. Rotating it signs everyone out,
# which is also the way to revoke a session if a phone goes missing.
openssl rand -base64 32
```

### 2. Set them as Worker secrets

```sh
pnpm exec wrangler secret put ADMIN_PASSWORD
pnpm exec wrangler secret put DISPLAY_KEY
pnpm exec wrangler secret put SESSION_SECRET
```

Each prompts for the value on stdin, so nothing lands in your shell history.

Confirm all three exist — the names are listed, the values are not:

```sh
pnpm exec wrangler secret list
```

If any is missing, the app fails closed: `/display` and `/admin` return a 500
naming the absent secret rather than serving anything. That is deliberate, and
the fastest way to diagnose a half-configured deployment.

### 3. Apply the migrations to the remote database

The local D1 has had these since development; the remote one has neither.

```sh
pnpm exec wrangler d1 migrations apply chore-score --remote
```

This creates `children`, `day_marks` and `task_lists`, and seeds the two
children as **Alice** and **Ben**. Those are placeholders — rename them on the
admin page once it is up, which is what the name editor is for. The ids never
change, so renaming keeps every day mark and task list attached.

Check what is pending first — this is read-only:

```sh
pnpm exec wrangler d1 migrations list chore-score --remote
```

Then verify afterwards:

```sh
pnpm exec wrangler d1 execute chore-score --remote \
  --command "SELECT id, name, sort_order FROM children ORDER BY sort_order"
```

> **If you get `code: 7403`, "the given account is not authorized"** — try it
> again before doing anything else. D1's query endpoint returned this
> intermittently while this runbook was being written, on a token that has
> `d1 (write)` and that worked seconds later. `wrangler d1 info chore-score`
> uses a different endpoint, so it succeeding does not rule this out. If it
> persists rather than clearing on a retry, re-run `wrangler login` to refresh
> the OAuth grant.

## Every deploy

```sh
pnpm check && pnpm lint && pnpm test   # the gates, all three lanes plus e2e
pnpm run deploy
```

`deploy` builds first, because `wrangler.jsonc` points `main` at the adapter's
output and a stale build would deploy silently.

Wrangler prints the Worker URL when it finishes. That URL is what task 8.2 puts
into the TRMNL Screenshot plugin.

## Checking the deployment

Substitute your Worker URL and the display key you set.

```sh
WORKER_URL=https://chore-score.<your-subdomain>.workers.dev
DISPLAY_KEY=<the value you set>

# The display route rejects anything without the header.
curl -s -o /dev/null -w '%{http_code}\n' "$WORKER_URL/display"
# expect 401

# And serves the chart with it.
curl -s -o /dev/null -w '%{http_code}\n' \
  -H "x-display-key: $DISPLAY_KEY" "$WORKER_URL/display"
# expect 200

# It must never be cached, or TRMNL screenshots yesterday's chart.
curl -sI -H "x-display-key: $DISPLAY_KEY" "$WORKER_URL/display" | grep -i cache-control
# expect: cache-control: no-store

# Admin redirects to the password prompt, and the display key does not help.
curl -s -o /dev/null -w '%{http_code}\n' \
  -H "x-display-key: $DISPLAY_KEY" "$WORKER_URL/admin"
# expect 303, to /admin/login
```

Then open `$WORKER_URL/admin` on a phone, sign in, and confirm the today cards
are both reachable without scrolling.

## Setting up TRMNL (task 8.2)

In the TRMNL dashboard, add a **Screenshot** plugin pointing at:

```
<WORKER_URL>/display
```

with a custom header:

```
X-Display-Key: <the DISPLAY_KEY you set>
```

If the plan in use turns out not to support custom headers, the fallback in
design.md is an unguessable path segment instead — weaker, but adequate for a
children's chore chart.

Leave the refresh interval alone for now. It is settled in task 8.5, together
with the render stamp: if the panel sleeps overnight, a healthy chart shows last
night's time every morning, and a freshness signal that looks stale every
morning stops being read.

## What to expect on the first render

Both children will show a **faint trophy for last week**, because there is no
data for it. That is correct, not a fault, and it clears itself within seven
days.

## Rolling back

```sh
pnpm exec wrangler rollback
```

D1 is unaffected by a rollback. The only stateful change here is the schema,
which is created once and not altered. If the panel ends up showing nothing, the
wall falls back to what it was before: a piece of paper.
