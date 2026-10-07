# Project skeleton (issue #18)

## Objective

Stand up the project end to end with the minimum: the Expo app opens as a development build and shows real data read from the local Supabase, and a pull request to `develop` cannot merge when a check fails.

## Problem and why

The repository has no code. Every other v1 ticket is blocked until the app, the local database, the first tests of each kind and the CI checks exist. The first tests set the style for the rest.

## Scope

- Expo app (React Native, strict TypeScript, Expo Router, `expo-dev-client`) at the repository root.
- Five features (`calendario`, `eventos`, `iglesias`, `sesion`, `ajustes`), each with `dominio`, `datos`, `interfaz`, plus `src/shared`.
- `supabase/`: one migration with `asociaciones`, `distritos`, `iglesias`; read-only RLS; seed data; pgTAP test.
- Generated database types.
- One screen showing real data through the `datos` layer of `iglesias`.
- GitHub Actions: four required checks on pull requests to `develop`; migrations applied to the development Supabase on merge to `develop`.

Out of scope: events, login, the approved screens, offline cache persistence, the unión level.

## Constraints

- Glossary terms in Spanish without accents (`iglesias`, `distritos`, `asociaciones`); everything else in English. Comments and commits in English.
- A component never calls Supabase. Routes only connect a URL with a screen.
- No secret in a versioned file. Local keys live in `.env.local` (ignored); `.env.example` documents the names.
- Package manager: npm. Supabase CLI as a dev dependency (`npx supabase`).
- Design tokens come from `diseno/theme.ts`.

## Decisions

- `iglesias.excluida_del_buscador boolean not null default false` is the mark that hides a church from "Elegir iglesia". The row stays readable; the search filters it.
- RLS enabled on the three tables with a single `select` policy for `anon` and `authenticated`. No write policy exists, so the app cannot modify the structure.
- Bundle identifier `com.chordandev.agendadeiglesia` is a placeholder until the association provides the definitive one.

## Tasks

- [x] **T1 — Expo app and structure.** Scaffold the app, strict TypeScript, Expo Router, dev client, ESLint + Prettier, Jest, the five features with three layers and `src/shared`. Route: delegated (2+ non-trivial files). Checks: `npm run typecheck`, `npm run lint`, `npm test`.
- [x] **T2 — Database structure.** `supabase init`, migration, RLS, seed (one asociación, several distritos and iglesias, one excluded church), pgTAP test with one allowed and one rejected case, generated types. Route: delegated. Checks: `npx supabase db reset`, `npx supabase test db`.
- [ ] **T3 — Real data on screen.** Supabase client in `src/shared`, `iglesias/datos` query, first domain rule with its Jest test written first, `iglesias/interfaz` screen wired from a route. Route: delegated. Checks: `npm run typecheck`, `npm run lint`, `npm test`.
- [ ] **T4 — Continuous integration.** Workflow with four jobs (types, style, domain tests, permission tests on a local Supabase from scratch) on pull requests to `develop`; workflow that pushes migrations to the development Supabase on push to `develop`; README with setup steps. Route: delegated. Checks: workflow YAML parses; commands match the npm scripts.
- [ ] **T5 — Development build.** Build and run on the iOS simulator and on the Android phone; confirm the screen shows seeded data. Route: inline (per-action). Checks: observed screen.

## Acceptance criteria

Those of issue #18.

## Needs a person

- Create the development Supabase project (São Paulo) and load `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD` and `SUPABASE_PROJECT_ID` as GitHub secrets.
- Mark the four checks as required in the branch protection of `develop`.
- Android build on the physical phone (this machine has no JDK 17 nor Android Studio).

## Delivery

Strategy: `single-pr` — project policy is one short branch per ticket, squash-merged to `develop`. Forecast exceeds 400 authored lines because a scaffold cannot be split into working slices.

## Progress

Branch `feat/18-project-skeleton`.

- **T1** — commit `feat: scaffold Expo app with feature layers and style checks`. Observed: `npm run typecheck` clean; `npm run lint` clean (ESLint + Prettier); a temporary probe importing Supabase from `interfaz/`, `src/app/` and React from `dominio/` produced 5 `no-restricted-imports` errors, then was removed. `npm test` has no test yet (the first one arrives with T3).

## Next step

T2.
