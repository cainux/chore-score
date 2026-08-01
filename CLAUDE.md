# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project state

This repo is **scaffolding plus a complete specification, with no application code yet**. `src/` is the stock `sv create --template minimal` skeleton: `src/routes/+page.svelte`, `src/routes/demo/`, and `src/lib/vitest-examples/` are all placeholder examples to be deleted as real code lands.

The actual work is fully specified in `openspec/changes/add-chore-chart/`. Read `proposal.md`, `design.md`, `specs/*/spec.md`, and `tasks.md` before writing code — the design makes non-obvious decisions (absence-as-state schema, two independent auth gates, fixed-pixel layout) that are not recoverable from the source tree.

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
pnpm test:e2e             # playwright (builds + previews first)
```

Running a subset:

```sh
pnpm test:unit -- --run src/lib/dates.spec.ts     # one unit file, no watch
pnpm test:unit -- --run --project server          # node-side tests only
pnpm test:unit -- --run --project client          # browser-side tests only
pnpm test:e2e -- -g "toggles a square"            # one e2e test by name
```

## Testing layout

`vite.config.ts` defines **vitest projects split purely by filename**, so where a test lives decides how it runs:

| Pattern                | Project  | Environment                    |
| ---------------------- | -------- | ------------------------------ |
| `src/**/*.svelte.spec.ts` | `client` | real Chromium via Playwright, `vitest-browser-svelte` |
| `src/**/*.workers.spec.ts` | `workers` | real workerd + D1 via Miniflare (task 1.5 adds it) |
| `src/**/*.spec.ts` (other) | `server` | node                          |
| `**/*.e2e.ts`          | —        | Playwright, against a real build on :4173 |

`src/lib/server/**` is excluded from the client project. `expect.requireAssertions` is on, so a test with no assertion fails.

The `workers` project exists because the other three lanes all have full ICU and no D1, so they cannot see the two things most likely to be wrong in production — see design.md D9. Only two kinds of test belong there: `londonToday` (the sole ICU-dependent function) and anything touching D1. Pure date arithmetic stays in `server`. Two gotchas: the `workers` project must **not** `extends: './vite.config.ts'` (it would inherit the `sveltekit()` plugin), and its filename pattern must also be added to the `server` project's `exclude`, or every workers test runs a second time in node and fails on `cloudflare:test` imports.

## Configuration notes

- There is **no `svelte.config.js`** — the SvelteKit adapter and compiler options live inline in `vite.config.ts`. Change the adapter there. It currently uses `adapter-auto`; task 1.1 switches it to `adapter-cloudflare` for Workers + D1.
- **Runes mode is forced** for all non-`node_modules` files, so `$state`/`$props`/`$derived` are mandatory — no `export let`, no legacy stores in components.
- Prettier: tabs, single quotes, no trailing commas, 100 columns. ESLint pulls its ignores from `.gitignore`.

## Domain invariant: UTC everywhere, London once

This rule is in `openspec/config.yaml` and is load-bearing for correctness across BST transitions:

- Everything stored, transported, logged, or computed is **UTC**. Calendar dates are zone-free `'YYYY-MM-DD'` strings; date arithmetic is `Date.UTC(...)` plus whole multiples of `86_400_000`.
- **`londonToday(now)` is the only function permitted to reference `Europe/London`.** Any other named timezone, or any local-time API (`getDate`, `getDay`, `getHours`, `getMonth`, `getFullYear`), is a defect — task 2.5 adds a lint rule or test enforcing this.

Every other date function takes a date string and is testable with no clock, zone, or mocking.

## Architecture (as designed, not yet built)

SvelteKit on Cloudflare Workers with D1. Two routes with almost nothing in common — deliberately no shared UI layer:

- **`GET /display`** — server-rendered chart for a TRMNL OG e-ink panel screenshotted by a headless browser. Fixed 800×480 absolute-pixel layout, 2-bit greyscale palette, inline SVG, self-hosted `woff2`, **zero external requests and zero client-side rendering** (anything that renders after the screenshot fires does not exist), `Cache-Control: no-store`.
- **`/admin/*`** — phone-first single scrolling column for parents. Mutations are SvelteKit **form actions** that work without JavaScript, with `use:enhance` layering optimistic toggling on top.

`hooks.server.ts` holds two non-overlapping gates: a secret-header check for `/display` and an HMAC-signed cookie session for `/admin`. Both secrets come from Worker bindings and the app fails closed if either is missing.

Storage is three tables (`children`, `day_marks`, `task_lists`). `day_marks` has **one row per earned day and no boolean column** — "not earned" is the absence of a row, which makes marking idempotent via `INSERT OR IGNORE` and clearing residue-free via `DELETE`. The weekly trophy is derived (`COUNT(*) = 7` over a week's dates), never stored.

## OpenSpec workflow

Changes are spec-driven through the `openspec` CLI (v1.7.0) and its skills (`openspec-propose`, `openspec-apply-change`, `openspec-update-change`, `openspec-sync-specs`, `openspec-archive-change`, `openspec-explore`), also available as `/opsx:*` commands. Work implements `tasks.md`; when behaviour changes, update the change's artifacts rather than editing code alone. `openspec/config.yaml` requires design docs to include a mermaid data-flow diagram.

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
