# Event model and public read (issue #20)

## Objective

The database stores eventos with their duenio, alcance, enfasis and dates, anyone can read them without a session, and the `datos` layer returns the calendario of an iglesia for a month from simulated data.

## Problem and why

The skeleton only has the structure (asociaciones, distritos, iglesias). Every calendar and event ticket of the v1 (#24, #26, #33 to #36) is blocked until the event model exists and can be read. Write policies arrive later with #21.

## Scope

- One migration: enums `enfasis`, `alcance`, `repeticion`; tables `eventos`, `eventos_fechas`, `iglesias_sumadas`; read-only RLS.
- pgTAP tests: public read, rejected writes, the single-duenio constraint.
- Seed: simulated eventos of the three alcances, with and without enfasis.
- Regenerated `src/shared/database.types.ts`.
- Domain rule `armarCalendario` with Jest tests written first.
- `datos` query that returns the calendario of an iglesia for a month.

Out of scope: write policies and cargos (#21), screens (#24, #26), generating the dates of a series (#35, #36), expanding a multi-day event into days (#34), the form validation (#33).

## Constraints

- Glossary terms in Spanish without accents; `duenio` for "dueño". Comments and commits in English.
- `dominio` is pure TypeScript. A component never calls Supabase.
- `main` was fetched before creating the migration (branch is level with `origin/main` at `8f70723`).
- The generated types must match the schema: CI regenerates them and fails on a diff.

## Decisions

- **Enums.** `enfasis`: `identidad`, `liderazgo`, `nuevas_generaciones`, `discipulado`. A null `enfasis` is an "Actividad regular". `alcance`: `iglesia`, `distrito`, `asociacion`. `repeticion`: `ninguna`, `semanal`, `mensual`.
- **Duenio.** Three nullable foreign keys on `eventos` (`duenio_iglesia_id`, `duenio_distrito_id`, `duenio_asociacion_id`) and one check constraint: exactly the column that matches `alcance` is set, the other two are null.
- **Dates.** `eventos_fechas (evento_id, fecha)` holds one row per date, primary key on both columns. The start date of an evento is its first row, so `eventos` has no start date column. `fecha_fin` lives on `eventos` (as the issue lists it): a multi-day evento has a single date row plus its `fecha_fin`.
- **Local time.** `fecha` and `fecha_fin` are `date`, `hora` is `time` (without time zone). No `timestamptz` anywhere in the event model.
- **Series columns.** `repeticion` defaults to `ninguna`; `fin_de_serie` ("Hasta") is set if and only if the evento repeats; an evento with `fecha_fin` cannot repeat. The one-year cap of "Hasta" stays in the domain (#35) because it is relative to the day of the edit.
- **`lugar` is nullable.** The spec makes only titulo, fecha, hora and duenio mandatory in the form, and the detail hides empty fields.
- **Iglesias sumadas.** `iglesias_sumadas (evento_id, iglesia_id)`, primary key on both. No screen in the v1.
- **Who owns the calendario rule.** The domain function decides which eventos belong to an iglesia and removes duplicates. The query narrows what it downloads with the same criteria only as an optimisation; the result always goes through the domain function.
- **Feature placement.** Event types in `eventos/dominio`; `armarCalendario` and the query in `calendario`.

## Tasks

- [x] **T1 — Schema, permissions and seed.** Migration, pgTAP test, seed, regenerated types. Route: delegated (2+ non-trivial files). Checks: `npm run db:reset`, `npm run db:test`, `npm run db:types` leaves no diff after commit, `npm run typecheck`, `npm run lint`.
- [ ] **T2 — Calendario rule in the domain.** Event types and `armarCalendario`, tests first (RED, then GREEN). Route: delegated (same writer as T3). Checks: `npm test`, `npm run typecheck`, `npm run lint`.
- [ ] **T3 — Calendario query.** `getCalendarioDeIglesia(iglesiaId, month)` and its TanStack Query hook, verified against the seeded local Supabase. Route: delegated. Checks: `npm run typecheck`, `npm run lint`, a one-off script that prints the calendario of two seeded iglesias.

## Acceptance criteria

Those of issue #20.

## Delivery

Strategy: `single-pr` — project policy is one short branch per ticket, squash-merged to `main`. Forecast: about 600 authored lines (generated types excluded), most of it SQL tests and seed data that cannot ship without the migration they exercise.

## Progress

Branch `claude/issue-20-ca1355`. Review boundary starts at `8f70723`.

- **T1 done** in `b6187a3` (delegated writer). RED observed first: `npm run db:test` failed 54/54 on `eventos_permisos.test.sql` before the migration was applied (`relation "public.eventos" does not exist`). Observed after: `npm run db:reset` applied both migrations and loaded the seed; `npm run db:test` passed, 2 files, 81 tests (27 structure, 54 eventos); `npm run db:types` left no diff after the commit; `npm run typecheck` and `npm run lint` clean; `npm test` 9 passed.
  - Added beyond the listed decisions: the constraint `eventos_titulo_not_blank`, and a test that no column of the event model is a timestamp or carries a time zone.
  - Seed: 14 eventos (`e0000000-…-01` to `14`), 2 iglesias sumadas. Evento `09` (Córdoba Central) adds Argüello, outside its alcance; evento `06` (distrito Córdoba Norte) adds Villa Allende, inside its alcance: the duplicate `armarCalendario` must collapse.
  - Not enforced by the schema (needs more than a check constraint): an evento of alcance asociacion can still receive iglesias sumadas, and `fecha_fin` / `fin_de_serie` are not compared with the first date in `eventos_fechas`.
