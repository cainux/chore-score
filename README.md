# chore-score

A chore chart for two children, rendered onto a [TRMNL](https://usetrmnl.com/) OG
e-ink panel on a kitchen wall, and edited by their parents from a phone.

A paper chart on the fridge works but goes stale and gets lost. The point here is
ambient visibility: the chart lives on the wall the whole family walks past.
Tracking is a side effect, not the goal.

```
┌ 800 x 480 ───────────────────────────────────────────────────────────┐
│  ALICE                         BEN                                   │
│  • Piano 15 mins daily         • Piano 10 mins daily                 │
│  • Reading log signed          • Spellings                           │
│  ──────────────────────────────────────────────────────────────────  │
│        20–26 JUL                      27 JUL–2 AUG                   │
│        M  T  W  T  F  S  S            M  T  W  T  F  S  S            │
│  Alice ★  ★  ★  ★  ★  ★  ★  ▼   Alice ★  ★  ★  ·  ·  ·  ▽           │
│  Ben   ★     ★  ★  ★     ★  ▫   Ben   ★  ★     ·  ·  ·  ▫           │
│                                        updated Sat 2 Aug 20:14       │
└──────────────────────────────────────────────────────────────────────┘
```

A day is all-or-nothing: one sticker means "did everything expected of them
today", judged by a parent. Seven out of seven earns a weekly trophy, which shows
as won, still winnable, or lost, so the goal is visible during the week rather
than only once it is decided.

## How it is shaped

Two routes with almost nothing in common, and deliberately no shared UI layer.

**`GET /display`** is server-rendered for a client that is really a camera:
TRMNL's headless browser loads the page once, screenshots it, and throws it away.
Anything that renders after the screenshot fires does not exist. So the layout is
fixed 800×480 absolute pixels, the icons are inline SVG, the fonts are bundled
and self-hosted, there is no client-side rendering at all, and the response is
`no-store`.

**`/admin`** is a single scrolling column designed for one thumb in a kitchen.
Mutations are SvelteKit form actions that work without JavaScript, with
`use:enhance` layering optimistic toggling on top.

Storage is three tables in D1. `day_marks` has one row per earned day and no
boolean column — "not earned" is the absence of a row, which makes marking
idempotent and clearing residue-free. The weekly trophy is derived, never stored.

Two details that are easy to get wrong and are worth knowing about before
changing anything:

- **All dates are UTC**, and exactly one function in the codebase is allowed to
  name `Europe/London`. A test asserts that it stays exactly one, and a lint rule
  rejects local-time accessors.
- **A day mark control submits the date it was rendered for.** The server applies
  that date rather than re-deriving today, so a parent ticking off "today" at
  00:20 records the day they were looking at.

`CLAUDE.md` covers the repository conventions; `openspec/` holds the full
specification and the reasoning behind each decision.

## Running it

Requires Node 24 and pnpm 11.

```sh
pnpm install
cp .dev.vars.example .dev.vars    # local-only fixtures, not secrets
pnpm migrate:local
pnpm dev
```

`/display` needs the `X-Display-Key` header; `/admin` needs the password. Both
come from `.dev.vars` locally.

```sh
pnpm check        # svelte-check + tsc
pnpm lint         # prettier + eslint
pnpm test         # unit, component, workerd, and e2e
```

Tests are split by filename across four runtimes — node, real Chromium, real
workerd with D1, and Playwright against a real build. Which one a test lands in
is decided by what it is called, and the reasoning is in `CLAUDE.md`.

## Deploying

See [DEPLOY.md](./DEPLOY.md).

## Status

The application is complete and tested. What remains is the part that needs the
physical panel in front of you: checking legibility at kitchen distance and
retuning type sizes and grey levels against what the hardware actually shows.
Every value that step will change is collected in `src/lib/settings.ts`.
