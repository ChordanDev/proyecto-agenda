-- Tests of public.fechas_de_recordatorio (issue #216): the daily sending reads
-- each date of a series with its excepcion, as buscar_eventos does (#214). A
-- moved date warns the night before its new day, a changed date warns with its
-- own titulo and hora, and a deleted date does not warn.
--
-- Run with: npm run db:test

begin;

create extension if not exists pgtap with schema extensions;

select plan(16);

-- Fixtures ---------------------------------------------------------------------

insert into public.asociaciones (id, nombre) values
  ('aaaaaaaa-0000-4000-8000-000000000216', 'Asociación de la prueba');
insert into public.distritos (id, asociacion_id, nombre) values
  ('dddddddd-0000-4000-8000-000000000216', 'aaaaaaaa-0000-4000-8000-000000000216', 'Distrito'),
  ('dddddddd-0000-4000-8000-000000000217', 'aaaaaaaa-0000-4000-8000-000000000216', 'Distrito de baja');
insert into public.iglesias (id, distrito_id, nombre, direccion, ciudad, provincia) values
  ('11111111-0000-4000-8000-000000000216', 'dddddddd-0000-4000-8000-000000000216', 'Iglesia central', 'Calle 1', 'Ciudad', 'Provincia'),
  ('22222222-0000-4000-8000-000000000216', 'dddddddd-0000-4000-8000-000000000216', 'Iglesia sumada', 'Calle 2', 'Ciudad', 'Provincia'),
  ('33333333-0000-4000-8000-000000000216', 'dddddddd-0000-4000-8000-000000000216', 'Iglesia de baja', 'Calle 3', 'Ciudad', 'Provincia');

-- Weekly series on Saturdays (7, 14, 21 and 28 November), all with an enfasis.
insert into public.eventos (id, titulo, alcance, duenio_iglesia_id, duenio_distrito_id, hora, lugar, enfasis, repeticion, fin_de_serie) values
  -- Its date of the 14th moves to Sunday the 22nd.
  ('eeeeeeee-0000-4000-8000-000000000001', 'Movida', 'iglesia', '11111111-0000-4000-8000-000000000216', null, '19:00', 'Templo', 'identidad', 'semanal', '2026-11-28'),
  -- Its date of the 21st changes the titulo, the hora and the lugar.
  ('eeeeeeee-0000-4000-8000-000000000002', 'Culto joven', 'iglesia', '11111111-0000-4000-8000-000000000216', null, '19:00', 'Templo', 'liderazgo', 'semanal', '2026-11-28'),
  -- Its date of the 21st is deleted.
  ('eeeeeeee-0000-4000-8000-000000000003', 'Borrada', 'iglesia', '11111111-0000-4000-8000-000000000216', null, '18:00', null, 'discipulado', 'semanal', '2026-11-28'),
  -- Its date of the 21st becomes an actividad regular.
  ('eeeeeeee-0000-4000-8000-000000000004', 'Regular', 'iglesia', '11111111-0000-4000-8000-000000000216', null, '17:00', null, 'identidad', 'semanal', '2026-11-28'),
  -- Of an iglesia de baja, and of a distrito de baja.
  ('eeeeeeee-0000-4000-8000-000000000005', 'De iglesia de baja', 'iglesia', '33333333-0000-4000-8000-000000000216', null, '16:00', null, 'identidad', 'semanal', '2026-11-28'),
  ('eeeeeeee-0000-4000-8000-000000000006', 'De distrito de baja', 'distrito', null, 'dddddddd-0000-4000-8000-000000000217', '16:00', null, 'identidad', 'semanal', '2026-11-28');

insert into public.eventos_fechas (evento_id, fecha)
select evento_id, fecha::date
from unnest(array[
  'eeeeeeee-0000-4000-8000-000000000001', 'eeeeeeee-0000-4000-8000-000000000002',
  'eeeeeeee-0000-4000-8000-000000000003', 'eeeeeeee-0000-4000-8000-000000000004',
  'eeeeeeee-0000-4000-8000-000000000005', 'eeeeeeee-0000-4000-8000-000000000006'
]::uuid[]) as evento_id,
unnest(array['2026-11-07', '2026-11-14', '2026-11-21', '2026-11-28']) as fecha;

-- The first series is shared with an active iglesia and with one de baja.
insert into public.iglesias_sumadas (evento_id, iglesia_id) values
  ('eeeeeeee-0000-4000-8000-000000000001', '22222222-0000-4000-8000-000000000216'),
  ('eeeeeeee-0000-4000-8000-000000000001', '33333333-0000-4000-8000-000000000216');

insert into public.excepciones (evento_id, fecha, fecha_nueva) values
  ('eeeeeeee-0000-4000-8000-000000000001', '2026-11-14', '2026-11-22');
insert into public.excepciones (evento_id, fecha, titulo, hora, cambia_lugar, lugar) values
  ('eeeeeeee-0000-4000-8000-000000000002', '2026-11-21', 'Culto especial', '10:30', true, 'Salón');
insert into public.excepciones (evento_id, fecha, cambia_enfasis, enfasis) values
  ('eeeeeeee-0000-4000-8000-000000000004', '2026-11-21', true, null);
-- A deleted date loses its row in eventos_fechas, as borrar_fecha does.
insert into public.excepciones (evento_id, fecha, borrada) values
  ('eeeeeeee-0000-4000-8000-000000000003', '2026-11-21', true);
delete from public.eventos_fechas
where evento_id = 'eeeeeeee-0000-4000-8000-000000000003' and fecha = '2026-11-21';

update public.iglesias set de_baja = true where id = '33333333-0000-4000-8000-000000000216';
update public.distritos set de_baja = true where id = 'dddddddd-0000-4000-8000-000000000217';

-- Only the eventos of this asociacion: the tests read with the server, which sees every one.
create temporary view de_la_prueba as
select * from public.eventos where duenio_iglesia_id in (
  '11111111-0000-4000-8000-000000000216', '33333333-0000-4000-8000-000000000216'
) or duenio_distrito_id = 'dddddddd-0000-4000-8000-000000000217';
grant select on de_la_prueba to service_role;

-- Who may call it -------------------------------------------------------------------

select isnt_definer('public', 'fechas_de_recordatorio', array['date']);
select function_privs_are(
  'public', 'fechas_de_recordatorio', array['date'], 'anon', array[]::text[],
  'Without a session nobody reads the dates of the recordatorios'
);
select function_privs_are(
  'public', 'fechas_de_recordatorio', array['date'], 'authenticated', array[]::text[],
  'A usuario does not read the dates of the recordatorios'
);
select function_privs_are(
  'public', 'fechas_de_recordatorio', array['date'], 'service_role', array['EXECUTE'],
  'The server reads the dates of the recordatorios'
);

set local role service_role;

-- A moved date ------------------------------------------------------------------

select results_eq(
  $$ select fecha, titulo from public.fechas_de_recordatorio('2026-11-22')
     where evento_id = 'eeeeeeee-0000-4000-8000-000000000001' $$,
  $$ values ('2026-11-22'::date, 'Movida') $$,
  'A date moved to tomorrow warns today, on its new day'
);

select is_empty(
  $$ select 1 from public.fechas_de_recordatorio('2026-11-14')
     where evento_id = 'eeeeeeee-0000-4000-8000-000000000001' $$,
  'A moved date does not warn before its original day'
);

select results_eq(
  $$ select fecha from public.fechas_de_recordatorio('2026-11-07')
     where evento_id = 'eeeeeeee-0000-4000-8000-000000000001' $$,
  $$ values ('2026-11-07'::date) $$,
  'The other dates of the series warn on their own day'
);

-- A changed date -----------------------------------------------------------------

select results_eq(
  $$ select titulo, hora, lugar from public.fechas_de_recordatorio('2026-11-21')
     where evento_id = 'eeeeeeee-0000-4000-8000-000000000002' $$,
  $$ values ('Culto especial', '10:30'::time, 'Salón') $$,
  'A date with its titulo, hora and lugar changed warns with the new ones'
);

select results_eq(
  $$ select titulo, hora, lugar from public.fechas_de_recordatorio('2026-11-14')
     where evento_id = 'eeeeeeee-0000-4000-8000-000000000002' $$,
  $$ values ('Culto joven', '19:00'::time, 'Templo') $$,
  'A date without an excepcion warns with those of the series'
);

-- A deleted date ------------------------------------------------------------------

select is_empty(
  $$ select 1 from public.fechas_de_recordatorio('2026-11-21')
     where evento_id = 'eeeeeeee-0000-4000-8000-000000000003' $$,
  'A deleted date of a series does not warn'
);

select results_eq(
  $$ select fecha from public.fechas_de_recordatorio('2026-11-28')
     where evento_id = 'eeeeeeee-0000-4000-8000-000000000003' $$,
  $$ values ('2026-11-28'::date) $$,
  'The other dates of a series with a deleted date keep warning'
);

-- An actividad regular ------------------------------------------------------------

select is_empty(
  $$ select 1 from public.fechas_de_recordatorio('2026-11-21')
     where evento_id = 'eeeeeeee-0000-4000-8000-000000000004' $$,
  'A date whose excepcion turns it into an actividad regular stops warning'
);

select results_eq(
  $$ select enfasis from public.fechas_de_recordatorio('2026-11-14')
     where evento_id = 'eeeeeeee-0000-4000-8000-000000000004' $$,
  $$ values ('identidad'::public.enfasis) $$,
  'The other dates of that series keep their enfasis and warn'
);

-- What is de baja (#159) ----------------------------------------------------------

select is_empty(
  $$ select 1 from public.fechas_de_recordatorio('2026-11-07')
     where evento_id in ('eeeeeeee-0000-4000-8000-000000000005', 'eeeeeeee-0000-4000-8000-000000000006') $$,
  'An evento of an iglesia or a distrito de baja does not warn'
);

select results_eq(
  $$ select iglesias_sumadas from public.fechas_de_recordatorio('2026-11-07')
     where evento_id = 'eeeeeeee-0000-4000-8000-000000000001' $$,
  $$ values (array['22222222-0000-4000-8000-000000000216']::uuid[]) $$,
  'An iglesia sumada de baja stops being sumada'
);

-- Everything of a day --------------------------------------------------------------

select results_eq(
  $$ select r.evento_id, r.fecha from public.fechas_de_recordatorio('2026-11-21') as r
     join de_la_prueba on de_la_prueba.id = r.evento_id
     order by r.evento_id $$,
  $$ values
    ('eeeeeeee-0000-4000-8000-000000000001'::uuid, '2026-11-21'::date),
    ('eeeeeeee-0000-4000-8000-000000000002'::uuid, '2026-11-21'::date) $$,
  'A day reads each date once, only those that warn'
);

reset role;

select * from finish();

rollback;
