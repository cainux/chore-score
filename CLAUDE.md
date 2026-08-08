# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project state

**Built, deployed and running on the wall.** Production is <https://chores.oha.me>, and `/display` on it is what the TRMNL panel captures every 15 minutes. Completed changes live under `openspec/changes/archive/`; `openspec list` shows anything still in progress.

Two places hold the written record, and they answer different questions:

- **`openspec/specs/*/spec.md`** — what the system does now, across the `chore-tracking`, `chart-display`, `parent-admin`, and `access-control` capabilities. This is the living contract; keep it true.
- **`openspec/changes/archive/*/`** — **why**, which the specs deliberately do not carry. Each archived change has a `design.md` holding numbered decisions that code comments and this file cite as "design.md D9" and the like. Several were reversed by the physical panel — or by how the admin page was actually used — and record both the original reasoning and what overturned it, so read the whole entry rather than skimming for the current answer.

**The decision series is continuous across the archives, and citations are bare numbers** — a comment can say "design.md D19" without saying which archive. Don't keep a table mapping numbers to files here; it would need hand-updating on every archive and would silently go stale, the way the change list and requirement counts used to. Grep instead:

```sh
grep -rn '^### D19\.' openspec/changes/archive/*/design.md                                        # find where D19 lives
grep -rhoE '^### D[0-9]+\.' openspec/changes/archive/*/design.md | grep -oE '[0-9]+' | sort -n | tail -1   # the current high-water mark
```

Numbering carries on rather than restarting per archive precisely so a citation stays unambiguous — when a new change's design.md adds decisions, continue from whatever that second command reports, don't restart at D1.

Read `design.md` before changing anything on the display or in the date module. It makes decisions — absence-as-state schema, two asymmetric auth gates, a fixed-pixel canvas, a trophy with no notion of today — that are not recoverable from the source tree, and that look arbitrary until you know what they cost to learn.

## Commands

Package manager is **pnpm** (`engine-strict=true`; Node 24, pnpm 11).

```sh
pnpm dev                  # vite dev server
pnpm build                # production build
pnpm preview              # serve the build on :4173
pnpm check                # svelte-check + tsc (the typecheck gate)
pnpm lint                 # prettier --check . && eslint .
pnpm format               # prettier --write .
pnpm test                 # unit (single run) + e2e
pnpm test:unit            # vitest, watch mode
pnpm test:e2e             # playwright (builds, then wrangler dev on :4173)
pnpm run deploy           # build + wrangler deploy, to the live wall chart
```

Running a subset:

```sh
pnpm test:unit --run src/lib/dates.spec.ts     # one unit file, no watch
pnpm test:unit --run --project server          # node-side only      (115)
pnpm test:unit --run --project client          # browser-side only    (37)
pnpm test:unit --run --project workers         # real workerd + D1    (59)
npx playwright test -g "44x44"                 # e2e tests matching a name
```

**No `--` before the flags.** `pnpm test:unit -- --run --project server` silently runs the entire suite: pnpm forwards the bare `--` to vitest, which reads it as a filename filter rather than a separator, and the `--project` never takes effect. It looks like it worked, because 200 passing tests look like success. The same applies to `-g` on the e2e script, which is why that line calls Playwright directly.

Note that e2e runs against **`wrangler dev`, not `vite preview`**. The auth gates read their secrets from Worker bindings, and `vite preview` is plain Node with none — every gated route would fail closed with a 500 and the suite would pass for entirely the wrong reason. Secrets come from `.dev.vars`.

## Testing layout

`vite.config.ts` defines **vitest projects split purely by filename**, so where a test lives decides how it runs:

| Pattern                | Project  | Environment                    |
| ---------------------- | -------- | ------------------------------ |
| `src/**/*.svelte.spec.ts` | `client` | real Chromium via Playwright, `vitest-browser-svelte` |
| `src/**/*.workers.spec.ts` | `workers` | real workerd + D1 via Miniflare, configured standalone in `vitest.workers.config.ts` |
| `src/**/*.spec.ts` (other) | `server` | node                          |
| `**/*.e2e.ts`          | —        | Playwright, against a real build on :4173 |

`src/lib/server/**` is excluded from the client project. `expect.requireAssertions` is on, so a test with no assertion fails.

The `workers` project exists because the other three lanes all have full ICU and no D1, so they cannot see the two things most likely to be wrong in production — see design.md D9. Only two kinds of test belong there: `londonToday` (the sole ICU-dependent function) and anything touching D1. Pure date arithmetic stays in `server`. Two gotchas: the `workers` project must **not** `extends: './vite.config.ts'` (it would inherit the `sveltekit()` plugin), and its filename pattern must also be added to the `server` project's `exclude`, or every workers test runs a second time in node and fails on `cloudflare:test` imports.

### D1 state in the `workers` project

Established empirically against `@cloudflare/vitest-pool-workers` 0.20.1, because the published material for older releases does not describe this version:

- **Isolation is per file, not per test.** Each spec file starts against a completely empty database — no tables at all, not even the `d1_migrations` bookkeeping. Two tests in the same file share whatever the earlier one left behind.
- **`reset()` from `cloudflare:test` is a wipe, not a truncate.** It drops the schema along with the rows, so a test that runs after it sees an empty `sqlite_master`.

So a D1 test can assume nothing on entry, and the schema has to be put there by the test itself. D1 tests import the data-layer module directly and hand it `env.DB`. Do not reach for `SELF.fetch()`: driving the whole worker would require pointing the pool's `main` at the built `.svelte-kit/cloudflare/_worker.js`, which couples the unit tests to a build step and re-tests routing that Playwright already covers. The pool config deliberately has no `main` for that reason.

`withSchema()` in `src/lib/server/db/testing.ts` is that convention: a `beforeEach` calling `reset()` and then `applyD1Migrations()`. Every test therefore starts against the full migrated state — which includes the seeded roster from `0002`, so `children` has two rows on entry while `day_marks` and `task_lists` are empty. Call it once at the top of any `describe` that touches D1. The migration SQL is read in Node by `vitest.workers.config.ts` and handed across via `provide`/`inject`, because workerd has no filesystem to read it from.

## Configuration notes

- There is **no `svelte.config.js`** — the SvelteKit adapter and compiler options live inline in `vite.config.ts`. It uses `adapter-cloudflare`; change it there.
- **`wrangler.jsonc` declares the custom domain in `routes`.** Do not remove that entry to "clean up" a value the dashboard already has. Cloudflare overrides dashboard routes on deploy with whatever the config says, so an absent `routes` can detach `chores.oha.me` — and on e-ink that is the worst available failure, because the wall keeps showing its last good capture and nothing announces the fault.
- **Runes mode is forced** for all non-`node_modules` files, so `$state`/`$props`/`$derived` are mandatory — no `export let`, no legacy stores in components.
- Prettier: tabs, single quotes, no trailing commas, 100 columns. ESLint pulls its ignores from `.gitignore`.

## Domain invariant: UTC everywhere, London once

This rule is in `openspec/config.yaml` and is load-bearing for correctness across BST transitions:

- Everything stored, transported, logged, or computed is **UTC**. Calendar dates are zone-free `'YYYY-MM-DD'` strings; date arithmetic is `Date.UTC(...)` plus whole multiples of `86_400_000`.
- **`londonParts(now)` is the only function permitted to reference `Europe/London`.** It returns `{ date, time }` from a single `Intl.DateTimeFormat` `formatToParts` call; `londonToday(now)` is a thin wrapper returning the date. The time exists for one consumer only — the render stamp on the display. Any other named timezone, or any local-time API (`getDate`, `getDay`, `getHours`, `getMonth`, `getFullYear`), is a defect. `src/lib/invariants.spec.ts` enforces this across the whole codebase, including inside `londonParts` itself.

Every other date function takes a date string and is testable with no clock, zone, or mocking.

## Architecture

SvelteKit on Cloudflare Workers with D1. Two route families with almost nothing in common — deliberately no shared UI layer:

- **`GET /display`** — server-rendered chart for a TRMNL OG e-ink panel screenshotted by a headless browser. Fixed 800×480 absolute-pixel layout, 2-bit greyscale palette, inline SVG, self-hosted `woff2`, **zero external requests and no client runtime at all** (not merely nothing the appearance depends on: `csr = false`, no hydration, nothing scheduled after the response), `Cache-Control: no-store`.
- **`/admin/*`** — phone-first single scrolling column for parents. Mutations are SvelteKit **form actions** that work without JavaScript, with `use:enhance` layering optimistic toggling on top.

### The canvas is shared; the pages are not

`/display` and `/admin/preview` render the **same** chart from the **same** code:

- `src/lib/display/Panel.svelte` — the `.panel` element, everything in it, all of its CSS, and the `fonts.css` import. What each route keeps is only what is properly route-level: the `html`/`body` reset and the `width=800` viewport meta on `/display`, the scale-to-fit wrapper and the channel listener on the preview.
- `src/lib/server/display/view.ts` — `buildDisplayView(db, now)`. Both loads are thin callers of it.

Sharing **both** is the point. Sharing only the component would leave two places computing rows, bullets and trophies; sharing only the loader would leave two copies of the markup. Either half alone reintroduces the drift the spec forbids — see design.md D18 in the `add-live-display-preview` change.

**`/admin/preview` is under `/admin` and must stay there.** It is the live view: it hydrates, listens on a `BroadcastChannel`, and calls `invalidateAll()` when the admin page reports a saved edit. Two reasons it is not a mode of `/display` (design.md D16). First, the panel must never reach a hydrating page — a capture timed against network idle does not fire cleanly on one, and that failure is silent, because the wall keeps its last good image and nothing announces the fault. Second, `gateFor()` already routes `/admin/*` to the session gate, so the display key — the credential sitting in a third party's plugin config — cannot open it, structurally rather than by a rule.

The nudge (`src/lib/live.ts`) **carries no payload**: the preview re-reads from the server rather than accepting a description of the change, so it can only ever show a view model the server produced. It is posted after `await update()` resolves and only on success — earlier is a race the preview loses, leaving it confidently one edit behind. Reach is one browser, deliberately (design.md D21).

`hooks.server.ts` holds two gates: a secret-header check for `/display` and an HMAC-signed cookie session for `/admin`. Both secrets come from Worker bindings and the app fails closed if either is missing. They are **asymmetric on purpose** — an admin session also opens `/display`, so a parent can preview the wall chart from a phone, but the display key never opens `/admin`. That key is configured into a third-party screenshot service and sent on every poll, making it the most exposed credential here, so it confers nothing beyond reading the chart (design.md D4).

Storage is three tables (`children`, `day_marks`, `task_lists`). `day_marks` has **one row per earned day and no boolean column** — "not earned" is the absence of a row, which makes marking idempotent via `INSERT OR IGNORE` and clearing residue-free via `DELETE`. The weekly trophy is derived (`COUNT(*) = 7` over a week's dates), never stored.

**The trophy has one state and asks nothing about today.** It is drawn on a complete week and not otherwise. It formerly had three states — won, still winnable, lost — which needed a "strictly before today" rule, deliberately different from how a day square resolves, purely to stop it flickering daily. The panel retired the hollow variants (they did not read as a trophy across a room), and the whole today question went with them. `weekComplete(dates, isEarned)` takes no `today` at all. Do not reintroduce one without reading design.md D13, which records why the richer version was tried and what killed it.

## OpenSpec workflow

Changes are spec-driven through the `openspec` CLI (v1.7.0) and its skills (`openspec-propose`, `openspec-apply-change`, `openspec-update-change`, `openspec-sync-specs`, `openspec-archive-change`, `openspec-explore`), also available as `/opsx:*` commands. Work implements `tasks.md`; when behaviour changes, update the change's artifacts rather than editing code alone. `openspec/config.yaml` requires design docs to include a mermaid data-flow diagram.

New work starts with `/opsx:propose`, which creates a change under `openspec/changes/` with `openspec/specs/` as its baseline — a **modified** capability needs a delta spec whose folder name matches the existing one. Run `openspec list` for whatever is currently active, rather than trusting a status line here.

The archived changes are worth imitating in one respect: when the panel or the desk overturned a decision, the reversal was written into `design.md` alongside the original argument rather than replacing it, and the superseded tasks were annotated with what reversed them instead of being deleted. `add-live-display-preview` carries a "What the desk found" section doing the same for what its implementation turned up. That is why "why is the trophy so plain?" has an answer. Keep doing it.

You are able to use the Svelte MCP server, where you have access to comprehensive Svelte 5 and SvelteKit documentation. Here's how to use the available tools effectively:

## Available Svelte MCP Tools:

### 1. list-sections

Use this FIRST to discover all available documentation sections. Returns a structured list with titles, use_cases, and paths.
When asked about Svelte or SvelteKit topics, ALWAYS use this tool at the start of the chat to find relevant sections.

### 2. get-documentation

Retrieves full documentation content for specific sections. Accepts single or multiple sections.
After calling the list-sections tool, you MUST analyze the returned documentation sections (especially the use_cases field) and then use the get-documentation tool to fetch ALL documentation sections that are relevant for the user's task.

### 3. svelte-autofixer

Analyzes Svelte code and returns issues and suggestions.
You MUST use this tool whenever writing Svelte code before sending it to the user. Keep calling it until no issues or suggestions are returned.

### 4. playground-link

Generates a Svelte Playground link with the provided code.
After completing the code, ask the user if they want a playground link. Only call this tool after user confirmation and NEVER if code was written to files in their project.
