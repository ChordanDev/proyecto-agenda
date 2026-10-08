# Usuarios, cargos and write permissions (issue #21)

## Objective

A usuario can create, edit and delete an evento only when one of their cargos covers the duenio of that evento. The rule lives in the database, as row level security policies, and in the domain, to decide which actions to show. The database is the one that decides.

## Problem and why

The event model (#20) is read-only: with row level security enabled and no write policy, nobody can modify an evento from the app. Every ticket that writes or shows write actions (#26, #29, #33 to #36) is blocked until the cargos exist and the write rule is enforced and tested.

## Scope

- One migration: table `cargos`, its read policy, the function that answers whether the cargos of the caller cover a duenio, and the write policies of `eventos` and `eventos_fechas`.
- pgTAP tests for every case the issue lists, in a new file, plus the update of the policy lists in `eventos_permisos.test.sql`.
- Seed: four simulated usuarios (an encargado, a pastor, an admin and a usuario without cargos) that can log in against the local Supabase.
- Regenerated `src/shared/database.types.ts`.
- Domain rule `cargosAbarcanDuenio` with Jest tests written first, one per combination of the permission table.

Out of scope: the login screen and reading the cargos of the session from the app (#29), the event form and its queries (#33), the "Eliminar mi cuenta" function (#31), write policies of `iglesias_sumadas` (sharing is v2), and any management screen.

## Constraints

- Glossary terms in Spanish without accents; `duenio` for "dueño". Comments and commits in English.
- `dominio` is pure TypeScript.
- `main` was fetched before creating the migration (branch is level with `origin/main` at `79de6fb`).
- The migrations already on `main` are applied to the development Supabase: they are never edited, only followed by a new one.
- The generated types must match the schema: CI regenerates them and fails on a diff.
- The seed is local only: `deploy-migrations.yml` runs `supabase db push` without it.

## Decisions

- **Permission table** (from the spec, issue #17).

  | Duenio of the evento                  | Encargado | Pastor | Admin |
  | ------------------------------------- | --------- | ------ | ----- |
  | Their iglesia / an iglesia they cover | Yes       | Yes    | Yes   |
  | Another iglesia                       | No        | No     | Yes   |
  | Their distrito                        | No        | Yes    | Yes   |
  | Another distrito                      | No        | No     | Yes   |
  | The asociacion                        | No        | No     | Yes   |

- **`cargos` table.** `usuario_id` references `auth.users (id)` with `on delete cascade`, plus one nullable foreign key per level (`iglesia_id`, `distrito_id`, `asociacion_id`) and a check constraint: exactly one is set. It mirrors how `eventos` stores its duenio, so every level keeps a real foreign key. The same usuario cannot hold the same cargo twice.
- **No `usuarios` table.** Names and emails stay in `auth.users`, which the API does not expose. The issue asks for the cargos table only, and nothing in the v1 shows the name of another usuario; a profile table arrives with the management screens (v2) if they need it.
- **Reading cargos.** `select` is granted to `authenticated` only, with one policy: `usuario_id = auth.uid()`. `anon` has no grant at all, so a read without a session is an error, not an empty result. There is no insert, update or delete policy and no write grant: the developers load the cargos.
- **Where the rule lives in the database.** One SQL function, `stable`, `security invoker`, with an empty `search_path`, that receives the three duenio columns and answers whether a cargo of `auth.uid()` covers them, walking up the structure (iglesia → distrito → asociacion). Every write policy calls it, so the rule is written once. It reads `cargos` on each call: the session only supplies the id of the usuario, never the cargos.
- **Write policies.** `eventos`: insert (`with check`), update (`using` on the old row and `with check` on the new one, so the duenio cannot be moved to a level the cargos do not cover) and delete (`using`), all for `authenticated`. `eventos_fechas`: the same three, deciding by the duenio of its evento. `iglesias_sumadas` stays read-only until sharing is built.
- **Domain rule.** `cargosAbarcanDuenio(cargos, duenio)` in `sesion/dominio`, next to the `Cargo` type. Deciding needs to know what the duenio depends on (the distrito of an iglesia, the asociacion of a distrito), so the function receives the duenio together with its place in the structure, in the style of `IglesiaEnEstructura`.
- **Simulated usuarios.** Inserted in `seed.sql` into `auth.users` and `auth.identities` with fixed ids, `@example.com` emails and one shared development password written in the seed.

## Tasks

- [x] **T1 — Coverage rule in the domain.** `Cargo` type and `cargosAbarcanDuenio`, tests first (RED, then GREEN). Route: delegated (same writer as T2). Checks: `npm test`, `npm run typecheck`, `npm run lint`.
- [x] **T2 — Cargos, write policies and simulated usuarios.** Migration, pgTAP tests first (RED before the migration exists), seed, regenerated types. Route: delegated (2+ non-trivial files). Checks: `npm run db:reset`, `npm run db:test`, `npm run db:types` leaves no diff after the commit, `npm run typecheck`, `npm run lint`, a password login of each simulated usuario against the local Supabase.

## Acceptance criteria

Those of issue #21.

## Delivery

Strategy: `single-pr` — project policy is one short branch per ticket, squash-merged to `main`. Forecast: about 800 authored lines (generated types excluded), most of it pgTAP cases that cannot ship without the migration they exercise.

## Progress

Branch `claude/issue-21-61b896`. Review boundary starts at `79de6fb`.

- **T1 done** in `14f6d9f` (delegated writer). RED observed first: against a stub that returned `false`, the encargado case failed on its assertion (`Expected: true, Received: false`); the pastor slice then failed 2 tests and the admin slice 3, each before its code. The edge cases (no cargos, several cargos, equal ids across levels) passed on their first run, so they have no RED. Observed after: `npm test` 4 suites, 63 passed; `npm run typecheck` and `npm run lint` clean.
  - Names: `Cargo` (discriminant `nivel`, because the alcance is the level that owns an evento) in `cargo.ts`; `DuenioEnEstructura` and `cargosAbarcanDuenio(cargos, duenio)` in `cargosAbarcanDuenio.ts`.
  - The worktree had a `node_modules` older than #19: `npm ci` was needed before typecheck and lint could resolve every module.
- **T2 done** in `ef78082` (same writer). RED observed first: before the migration, `cargos_permisos.test.sql` aborted with `relation "public.cargos" does not exist` and `eventos_permisos.test.sql` failed 8 of 66 (the new policy pins). Observed after: `npm run db:reset` applied the three migrations and the seed; `npm run db:test` passed, 3 files, 270 tests (177 cargos, 66 eventos, 27 structure), re-run by the parent with the same result; `npm run db:types` left no diff after the commit; `npm test` 63 passed; `npm run typecheck` and `npm run lint` clean. 1552 inserted lines, 1232 of them pgTAP: the issue asks for literal insert, update and delete cases per cargo, so it was not split.
  - Names: migration `20261008131231_create_cargos.sql`; function `public.cargos_abarcan_duenio(uuid, uuid, uuid)`; policies `Usuarios can read their own cargos` and `Usuarios can insert|update|delete eventos|eventos_fechas their cargos cover`; constraint `cargos_exactly_one_nivel`; partial unique indexes `cargos_{iglesia,distrito,asociacion}_id_usuario_id_key` (the level goes first, so they also serve its foreign key) and `cargos_usuario_id_idx`.
  - Simulated usuarios (`b0000000-0000-4000-8000-00000000000N`): `1` encargado@example.com (Córdoba Central), `2` pastor@example.com (distrito Córdoba Centro), `3` admin@example.com (the asociacion), `4` sin-cargos@example.com. The four logged in with a password grant against the local Supabase; through the local API each read only their own cargos (1, 1, 1 and 0 rows) and a read without a session answered 401 with `permission denied for table cargos`.
  - Added beyond the listed decisions: the function answers false unless exactly one duenio column is set; extra pgTAP cases for a usuario with two cargos, a session whose claims pretend to be admin, a cargo added in the middle of a session and the cascade from a deleted usuario to their cargos. Four throwaway mutants (any cargo covers everything, `with check (true)`, cargos open to anon, cargos read from the claims) each made the new test file fail.
  - `eventos_permisos.test.sql`: no existing case changed, only the policy pins and one comment.
  - Not enforced, left as later work: only `cargos` has Supabase's default privileges revoked, so on the other tables the policies are what reject a write (`truncate` is not governed by row level security, although the API does not expose it); the foreign keys from `cargos` to the structure have no cascade, so deleting an iglesia that has cargos is blocked; the function can be called through RPC by any usuario with a session; no test ties the domain rule to the SQL rule, they are two implementations.
