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
- [x] **T2 — Calendario rule in the domain.** Event types and `armarCalendario`, tests first (RED, then GREEN). Route: delegated (same writer as T3). Checks: `npm test`, `npm run typecheck`, `npm run lint`.
- [x] **T3 — Calendario query.** `getCalendarioDeIglesia(iglesiaId, month)` and its TanStack Query hook, verified against the seeded local Supabase. Route: delegated. Checks: `npm run typecheck`, `npm run lint`, a one-off script that prints the calendario of two seeded iglesias.

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
- T1 review: medium risk, consent granted, approved and acknowledged (lineage review-890a4ec21aaafbaf); its one suggestion (keys and cascades untested) was taken as extra pgTAP cases. Review boundary: 2347350.
- **T2 done** in `19c9a91` (delegated writer). RED observed first, twice: `npm test` failed both new suites with `Cannot find module` before the files existed, and then, against pass-through stubs, 22 of the 31 new tests failed on their assertions (every exclusion, de-duplication, ordering and month-range case). Observed after: `npm test` 3 suites, 41 tests passed; `npm run typecheck` and `npm run lint` clean.
  - Added beyond the listed decisions: `titulo` is compared with `localeCompare(…, 'es')`, so an accented titulo is not sent to the end of its day; ties after date, hora and titulo keep the order of the input; `getMonthRange` throws a `RangeError` for a month outside 1 to 12.
- **T3 done** in `cedda2e` (same writer). One request reads the iglesia with its distrito, the asociacion of that distrito and the ids of the eventos it is sumada to; two parallel requests read `eventos_fechas` with `eventos!inner (…, iglesias_sumadas (iglesia_id))`, both narrowed with an `or` on the embedded `eventos` (the three duenio columns plus `id.in.(…)` for the sumadas): the dates inside the month, and the dates before it whose `eventos.fecha_fin` reaches it. PostgREST cannot put a column of `eventos_fechas` and one of the embedded `eventos` in the same `or`, hence two requests. The result always goes through `armarCalendario`.
  - Checked against the seeded local Supabase with a temporary Jest test that called `getCalendarioDeIglesia` (not committed). Córdoba Central: October 6 dates (4 Culto de oración, Encuentro de familias del distrito, Congreso de Jóvenes), November 8 (the Congreso with its real date 2026-10-30, 4 Culto de oración, Día de ayuno y oración, Escuela de líderes, Vigilia de oración del distrito), December 6 (5 Culto de oración, Concierto de Navidad). Villa Allende: October 1 (Congreso), November 4 (Congreso, Día de ayuno, Escuela de líderes and the Campamento de Conquistadores once). Argüello: November 5, December 1 (Concierto de Navidad, as sumada). Villa María Centro: October 1, November 3, December 1 (Caminata misionera), with no evento of Córdoba Central or its distrito. An unknown iglesia id rejects with a clear error.
  - Added beyond the listed decisions: an unknown iglesia throws instead of returning an empty calendario; an evento whose duenio column does not match its alcance throws instead of being skipped.
  - Known limits: the ids of the eventos where the iglesia is sumada travel in the URL, which is fine while sharing has no screen (v1) but needs another shape if an iglesia accumulates hundreds; the fetch that `jest-expo` installs cannot reach a real server, so the temporary check had to restore the fetch of Node in a custom test environment.
- **Extra pgTAP cases** in `eb9fcb2`: a duplicate `(evento_id, fecha)` and a duplicate `(evento_id, iglesia_id)` raise 23505, and deleting an evento removes its dates and its iglesias sumadas. `npm run db:test` passed, 2 files, 86 tests (27 structure, 59 eventos).
- T2 and T3 review: medium risk, consent granted, approved and acknowledged (lineage review-c689a14228a1699b). Three advisory findings left as later work: `getCalendarioDeIglesia` has no committed test (the project has no test category for the `datos` layer; it was checked by hand against the seed), the embedded `distritos` object is read without a guard, and `getMonthRange` does not validate the year. Review boundary: 9511610.
- **External advisory review of the pull request** (two confirmed findings, both applied): `getMonthRange` now rejects a year outside 1 to 9999 with a `RangeError`, test first (RED: 1 of 12 failed); the migration gains the partial index `eventos_fecha_fin_idx`, pinned with `has_index` (RED: 1 of 60 failed). The migration was edited in place because it had not been applied outside the local Supabase. Observed after: `npm test` 43 passed; `npm run db:test` 87 passed (27 structure, 60 eventos); `npm run typecheck`, `npm run lint` clean; `npm run db:types` left no diff. The benefit of the index was not measured: with the seed the planner has no reason to use it.
