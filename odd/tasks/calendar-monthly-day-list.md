# Calendar: monthly view and day list (issues #24 and #43)

## Objective

The hermano opens the app and sees the month of their iglesia elegida, with a marker of shape and colour on every day that has events, and under it the events of the selected day. The bottom bar has Calendario and Ajustes, and nothing else.

## Problem and why

`/calendario` is a temporary screen: after choosing an iglesia the hermano lands on a title and nothing more, so the app does not yet replace the printed agenda. The data and the rules that gather the events of an iglesia, its distrito and the asociación exist since #20; nothing draws them. Stories 10 to 16, 19, 21, 22, 88 and 89 of #17 ask for the monthly view, the day list and a bottom bar that is the same for everyone in v1.

The approved design still draws a Chat tab in the bottom bar. #43 asks to bring it up to date before building; the user decided to do it as the first task of this ticket, as #23 did with "Elegir iglesia", and approves the design when merging.

## Scope

- The approved design of the bottom navigation without the Chat tab (#43): mockups and captures.
- The monthly grid with markers, the month navigation, the selected day and its list of events.
- The bottom bar with Calendario and Ajustes. Ajustes is a temporary screen until its ticket (#28).

Out of scope: marking every day of an event of several days (#34), filters by énfasis and by iglesia (#25), the detail of an event (#26), the offline cache and "Actualizado el…" (#27), creating events (the "Nuevo evento" button), shared events ("Compartido con…", v2).

## Constraints

- Values come from `@/shared/theme`. Sizes missing from the tokens are read from the mockup and kept as named constants with the HTML line in a comment, never invented.
- A component never calls Supabase nor the phone storage: it asks the `datos` layer of its feature. Routes only connect a URL with a screen. `dominio` imports neither React, Expo, TanStack nor Supabase.
- Glossary terms in Spanish without accents; everything else in English. Comments and commits in English; UI copy in Spanish, in the voice of the approved mockups.
- No new native library: the development client installed on the simulator and the APK of the other worktrees must keep working.
- Dates stay `YYYY-MM-DD` strings and hours `HH:MM:SS` strings, as in the existing code. The domain does plain arithmetic; it never builds a `Date`.

## Decisions

- **Own month grid, no calendar library** (user's choice after the compatibility test). Tested on React Native 0.86.3, React 19.2.3, Expo SDK 57, new architecture: `react-native-calendars` 1.1314.0 and `@marceloterreiro/flash-calendar` 2.0.0 (with `@shopify/flash-list` 2.3.3) both render October 2026 on the iOS simulator through the installed development client, and neither ships native code. `react-native-calendars` also renders under Jest with no console output; `flash-calendar` needs a `transformIgnorePatterns` change to load under Jest. Not run on Android. The design replaces the header, the day cells and the markers of both, so what a library would add is the grid arithmetic: a short domain rule with tests does that with no dependency (5 MB with lodash, xdate and recyclerlistview in the first case) and keeps "today" under our control.
- **Design update (#43).** The Chat tab is removed from `04a-calendario.html` and `10-ajustes.html`, the two screens of v1 that draw the bar. `04b` reuses `04a`, so its capture is regenerated too. The Gestión tab that `04a` shows only to the pastor is left as it is: it belongs to the pastor's screens. The mockups of v2 (`07`, `08`, `09`) are not touched.
- **Hours are shown as stored.** #17: date and hour are stored as the local ones of the asociación, with no conversion. The app shows `HH:MM` cut from the stored string, so every phone shows the same hour whatever its time zone.
- **"Today" is the date of the phone.** No time zone of the asociación is stored anywhere, and choosing one is not part of this ticket. Only the screen reads the clock; the domain receives today as a date string.
- **Selected day.** On opening, today. On moving to another month, today when that month holds it, otherwise day 1, so the list under the grid always belongs to a day in sight.
- **Markers.** One per category present on the day, not one per event, in the fixed order of the mockup (Identidad, Liderazgo, Nuevas Generaciones, Discipulado, Actividad regular): five at most, no overflow sign.
- **Alcance label.** Events of the iglesia show none. Events of a distrito show the nombre of that distrito; events of the asociación show "Asociación".
- **Events of several days** appear on their first day only: marking the whole range is #34 (the data layer already says so).
- **Parts of the mockup that belong to other tickets are not drawn:** the "Filtrar" row and its sheet (#25), the pastor's filter by iglesia (#25), the "Nuevo evento" button, and the chevron of each row together with the tap that opens the detail (#26). A row that looks tappable and does nothing would mislead.
- **States the mockup does not draw:** loading and load error with "Reintentar", as text inside the white card with the mockup's typography; no iglesia elegida (a session without one reaches `/calendario`), a message with a button to "Elegir mi iglesia".
- **Bottom bar.** A tab layout of Expo Router with a custom bar drawn as the mockup; `/calendario` keeps its URL and `/ajustes` is added.
- **Test-first.** Domain rules get their tests before the code. Screens have no automated tests in v1 (project policy); the screen is observed on iOS and Android.

## Tasks

- [x] **T1 — Design update (#43).** `04a-calendario.html` and `10-ajustes.html` without the Chat tab; captures `4a`, `4b` and `10` regenerated from the updated mockups at their current size. Route: delegated (several files, the capture needs the mockup expanded to static HTML). Checks: structural readback of the HTML; each capture opens and shows the bar without Chat.
- [x] **T2 — Calendar rules.** Domain rules with tests first: the grid of a month (leading blanks, days), previous and next month, the markers of each day, the events of a day, the selected day when the month changes, and the texts ("Octubre 2026", "Sábado 10 de octubre", "3 eventos", `HH:MM`, the alcance label). Route: delegated (same writer as T3). Checks: `npm test`, `npm run typecheck`, `npm run lint`.
- [x] **T3 — Calendar screen and bottom bar.** `CalendarioScreen` as in the updated mockup with the states above; the tab layout with Calendario and Ajustes; the temporary Ajustes screen. Route: delegated (2+ non-trivial files; reading the mockup prepares the write). Checks: `npm run typecheck`, `npm run lint`, `npm test`.
- [x] **T4 — Observed on device.** Development build on iOS and Android against the local Supabase with the seed: the screen against the updated capture, markers, month navigation, today selected, list and empty day, alcance labels, a repeated event on each of its dates, the bottom bar. Route: inline (per-action). Checks: observed screens.

## Acceptance criteria

Those of issues #24 and #43. The approval of the design (#43) is the user's, on merging.

## Delivery

Strategy: `single-pr` — project policy is one short branch per ticket, squash-merged to `main`; the pull request closes #24 and #43. Forecast: about 800 authored lines (captures excluded), over the 400 heuristic because the ticket carries rules with their tests, a screen and the navigation, and the project does not split a screen across pull requests. Actual: 1693 insertions and 28 deletions against `1809ebd`, captures and this document excluded; 494 of them are tests. Past the forecast because the screen is three components with the named constants of the mockup, and the rules needed 63 tests.

## Progress

Branch `claude/calendario-monthly-day-list-eac297`, fast-forwarded to `1809ebd` (main). Review boundary: `1809ebd` (branch point).

- T1 — `dbdf6b5` docs(diseno): remove the Chat tab from the bottom navigation mockups; `d07052d` docs(diseno): regenerate the pastor calendar capture without the Chat tab. Captures regenerated by expanding each mockup to static HTML with jsdom and taking a headless Chrome screenshot at 390 wide, 2x, with GPU rasterisation (`--disable-gpu` breaks the match). The same method over the old mockups reproduced `4a` and `10` within noise (142 and 55 pixels off by 2 levels or more). The old `4b` also carried a scrollbar thumb over the row of iglesia chips, an artefact of the first export that headless Chrome does not paint: the new `4b` does not have it, and that is its only other difference.
- T2 — `95cbe3e` feat(calendario): add the month grid and day list rules. `eventos/dominio/categoria`, and in `calendario/dominio`: `localDate` (weekday by arithmetic), `getMonthGrid`, `monthNavigation`, `dayOfCalendario`, `calendarioTexts`. RED observed before the code: six suites failing on the missing modules, then 63 tests failing against stubs.
- T3 — `e3aad28` feat(ui): add the bottom navigation bar (`BottomBar`, `TabIcons`, the `(tabs)` layout, the temporary Ajustes); `cb2c7bc` feat(calendario): add the monthly calendar screen (`CalendarioScreen`, `MonthGrid`, `EventosOfDay`, `useToday`, `useIglesiaDeCalendario`). `getCalendarioDeIglesia` now returns `{ fechas, nombresDeDistritos }`: the query embeds the nombre of the distrito that owns each evento.
- T4 — `024d86d` fix(calendario): keep the selected day and the active tab round on Android (found while observing on Android).
- Checks observed on `024d86d`: `npm run typecheck` clean, `npm run lint` clean, `npm test` 11 suites and 130 tests passed (writer on `cb2c7bc`, parent again on `024d86d`).
- Observed on iOS (iPhone 17 simulator, iOS 26.2) and Android (emulator API 36.1), development build already installed (no native change) against the local Supabase with the seed:
  - The screen follows the updated capture: header with the iglesia and its distrito, month title with the two round buttons, the grid card with Saturday highlighted, the day heading with its count, the list card, the bar with Calendario and Ajustes and nothing else.
  - On opening, today (Thursday 8 October 2026) is selected and "No hay eventos este día." shows. Selecting another day fills it and leaves today ringed.
  - Markers: rombo on the Wednesdays of "Culto de oración", circle on 24 October, "D" on 30 October, triangle on 15 November (Córdoba Central, iOS); square and rombo together on 17 October (Nueva Córdoba, Android).
  - Alcance: "Somos · Córdoba Centro" on the evento of the distrito and "Integramos · Asociación" on the one of the asociación; the eventos of the iglesia show none.
  - A repeated evento on each date: the weekly series on every Wednesday of October and November; the monthly series on 17 October, 21 November, 19 December and 16 January.
  - Month navigation from September 2026 to January 2027: each month starts on the right weekday, day 1 is selected, and coming back to October selects today again.
  - Hours as stored: 13:00, 16:00, 19:00, 20:00.
  - The Ajustes tab opens the temporary screen. On Android the system back button on Ajustes returns to Calendario. Reopening the app goes straight to the calendar.
- After the pull request (#72) — fix(calendario): move the selection to the new today when the day changes. Found by the native review and confirmed by the advisory review of the pull request (F2): with the app left open overnight the ring moved to the new today while the selection and the list stayed on yesterday. Rule `getSelectedDateAfterTodayChange` (four tests, RED first): whoever was on today moves on to the new today, with its month; whoever was looking at another day stays there. Observed on Android by moving the phone a day ahead through its time zone while the app was in the background: back in front, "Viernes 9 de octubre" was selected; with 24 October selected and the date moved back, the selection stayed. Not observed on iOS (the simulator follows the clock of the Mac), where the screen was only seen to open. Checks: `npm test` 11 suites and 134 tests, `npm run typecheck` and `npm run lint` clean.
- Not observed: the load error with "Reintentar", the state with no iglesia elegida, a day with five markers (the seed has none), a phone narrower than 390, VoiceOver and TalkBack.

## Notes for the next tickets

- **Android loses the radius of a view that gets its background after being drawn without one** (React Native 0.86.3, new architecture): the day that becomes selected and the pill of the tab that becomes active came out square. `MonthGrid` and `BottomBar` give that view a `key` that changes with its look. Any toggled background on a rounded view needs the same.
- Header and alcance label show the nombres as stored. The seed has "Córdoba Central" and "Córdoba Centro", without the "Iglesia" and "Distrito" the mockup carries inside its sample names, so a hermano reads "Somos · Córdoba Centro" with nothing that says it is a distrito. Open for the user: prefix the label or keep the stored nombre.
- `04a` still draws the Gestión tab for the pastor, so the capture `4b` shows Calendario, Gestión and Ajustes, while story 89 says the bar is the same for everyone in v1.
- #25 adds the "Filtrar" row and the iglesia filter above the grid; #26 adds the chevron and the tap on each row, and may move `formatTime` to `eventos`; #34 marks every day of an evento of several days; #27 can persist `{ fechas, nombresDeDistritos }` as it is (plain data).
- `Tabs` comes from `expo-router/js-tabs`: the export of `expo-router` is deprecated in version 57.
- Left from the advisory review of the pull request, for later tickets: the header and the "iglesia exists" check read the whole list of iglesias instead of the row the calendar already reads by id, so a failed read of the iglesias leaves the header empty with no "Reintentar" (F1); each change of month makes three requests, also for a month already seen, because the query has no `staleTime` — to settle with the offline cache of #27 (F3). `useToday` still does not notice midnight passing with the app in front.
- Months are not prefetched: "Cargando eventos…" shows for a moment on each change of month.

## Next step

The native review of `1809ebd..HEAD` (its outcome is recorded in the Engram copy of this document, not here: a commit after the review would ask for it again), then the pull request to `main` closing #24 and #43, when the user asks for it.
