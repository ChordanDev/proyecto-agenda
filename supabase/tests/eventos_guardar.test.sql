-- Permission tests for public.guardar_evento and public.borrar_evento: an
-- evento and its dates are saved in one operation, with the permissions of the
-- usuario who calls them.
--
-- The way permission tests are written is explained at the top of
-- estructura_permisos.test.sql, and how a test acts as a usuario at the top of
-- cargos_permisos.test.sql.
--
-- Run with: npm run db:test

begin;

create extension if not exists pgtap with schema extensions;

select plan(38);

-- Fixtures ---------------------------------------------------------------------

insert into public.asociaciones (id, nombre) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'Asociación de la prueba');

insert into public.distritos (id, asociacion_id, nombre) values
  ('dddddddd-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'Distrito de la prueba');

insert into public.iglesias (id, distrito_id, nombre, direccion, localidad) values
  ('11111111-0000-4000-8000-000000000001', 'dddddddd-0000-4000-8000-000000000001', 'Iglesia del encargado', 'Calle 1', 'Localidad'),
  ('11111111-0000-4000-8000-000000000002', 'dddddddd-0000-4000-8000-000000000001', 'Otra iglesia', 'Calle 2', 'Localidad');

insert into auth.users (id, aud, role, email) values
  ('bbbbbbbb-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'encargado@prueba.example.com'),
  ('bbbbbbbb-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'pastor@prueba.example.com');

insert into public.cargos (id, usuario_id, iglesia_id, distrito_id, asociacion_id) values
  ('cccccccc-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000001', '11111111-0000-4000-8000-000000000001', null, null),
  ('cccccccc-0000-4000-8000-000000000002', 'bbbbbbbb-0000-4000-8000-000000000002', null, 'dddddddd-0000-4000-8000-000000000001', null);

-- One evento of the iglesia of the encargado and one of the other iglesia.
insert into public.eventos (id, titulo, alcance, duenio_iglesia_id, hora) values
  ('eeeeeeee-0000-4000-8000-000000000001', 'Evento propio', 'iglesia', '11111111-0000-4000-8000-000000000001', '19:00'),
  ('eeeeeeee-0000-4000-8000-000000000002', 'Evento ajeno', 'iglesia', '11111111-0000-4000-8000-000000000002', '19:00');

insert into public.eventos_fechas (evento_id, fecha) values
  ('eeeeeeee-0000-4000-8000-000000000001', '2026-11-14'),
  ('eeeeeeee-0000-4000-8000-000000000002', '2026-11-14');

-- The functions themselves ---------------------------------------------------------

select function_returns(
  'public', 'guardar_evento',
  array['text', 'alcance', 'time without time zone', 'repeticion', 'date[]', 'uuid', 'text', 'text', 'enfasis', 'uuid', 'uuid', 'uuid', 'date', 'date', 'uuid'],
  'uuid'
);
select isnt_definer(
  'public', 'guardar_evento',
  array['text', 'alcance', 'time without time zone', 'repeticion', 'date[]', 'uuid', 'text', 'text', 'enfasis', 'uuid', 'uuid', 'uuid', 'date', 'date', 'uuid']
);
select function_privs_are(
  'public', 'guardar_evento',
  array['text', 'alcance', 'time without time zone', 'repeticion', 'date[]', 'uuid', 'text', 'text', 'enfasis', 'uuid', 'uuid', 'uuid', 'date', 'date', 'uuid'],
  'anon', array[]::text[],
  'anon cannot execute guardar_evento'
);
select function_privs_are(
  'public', 'guardar_evento',
  array['text', 'alcance', 'time without time zone', 'repeticion', 'date[]', 'uuid', 'text', 'text', 'enfasis', 'uuid', 'uuid', 'uuid', 'date', 'date', 'uuid'],
  'authenticated', array['EXECUTE'],
  'authenticated can execute guardar_evento'
);
select function_returns('public', 'borrar_evento', array['uuid'], 'void');
select isnt_definer('public', 'borrar_evento', array['uuid']);
select function_privs_are(
  'public', 'borrar_evento', array['uuid'], 'anon', array[]::text[],
  'anon cannot execute borrar_evento'
);
select function_privs_are(
  'public', 'borrar_evento', array['uuid'], 'authenticated', array['EXECUTE'],
  'authenticated can execute borrar_evento'
);

-- Without a session (anon): the hermano ---------------------------------------------

set local role anon;

select throws_ok(
  $$ select public.guardar_evento(
    titulo => 'Del hermano',
    alcance => 'iglesia',
    duenio_iglesia_id => '11111111-0000-4000-8000-000000000001',
    hora => '10:00',
    repeticion => 'ninguna',
    fechas => array['2026-12-05']::date[]) $$,
  '42501', 'permission denied for function guardar_evento', 'anon cannot save an evento'
);
select throws_ok(
  $$ select public.borrar_evento('eeeeeeee-0000-4000-8000-000000000001') $$,
  '42501', 'permission denied for function borrar_evento', 'anon cannot delete an evento'
);

reset role;

-- The encargado --------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000001", "role": "authenticated"}';

-- Allowed: creating an evento of their iglesia saves it with all its dates.
select isnt(
  public.guardar_evento(
    titulo => 'Culto joven',
    lugar => 'Templo',
    enfasis => 'nuevas_generaciones',
    alcance => 'iglesia',
    duenio_iglesia_id => '11111111-0000-4000-8000-000000000001',
    hora => '19:00',
    repeticion => 'ninguna',
    fechas => array['2026-12-05']::date[]),
  null,
  'the encargado creates an evento of their iglesia'
);
select results_eq(
  $$ select eventos.titulo, eventos.lugar, eventos.enfasis::text, eventos.hora, eventos_fechas.fecha
     from public.eventos join public.eventos_fechas on eventos_fechas.evento_id = eventos.id
     where eventos.titulo = 'Culto joven' $$,
  $$ values ('Culto joven', 'Templo'::text, 'nuevas_generaciones', '19:00'::time, '2026-12-05'::date) $$,
  'the evento and its date are saved together'
);

-- Rejected: an evento of an iglesia the cargos do not cover.
select throws_ok(
  $$ select public.guardar_evento(
    titulo => 'En otra iglesia',
    alcance => 'iglesia',
    duenio_iglesia_id => '11111111-0000-4000-8000-000000000002',
    hora => '10:00',
    repeticion => 'ninguna',
    fechas => array['2026-12-05']::date[]) $$,
  '42501', null, 'the encargado cannot create an evento of another iglesia'
);
select is_empty(
  $$ select 1 from public.eventos where titulo = 'En otra iglesia' $$,
  'nothing of the rejected evento is saved'
);

-- Rejected: an evento without dates would show in no calendario.
select throws_ok(
  $$ select public.guardar_evento(
    titulo => 'Sin fechas',
    alcance => 'iglesia',
    duenio_iglesia_id => '11111111-0000-4000-8000-000000000001',
    hora => '10:00',
    repeticion => 'ninguna',
    fechas => array[]::date[]) $$,
  '22023', 'An evento needs at least one fecha', 'an evento cannot be saved without dates'
);
select throws_ok(
  $$ select public.guardar_evento(
    titulo => 'Sin fechas',
    alcance => 'iglesia',
    duenio_iglesia_id => '11111111-0000-4000-8000-000000000001',
    hora => '10:00',
    repeticion => 'ninguna',
    fechas => null) $$,
  '22023', 'An evento needs at least one fecha', 'an evento cannot be saved with no list of dates'
);
select is_empty(
  $$ select 1 from public.eventos where titulo = 'Sin fechas' $$,
  'no evento without dates is left behind'
);

-- Rollback: the evento is inserted, then its dates fail (the same date twice
-- breaks the primary key). The evento does not stay without dates.
select throws_ok(
  $$ select public.guardar_evento(
    titulo => 'Fechas repetidas',
    alcance => 'iglesia',
    duenio_iglesia_id => '11111111-0000-4000-8000-000000000001',
    hora => '10:00',
    repeticion => 'ninguna',
    fechas => array['2026-12-05', '2026-12-05']::date[]) $$,
  '23505', null, 'saving the dates fails'
);
select is_empty(
  $$ select 1 from public.eventos where titulo = 'Fechas repetidas' $$,
  'when the dates fail, the evento is not saved either'
);

-- Allowed: editing their evento replaces its columns and all its dates.
select is(
  public.guardar_evento(
    evento_id => 'eeeeeeee-0000-4000-8000-000000000001',
    titulo => 'Evento propio, cambiado',
    lugar => 'Salón',
    descripcion => 'Con merienda',
    enfasis => 'discipulado',
    alcance => 'iglesia',
    duenio_iglesia_id => '11111111-0000-4000-8000-000000000001',
    hora => '18:30',
    repeticion => 'semanal',
    fin_de_serie => '2026-11-28',
    fechas => array['2026-11-21', '2026-11-28']::date[]),
  'eeeeeeee-0000-4000-8000-000000000001'::uuid,
  'the encargado edits an evento of their iglesia'
);
select results_eq(
  $$ select titulo, lugar, descripcion, enfasis::text, hora, repeticion::text, fin_de_serie
     from public.eventos where id = 'eeeeeeee-0000-4000-8000-000000000001' $$,
  $$ values ('Evento propio, cambiado', 'Salón'::text, 'Con merienda'::text, 'discipulado',
             '18:30'::time, 'semanal', '2026-11-28'::date) $$,
  'every column of the evento is replaced'
);
select results_eq(
  $$ select fecha from public.eventos_fechas
     where evento_id = 'eeeeeeee-0000-4000-8000-000000000001' order by fecha $$,
  $$ values ('2026-11-21'::date), ('2026-11-28'::date) $$,
  'its dates are replaced, the old one included'
);

-- Rollback while editing: the evento is updated and its old dates deleted, then
-- the new dates fail. The evento keeps what it had.
select throws_ok(
  $$ select public.guardar_evento(
    evento_id => 'eeeeeeee-0000-4000-8000-000000000001',
    titulo => 'No se guarda',
    alcance => 'iglesia',
    duenio_iglesia_id => '11111111-0000-4000-8000-000000000001',
    hora => '10:00',
    repeticion => 'ninguna',
    fechas => array['2026-12-12', '2026-12-12']::date[]) $$,
  '23505', null, 'saving the new dates of an edit fails'
);
select results_eq(
  $$ select eventos.titulo, eventos_fechas.fecha
     from public.eventos join public.eventos_fechas on eventos_fechas.evento_id = eventos.id
     where eventos.id = 'eeeeeeee-0000-4000-8000-000000000001' order by fecha $$,
  $$ values ('Evento propio, cambiado', '2026-11-21'::date), ('Evento propio, cambiado', '2026-11-28'::date) $$,
  'when an edit fails, the evento keeps its columns and its dates'
);

-- Rejected: editing an evento of an iglesia the cargos do not cover. The
-- policy hides it, and the function says so instead of changing nothing.
select throws_ok(
  $$ select public.guardar_evento(
    evento_id => 'eeeeeeee-0000-4000-8000-000000000002',
    titulo => 'Cambiado',
    alcance => 'iglesia',
    duenio_iglesia_id => '11111111-0000-4000-8000-000000000002',
    hora => '10:00',
    repeticion => 'ninguna',
    fechas => array['2026-12-05']::date[]) $$,
  'P0002', null, 'the encargado cannot edit an evento of another iglesia'
);

-- Rejected: handing their evento to an iglesia the cargos do not cover.
select throws_ok(
  $$ select public.guardar_evento(
    evento_id => 'eeeeeeee-0000-4000-8000-000000000001',
    titulo => 'Regalado',
    alcance => 'iglesia',
    duenio_iglesia_id => '11111111-0000-4000-8000-000000000002',
    hora => '10:00',
    repeticion => 'ninguna',
    fechas => array['2026-12-05']::date[]) $$,
  '42501', null, 'the encargado cannot give their evento to another iglesia'
);

-- Rejected: an evento of their distrito; an encargado only covers their iglesia.
select throws_ok(
  $$ select public.guardar_evento(
    titulo => 'Del distrito',
    alcance => 'distrito',
    duenio_distrito_id => 'dddddddd-0000-4000-8000-000000000001',
    hora => '10:00',
    repeticion => 'ninguna',
    fechas => array['2026-12-05']::date[]) $$,
  '42501', null, 'the encargado cannot create an evento of their distrito'
);

-- Rejected: deleting an evento of another iglesia.
select throws_ok(
  $$ select public.borrar_evento('eeeeeeee-0000-4000-8000-000000000002') $$,
  'P0002', null, 'the encargado cannot delete an evento of another iglesia'
);

-- Allowed: deleting their evento takes its dates along.
select lives_ok(
  $$ select public.borrar_evento('eeeeeeee-0000-4000-8000-000000000001') $$,
  'the encargado deletes an evento of their iglesia'
);
select is_empty(
  $$ select 1 from public.eventos where id = 'eeeeeeee-0000-4000-8000-000000000001' $$,
  'the deleted evento is gone'
);
select is_empty(
  $$ select 1 from public.eventos_fechas where evento_id = 'eeeeeeee-0000-4000-8000-000000000001' $$,
  'its dates are gone with it'
);

-- Rejected: an evento that does not exist (any more).
select throws_ok(
  $$ select public.borrar_evento('eeeeeeee-0000-4000-8000-000000000001') $$,
  'P0002', null, 'deleting an evento that does not exist fails'
);

reset role;

-- What the encargado could not touch is still there.
select results_eq(
  $$ select titulo from public.eventos where id = 'eeeeeeee-0000-4000-8000-000000000002' $$,
  $$ values ('Evento ajeno') $$,
  'the evento of the other iglesia is unchanged'
);
select results_eq(
  $$ select fecha from public.eventos_fechas where evento_id = 'eeeeeeee-0000-4000-8000-000000000002' $$,
  $$ values ('2026-11-14'::date) $$,
  'the dates of the evento of the other iglesia are unchanged'
);

-- The pastor -----------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000002", "role": "authenticated"}';

-- Allowed: an evento of their distrito and one of any of its iglesias.
select isnt(
  public.guardar_evento(
    titulo => 'Encuentro del distrito',
    enfasis => 'identidad',
    alcance => 'distrito',
    duenio_distrito_id => 'dddddddd-0000-4000-8000-000000000001',
    hora => '16:00',
    repeticion => 'ninguna',
    fechas => array['2026-12-12']::date[]),
  null,
  'the pastor creates an evento of their distrito'
);
select isnt(
  public.guardar_evento(
    titulo => 'Culto en otra iglesia',
    alcance => 'iglesia',
    duenio_iglesia_id => '11111111-0000-4000-8000-000000000002',
    hora => '10:00',
    repeticion => 'ninguna',
    fechas => array['2026-12-12']::date[]),
  null,
  'the pastor creates an evento of an iglesia of their distrito'
);

-- Allowed: deleting an evento of an iglesia of their distrito.
select lives_ok(
  $$ select public.borrar_evento('eeeeeeee-0000-4000-8000-000000000002') $$,
  'the pastor deletes an evento of an iglesia of their distrito'
);

-- Rejected: an evento of the asociacion, which is above their distrito.
select throws_ok(
  $$ select public.guardar_evento(
    titulo => 'De la asociación',
    alcance => 'asociacion',
    duenio_asociacion_id => 'aaaaaaaa-0000-4000-8000-000000000001',
    hora => '10:00',
    repeticion => 'ninguna',
    fechas => array['2026-12-12']::date[]) $$,
  '42501', null, 'the pastor cannot create an evento of the asociacion'
);

reset role;

select * from finish();

rollback;
