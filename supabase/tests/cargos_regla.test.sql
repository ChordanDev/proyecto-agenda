-- GENERATED FILE, DO NOT EDIT.
-- It comes from src/features/sesion/dominio/cargosAbarcanDuenio.casos.json.
-- Change the cases there and run `npm run db:casos-cargos`.
-- CI fails when this file is out of date.
--
-- Asserts every case of the table against public.cargos_abarcan_duenio, the
-- rule of the database, acting as a usuario that holds the cargos of the case.
-- The same cases are asserted against the rule of the domain by
-- cargosAbarcanDuenio.test.ts, so the two rules cannot drift apart.
--
-- The function is called directly and not through the writes of the eventos:
-- this tests the rule, and cargos_permisos.test.sql tests the policies.
--
-- Run with: npm run db:test

begin;

create extension if not exists pgtap with schema extensions;

select plan(81);

-- Fixtures, loaded by the superuser ------------------------------------------

insert into public.asociaciones (id, nombre) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'asociacion-central'),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'otra-asociacion');

insert into public.distritos (id, asociacion_id, nombre) values
  ('dddddddd-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'distrito-centro'),
  ('dddddddd-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000001', 'distrito-norte'),
  ('dddddddd-0000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000002', 'distrito-lejano');

insert into public.iglesias (id, distrito_id, nombre, direccion, ciudad, provincia) values
  ('11111111-0000-4000-8000-000000000001', 'dddddddd-0000-4000-8000-000000000001', 'iglesia-cordoba-central', 'Calle 1', 'Ciudad', 'Provincia'),
  ('11111111-0000-4000-8000-000000000002', 'dddddddd-0000-4000-8000-000000000001', 'iglesia-nueva-cordoba', 'Calle 1', 'Ciudad', 'Provincia'),
  ('11111111-0000-4000-8000-000000000003', 'dddddddd-0000-4000-8000-000000000002', 'iglesia-arguello', 'Calle 1', 'Ciudad', 'Provincia'),
  ('11111111-0000-4000-8000-000000000004', 'dddddddd-0000-4000-8000-000000000003', 'iglesia-lejana', 'Calle 1', 'Ciudad', 'Provincia');

-- The usuarios: only what the foreign key of cargos and auth.uid() need.
insert into auth.users (id, aud, role, email) values
  ('bbbbbbbb-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'encargado-de-cordoba-central@casos.example.com'),
  ('bbbbbbbb-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'pastor-de-distrito-centro@casos.example.com'),
  ('bbbbbbbb-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'pastor-de-distrito-norte@casos.example.com'),
  ('bbbbbbbb-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'admin-de-asociacion-central@casos.example.com'),
  ('bbbbbbbb-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'admin-de-otra-asociacion@casos.example.com'),
  ('bbbbbbbb-0000-4000-8000-000000000006', 'authenticated', 'authenticated', 'sin-cargos@casos.example.com'),
  ('bbbbbbbb-0000-4000-8000-000000000007', 'authenticated', 'authenticated', 'encargado-de-cordoba-central-y-pastor-de-distrito-norte@casos.example.com'),
  ('bbbbbbbb-0000-4000-8000-000000000008', 'authenticated', 'authenticated', 'encargado-de-cordoba-central-y-cargos-lejanos@casos.example.com'),
  ('bbbbbbbb-0000-4000-8000-000000000009', 'authenticated', 'authenticated', 'encargado-de-cordoba-central-pastor-y-admin-lejanos@casos.example.com');

insert into public.cargos (usuario_id, iglesia_id, distrito_id, asociacion_id) values
  ('bbbbbbbb-0000-4000-8000-000000000001', '11111111-0000-4000-8000-000000000001'::uuid, null::uuid, null::uuid),
  ('bbbbbbbb-0000-4000-8000-000000000002', null::uuid, 'dddddddd-0000-4000-8000-000000000001'::uuid, null::uuid),
  ('bbbbbbbb-0000-4000-8000-000000000003', null::uuid, 'dddddddd-0000-4000-8000-000000000002'::uuid, null::uuid),
  ('bbbbbbbb-0000-4000-8000-000000000004', null::uuid, null::uuid, 'aaaaaaaa-0000-4000-8000-000000000001'::uuid),
  ('bbbbbbbb-0000-4000-8000-000000000005', null::uuid, null::uuid, 'aaaaaaaa-0000-4000-8000-000000000002'::uuid),
  ('bbbbbbbb-0000-4000-8000-000000000007', '11111111-0000-4000-8000-000000000001'::uuid, null::uuid, null::uuid),
  ('bbbbbbbb-0000-4000-8000-000000000007', null::uuid, 'dddddddd-0000-4000-8000-000000000002'::uuid, null::uuid),
  ('bbbbbbbb-0000-4000-8000-000000000008', '11111111-0000-4000-8000-000000000004'::uuid, null::uuid, null::uuid),
  ('bbbbbbbb-0000-4000-8000-000000000008', null::uuid, 'dddddddd-0000-4000-8000-000000000003'::uuid, null::uuid),
  ('bbbbbbbb-0000-4000-8000-000000000008', '11111111-0000-4000-8000-000000000001'::uuid, null::uuid, null::uuid),
  ('bbbbbbbb-0000-4000-8000-000000000009', '11111111-0000-4000-8000-000000000001'::uuid, null::uuid, null::uuid),
  ('bbbbbbbb-0000-4000-8000-000000000009', null::uuid, 'dddddddd-0000-4000-8000-000000000003'::uuid, null::uuid),
  ('bbbbbbbb-0000-4000-8000-000000000009', null::uuid, null::uuid, 'aaaaaaaa-0000-4000-8000-000000000002'::uuid);

-- The cases ---------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000001", "role": "authenticated"}';
select is(public.cargos_abarcan_duenio('11111111-0000-4000-8000-000000000001'::uuid, null::uuid, null::uuid), true, 'encargado-de-cordoba-central covers iglesia-cordoba-central');
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000001", "role": "authenticated"}';
select is(public.cargos_abarcan_duenio('11111111-0000-4000-8000-000000000002'::uuid, null::uuid, null::uuid), false, 'encargado-de-cordoba-central does not cover iglesia-nueva-cordoba');
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000001", "role": "authenticated"}';
select is(public.cargos_abarcan_duenio('11111111-0000-4000-8000-000000000003'::uuid, null::uuid, null::uuid), false, 'encargado-de-cordoba-central does not cover iglesia-arguello');
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000001", "role": "authenticated"}';
select is(public.cargos_abarcan_duenio('11111111-0000-4000-8000-000000000004'::uuid, null::uuid, null::uuid), false, 'encargado-de-cordoba-central does not cover iglesia-lejana');
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000001", "role": "authenticated"}';
select is(public.cargos_abarcan_duenio(null::uuid, 'dddddddd-0000-4000-8000-000000000001'::uuid, null::uuid), false, 'encargado-de-cordoba-central does not cover distrito-centro');
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000001", "role": "authenticated"}';
select is(public.cargos_abarcan_duenio(null::uuid, 'dddddddd-0000-4000-8000-000000000002'::uuid, null::uuid), false, 'encargado-de-cordoba-central does not cover distrito-norte');
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000001", "role": "authenticated"}';
select is(public.cargos_abarcan_duenio(null::uuid, 'dddddddd-0000-4000-8000-000000000003'::uuid, null::uuid), false, 'encargado-de-cordoba-central does not cover distrito-lejano');
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000001", "role": "authenticated"}';
select is(public.cargos_abarcan_duenio(null::uuid, null::uuid, 'aaaaaaaa-0000-4000-8000-000000000001'::uuid), false, 'encargado-de-cordoba-central does not cover asociacion-central');
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000001", "role": "authenticated"}';
select is(public.cargos_abarcan_duenio(null::uuid, null::uuid, 'aaaaaaaa-0000-4000-8000-000000000002'::uuid), false, 'encargado-de-cordoba-central does not cover otra-asociacion');
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000002", "role": "authenticated"}';
select is(public.cargos_abarcan_duenio('11111111-0000-4000-8000-000000000001'::uuid, null::uuid, null::uuid), true, 'pastor-de-distrito-centro covers iglesia-cordoba-central');
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000002", "role": "authenticated"}';
select is(public.cargos_abarcan_duenio('11111111-0000-4000-8000-000000000002'::uuid, null::uuid, null::uuid), true, 'pastor-de-distrito-centro covers iglesia-nueva-cordoba');
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000002", "role": "authenticated"}';
select is(public.cargos_abarcan_duenio('11111111-0000-4000-8000-000000000003'::uuid, null::uuid, null::uuid), false, 'pastor-de-distrito-centro does not cover iglesia-arguello');
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000002", "role": "authenticated"}';
select is(public.cargos_abarcan_duenio('11111111-0000-4000-8000-000000000004'::uuid, null::uuid, null::uuid), false, 'pastor-de-distrito-centro does not cover iglesia-lejana');
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000002", "role": "authenticated"}';
select is(public.cargos_abarcan_duenio(null::uuid, 'dddddddd-0000-4000-8000-000000000001'::uuid, null::uuid), true, 'pastor-de-distrito-centro covers distrito-centro');
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000002", "role": "authenticated"}';
select is(public.cargos_abarcan_duenio(null::uuid, 'dddddddd-0000-4000-8000-000000000002'::uuid, null::uuid), false, 'pastor-de-distrito-centro does not cover distrito-norte');
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000002", "role": "authenticated"}';
select is(public.cargos_abarcan_duenio(null::uuid, 'dddddddd-0000-4000-8000-000000000003'::uuid, null::uuid), false, 'pastor-de-distrito-centro does not cover distrito-lejano');
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000002", "role": "authenticated"}';
select is(public.cargos_abarcan_duenio(null::uuid, null::uuid, 'aaaaaaaa-0000-4000-8000-000000000001'::uuid), false, 'pastor-de-distrito-centro does not cover asociacion-central');
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000002", "role": "authenticated"}';
select is(public.cargos_abarcan_duenio(null::uuid, null::uuid, 'aaaaaaaa-0000-4000-8000-000000000002'::uuid), false, 'pastor-de-distrito-centro does not cover otra-asociacion');
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000003", "role": "authenticated"}';
select is(public.cargos_abarcan_duenio('11111111-0000-4000-8000-000000000001'::uuid, null::uuid, null::uuid), false, 'pastor-de-distrito-norte does not cover iglesia-cordoba-central');
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000003", "role": "authenticated"}';
select is(public.cargos_abarcan_duenio('11111111-0000-4000-8000-000000000002'::uuid, null::uuid, null::uuid), false, 'pastor-de-distrito-norte does not cover iglesia-nueva-cordoba');
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000003", "role": "authenticated"}';
select is(public.cargos_abarcan_duenio('11111111-0000-4000-8000-000000000003'::uuid, null::uuid, null::uuid), true, 'pastor-de-distrito-norte covers iglesia-arguello');
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000003", "role": "authenticated"}';
select is(public.cargos_abarcan_duenio('11111111-0000-4000-8000-000000000004'::uuid, null::uuid, null::uuid), false, 'pastor-de-distrito-norte does not cover iglesia-lejana');
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000003", "role": "authenticated"}';
select is(public.cargos_abarcan_duenio(null::uuid, 'dddddddd-0000-4000-8000-000000000001'::uuid, null::uuid), false, 'pastor-de-distrito-norte does not cover distrito-centro');
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000003", "role": "authenticated"}';
select is(public.cargos_abarcan_duenio(null::uuid, 'dddddddd-0000-4000-8000-000000000002'::uuid, null::uuid), true, 'pastor-de-distrito-norte covers distrito-norte');
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000003", "role": "authenticated"}';
select is(public.cargos_abarcan_duenio(null::uuid, 'dddddddd-0000-4000-8000-000000000003'::uuid, null::uuid), false, 'pastor-de-distrito-norte does not cover distrito-lejano');
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000003", "role": "authenticated"}';
select is(public.cargos_abarcan_duenio(null::uuid, null::uuid, 'aaaaaaaa-0000-4000-8000-000000000001'::uuid), false, 'pastor-de-distrito-norte does not cover asociacion-central');
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000003", "role": "authenticated"}';
select is(public.cargos_abarcan_duenio(null::uuid, null::uuid, 'aaaaaaaa-0000-4000-8000-000000000002'::uuid), false, 'pastor-de-distrito-norte does not cover otra-asociacion');
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000004", "role": "authenticated"}';
select is(public.cargos_abarcan_duenio('11111111-0000-4000-8000-000000000001'::uuid, null::uuid, null::uuid), true, 'admin-de-asociacion-central covers iglesia-cordoba-central');
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000004", "role": "authenticated"}';
select is(public.cargos_abarcan_duenio('11111111-0000-4000-8000-000000000002'::uuid, null::uuid, null::uuid), true, 'admin-de-asociacion-central covers iglesia-nueva-cordoba');
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000004", "role": "authenticated"}';
select is(public.cargos_abarcan_duenio('11111111-0000-4000-8000-000000000003'::uuid, null::uuid, null::uuid), true, 'admin-de-asociacion-central covers iglesia-arguello');
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000004", "role": "authenticated"}';
select is(public.cargos_abarcan_duenio('11111111-0000-4000-8000-000000000004'::uuid, null::uuid, null::uuid), false, 'admin-de-asociacion-central does not cover iglesia-lejana');
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000004", "role": "authenticated"}';
select is(public.cargos_abarcan_duenio(null::uuid, 'dddddddd-0000-4000-8000-000000000001'::uuid, null::uuid), true, 'admin-de-asociacion-central covers distrito-centro');
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000004", "role": "authenticated"}';
select is(public.cargos_abarcan_duenio(null::uuid, 'dddddddd-0000-4000-8000-000000000002'::uuid, null::uuid), true, 'admin-de-asociacion-central covers distrito-norte');
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000004", "role": "authenticated"}';
select is(public.cargos_abarcan_duenio(null::uuid, 'dddddddd-0000-4000-8000-000000000003'::uuid, null::uuid), false, 'admin-de-asociacion-central does not cover distrito-lejano');
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000004", "role": "authenticated"}';
select is(public.cargos_abarcan_duenio(null::uuid, null::uuid, 'aaaaaaaa-0000-4000-8000-000000000001'::uuid), true, 'admin-de-asociacion-central covers asociacion-central');
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000004", "role": "authenticated"}';
select is(public.cargos_abarcan_duenio(null::uuid, null::uuid, 'aaaaaaaa-0000-4000-8000-000000000002'::uuid), false, 'admin-de-asociacion-central does not cover otra-asociacion');
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000005", "role": "authenticated"}';
select is(public.cargos_abarcan_duenio('11111111-0000-4000-8000-000000000001'::uuid, null::uuid, null::uuid), false, 'admin-de-otra-asociacion does not cover iglesia-cordoba-central');
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000005", "role": "authenticated"}';
select is(public.cargos_abarcan_duenio('11111111-0000-4000-8000-000000000002'::uuid, null::uuid, null::uuid), false, 'admin-de-otra-asociacion does not cover iglesia-nueva-cordoba');
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000005", "role": "authenticated"}';
select is(public.cargos_abarcan_duenio('11111111-0000-4000-8000-000000000003'::uuid, null::uuid, null::uuid), false, 'admin-de-otra-asociacion does not cover iglesia-arguello');
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000005", "role": "authenticated"}';
select is(public.cargos_abarcan_duenio('11111111-0000-4000-8000-000000000004'::uuid, null::uuid, null::uuid), true, 'admin-de-otra-asociacion covers iglesia-lejana');
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000005", "role": "authenticated"}';
select is(public.cargos_abarcan_duenio(null::uuid, 'dddddddd-0000-4000-8000-000000000001'::uuid, null::uuid), false, 'admin-de-otra-asociacion does not cover distrito-centro');
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000005", "role": "authenticated"}';
select is(public.cargos_abarcan_duenio(null::uuid, 'dddddddd-0000-4000-8000-000000000002'::uuid, null::uuid), false, 'admin-de-otra-asociacion does not cover distrito-norte');
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000005", "role": "authenticated"}';
select is(public.cargos_abarcan_duenio(null::uuid, 'dddddddd-0000-4000-8000-000000000003'::uuid, null::uuid), true, 'admin-de-otra-asociacion covers distrito-lejano');
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000005", "role": "authenticated"}';
select is(public.cargos_abarcan_duenio(null::uuid, null::uuid, 'aaaaaaaa-0000-4000-8000-000000000001'::uuid), false, 'admin-de-otra-asociacion does not cover asociacion-central');
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000005", "role": "authenticated"}';
select is(public.cargos_abarcan_duenio(null::uuid, null::uuid, 'aaaaaaaa-0000-4000-8000-000000000002'::uuid), true, 'admin-de-otra-asociacion covers otra-asociacion');
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000006", "role": "authenticated"}';
select is(public.cargos_abarcan_duenio('11111111-0000-4000-8000-000000000001'::uuid, null::uuid, null::uuid), false, 'sin-cargos does not cover iglesia-cordoba-central');
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000006", "role": "authenticated"}';
select is(public.cargos_abarcan_duenio('11111111-0000-4000-8000-000000000002'::uuid, null::uuid, null::uuid), false, 'sin-cargos does not cover iglesia-nueva-cordoba');
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000006", "role": "authenticated"}';
select is(public.cargos_abarcan_duenio('11111111-0000-4000-8000-000000000003'::uuid, null::uuid, null::uuid), false, 'sin-cargos does not cover iglesia-arguello');
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000006", "role": "authenticated"}';
select is(public.cargos_abarcan_duenio('11111111-0000-4000-8000-000000000004'::uuid, null::uuid, null::uuid), false, 'sin-cargos does not cover iglesia-lejana');
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000006", "role": "authenticated"}';
select is(public.cargos_abarcan_duenio(null::uuid, 'dddddddd-0000-4000-8000-000000000001'::uuid, null::uuid), false, 'sin-cargos does not cover distrito-centro');
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000006", "role": "authenticated"}';
select is(public.cargos_abarcan_duenio(null::uuid, 'dddddddd-0000-4000-8000-000000000002'::uuid, null::uuid), false, 'sin-cargos does not cover distrito-norte');
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000006", "role": "authenticated"}';
select is(public.cargos_abarcan_duenio(null::uuid, 'dddddddd-0000-4000-8000-000000000003'::uuid, null::uuid), false, 'sin-cargos does not cover distrito-lejano');
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000006", "role": "authenticated"}';
select is(public.cargos_abarcan_duenio(null::uuid, null::uuid, 'aaaaaaaa-0000-4000-8000-000000000001'::uuid), false, 'sin-cargos does not cover asociacion-central');
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000006", "role": "authenticated"}';
select is(public.cargos_abarcan_duenio(null::uuid, null::uuid, 'aaaaaaaa-0000-4000-8000-000000000002'::uuid), false, 'sin-cargos does not cover otra-asociacion');
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000007", "role": "authenticated"}';
select is(public.cargos_abarcan_duenio('11111111-0000-4000-8000-000000000001'::uuid, null::uuid, null::uuid), true, 'encargado-de-cordoba-central-y-pastor-de-distrito-norte covers iglesia-cordoba-central');
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000007", "role": "authenticated"}';
select is(public.cargos_abarcan_duenio('11111111-0000-4000-8000-000000000002'::uuid, null::uuid, null::uuid), false, 'encargado-de-cordoba-central-y-pastor-de-distrito-norte does not cover iglesia-nueva-cordoba');
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000007", "role": "authenticated"}';
select is(public.cargos_abarcan_duenio('11111111-0000-4000-8000-000000000003'::uuid, null::uuid, null::uuid), true, 'encargado-de-cordoba-central-y-pastor-de-distrito-norte covers iglesia-arguello');
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000007", "role": "authenticated"}';
select is(public.cargos_abarcan_duenio('11111111-0000-4000-8000-000000000004'::uuid, null::uuid, null::uuid), false, 'encargado-de-cordoba-central-y-pastor-de-distrito-norte does not cover iglesia-lejana');
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000007", "role": "authenticated"}';
select is(public.cargos_abarcan_duenio(null::uuid, 'dddddddd-0000-4000-8000-000000000001'::uuid, null::uuid), false, 'encargado-de-cordoba-central-y-pastor-de-distrito-norte does not cover distrito-centro');
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000007", "role": "authenticated"}';
select is(public.cargos_abarcan_duenio(null::uuid, 'dddddddd-0000-4000-8000-000000000002'::uuid, null::uuid), true, 'encargado-de-cordoba-central-y-pastor-de-distrito-norte covers distrito-norte');
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000007", "role": "authenticated"}';
select is(public.cargos_abarcan_duenio(null::uuid, 'dddddddd-0000-4000-8000-000000000003'::uuid, null::uuid), false, 'encargado-de-cordoba-central-y-pastor-de-distrito-norte does not cover distrito-lejano');
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000007", "role": "authenticated"}';
select is(public.cargos_abarcan_duenio(null::uuid, null::uuid, 'aaaaaaaa-0000-4000-8000-000000000001'::uuid), false, 'encargado-de-cordoba-central-y-pastor-de-distrito-norte does not cover asociacion-central');
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000007", "role": "authenticated"}';
select is(public.cargos_abarcan_duenio(null::uuid, null::uuid, 'aaaaaaaa-0000-4000-8000-000000000002'::uuid), false, 'encargado-de-cordoba-central-y-pastor-de-distrito-norte does not cover otra-asociacion');
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000008", "role": "authenticated"}';
select is(public.cargos_abarcan_duenio('11111111-0000-4000-8000-000000000001'::uuid, null::uuid, null::uuid), true, 'encargado-de-cordoba-central-y-cargos-lejanos covers iglesia-cordoba-central');
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000008", "role": "authenticated"}';
select is(public.cargos_abarcan_duenio('11111111-0000-4000-8000-000000000002'::uuid, null::uuid, null::uuid), false, 'encargado-de-cordoba-central-y-cargos-lejanos does not cover iglesia-nueva-cordoba');
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000008", "role": "authenticated"}';
select is(public.cargos_abarcan_duenio('11111111-0000-4000-8000-000000000003'::uuid, null::uuid, null::uuid), false, 'encargado-de-cordoba-central-y-cargos-lejanos does not cover iglesia-arguello');
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000008", "role": "authenticated"}';
select is(public.cargos_abarcan_duenio('11111111-0000-4000-8000-000000000004'::uuid, null::uuid, null::uuid), true, 'encargado-de-cordoba-central-y-cargos-lejanos covers iglesia-lejana');
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000008", "role": "authenticated"}';
select is(public.cargos_abarcan_duenio(null::uuid, 'dddddddd-0000-4000-8000-000000000001'::uuid, null::uuid), false, 'encargado-de-cordoba-central-y-cargos-lejanos does not cover distrito-centro');
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000008", "role": "authenticated"}';
select is(public.cargos_abarcan_duenio(null::uuid, 'dddddddd-0000-4000-8000-000000000002'::uuid, null::uuid), false, 'encargado-de-cordoba-central-y-cargos-lejanos does not cover distrito-norte');
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000008", "role": "authenticated"}';
select is(public.cargos_abarcan_duenio(null::uuid, 'dddddddd-0000-4000-8000-000000000003'::uuid, null::uuid), true, 'encargado-de-cordoba-central-y-cargos-lejanos covers distrito-lejano');
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000008", "role": "authenticated"}';
select is(public.cargos_abarcan_duenio(null::uuid, null::uuid, 'aaaaaaaa-0000-4000-8000-000000000001'::uuid), false, 'encargado-de-cordoba-central-y-cargos-lejanos does not cover asociacion-central');
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000008", "role": "authenticated"}';
select is(public.cargos_abarcan_duenio(null::uuid, null::uuid, 'aaaaaaaa-0000-4000-8000-000000000002'::uuid), false, 'encargado-de-cordoba-central-y-cargos-lejanos does not cover otra-asociacion');
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000009", "role": "authenticated"}';
select is(public.cargos_abarcan_duenio('11111111-0000-4000-8000-000000000001'::uuid, null::uuid, null::uuid), true, 'encargado-de-cordoba-central-pastor-y-admin-lejanos covers iglesia-cordoba-central');
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000009", "role": "authenticated"}';
select is(public.cargos_abarcan_duenio('11111111-0000-4000-8000-000000000002'::uuid, null::uuid, null::uuid), false, 'encargado-de-cordoba-central-pastor-y-admin-lejanos does not cover iglesia-nueva-cordoba');
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000009", "role": "authenticated"}';
select is(public.cargos_abarcan_duenio('11111111-0000-4000-8000-000000000003'::uuid, null::uuid, null::uuid), false, 'encargado-de-cordoba-central-pastor-y-admin-lejanos does not cover iglesia-arguello');
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000009", "role": "authenticated"}';
select is(public.cargos_abarcan_duenio('11111111-0000-4000-8000-000000000004'::uuid, null::uuid, null::uuid), true, 'encargado-de-cordoba-central-pastor-y-admin-lejanos covers iglesia-lejana');
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000009", "role": "authenticated"}';
select is(public.cargos_abarcan_duenio(null::uuid, 'dddddddd-0000-4000-8000-000000000001'::uuid, null::uuid), false, 'encargado-de-cordoba-central-pastor-y-admin-lejanos does not cover distrito-centro');
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000009", "role": "authenticated"}';
select is(public.cargos_abarcan_duenio(null::uuid, 'dddddddd-0000-4000-8000-000000000002'::uuid, null::uuid), false, 'encargado-de-cordoba-central-pastor-y-admin-lejanos does not cover distrito-norte');
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000009", "role": "authenticated"}';
select is(public.cargos_abarcan_duenio(null::uuid, 'dddddddd-0000-4000-8000-000000000003'::uuid, null::uuid), true, 'encargado-de-cordoba-central-pastor-y-admin-lejanos covers distrito-lejano');
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000009", "role": "authenticated"}';
select is(public.cargos_abarcan_duenio(null::uuid, null::uuid, 'aaaaaaaa-0000-4000-8000-000000000001'::uuid), false, 'encargado-de-cordoba-central-pastor-y-admin-lejanos does not cover asociacion-central');
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000009", "role": "authenticated"}';
select is(public.cargos_abarcan_duenio(null::uuid, null::uuid, 'aaaaaaaa-0000-4000-8000-000000000002'::uuid), true, 'encargado-de-cordoba-central-pastor-y-admin-lejanos covers otra-asociacion');
reset role;

select * from finish();

rollback;
