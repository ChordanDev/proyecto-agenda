-- Permission tests for creating an evento with an id chosen by the app
-- (`nuevo_evento_id` of public.guardar_evento): a create sent again after its
-- answer was lost saves the evento once, and the id gives no way around the
-- policies.
--
-- The way permission tests are written is explained at the top of
-- estructura_permisos.test.sql, and how a test acts as a usuario at the top of
-- cargos_permisos.test.sql.
--
-- Run with: npm run db:test

begin;

create extension if not exists pgtap with schema extensions;

select plan(11);

-- Fixtures ---------------------------------------------------------------------

insert into public.asociaciones (id, nombre) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'Asociación de la prueba');

insert into public.distritos (id, asociacion_id, nombre) values
  ('dddddddd-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'Distrito de la prueba');

insert into public.iglesias (id, distrito_id, nombre, direccion, ciudad, provincia) values
  ('11111111-0000-4000-8000-000000000001', 'dddddddd-0000-4000-8000-000000000001', 'Iglesia del encargado', 'Calle 1', 'Ciudad', 'Provincia'),
  ('11111111-0000-4000-8000-000000000002', 'dddddddd-0000-4000-8000-000000000001', 'Otra iglesia', 'Calle 2', 'Ciudad', 'Provincia');

insert into auth.users (id, aud, role, email) values
  ('bbbbbbbb-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'encargado@prueba.example.com');

insert into public.cargos (id, usuario_id, iglesia_id, distrito_id, asociacion_id) values
  ('cccccccc-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000001', '11111111-0000-4000-8000-000000000001', null, null);

-- An evento of the other iglesia, which the encargado cannot edit.
insert into public.eventos (id, titulo, alcance, duenio_iglesia_id, hora) values
  ('eeeeeeee-0000-4000-8000-000000000002', 'Evento ajeno', 'iglesia', '11111111-0000-4000-8000-000000000002', '19:00');

insert into public.eventos_fechas (evento_id, fecha) values
  ('eeeeeeee-0000-4000-8000-000000000002', '2026-11-14');

-- The function -----------------------------------------------------------------------

-- The id chosen by the app replaces the old signature instead of overloading it.
select is(
  (select count(*)::int from pg_proc
   where proname = 'guardar_evento' and pronamespace = 'public'::regnamespace),
  1,
  'there is a single guardar_evento'
);

-- The encargado --------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000001", "role": "authenticated"}';

-- Allowed: a create with the id chosen by the app saves it with that id.
select is(
  public.guardar_evento(
    nuevo_evento_id => 'eeeeeeee-0000-4000-8000-000000000010',
    titulo => 'Culto joven',
    alcance => 'iglesia',
    duenio_iglesia_id => '11111111-0000-4000-8000-000000000001',
    hora => '19:00',
    repeticion => 'ninguna',
    fechas => array['2026-12-05']::date[]),
  'eeeeeeee-0000-4000-8000-000000000010'::uuid,
  'the encargado creates an evento with the id the app chose'
);

-- Allowed: the same create sent again, after its answer was lost, saves nothing new.
select is(
  public.guardar_evento(
    nuevo_evento_id => 'eeeeeeee-0000-4000-8000-000000000010',
    titulo => 'Culto joven',
    alcance => 'iglesia',
    duenio_iglesia_id => '11111111-0000-4000-8000-000000000001',
    hora => '19:00',
    repeticion => 'ninguna',
    fechas => array['2026-12-05']::date[]),
  'eeeeeeee-0000-4000-8000-000000000010'::uuid,
  'a create sent again answers with the same evento'
);
select results_eq(
  $$ select count(*)::int from public.eventos where titulo = 'Culto joven' $$,
  $$ values (1) $$,
  'a create sent again does not duplicate the evento'
);
select results_eq(
  $$ select fecha from public.eventos_fechas
     where evento_id = 'eeeeeeee-0000-4000-8000-000000000010' $$,
  $$ values ('2026-12-05'::date) $$,
  'a create sent again does not duplicate its dates'
);

-- Allowed: what changed in the form between the two tries is what stays.
select lives_ok(
  $$ select public.guardar_evento(
    nuevo_evento_id => 'eeeeeeee-0000-4000-8000-000000000010',
    titulo => 'Culto joven (corregido)',
    alcance => 'iglesia',
    duenio_iglesia_id => '11111111-0000-4000-8000-000000000001',
    hora => '20:00',
    repeticion => 'ninguna',
    fechas => array['2026-12-12']::date[]) $$,
  'a create sent again with changes saves them'
);
select results_eq(
  $$ select eventos.titulo, eventos.hora, eventos_fechas.fecha
     from public.eventos join public.eventos_fechas on eventos_fechas.evento_id = eventos.id
     where eventos.id = 'eeeeeeee-0000-4000-8000-000000000010' $$,
  $$ values ('Culto joven (corregido)', '20:00'::time, '2026-12-12'::date) $$,
  'the evento keeps what the last try sent'
);

-- Rejected: the id of an evento the cargos do not cover does not edit it.
select throws_ok(
  $$ select public.guardar_evento(
    nuevo_evento_id => 'eeeeeeee-0000-4000-8000-000000000002',
    titulo => 'Pisado',
    alcance => 'iglesia',
    duenio_iglesia_id => '11111111-0000-4000-8000-000000000001',
    hora => '19:00',
    repeticion => 'ninguna',
    fechas => array['2026-12-05']::date[]) $$,
  'P0002', null, 'the id of an evento of another iglesia does not let the encargado edit it'
);

-- Allowed: with both ids, evento_id decides: it edits that evento and creates none.
select is(
  public.guardar_evento(
    evento_id => 'eeeeeeee-0000-4000-8000-000000000010',
    nuevo_evento_id => 'eeeeeeee-0000-4000-8000-000000000011',
    titulo => 'Culto joven (editado)',
    alcance => 'iglesia',
    duenio_iglesia_id => '11111111-0000-4000-8000-000000000001',
    hora => '19:00',
    repeticion => 'ninguna',
    fechas => array['2026-12-19']::date[]),
  'eeeeeeee-0000-4000-8000-000000000010'::uuid,
  'with both ids, the edit goes to evento_id'
);
select results_eq(
  $$ select id, titulo from public.eventos
     where id in ('eeeeeeee-0000-4000-8000-000000000010', 'eeeeeeee-0000-4000-8000-000000000011') $$,
  $$ values ('eeeeeeee-0000-4000-8000-000000000010'::uuid, 'Culto joven (editado)') $$,
  'with both ids, nuevo_evento_id creates nothing'
);

reset role;

select results_eq(
  $$ select titulo from public.eventos where id = 'eeeeeeee-0000-4000-8000-000000000002' $$,
  $$ values ('Evento ajeno') $$,
  'the evento of the other iglesia is unchanged'
);

select * from finish();

rollback;
