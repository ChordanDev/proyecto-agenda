# Calendar header from the iglesia read (issue #73)

## Objective

The header of the calendar (nombre of the iglesia and of its distrito) and the check that the iglesia elegida still exists come from the read by id that the calendar already makes, not from the full list of iglesias.

## Problem and why

`useIglesiaDeCalendario` looked the iglesia elegida up in `['iglesias']`. If only that list failed, the header stayed empty all session with no "Reintentar"; every opening of the calendar downloaded the whole table for two texts; and a deleted iglesia elegida was detected only if the list loaded. Findings F1 and two native warnings of #24 (PR #72).

## Scope

- `getCalendarioDeIglesia` also returns `iglesia: { nombre, distrito } | null`, read in the by-id query it already makes. `null` means the iglesia does not exist; then no dates are read.
- `useIglesiaDeCalendario` no longer uses `useIglesias`. The screen takes the header from the calendar read; its "Reintentar" refetches that read.
- Pure domain rules, tests first: `armarNombresDeDistritos` (nombres of distritos for the alcance label) and `armarCalendarioDeIglesia` (shape of the query result, including the missing iglesia).

Out of scope: "Elegir iglesia" (keeps the full list), the signed-in path (unchanged), filters of #25.

## Constraints

- No Supabase in components or `dominio`. Allowed edits only under `src/features/calendario/**` and this file.
- About 400 authored changed lines per task is a planning heuristic only.

## Decisions

- **Missing iglesia is a null row, not an error.** `maybeSingle` already returns null data; the read answers `iglesia: null` with empty dates, and the screen shows "Elegir mi iglesia". A failed read stays an error (Reintentar).
- **The header goes with each month's read** (it is in the query result). To avoid it vanishing while the next month loads, the screen keeps the last header read; `MonthOfCalendario` is keyed by the iglesia so another iglesia starts from today without the old header.
- **Usuario path unchanged**: its header still comes from the covered iglesias (`encabezadoDeUsuario`).
- **Header absent on a failed read**: the error with "Reintentar" shows in the day list; a retry brings back header and events.

## Tasks

- [x] **T1 — Domain rules, tests first.** `nombresDeDistritos`, `calendarioDeIglesia`. Route: inline. RED then GREEN with `npm test`.
- [x] **T2 — Data and screen.** `getCalendarioDeIglesia`, `getFechasDelMes`, `useCalendario`, `useIglesiaDeCalendario`, `CalendarioScreen`. Route: delegated writer (this one); no further delegation.
- [ ] **T3 — Observed on device.** Header, offline error with Reintentar, missing iglesia elegida, "Elegir mi iglesia" round trip, on iOS and Android. PENDING: not possible for the writer.

## Acceptance criteria

Those of issue #73.

## Progress

Branch `feat/73-header-from-iglesia-read`, stacked on `feat/69-volver-without-previous`.

- RED observed: both new suites failed on the missing modules. GREEN: 2 suites, 8 tests; full run 19 suites, 255 tests.
- Select shape verified with curl against the local Supabase: `iglesias?select=id,nombre,distrito_id,distritos(nombre,asociacion_id),iglesias_sumadas(evento_id)` returns the expected row; an unknown id returns 0 rows (`maybeSingle` gives null).
- Checks: `npm run typecheck`, `npm run lint`, `npm test` pass.
- Commit: `8245edd` fix: calendar header from the iglesia read (#73). Engram mirror: `odd/header-from-iglesia-read/tasks`, summary (full document in this file).

## Next step

Observe T3 on device; then PR (human decision).
