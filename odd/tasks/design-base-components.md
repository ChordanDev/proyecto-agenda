# Design base components (issue #19)

## Objective

The components and visual values every screen uses exist once in the shared module, built from the approved theme tokens, and can be seen together on a development-only sample screen.

## Problem and why

The skeleton (#18) left a temporary screen with hand-written styles. Every approved screen (#20 onwards) needs the same marks, buttons, fields, cards and text styles. Building them once, before the screens, keeps the screens consistent and stops each ticket from re-deriving sizes from the HTML mockups.

## Scope

- The four énfasis shapes (círculo, triángulo, "D", cuadrado) and the grey rombo of the actividad regular, each with its theme color.
- Fonts of the design (Noto Sans, Oswald) loaded at app start.
- Text styles, primary and secondary buttons, text field, card and the gradient screen background.
- A development-only sample screen that shows all of them, reachable from a route.

Out of scope: the approved screens themselves, navigation bar, bottom sheet, chips, toggles and any component used by a single screen (they belong to that screen's ticket).

## Constraints

- Values come from `diseno/theme.ts` (imported through `@/shared/theme`). Sizes missing from the tokens are read from `diseno/pantallas/*.html`, never invented.
- Each énfasis and the actividad regular are recognised by shape and color, never by color alone.
- Buttons are at least 44 points high (`accesibilidad.alturaMinTactil`); text respects the design sizes.
- Glossary terms in Spanish without accents; everything else in English. Comments and commits in English; UI copy in Spanish.
- Shared code lives in `src/shared`. Routes only connect a URL with a screen.
- Libraries named by `diseno/README.md`: `react-native-svg`, `expo-linear-gradient`, `@expo-google-fonts/noto-sans`, `@expo-google-fonts/oswald`. Installed with `npx expo install` so versions match the SDK.

## Decisions

- Shared components live in `src/shared/ui/`.
- The sample screen is hidden outside development with a route guard on `__DEV__`; it ships no entry point in release builds.
- Test-first exception: project policy is no automated tests for screens and components in v1, and this ticket adds no domain rule. Checks are types, lint, the existing Jest suite and the observed sample screen.

## Tasks

- [x] **T1 — Énfasis shapes.** Install `react-native-svg`; one component draws the five shapes from the theme `categorias` (shape, color, the subtle border of the yellow "D"), sized by a prop, with an accessibility label naming the énfasis. Route: delegated (reading the mockups prepares the write). Checks: `npm run typecheck`, `npm run lint`, `npm test`.
- [x] **T2 — Fonts and base components.** Install the font packages and `expo-linear-gradient`; load the fonts in the root layout; text component with the design sizes; primary and secondary buttons; text field; card; gradient screen background. Route: delegated (2+ non-trivial files). Checks: `npm run typecheck`, `npm run lint`, `npm test`.
- [x] **T3 — Sample screen.** Development-only screen that shows every shape, text style, button, field and card, wired from a route guarded by `__DEV__`. Route: delegated (same writer). Checks: `npm run typecheck`, `npm run lint`, `npm test`.
- [x] **T4 — Observed on device.** Build the development client and look at the sample screen on iOS and Android. Route: inline (per-action). Checks: observed screen against `diseno/capturas`.

## Acceptance criteria

Those of issue #19.

## Delivery

Strategy: `single-pr` — project policy is one short branch per ticket, squash-merged to `main`. Forecast: about 600 authored lines (lockfile excluded); the components and the screen that exhibits them are one reviewable unit.

## Progress

Branch `claude/issue-19-84c5ee`. Review boundary: `8f70723` (branch point).

- T1 — `100af62` feat(shared): add the énfasis shapes. `FormaDeEnfasis` in `src/shared/ui/`.
- T2 — `078620a` feat(shared): load the design fonts and add the base components. `AppText`, `Button`, `TextField`, `Card`, `ScreenBackground`, `useDesignFonts`.
- T3 — `eed92d4` feat(shared): add the development sample screen of the base components. Route `showcase`, guarded by `__DEV__`; deep link `agendadeiglesia://showcase`.
- Checks observed on `eed92d4`: `npm run typecheck` clean (writer and parent spot check), `npm run lint` clean, `npm test` 1 suite and 9 tests passed.
- T4, iOS — development build on the iPhone 17 simulator (iOS 26.2), opened with `agendadeiglesia://showcase`. Observed: the five shapes with lema and nombre matching `diseno/capturas/6 · Crear evento.png`, Noto Sans and Oswald loaded, the gradient background, primary button 58 high, secondary 52, field 56, flat white cards. `pod install` needs `LANG=en_US.UTF-8`. The worktree has no `.env.local`, so the bundler ran with the placeholder values of `.env.example`; the sample screen does not use Supabase.
- T4, Android — development build (`BUILD SUCCESSFUL`) on the emulator `Medium_Phone_API_36.1` (Android 36.1), opened with `agendadeiglesia://showcase`. Observed: the same screen as on iOS; shapes, fonts, gradient, buttons, fields and cards match, and the 1.15 title line height does not clip accented capitals. The first build needs NDK 27.1.12297006, CMake 3.22.1 and build-tools 35/36, which Gradle downloads (several GB); a download cut by a full disk leaves a stub folder under `ndk/` that must be removed before retrying.
- Review — range `8f70723..624101c` assessed medium (`configuration_change` in `app.json`, slice budget reached). Consent granted; one reliability lens; approved and acknowledged (lineage `review-94720e28cf5c57d6`). Review boundary: `624101c`.

## Review follow-ups (non-blocking)

- The `__DEV__` guard of the sample route was only observed in development builds; the release branch (route rejected) was never exercised.
- The root layout renders nothing until the fonts load or fail; the system-font fallback is untested and the splash-screen promises are not caught.
- `Button` spreads the caller props after `accessibilityState`, so a caller state replaces the disabled flag for screen readers.
- `ScreenBackground` computes the gradient stop from the window height instead of its own layout height, so the stop shifts inside a tab layout or a modal.
- `FormaDeEnfasis` accepts zero or negative sizes, and its geometry (`getBox`) has no unit test.

## Values not in the theme

Taken from the mockups and kept as named constants next to their component:

- Shape geometry at height 20: triangle 22 wide, "D" 13 wide, square 18 with radius 2, rombo side 15 (`06-crear-evento.html`).
- Label size 16 (`02-login.html`), secondary button height 52 (`07-chat-ia.html`), line heights 1.15 / 1.4 / 1.5.

Not drawn in the mockups, chosen here: pressed opacity 0.85, disabled opacity 0.5, placeholder color `textoTenue`.

## Follow-ups for the design

- `fontSize` has no 16 although the mockups use it about 30 times; `accesibilidad` has no secondary button height; there are no line-height tokens.
- The welcome screen uses a 60-high primary button with 19 px text against the 58/18 tokens.
- Shape proportions vary by size across mockups; the component scales the 20-high reference.
- The yellow border is 0.2 alpha in the small calendar and chat marks against 0.15 in the theme; the component uses 0.15.
