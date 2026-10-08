# Choose iglesia screen (issue #23)

## Objective

The hermano searches their iglesia by name among all those of the asociación, confirms it with "Continuar" and it stays stored on the phone as the iglesia elegida.

## Problem and why

"Elegir mi iglesia" on the Bienvenida opens today a temporary list left by the skeleton (#18): it has no search, no selection and stores nothing, so the hermano can never get past the first step. Stories 3 to 7 of #17 ask for a search by name that ignores case and accents, results that show distrito and localidad, an explicit confirmation and a choice that survives closing the app.

## Scope

- The approved design of the screen, updated first as #17 requires: no "Usar mi ubicación", no distances, each row shows distrito and localidad.
- The "Elegir iglesia" screen as in `diseno/pantallas/03-elegir-iglesia.html`, replacing the temporary list.
- Writing the iglesia elegida when "Continuar" is pressed, and going to the calendar.
- Two shared components the mockup needs and other approved screens reuse: the round back button and the search field.

Out of scope: location and distances (v2), the calendar itself (#24), changing the iglesia from Ajustes (#28), the offline cache (#27).

## Constraints

- Values come from `@/shared/theme`. Sizes missing from the tokens are read from the mockup and kept as named constants with the HTML line in a comment, never invented.
- A component never calls Supabase nor the phone storage: it asks the `datos` layer of its feature. Routes only connect a URL with a screen.
- The search rule is the existing `buscarIglesias` (`iglesias/dominio`), already covered by nine tests: by nombre, ignoring case and accents, excluded iglesias never returned. No database change is needed: `localidad` and `excluida_del_buscador` exist and anyone can read them.
- Glossary terms in Spanish without accents; everything else in English. Comments and commits in English; UI copy in Spanish, in the voice of the approved mockups ("Elegí", "Podés").
- No new native library.

## Decisions

- **Design update.** The location button and the heading "Más cercanas" are removed (the heading only made sense with distances; nothing replaces it). The second line of each row is `distrito · localidad`. The placeholder becomes "Buscar por nombre", because #17 fixes the search to the nombre. The radiogroup is labelled "Iglesias".
- **No preselection.** Nothing is selected on entry and "Continuar" stays disabled until an iglesia is picked, so nobody confirms one by mistake (story 6). The mockup keeps one row selected only to show the selected state.
- **What is confirmed is always visible.** If the search hides the selected iglesia, "Continuar" is disabled again; clearing the search brings the selection back.
- **Empty search shows every iglesia** of the asociación (excluded ones aside), ordered by nombre. No minimum number of characters.
- **"Continuar" is pinned** to the bottom, outside the scroll. With the four rows of the mockup it lands exactly where the mockup draws it; with a real asociación the hermano does not have to scroll past every iglesia to reach it.
- **States the mockup does not draw** (loading, load error with retry, no results) are shown as text inside the white card, with the mockup's typography.
- **After confirming** the iglesia elegida is written, the query `['iglesiaElegida']` is invalidated and the calendar replaces the whole stack, so "back" does not return to the Bienvenida. If writing fails, the screen stays and says so.
- **Picking an iglesia closes the keyboard.** Observed on iOS: the keyboard covers "Continuar", so after searching and picking there was nothing in sight to confirm with.
- **Test-first exception.** This ticket adds no domain rule: the search rule exists with its tests. Screens have no automated tests in v1 (project policy); the screen is observed on iOS and Android.

## Tasks

- [x] **T1 — Design update.** `03-elegir-iglesia.html` without location nor distances, rows with distrito and localidad, and its capture regenerated from the updated mockup. Route: delegated (same writer as T2). Checks: structural readback of the HTML; the capture opens and shows the new rows.
- [x] **T2 — Elegir iglesia screen.** Shared `BackButton` and `SearchField`; the screen with search, selectable rows, the three undrawn states and the pinned "Continuar"; the mutation that writes the iglesia elegida; the route; the temporary list removed. Route: delegated (2+ non-trivial files, reading the mockup prepares the write). Checks: `npm run typecheck`, `npm run lint`, `npm test`.
- [x] **T3 — Observed on device.** Development build on iOS and Android: the screen against the updated capture, search with accents and capitals, the excluded iglesia absent, nothing stored before "Continuar", the choice still there after reopening the app. Route: inline (per-action). Checks: observed screens.

## Acceptance criteria

Those of issue #23.

## Delivery

Strategy: `single-pr` — project policy is one short branch per ticket, squash-merged to `main`. Forecast: about 400 authored lines (the capture excluded).

## Progress

Branch `claude/issue-23-afa760`, fast-forwarded to `f6d44bc` (main). Review boundary: `f6d44bc` (branch point).

- T1 — `4fa0831` docs(diseno): update the Elegir iglesia mockup without location nor distances. The capture was regenerated by expanding the mockup template to static HTML and taking a headless Chrome screenshot at 390x844, 2x; the same method over the old mockup matched the committed capture within one colour level per channel.
- T2 — `1da2d34` feat(ui): add the back button and the search field; `2731032` feat(iglesias): add the Elegir iglesia screen. `BackButton` and `SearchField` in `src/shared/ui`; `useElegirIglesia` (mutation, `networkMode: 'always'`, invalidates `['iglesiaElegida']`); `ElegirIglesiaScreen` replaces the temporary list; after confirming, `router.dismissAll()` then `router.replace('/calendario')` (expo-router 57: `dismissTo` leaves the Bienvenida underneath when the target is not in the stack).
- T3 — `d1219f6` fix(iglesias): close the keyboard when an iglesia is picked (found while observing on iOS).
- Checks observed on `d1219f6`: `npm run typecheck` clean, `npm run lint` clean, `npm test` 5 suites and 67 tests passed (writer on `2731032`, parent again on `d1219f6`).
- Observed on iOS (iPhone 17 simulator, iOS 26.2) and Android (emulator API 36.1), development build against the local Supabase with the seed:
  - The screen matches the updated capture: header, title, search field, one card with `distrito · localidad` rows, "Continuar" pinned and disabled on entry. No location button, no distances.
  - "CORDOBA" finds "Córdoba Central" and "Nueva Córdoba"; "guem" finds "Barrio Güemes"; "RIO" finds "Barrio Güemes", "Río Ceballos" and "Río Cuarto Central".
  - "Iglesia de prueba" (excluded from the search) never appears.
  - Picking a row stores nothing (iOS: no AsyncStorage manifest on the phone). After "Continuar" the phone holds the id of the picked iglesia and the calendar opens.
  - Reopening the app goes straight to the calendar on both. On Android the system back button on the calendar leaves the app; it does not return to this screen nor to the Bienvenida.
- Authored lines: 460 insertions and 129 deletions against `f6d44bc`, capture and this document excluded; 111 of the deletions are the removed temporary list. Past the 400 forecast because the screen carries four states the mockup does not draw.
- Not observed: the load-error state with "Reintentar", the save-error text and the "no iglesias" text (they need a failing network or storage); VoiceOver and TalkBack.

## Review

Native review of `f6d44bc..6ab60bf`: assessed medium (`slice_budget_reached`, 10 paths, 670 lines), consent granted, one lens (reliability), approved and acknowledged (lineage `review-d02295ceafeb6299`). Reviewed boundary: `6ab60bf`.

Advisory findings, none blocking, left as later work:

- WARNING — the load error with "Reintentar", the "no iglesias" text and the save error are proved by neither a test nor a device observation (`ElegirIglesiaScreen.tsx:78-97`).
- SUGGESTION — a paused iglesias query (offline, once #27 wires connectivity) would show "Cargando iglesias…" with no way out (`:79-89`).
- SUGGESTION — rows stay selectable while the save is pending, so the checked row can differ from the one being stored (`:71-75`).
- SUGGESTION — the back button calls `router.back()` without checking there is history; entered by a deep link or from Ajustes (#28) it would do nothing (`:115`).

## Notes for the next tickets

- Rows are about 3pt taller than the mockup (75 against 72): `AppText` applies the line heights of the theme, the mockup sets none.
- On Android the keyboard resizes the window, so "Continuar" rides above it; on iOS it is covered until an iglesia is picked or the keyboard is dismissed.
- #28 (change the iglesia from Ajustes) can reuse this screen, but "Continuar" always resets the stack to the calendar.
- The iglesia elegida is stored as its id only: #24 reads nombre, distrito and localidad from the `['iglesias']` query.
- `CLAUDE.md` still describes this screen with "Usar mi ubicación" and distances (section "Pantallas", item 3).

## Next step

The pull request to `main` when the user asks for it; the four advisory findings are the user's call.
