# Login and the calendar of the usuario (issue #29)

## Objective

An encargado, pastor or admin signs in with email and password and sees the calendar of everything their cargos cover: the encargado, their iglesia; the pastor, all the iglesias of their distrito together; the admin, all those of the asociación. The session stays on the phone until it is closed.

## Problem and why

The "Soy encargado o pastor" button of the Bienvenida leads to a placeholder, and the calendar only knows the iglesia elegida of the phone. Stories 35, 36, 41, 42, 45, 46, 47 and 49 of #17 ask for the login, a session that does not expire, clear errors that do not reveal which emails exist, and a calendar that is the union of what the cargos cover. The data (cargos with their own-row read policy, the seed usuarios) exists since #21.

## Scope

- The login screen of the approved design (`diseno/pantallas/02-login.html`) and the `signIn` call.
- The Supabase session persisted in `expo-secure-store`, refreshed automatically.
- Domain rules, tests first: the message of a failed login, the iglesias a set of cargos covers, the calendar of a usuario (deduplicated union), the header for one or several iglesias.
- `datos`: the cargos of the usuario, the iglesias with their place in the structure, the calendar of several iglesias.
- `CalendarioScreen` shows the calendar of the usuario when there is a session; the hermano path does not change.

Out of scope: "Es mi primera vez u olvidé mi contraseña" and sign-out (their own tickets), creating events, the offline cache (#27).

## Constraints

- A component never calls Supabase nor the phone storage; routes only connect a URL with a screen; `dominio` imports neither React, Expo, TanStack nor Supabase.
- Glossary terms in Spanish without accents; everything else in English. Comments and commits in English; UI copy in Spanish, in the voice of the mockups.
- No migration: the existing policy "Usuarios can read their own cargos" already lets a usuario read their own cargos.
- About 400 authored changed lines per task is a planning heuristic only.

## Decisions

- **Link "Es mi primera vez u olvidé mi contraseña": omitted.** The mockup (02-login.html) does not draw it either; it belongs to its own ticket and a link that does nothing would mislead. The card "¿Sos miembro de iglesia? — Elegir iglesia" of the mockup is drawn: it works (`/choose-iglesia`).
- **Session storage.** `expo-secure-store` as the `storage` of the Supabase client, with `persistSession` and `autoRefreshToken`. The refresh token does not expire by default, so the session lasts until sign-out. Size: the old 2048-byte figure was only a warning; the module (v57.0.4) enforces no limit on iOS (Keychain; the warning was removed, see its CHANGELOG, PR #40187) nor on Android (no limit constant anywhere in the package, searched), so the session JSON is stored in one value, with no chunking. Foreground/background: the client's auto refresh is started and stopped with `AppState`, as Supabase documents for React Native.
- **Native module.** `expo-secure-store` is native: the installed development builds must be rebuilt before the app runs with it. Config plugin added to `app.json`.
- **Errors never reveal whether an email exists.** `invalid_credentials`, `user_not_found` and `email_not_confirmed` all show the same message; a lost connection, too many attempts and anything else have their own texts; empty fields are caught before the call.
- **Calendar of the usuario.** Cargos → covered iglesias via the existing rule `cargosAbarcanDuenio` (an iglesia treated as a duenio, so encargado/pastor/admin all go through the same rule as the database) → `armarCalendarioDeIglesias`, the generalisation of `armarCalendario`: an (evento, date) pair is kept once however many covered iglesias see it.
- **Header with several iglesias.** One iglesia: its nombre and distrito, as for the hermano. Several: "Mis iglesias" with "N iglesias" (or "Distrito · N iglesias" when they share the distrito, the pastor's case).
- **Reading the events.** Up to 40 covered iglesias, the request is narrowed to the eventos owned by them, their distritos, their asociaciones or sumados to them; beyond that (an admin) it is not narrowed, to keep the URL short, and the domain does the filtering.
- **A session ignores the iglesia elegida.** With a session the hermano's choice is neither read nor used; it stays on the phone untouched.
- **States the mockup does not draw:** loading and load error with "Reintentar" for the cargos; a usuario that covers no iglesia (no cargos, or a distrito without iglesias): "Todavía no tenés iglesias asignadas. Consultá con la asociación."
- **After a successful login** the screen leaves the stack as "Elegir iglesia" does (`dismissAll` then `replace('/calendario')`). A stored session already lands on the calendar through `getFirstScreen`.
- **Known limitation, for #27.** `getSession` refreshes an expired access token; with no connection that read fails, and `getHasSesion` throws, so the app would open on the Bienvenida. The stored session is not lost. Offline reading belongs to #27.

## Tasks

- [x] **T1 — Domain rules, tests first.** `sesion/dominio`: sign-in error messages and credential validation. `calendario/dominio`: iglesias covered by cargos, `armarCalendarioDeIglesias` / `armarCalendarioDeUsuario`, header. Route: inline (small, understood files; tests before code). Checks: RED then GREEN with `npm test`.
- [x] **T2 — Session and data.** `expo-secure-store` storage in `shared/supabase.ts`, `signIn`, the session and cargos hooks, the iglesias and calendar of the usuario queries. Route: inline (the writer is this agent; reading prepared the write). Checks: `npm run typecheck`, `npm run lint`.
- [x] **T3 — Screens.** Login screen and route; `CalendarioScreen` / `useIglesiaDeCalendario` switch to the session calendar. Route: inline. Checks: `npm run typecheck`, `npm run lint`, `npm test`.
- [ ] **T4 — Observed on device.** Rebuild of the development client with `expo-secure-store`, login with the seed usuarios on iOS and Android. Route: inline (per-action). PENDING: not possible for the writer.

## Acceptance criteria

Those of issue #29. The login screen looking like the approved design on Android and iOS is observed by the user.

## Delivery

Strategy: `single-pr`, one short branch per ticket. Forecast: about 700 authored lines with tests.

## Progress

Branch `feat/29-login-user-calendar`, from `main` at `4806557`. Review boundary: `4806557`.

- T1 — `fe30949` feat: add sign-in error and user calendar rules. RED observed first: three suites failing on the missing modules (`signInErrors`, `armarCalendarioDeUsuario`, `encabezadoDeCalendario`); GREEN after the code: 14 suites, 164 tests (134 before). `armarCalendario` is now `armarCalendarioDeIglesias([iglesia], …)`; its existing tests stay green.
- T2 and T3 — feat: email login and user calendar (hash below). Route declaration: all inline, one writer; no trigger fired (the exploration fitted the inline budget plus a few reads, and the writes were done by this same agent that read them).
  - `expo-secure-store` 57.0.4 installed with `npx expo install` (config plugin added to `app.json`).
  - `getCalendarioDeIglesia` split: the reading of the month moved to `getFechasDelMes`, shared with `getCalendarioDeUsuario`; `useCalendarioDeIglesia` became `useCalendario(fuente, month)`.
  - `TextField` got an optional `trailing` slot for the "Mostrar" button of the password.
- Verified against the local Supabase (running, seed applied) with HTTP calls, as the usuarios of the seed: sign-in works; each usuario reads only their own cargos (pastor → the distrito of Córdoba Centro; encargado → Córdoba Central); an unknown email and a wrong password both answer `400 invalid_credentials`; the narrowed request (`in.(…)` with `or` on the embedded eventos) returns the October eventos of the distrito, the asociación and the iglesias, 8 dates.
- Checks observed: `npm run typecheck` clean; `npm run lint` clean (ESLint and Prettier); `npm test` 14 suites, 164 tests passed.
- Not run: `npm run db:test` (no migration or policy changed; the `supabase` binary is not on the PATH of the writer). Not observed on device: T4 above, which also needs the development client rebuilt (`expo-secure-store` is native). The loading, error and no-iglesias states of the calendar are not observed either.
- Risks to look at on the device: the session surviving an app restart (SecureStore), the keyboard over the form on small phones, "Mostrar" on Android, the card at the bottom on a short phone, and the narrowed request for an admin (all iglesias: more than 40 reads everything).

## Notes for the next tickets

- Sign-out must clear the `['sesion']` and `['cargos']` queries (`useSignIn` sets and invalidates them).
