# Calendar: filters by énfasis (issue #25)

## Objective

The hermano filters the calendar by énfasis, with "Actividad regular" as one more option, to see only the activities they care about. The filter affects the markers of the month and the list of the day.

## Problem and why

The monthly calendar (#24) shows every event of the iglesia, its distrito and the asociación. Story 20 of #17 asks to hide what does not interest the hermano. The approved design already draws the "Filtrar" row and its bottom sheet in `04a-calendario.html`; #24 left them out on purpose.

## Scope

- Five options: Somos, Formamos, Integramos, Hacemos and Actividad regular, each with its shape and colour.
- A domain rule that filters the fechas; the same result feeds the grid markers and the day list.
- The "Filtrar" row (summary text, button with the count of hidden options) and its bottom sheet, as in the mockup.

Out of scope: the pastor/admin filter by iglesia (own ticket), persisting the filter across sessions.

## Constraints

- Values from `@/shared/theme`; sizes missing from the tokens are named constants with the HTML line in a comment.
- No new native library (the sheet uses React Native's `Modal`).
- Glossary terms in Spanish without accents, the rest in English. Comments and commits in English; UI copy in Spanish as in the mockup.
- Domain rule written test-first; screens have no automated tests in v1.
- Allowed edit surfaces: this document, `src/features/calendario/dominio/**`, `src/features/calendario/interfaz/**`, `src/shared/ui/**`. Nothing in `supabase/**`.

## Decisions

- **Nothing selected shows nothing.** The brief proposed showing everything, but the approved mockup says otherwise: unchecking every option makes the summary read "Nada seleccionado", and its events are filtered by the checked options only. The rule follows the approved design; "Mostrar todo" in the sheet is the way back. The user can overturn this on merging.
- **State is the list of selected options**, all five by default, kept by `CalendarioScreen` (the month component). It lives while the screen lives; it is not persisted and it survives month changes.
- **Rule shape.** `filtroDeCategorias.ts` holds `filterFechasByCategorias`, `toggleCategoria` (keeps the order of the design), `countHiddenCategorias` (the badge) and `formatFiltroSummary` ("Mostrando todo" / "Mostrando: Somos, …" / "Nada seleccionado").
- **Sheet** is a transparent `Modal` with a slide animation: dark scrim (tap closes), 24 radius handle sheet, five checkbox rows with `FormaDeEnfasis`, and "Mostrar todo" / "Listo". The mockup's sheet is part of the phone frame; `Modal` covers the whole screen including the bottom bar, an accepted difference.
- **Badge** with the hidden count appears only when something is hidden, as in the mockup.
- **Empty states unchanged:** a filtered-out day reads "No hay eventos este día."

## Tasks

- [x] **T1 — Filter rule.** Test first, then code. Route: inline (one small rule plus its test; the design was read inline). Checks: `npm test`.
- [x] **T2 — Filter UI and wiring.** `FiltroDeCategorias` (row and sheet) and `CalendarioScreen` holding the state and passing the filtered fechas to `MonthGrid` and `EventosOfDay`. Route: inline (two files, one component written from the mockup already read). Checks: `npm run typecheck`, `npm run lint`, `npm test`.
- [ ] **T3 — Observed on device.** iOS and Android against the mockup and capture `4a`. Pending: needs a device; not possible for the writer.

## Acceptance criteria

Those of issue #25. The visual match on iOS and Android is observed in T3.

## Progress

Branch `feat/25-emphasis-filters`, from `feat/29-login-user-calendar` (PR #76, not merged).

- T1 — RED observed: `npx jest src/features/calendario/dominio/filtroDeCategorias` failed with "Cannot find module './filtroDeCategorias'". GREEN observed after the code: 12 tests passed.
- T2 — checks: `npm run typecheck` clean, `npm run lint` clean, `npm test` 15 suites and 176 tests passed, `npx prettier --check` clean.
- Commits: `bfcf67f` feat: emphasis filters on the calendar (#25).
- Engram mirror: `odd/emphasis-filters/tasks`.

## Next step

Observe the filter on iOS and Android (T3); the user decides on "nothing selected shows nothing".
