## Context

Greenfield build — see `proposal.md` for motivation. The design is shaped almost entirely by one unusual client: a TRMNL OG e-ink panel that fetches the display page through TRMNL's hosted Screenshot plugin.

That imposes constraints a normal web app does not have:

- **The client is a camera, not a browser.** It loads the page once, screenshots it, and throws it away. Anything that renders after the screenshot fires does not exist.
- **The canvas is fixed and small.** 800×480 physical pixels on a 7.5" panel, so roughly **0.2 mm per pixel**.
- **Four grey levels, no colour.** 2-bit greyscale.
- **Latency is invisible but timeouts are fatal.** Refresh happens on TRMNL's schedule, so a change appearing a few minutes late is fine, but a cold start that stalls the screenshot means a blank wall.
- **The device cannot log in.** No interactive auth is possible on that route.

Everything else — two users, three tables, a few hundred rows a year — is trivially small.

See `specs/` for the behaviour being implemented.

## Goals / Non-Goals

**Goals:**

- A display page that is correct the instant its HTML finishes loading, with zero client-side dependency.
- Date handling that is provably correct across British Summer Time transitions and around midnight.
- An admin page that works from a phone with one thumb, standing in the kitchen.
- Small enough to still be maintainable after a year of not touching it.

**Non-Goals:**

- Sub-minute freshness on the display. TRMNL's polling interval sets the floor and that is fine.
- Any shared UI framework or component library between the two pages. They have almost nothing in common and forcing reuse would compromise the display page.
- Offline support, real-time updates, or multi-household support.

## Decisions

### D1. Absence is the "not earned" state

`day_marks` stores one row per earned day. There is no boolean column and no row for a day that was not earned.

```sql
CREATE TABLE children (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  sort_order INTEGER NOT NULL
);

CREATE TABLE day_marks (
  child_id TEXT NOT NULL REFERENCES children(id),
  date     TEXT NOT NULL,          -- 'YYYY-MM-DD', always a London calendar date
  PRIMARY KEY (child_id, date)
);

CREATE TABLE task_lists (
  child_id   TEXT PRIMARY KEY REFERENCES children(id),
  body       TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL
);
```

_Why:_ it makes "marking is idempotent" and "clearing leaves no residue" fall out of `INSERT OR IGNORE` and `DELETE`, with no update path and no tri-state to reason about. Trophy status is then a `COUNT(*) = 7` over a week's dates.

_Alternative considered:_ a `earned BOOLEAN` column. Rejected — it introduces a third state (row exists, earned = false) that means nothing to this system and would need to be handled everywhere.

_Alternative considered:_ storing trophies as their own records. Rejected — the spec requires that editing a day mark immediately changes trophy status, so deriving it is both simpler and correct by construction.

### D2. UTC everywhere; exactly one function knows about London

**Project rule: all date and time handling is UTC.** Anything stored, transported, logged, or computed is UTC. No local times, no offsets, no naive timestamps anywhere in the system.

```
storage      day_marks.date         'YYYY-MM-DD'  (plain calendar date, no zone)
             task_lists.updated_at  ISO-8601 UTC, e.g. '2026-08-01T21:14:07Z'
arithmetic   Date.UTC(y, m, d) + n × 86_400_000
transport    UTC only; the client never sends a local time
```

Week boundaries and day offsets are computed by parsing a date string into `Date.UTC(...)` and adding whole multiples of 86,400,000 ms. UTC has no DST, so "seven days after Monday" is always exactly seven days — never 23 or 25 hours.

There is **one** deliberate exception, isolated to a single function:

```ts
// The only timezone-aware code in the system.
londonToday(now: Date): string   // → 'YYYY-MM-DD'
```

It answers "which calendar date is it for this family right now", because the chart is on a wall in a UK kitchen and its day must end when theirs does. During BST, London midnight is 23:00 UTC the previous day, so without this the app would disagree with the wall clock for the hour after midnight, seven months of the year.

_Why isolate rather than spread:_ every other function takes a `YYYY-MM-DD` string and is therefore trivially testable with no clock, no zone, and no mocking. The timezone question is asked once, at the edge, and never again.

_Constraint for implementers:_ `londonToday` is the only place `Europe/London` may appear. Any other use of a named timezone, or of a local-time API such as `getDate()`, `getDay()`, or `getHours()`, is a defect.

_Risk:_ this relies on Workers having full ICU data for named timezones. Verify early (see Risks).

### D3. Server-rendered with SvelteKit form actions; JavaScript is an enhancement

Both routes are server-rendered. Admin mutations are SvelteKit **form actions**, so toggling a square is a real form POST that works with JavaScript disabled. `use:enhance` layers on optimistic toggling so it feels instant on a phone, reverting the square and surfacing an error if the POST fails.

_Why:_ the display page has a hard requirement to be complete at load, which rules out client-side data fetching. Using the same server-first shape on admin means one mental model, and the failure-visibility requirement is satisfied by the framework rather than by hand-rolled state.

_Alternative considered:_ a JSON API with client-side rendering on admin. Rejected — more moving parts for two users and one screen, and it would make the two pages diverge structurally for no benefit.

### D4. Two independent gates in `hooks.server.ts`

| Route      | Gate               | Mechanism                                                          |
| ---------- | ------------------ | ------------------------------------------------------------------ |
| `/display` | Secret HTTP header | Constant-time compare against a configured secret                  |
| `/admin/*` | Shared password    | Signed, `HttpOnly` + `Secure` + `SameSite=Lax` cookie, long expiry |

The gates do not overlap: an authenticated parent hitting `/display` without the header is rejected, and the header does not grant admin. Both secrets come from Worker environment bindings and the app fails closed if either is absent.

_Why signed rather than random-token-in-a-table:_ no session table to store, expire, or clean up. The cookie carries an issued-at timestamp and an HMAC over it; verification is a signature check plus an expiry comparison.

_Alternative considered:_ Cloudflare Access in front of `/admin`. Genuinely tempting given Cloudflare is already in use, and it would remove password handling entirely. Rejected for now because it adds an identity-provider dependency to a two-person family app, but it is the obvious upgrade path if the shared password becomes annoying.

### D5. Everything on the display page is inline and self-hosted

The star and trophy are inline SVG. The typeface is a bundled `woff2` served by the app itself. No external requests of any kind.

_Why:_ the Screenshot plugin captures whatever is on screen when it fires. Any resource fetched from a third party is a race the screenshot can lose, and losing it means a fallback font or a missing glyph on the kitchen wall until the next refresh.

The display response also sets `Cache-Control: no-store`, so TRMNL never screenshots a cached copy of yesterday's chart.

### D6. Fixed 800×480 layout, expressed in absolute pixels

The display page is not responsive. It is a fixed 800×480 canvas, because it has exactly one viewer.

```
┌ 800 px ──────────────────────────────────────────────────────────────┐
│ 16px padding                                                         │
│  ┌ 376 px ──────────────────┐  ┌ 376 px ──────────────────┐          │
│  │ ALICE                    │  │ BEN                      │          │  task
│  │ • Piano 15 mins daily    │  │ • Piano 10 mins daily    │          │  blocks
│  │ • Reading log signed     │  │ • Spellings              │          │  ~180px
│  │ • Bins out Tuesday       │  │ • Tidy room              │          │
│  └──────────────────────────┘  └──────────────────────────┘          │
│  ──────────────────────────────────────────────────────────────────  │
│                                                                      │
│        LAST WEEK                      THIS WEEK                      │  20px
│        M  T  W  T  F  S  S            M  T  W  T  F  S  S            │  22px
│  ┌────┬──┬──┬──┬──┬──┬──┬──┬──┐ ┌──┬──┬──┬──┬──┬──┬──┬──┐            │
│  │Alice│★│★ │★ │  │★ │★ │★ │🏆│ │★ │★ │★ │· │· │· │· │  │            │  72px
│  ├────┼──┼──┼──┼──┼──┼──┼──┼──┤ ├──┼──┼──┼──┼──┼──┼──┼──┤            │
│  │Ben │★ │  │★ │★ │★ │  │★ │  │ │★ │★ │  │· │· │· │· │  │            │  72px
│  └────┴──┴──┴──┴──┴──┴──┴──┴──┘ └──┴──┴──┴──┴──┴──┴──┴──┘            │
│   80px  └── 7 × 42px ──┘  32px       └── 7 × 42px ──┘  32px          │
└──────────────────────────────────────────────────────────────────────┘
   total grid width: 80 + 294 + 32 + 20 + 294 + 32 = 752 px
   total height used: ~370 px of 480 — slack goes to the task blocks
```

Vertical budget out of 480 px:

| Band                   | Height                     |
| ---------------------- | -------------------------- |
| Padding (top + bottom) | 24                         |
| Task blocks            | 180 (grows into the slack) |
| Rule + spacing         | 14                         |
| Week labels            | 20                         |
| Weekday letters        | 22                         |
| Two child rows         | 144                        |
| **Slack**              | **~76**                    |

_Why absolute pixels:_ a fluid layout on a fixed single-viewport target only introduces ways for the chart to be subtly wrong. Hard numbers mean the layout can be verified against the real panel once and then trusted.

### D7. Square states map to specific grey levels

```mermaid
stateDiagram-v2
    direction LR
    [*] --> NotYet: date is in the future
    [*] --> Missed: date is today or past, no mark
    Missed --> Earned: parent toggles on
    Earned --> Missed: parent toggles off
    NotYet --> Missed: the day arrives unmarked
    NotYet --> Earned: parent toggles on (today only)

    note right of Earned
      filled star, #000
    end note
    note right of Missed
      empty square, #FFF
    end note
    note right of NotYet
      small dot, #AAA
    end note
```

| Element                              | Level      | Hex       |
| ------------------------------------ | ---------- | --------- |
| Stickers, names, task text           | black      | `#000000` |
| Weekday letters, week labels, trophy | dark grey  | `#555555` |
| Grid lines, future-day dots          | light grey | `#AAAAAA` |
| Background, missed squares           | white      | `#FFFFFF` |

Sticking to values near the panel's four actual levels keeps the device's own quantisation from dithering solid areas into texture.

### D9. Three test runtimes, because the risky assumption only exists in one of them

The date module's correctness depends on the runtime having full ICU data for `Europe/London` (D2). The default test setup cannot see that dependency at all:

```
   vitest 'server'    Node          full ICU, no D1
   vitest 'client'    Chromium      full ICU, no D1
   playwright e2e     vite preview  = Node again, no D1
   ─────────────────────────────────────────────────────
   production         workerd       ICU: the open question, and D1
```

Every lane that runs on `pnpm test` has ICU and lacks D1. So a `londonToday` test can pass indefinitely while production is wrong, and no D1 query is exercised before deployment.

**Decision: a third vitest project running in real workerd**, via `@cloudflare/vitest-pool-workers` and Miniflare, reading bindings from the Wrangler config. It holds exactly two categories of test:

| Test | Runtime | Why |
| --- | --- | --- |
| `londonToday` | workers | The only function depending on ICU |
| Anything touching D1 | workers | Real SQL, real `INSERT OR IGNORE` semantics |
| `weekStart`, `weekDates`, `displayWindow`, square-state resolution | server (Node) | Pure string arithmetic — no runtime dependency, and workerd startup is not free |
| Component rendering | client (Chromium) | Unchanged |
| Layout at 800×480, both auth gates | e2e | Unchanged — see below |

_Why a test rather than a one-off check:_ the alternative was a throwaway route inspected once under `wrangler dev`. That proves ICU works on the day it is run and defends nothing afterwards. Making it an assertion that pins a known BST instant means a Workers runtime change that breaks timezone handling shows up as a red test rather than as a wrong date on the kitchen wall.

_Consequence for sequencing:_ the pool reads the Wrangler config to construct bindings, and D1 tests need a migration to apply. **The Wrangler config, the D1 binding, and the schema migration therefore have to exist before any workerd test can run**, which pulls them out of the database section and into the first section of `tasks.md`.

_Unit-style, not `SELF.fetch()`:_ the pool can also drive the whole worker over `SELF`, but that requires pointing `main` at the built `.svelte-kit/cloudflare/_worker.js`, coupling unit tests to a build step and duplicating what Playwright already does. Data-layer modules are imported directly and handed `env.DB`.

_Alternative considered:_ hand-roll the BST rule unconditionally and depend on no ICU at all. Genuinely tempting — the rule is a dozen lines, has been stable since 2002, and would make `londonToday` a pure function testable in Node like everything else. Rejected as the default because it means owning a reimplementation of something the platform does correctly, but it remains the fallback if the assertion fails, and it is the right answer if Workers' ICU support turns out to be partial rather than absent.

_Alternative considered:_ an abstraction over D1 tested against `better-sqlite3` in Node. Rejected — it tests the abstraction rather than D1, and D1's actual behaviour around `INSERT OR IGNORE` and prepared statements is the thing worth verifying.

_What this deliberately does not cover:_ the fixed 800×480 layout (D6) and the two auth gates (D4) stay in Playwright. Layout does not depend on the runtime, and the gates live in `hooks.server.ts`, reachable only through the `SELF` path being avoided above.

_Caveat on volatility:_ this tooling is moving. At the time of writing, the only release line compatible with the installed vitest peers on `vitest ^4.1`, exposes itself as a Vite **plugin** rather than the widely documented `defineWorkersProject` / `poolOptions` form, and no longer offers the `isolatedStorage` or `singleWorker` options that most existing material assumes. Whether D1 state is isolated between tests must be established empirically before data-layer tests are written, since it decides whether they can assume a clean table. Treat published examples as probably stale and the installed package's own types as the source of truth.

## Data flow

```mermaid
flowchart TB
    subgraph kitchen["Kitchen"]
        TRMNL["TRMNL OG panel<br/>800×480, 2-bit"]
    end

    subgraph cf_trmnl["TRMNL cloud"]
        SHOT["Screenshot plugin<br/>headless browser<br/>+ secret header"]
    end

    subgraph phone["Parent's phone"]
        ADMIN_UI["Admin page"]
    end

    subgraph worker["Cloudflare Worker — SvelteKit"]
        HOOKS["hooks.server.ts<br/>header gate | session gate"]
        DISPLAY["GET /display<br/>SSR, no-store"]
        ADMINR["GET /admin<br/>POST toggle / save tasks"]
        DATES["date module<br/>now → London date<br/>→ week bounds (UTC maths)"]
    end

    D1[("D1<br/>children<br/>day_marks<br/>task_lists")]

    TRMNL -->|polls on schedule| SHOT
    SHOT -->|"GET + X-Display-Key"| HOOKS
    ADMIN_UI -->|"GET / POST + session cookie"| HOOKS
    HOOKS --> DISPLAY
    HOOKS --> ADMINR
    DISPLAY --> DATES
    ADMINR --> DATES
    DISPLAY -->|read| D1
    ADMINR -->|"INSERT OR IGNORE / DELETE / UPSERT"| D1
    DISPLAY -->|complete HTML| SHOT
    SHOT -->|rendered image| TRMNL
```

The loop closes only on TRMNL's polling interval: a parent toggles a square, D1 changes immediately, and the wall catches up at the next refresh.

## Admin layout

### D8. The admin page is designed for the phone, not derived from the wall

The admin page deliberately does **not** mirror the display. The two pages answer different questions:

|           | Display               | Admin                   |
| --------- | --------------------- | ----------------------- |
| Question  | "How are we doing?"   | "Tick tonight off"      |
| Viewer    | Whole family, ambient | One parent, deliberate  |
| Frequency | Glanced at constantly | Opened once a day       |
| Shape     | Fixed 800×480 canvas  | Single scrolling column |

Roughly 95% of admin visits are one parent, in the evening, recording that today went fine. That action gets the top of the page and the largest targets. Corrections and task edits are rarer and sit below the fold.

```
  ┌─ 390 px phone ──────────────────────────┐
  │  Saturday 1 August                      │
  │                                         │
  │  ┌──────────────┐  ┌──────────────┐     │
  │  │    ALICE     │  │     BEN      │     │  ← today
  │  │              │  │              │     │    ~170px tall
  │  │      ★       │  │      ○       │     │    one tap each
  │  │              │  │              │     │    no scrolling
  │  │    done      │  │   not yet    │     │    needed
  │  └──────────────┘  └──────────────┘     │
  │                                         │
  │  ── Fix a past day ──────────────────   │
  │                                         │
  │  ALICE          M   T   W   T   F   S   S
  │        last    [★] [★] [★] [ ] [★] [★] [★]
  │        this    [★] [★] [★] [○] [·] [·] [·]
  │                                     └── disabled
  │  BEN            M   T   W   T   F   S   S
  │        last    [★] [ ] [★] [★] [★] [ ] [★]
  │        this    [★] [★] [ ] [·] [·] [·] [·]
  │                                         │
  │  ── Tasks ───────────────────────────   │
  │                                         │
  │  ALICE                                  │
  │  ┌───────────────────────────────────┐  │
  │  │ Piano 15 mins daily               │  │
  │  │ Reading log signed                │  │
  │  │ Bins out Tuesday                  │  │
  │  └───────────────────────────────────┘  │
  │                          [ Save ]  ← only when dirty
  │  BEN                                    │
  │  ┌───────────────────────────────────┐  │
  │  │ Piano 10 mins daily               │  │
  │  │ Spellings                         │  │
  │  └───────────────────────────────────┘  │
  └─────────────────────────────────────────┘
```

Sizing at a 390 px viewport:

| Element         | Size       | Note                                               |
| --------------- | ---------- | -------------------------------------------------- |
| Today card      | ~170 × 170 | Two side by side with a gutter; unmissable         |
| Correction cell | 44 × 44    | Exactly the minimum touch target                   |
| Name gutter     | ~46 px     | `390 − 46 = 344`, and `344 / 7 ≈ 49 px` per column |
| Task field      | full width | Auto-growing textarea                              |

The weeks stack rather than sitting side by side — 14 targets across 390 px would be 24 px each, well under the minimum. Stacked, each week gets its own row of seven at 49 px, comfortably above it.

**Two surfaces, one underlying mark.** Today appears both as a big card and as a cell in the correction grid. They write the same `day_marks` row, so the correction grid re-renders after a today toggle and vice versa. No separate state.

_Why explicit save on tasks but not on day marks:_ a day mark is one bit and toggling it is unambiguous, so persisting immediately is right. Task text is typed over many keystrokes, and auto-saving would publish half-typed lines to the kitchen wall. The Save button appears only when the field differs from what is stored, which also gives the parent a visible answer to "did that save?".

_Alternative considered:_ a separate tasks screen, reached from a button. Rejected — it is one more navigation step for something a parent does while standing up, and the whole page is small enough that scrolling to it is cheaper than routing to it.

## Risks / Trade-offs

**Squares are physically small.** → At 0.2 mm/px, a 42 px cell is about **8.6 mm** and a star about **6.5 mm**. That reads comfortably at arm's length and from a metre or two, but two weeks on a 7.5" panel is inherently a walk-up-to-it chart, not a read-from-the-doorway one. Mitigation: verify on the real panel before finishing the layout. If it disappoints, the fallback is dropping to a single week, which roughly doubles every dimension — but that loses the "look how good last week was" effect, which is much of the point.

**Workers may lack full ICU data for named timezones.** → If `Intl.DateTimeFormat` with `timeZone: 'Europe/London'` is unavailable or wrong, every date in the system shifts. Mitigation: a test pinning a known BST instant, running in real workerd via the `workers` vitest project (D9), written before any UI is built and kept as a permanent assertion rather than a one-off check. Fallback is a small hand-rolled BST rule (last Sunday in March to last Sunday in October), which is a dozen lines and has been stable for decades.

**The workerd test harness is pre-release tooling.** → The pool depends on a Miniflare alpha and its configuration API changed shape in the release line compatible with the installed vitest. Mitigation: the dependency is transitive and pinned, so it will not drift unattended; and the harness only gates the test suite, not the deployed Worker. If it breaks irrecoverably, the fallback is the hand-rolled BST rule (which removes the ICU question entirely) plus data-layer verification against a deployed preview.

**The Screenshot plugin's custom-header support is a hard dependency.** → If headers turn out not to be available on the plan in use, `/display` has no gate. Mitigation: fall back to an unguessable path segment (`/d/<random>`) which is weaker but adequate given the data is a children's chore chart.

**The screenshot could fire before layout settles.** → Mitigation is structural: no client-side rendering, no external assets, fixed pixel layout, bundled fonts. There is nothing left to settle.

**7/7 is unforgiving, particularly for the 6-year-old.** → A single missed Tuesday kills the week with five days still to run, which removes the incentive for the rest of it. This is a deliberate product decision, not an oversight. Mitigation if it proves demotivating: the rule lives in one derived query, so relaxing it to 6/7 or adding a second tier is a small, contained change.

**A grim-looking wall.** → Mitigated by rendering misses as blank white rather than crosses, so a bad week reads as sparse rather than as a public telling-off.

**Shared password is weak by design.** → Anyone with the password has full write access and there is no audit trail of who changed what. Accepted: the blast radius is two children's sticker records. Cloudflare Access is the upgrade path if that ever stops being true.

## Migration Plan

Greenfield, so this is an initial rollout rather than a migration.

1. Create the D1 database and apply the schema; seed the two `children` rows.
2. Set Worker secrets for the admin password hash and the display header value. Confirm the app fails closed with either absent.
3. Deploy to a Workers preview URL. Verify `/display` renders correctly at exactly 800×480 in a headless browser.
4. Point the TRMNL Screenshot plugin at the preview URL with the custom header and confirm a real capture on the physical panel — this is the step that validates the pixel sizes.
5. Promote to the production URL and set TRMNL's refresh interval.

**Rollback:** revert the Worker deployment. D1 is unaffected by a rollback, and the only stateful risk is the schema, which is created once and not altered by this change. If the panel shows nothing, the wall falls back to what it was before: a piece of paper.

## Open Questions

- **Which typeface.** Needs to be heavy enough to survive 2-bit conversion at small sizes. Decidable when the layout is checked against the real panel; it does not affect structure.
- **TRMNL refresh interval.** A trade-off between how quickly a sticker appears and battery life. Purely a runtime setting, changeable at any time.
- **Whether admin needs login rate limiting.** Probably unnecessary behind an unguessable URL for two users, but trivial to add later via Cloudflare's own tooling if wanted.
