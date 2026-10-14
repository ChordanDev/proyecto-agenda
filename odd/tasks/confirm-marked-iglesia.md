# Confirm the marked iglesia (issue #68)

## Objective

In "Elegir iglesia", what is confirmed is always what is seen marked.

## Problem and why

The rule lived loose inside `ElegirIglesiaScreen.tsx` and had three gaps: while saving, another row could be marked (one iglesia marked, another saved); in that same window "Volver" could leave with the iglesia already saved; and after a save error the message stayed even if another iglesia was marked or the search changed. No data is lost (the write is local); the risk is the hermano seeing a different iglesia than the saved one.

## Scope

- A pure domain rule deciding whether "Continuar" can confirm, and one deciding whether the screen still accepts changes given the save state.
- Wiring both into `ElegirIglesiaScreen`, and clearing the save error on new input.

Out of scope: "Volver" when there is no previous screen (#69).

## Constraints

- Domain in `iglesias/dominio`, pure, unit tests first. No visual change. Comments and commits in English.

## Decisions

- `puedeConfirmar(idMarcada, visibles)`: marked and among the visible results.
- `aceptaCambios(estado)`: false while `pending` and once `success`; row taps and "Volver" do nothing then (the navigation to the calendar wins).
- The save error is cleared with `mutation.reset()` when another row is marked or the search text changes; only when in error state, so a pending save is never detached.
- Test-first: applicable to the domain rule; the screen has no automated tests in v1.

## Tasks

- [x] **T1 — Domain rules.** `puedeConfirmar.ts` with tests. Route: inline (one small file plus its test, no research). Checks: RED observed (module not found), then GREEN 6/6.
- [x] **T2 — Wire into the screen.** Row taps, "Volver" and error clearing. Route: inline (one file edit, understood). Checks: `npm run typecheck`, `npm run lint`, `npm test`.
- [ ] **T3 — Observed on device.** Pending: rapid row tap and "Volver" during the save, error cleared by marking another row or typing. Not possible for the writer.

## Acceptance criteria

Those of issue #68.

## Progress

Branch `feat/68-confirm-marked-iglesia` from `feat/66-cargos-rule-cases`.
Checks: typecheck, lint (eslint + prettier) and `npm test` (16 suites, 245 tests) pass.
Commit `c3f5ae3` fix: confirm always the marked iglesia (#68) (T1+T2, one work unit).
Review: not assessed by the writer. Engram mirror: pending.

## Next step

T3 on device, then PR to the stack base.
