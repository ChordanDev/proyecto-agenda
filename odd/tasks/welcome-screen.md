# Welcome screen (issue #22)

## Objective

Whoever opens the app for the first time sees the Bienvenida, with the main button "Elegir mi iglesia" and the secondary "Soy encargado o pastor". Whoever already has an iglesia elegida or a session goes straight in, without seeing it.

## Problem and why

The app opens today on a temporary list of iglesias left by the skeleton (#18). The hermano needs a first screen that says what the first step is (stories 1, 2), must not see it again once an iglesia is chosen (story 8), and the encargado or pastor needs a way from it to the login (story 34).

## Scope

- The Bienvenida screen, as in `diseno/pantallas/01-bienvenida.html` and `diseno/capturas/1 · Bienvenida.png`.
- The rule that decides the first screen: Bienvenida only when there is no iglesia elegida and no session.
- Reading the iglesia elegida from the phone and the session from Supabase, so the rule has real inputs. The write side of the iglesia elegida exists as a function for #23 to call.
- Provisional destinations for the two buttons and for the "straight in" case.

Out of scope: choosing an iglesia (#23), the calendar (#24), the login form and persistent session (#29, #30), changing the iglesia in Ajustes (#28).

## Constraints

- Values come from `@/shared/theme`. Sizes missing from the tokens are read from `diseno/pantallas/01-bienvenida.html`, never invented.
- The base components of `src/shared/ui` are reused; when the mockup of this screen differs from a base component, the component is extended minimally instead of forked.
- A component never calls Supabase nor the phone storage: it asks the `datos` layer of its feature. Routes only connect a URL with a screen.
- Glossary terms in Spanish without accents (`iglesiaElegida`, `sesion`, `bienvenida`); everything else in English. Comments and commits in English; UI copy in Spanish.
- No account is needed to continue: nothing on this path asks for one.
- New native libraries are installed with `npx expo install` so versions match the SDK.

## Decisions

- The Bienvenida and the first-screen rule live in the feature `sesion`; the storage of the iglesia elegida lives in `iglesias/datos`.
- The iglesia elegida is kept in AsyncStorage (not sensitive; the same library #27 needs for the offline cache). The session stays in Supabase auth, which #29 makes persistent; until then there is never a session at start.
- The splash screen stays up until the first screen is known, so the Bienvenida never flashes for someone who already chose an iglesia.
- Provisional destinations: "Elegir mi iglesia" opens the existing temporary list of iglesias (no selection yet, that is #23); the login and the calendar are placeholder screens.
- The logo is a shared component: seven approved screens use it.
- Test-first applies to the first-screen rule (Jest). The screen and the routes have no automated tests in v1 (project policy); they are observed on iOS and Android.

## Tasks

- [x] **T1 — First-screen rule.** Pure function in `sesion/dominio` that returns the first screen from the iglesia elegida and the session: Bienvenida only when both are missing. RED first. Route: delegated (same writer as T2 and T3). Checks: `npm test`, `npm run typecheck`, `npm run lint`.
- [x] **T2 — Bienvenida screen and provisional destinations.** Shared logo component; the screen with logo, the four shapes, the lemas, title, text and the two buttons; routes for the Bienvenida, the provisional "elegir iglesia", login and calendar. Route: delegated (2+ non-trivial files, reading the mockup prepares the write). Checks: `npm run typecheck`, `npm run lint`, `npm test`.
- [x] **T3 — Start gate.** Install AsyncStorage; read and write the iglesia elegida in `iglesias/datos`; read the session in `sesion/datos`; the start route applies the rule of T1 while the splash screen stays up. Route: delegated (same writer). Checks: `npm run typecheck`, `npm run lint`, `npm test`.
- [x] **T4 — Observed on device.** Development build on iOS and Android: the Bienvenida against the approved capture, both buttons, and the gate with and without an iglesia elegida. Route: inline (per-action). Checks: observed screens.

## Acceptance criteria

Those of issue #22.

## Delivery

Strategy: `single-pr` — project policy is one short branch per ticket, squash-merged to `main`. Forecast: about 350 authored lines (lockfile and the logo path data excluded).

## Progress

Branch `claude/issue-22-7587e3`, fast-forwarded to `79de6fb` (main). Review boundary: `79de6fb` (branch point).

- T1 — `14f10db` feat(sesion): add the rule that picks the first screen. `getFirstScreen` in `sesion/dominio`. RED observed (`3 failed, 1 passed`, expected `"calendario"`, received `"bienvenida"`), then GREEN (`4 passed`).
- T2 — `05b2a43` feat(sesion): add the Bienvenida screen and its provisional destinations. `BienvenidaScreen`, shared `Logo` and `PlaceholderScreen`; `Button` gains `size="large"` and `variant="text"`, `FormaDeEnfasis` gains `outlined`. Routes `/bienvenida`, `/choose-iglesia` (the existing temporary list), `/login` and `/calendario` (placeholders).
- T3 — `b860ef1` feat(sesion): open on the Bienvenida or go straight to the calendar. AsyncStorage 2.2.0; `getIglesiaElegida` / `setIglesiaElegida` / `clearIglesiaElegida` in `iglesias/datos`; `getHasSesion` and `useFirstScreen` in `sesion/datos`; the start route replaces itself with the first screen and the splash screen leaves once the route changed.
- Checks observed on `b860ef1`: `npm test` 4 suites and 47 tests passed (writer and parent spot check), `npm run typecheck` clean (writer and parent spot check), `npm run lint` clean (writer).
- Authored lines `79de6fb..b860ef1`, lockfile excluded: 478 added, 32 removed (the logo path data is one long line).

- Review — range `79de6fb..3a132ae` assessed medium (not passive, configuration change in `package-lock.json`). Consent granted; one reliability lens found one blocking defect: a read that failed is fetched again when the start route mounts, its status goes back to pending, and the root layout took the routes down again, which could leave the app behind the splash screen. Corrected in `0381d8c` fix(sesion): keep the first screen known when a failed read is fetched again (the gate waits on `isFetched`, not on `isPending`). Targeted validation approved; acknowledged (lineage `review-73f935afb9caa616`). Review boundary: `0381d8c`.
- T4, iOS — development build on the iPhone 17 simulator (iOS 26.2). Observed: the Bienvenida matches `diseno/capturas/1 · Bienvenida.png`; "Elegir mi iglesia" opens the temporary list of iglesias and "Soy encargado o pastor" the login placeholder; with an iglesia elegida written to the storage of the app, a cold start opens the calendar placeholder and never shows the Bienvenida.
- T4, Android — development build (`BUILD SUCCESSFUL`) on the emulator `Medium_Phone_API_36.1`. Observed: the same screen; both buttons and the back key behave as on iOS; back on the Bienvenida and on the calendar leaves the app, never returns to the start route; with an iglesia elegida in the storage of the app, a cold start opens the calendar placeholder.
- `0a37577` fix(sesion): keep the Bienvenida text in two lines on Android. Found on the emulator: Android measured the first line of the paragraph a little wider than 300 and broke it in three lines. The paragraph is now 320 wide with a non-breaking space in "y la", and the lemas wrap instead of running off a narrow screen. Observed again on both platforms. Assessed `0381d8c..0a37577`: medium, `under_budget` (12 lines), no review due.
- Checks observed on `0a37577`: `npm test` 47 passed, `npm run typecheck` clean, `npm run lint` clean.
- Second review — the whole branch `79de6fb..ff47adb` again, after the Android fix changed the candidate. Consent granted; one reliability lens; approved without corrections and acknowledged (lineage `review-3c8478e50a556872`). Review boundary: `ff47adb`.
- Advisory review (Jorge el Curioso) on `79de6fb..ff47adb`: approved, two confirmed low-priority findings, both corrected: the two reads of the start gate ran twice on every start because neither query had a `staleTime` (now `Infinity`, the writers invalidate), and `src/features/README.md` did not describe the `datos` to `datos` import between features nor the start route that redirects.
- Not observed: a read of the storage or of the session that fails on a device (the correction rests on the source of TanStack Query 5.104.1); a 360 dp phone and a large system font; a release build.


## Review follow-ups (non-blocking)

- The mapping from the state of the two reads to the rule (`useFirstScreen`) has no automated test; only the pure rule has one.
- Nothing bounds how long the splash screen waits for the two reads: a read that never settles leaves the app on it.
- Any stored string counts as an iglesia elegida, the empty one included; `setIglesiaElegida` does not validate what #23 gives it.

## Notes for the next tickets

- #29 invalidates the query `['sesion']` when the session starts or ends: it is never read again on its own.
- #23 and #28 call `setIglesiaElegida` / `clearIglesiaElegida` and then invalidate the query `['iglesiaElegida']`; the functions do not touch the query cache.
- `/bienvenida` and `/calendario` open without animation because they open behind the splash screen; #24 can revisit it for later pushes to the calendar.
- A read that fails counts as missing, per read: a storage failure with a session still opens the calendar.
- The provisional screens have no back button (swipe or hardware back only).

## Values not in the theme

All from `diseno/pantallas/01-bienvenida.html`: screen padding 48 / 24 / 40 (line 17); logo box 104, radius 28, shadow `0 8 24 rgba(22,46,74,0.18)` (line 19); logo height 66 (line 20); marks margin 64, gap 22, size 52 (lines 23–24); lemas margin 14, gap 10 (line 29); texts margin 56, gap 12, title 34 with line height 1.12, paragraph max width 320 instead of the 300 of the mockup, see `0a37577` (lines 33–35); buttons gap 12, primary 60 high with a 19 label, text button 56 high with an 18 semibold label (lines 40–42). The default `Logo` height 34 comes from `02-login.html` (line 22).

The marks are the base component scaled to 52, not the exact mockup sizes: triangle 57.2 wide (mockup 58), "D" 33.8 (34), square 46.8 (48) with corner radius 5.2 (3).

## Next step

Merge pull request #64 once the checks pass (the user decides).
