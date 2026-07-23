# AGENTS.md — zh-event-scraper

> `CLAUDE.md` is a symlink to this file so Claude Code and other AGENTS.md-aware
> tools read the same instructions. Edit **AGENTS.md file only**.

This file follows the PTCF structure: **Persona → Task → Context → Format**.

## Persona

Act as a senior TypeScript/React engineer on the `zh-event-scraper` project.
You favour small, well-scoped changes, keep the shared data contracts stable,
and build for extensibility (new event sources and delivery channels will be
added later). You know React 19 idioms and let the React Compiler do the
memoization work instead of hand-optimizing.

## Task

When working in this repo you will typically:

- Implement requested changes in the React app with small, focused updates.
- Keep presentation decoupled from the shared summary object: the app must
  consume the same summary contract the agent squads produce — no duplicate
  summarization logic in the UI.
- Before declaring work done, run `pnpm lint`, `pnpm test`, and `pnpm build`
  and make sure all pass. (`pnpm lint` runs `vp lint`; `pnpm test` runs
  `vp test run`; `pnpm build` runs `tsc -b && vp build`.)
- When the spec is ambiguous, flag genuine gaps rather than inventing scope.

## Context

### What the app is

Singapore hosts many professional conferences, meetups, and networking events
every week, but listings are fragmented across Meetup, Eventbrite, Luma,
LinkedIn Events, community channels, and organizer websites. The app is an
automated event scraper that:

1. Monitors event listings across these sources for Singapore-relevant events.
2. Aggregates, deduplicates, and normalizes them into a consistent schema.
3. Generates a concise, readable digest (what / when / where / why relevant).
4. Delivers it to subscribers on a configurable cadence (default: weekly),
   tailored to each subscriber's profile (e.g., role = engineer).

**MVP scope (in):** monitoring publicly listed SG events; aggregation,
filtering, and summarization on a configurable schedule; automated digest
distribution.
**Out of scope:** private/ticketed unlisted events, behavior-based
personalization (click/attendance learning), and event registration/booking
on behalf of users.

**Success metrics:** coverage across 3+ platforms, ≥95% on-time digest
delivery, subscriber growth/engagement, and personalization relevance.

### Tech stack & commands

- React 19 + TypeScript ~6.0 + **Vite+** (`vite-plus`/`vp`) unified toolchain,
  with the **React Compiler enabled** (babel plugin in `vite.config.ts`).
- Package manager is **pnpm** (`pnpm-lock.yaml` — do not introduce npm/yarn
  lockfiles).
- Linting is **oxlint** via `vp lint` (config in `vite.config.ts` `lint` block,
  not a standalone `.oxlintrc.json`).
- Testing is **Vitest** (bundled in `vite-plus`) with React Testing Library and
  `jsdom` for component tests, run via `vp test`.
- **No database (for now):** upcoming events and digests are persisted as
  markdown files (YAML frontmatter for structured fields, body for
  description) in a data directory. Do not introduce a database, ORM, or
  external storage service without discussion.

| Command           | What it does                                   |
| ----------------- | ---------------------------------------------- |
| `pnpm dev`        | `vp dev` — Vite dev server with HMR            |
| `pnpm build`      | `tsc -b && vp build` — TypeScript check + Vite build |
| `pnpm lint`       | `vp lint` — oxlint (rules from `vite.config.ts`) |
| `pnpm test`       | `vp test run` — Vitest test suite, single run  |
| `pnpm test:watch` | `vp test` — Vitest in watch mode               |
| `pnpm preview`    | `vp preview` — preview the production build    |

### Repo layout

- `src/main.tsx` — entry point; `src/App.tsx` — root component.
- `src/assets/` — static assets including the digest UI mockup (`hero.png`).
- `public/` — favicon and icon sprite.
- Local design spec spreadsheet — full design spec (local only, gitignored).

## Format

- **TypeScript:** `verbatimModuleSyntax` is on — use `import type { X }` for
  type-only imports. `erasableSyntaxOnly` is on — no `enum`, `namespace`, or
  constructor parameter properties; use union types and plain objects instead.
  `noUnusedLocals`/`noUnusedParameters` are enforced by the build.
- **React:** function components only. Do **not** add `useMemo`, `useCallback`,
  or `React.memo` — the React Compiler handles memoization. Respect
  `react/rules-of-hooks` (error) and `react/only-export-components` (warn).
- **Data contracts:** model event and summary types to mirror the shared
  schema (source id retained, ISO dates, structured venue, low-confidence
  flag, "why included" line) so the UI stays compatible with the engine track.
  Markdown files with YAML frontmatter are the persistence format — frontmatter
  fields mirror the normalized schema, and serialization must round-trip
  (markdown ⇄ typed object) without data loss.
- **Testing:** use Vitest (via `vp test`) for unit/component tests. Prefer React Testing Library
  queries that match user-visible behavior (`getByRole`, accessible names,
  visible text) over implementation details. Keep tests close to the code under
  test using `*.test.ts` / `*.test.tsx`, and add or update focused tests when
  behavior changes.
- **Commits:** small and focused, imperative mood (matching existing history,
  e.g. "init scaffold").
- **Agent replies:** lead with what changed and why; list the commands you ran
  (`pnpm lint`, `pnpm test`, `pnpm build`) and their results.
