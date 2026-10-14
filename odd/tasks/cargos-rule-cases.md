# One table of cases for the cargos rule (issue #66)

## Objective

The rule "a cargo covers a duenio" exists twice: `cargosAbarcanDuenio` in the domain (which actions to show) and `public.cargos_abarcan_duenio` in the database (which writes to accept). A single versioned table of cases is asserted against both, so one cannot change without the other noticing.

## Problem and why

Each rule had its own tests with its own cases (#21, PR #63 review). The impact of a difference is bounded because the database decides, but the app could show an action the database rejects or hide one it accepts.

## Scope

- `src/features/sesion/dominio/cargosAbarcanDuenio.casos.json`: structure, usuarios (with their cargos) and cases (`usuario`, `duenio`, `abarca`).
- Jest test reading the table.
- `scripts/generar-casos-cargos.ts` (`npm run db:casos-cargos`) writing `supabase/tests/cargos_regla.test.sql`.
- CI step failing when the generated file is stale.

Out of scope: the rule itself, migrations, the policies tests (`cargos_permisos.test.sql` keeps testing the policies; this tests the rule).

## Constraints

- App behaviour does not change.
- The generated pgTAP calls the function directly (SELECT), never through UPDATE/DELETE row counts: PR #75 revokes default table privileges, which turns "zero rows" into error 42501. It must pass before and after #75.
- No new dependency: Node 24 strips types (`node scripts/generar-casos-cargos.ts`).

## Decisions

- Ids are unique across levels in the table, so a cargo or duenio is named by its id alone and its level and place in the structure are looked up. The "equal ids at different levels" case cannot be expressed that way and stays hand-written in the Jest file.
- 9 usuarios x 9 duenios = 81 cases: every cell of the #17 table (encargado / pastor / admin x own iglesia, sister iglesia, iglesia of another distrito, own distrito, another distrito, the asociacion), plus another asociacion (iglesia, distrito, asociacion), a usuario without cargos, an admin of another asociacion and three usuarios with several cargos. Expected values were written by hand from the table, not computed by the rule.
- The generated file creates the fixtures as the superuser, then per case switches to `authenticated` with the claims of the usuario (`set local request.jwt.claims`) and asserts the function result with `is()`.
- CI: the check lives in the `Permission tests` job (it already has the database and the types check); that job gets `actions/setup-node` because it had no Node. It runs the generator and `git diff --exit-code`, with an `::error`, like the types check.
- `tsconfig.json` types gain `"node"` (script imports `node:fs`); `@types/node` is already installed transitively. The npm script passes `--disable-warning=MODULE_TYPELESS_PACKAGE_JSON` because the package has no `"type"`.

## Tasks

- [x] **T1 - Table, Jest test, generator and generated pgTAP.** Route: inline-by-delegated-writer (2+ non-trivial files). Checks: `npm test`, `npm run typecheck`, `npm run lint`, `npx supabase test db`.
- [x] **T2 - CI staleness check.** Checks: generator run twice leaves no diff; stale JSON edit produces a diff.

## Progress

- T1 `33d784a` (`test: shared case table for the cargos rule (#66)`). T2 `ff2b040` (`ci: check generated cargos rule test is fresh (#66)`).
- Jest read the table first with the old domain rule: 98 tests in the sesion folder passed (83 in this file); `npm test` 15 suites, 239 passed. `npm run typecheck` and `npm run lint` clean.
- `npx supabase test db`: `cargos_regla.test.sql ... ok` (81/81). The other three suites FAIL on this machine for an environmental reason unrelated to this change: the shared local database already has migration `20261014000000` (PR #75, revoke default table privileges) applied, and those suites' `is_empty` checks on UPDATE/DELETE raise `permission denied` (e.g. `permission denied for table asociaciones`). `db reset` was not run, to avoid dropping that state. The new file does not depend on it.
- Generator run twice: `git diff --exit-code` clean.
- Jorge review (advisory, APPROVED): optional finding accepted — if a PR deleted the generated file, the step regenerated it untracked and `git diff --exit-code` passed. Fix `99bcd43` (`ci: fail when the generated cargos rule test is missing (#66)`): the step first runs `git ls-files --error-unmatch` on it. Checked locally: the step passes with the file intact and fails ("missing") with it deleted in a commit.

### Manual proofs (for the PR)

- (a) Domain only: removed `&& duenio.iglesiaId === cargo.iglesiaId` from the `iglesia` branch of `cargosAbarcanDuenio.ts` -> `npx jest src/features/sesion/dominio/cargosAbarcanDuenio`: `Tests: 10 failed, 73 passed, 83 total` (e.g. `encargado-de-cordoba-central, duenio iglesia-nueva-cordoba: abarca false`). Reverted with `git checkout`. (A first attempt, flipping `duenio.alcance !== 'asociacion' &&` on the distrito branch, changed nothing: it is redundant because an asociacion duenio has no `distritoId`.)
- (b) Database only: in one psql session to 127.0.0.1:54322, `begin; create or replace function public.cargos_abarcan_duenio` without the line `or cargos.distrito_id = duenio_distrito_id`, then `\i supabase/tests/cargos_regla.test.sql` (its final `rollback` also reverts the function) -> `not ok 14 - pastor-de-distrito-centro covers distrito-centro`, `not ok 24 - pastor-de-distrito-norte covers distrito-norte`, `not ok 60 - encargado-de-cordoba-central-y-pastor-de-distrito-norte covers distrito-norte`. Afterwards `pg_get_functiondef` shows the original line again and `npx supabase test db` reports `cargos_regla.test.sql ... ok`.
- (c) Table changed without regenerating: edited `sin-cargos` / `asociacion-central` to `abarca: true`; regenerating shows the diff `- ... false, 'sin-cargos does not cover asociacion-central'` / `+ ... true, 'sin-cargos covers asociacion-central'` on `supabase/tests/cargos_regla.test.sql`, so `git diff --exit-code` fails in CI. (The Jest suite would also fail against the unchanged domain rule.) Reverted.

## Acceptance criteria

Those of issue #66.

## Next step

Open the PR to the stack parent (not pushed from here); PR notes: the three proofs above, the failing-on-#75-state caveat, `@types/node` transitive.
