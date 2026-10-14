# "Volver" without a previous screen (issue #69)

## Objective

In "Elegir iglesia", "Volver" never does nothing: with no screen behind it, it goes to the first screen of the app.

## Problem and why

`router.back()` does nothing when the screen is alone in the stack. Today it is unreachable (only entered from the Bienvenida), but #28 (change iglesia from Ajustes) and deep links will open it differently.

## Scope

- Share the firstScreen-to-route map between `src/app/index.tsx` and the screen.
- "Volver" and Android's system back: previous screen if any, else the first screen per `getFirstScreen`.

Out of scope: what "Continuar" leaves in the stack (#28).

## Constraints

- Routes files only connect URL and screen. Keep the #68 guard (`aceptaCambios`). Comments and commits in English.

## Decisions

- The map lives in `src/features/sesion/dominio/firstScreenRoute.ts` (not `src/shared`): it depends on the `FirstScreen` type of sesion, and `shared` must not import from a feature.
- No previous screen: `router.replace(firstScreenRoute(firstScreen))`. If `useFirstScreen` is still loading, `router.replace('/')`: the start route redirects as soon as it is known, so Volver never blocks nor guesses.
- Android back: with a single screen Expo Router lets the app close. A `BackHandler` listener (registered only while the screen is focused, via `useFocusEffect`) applies the same rule, and swallows the press while saving or once saved, as "Volver" does.
- Test-first on the pure map; the screen has no automated tests in v1.

## Tasks

- [x] **T1 — Shared route map.** `firstScreenRoute.ts` + test; `index.tsx` uses it. Route: inline (tiny files). RED: module not found; GREEN 2/2.
- [x] **T2 — Volver and system back.** Route: inline (one file edit). Checks: typecheck, lint, test.
- [ ] **T3 — Observed on device.** Pending, iOS and Android (incl. system back), with and without a screen behind. Not possible for the writer.

## Acceptance criteria

Those of issue #69.

## Progress

Branch `feat/69-volver-without-previous` from `feat/68-confirm-marked-iglesia`.
Checks: typecheck, lint, `npm test` (17 suites, 247 tests) pass.
Commit: see git log (`fix: volver goes to the first screen when there is no previous one (#69)`).
Review: not assessed by the writer. Engram mirror: see below.

## Next step

T3 on device, then PR to the stack base.
