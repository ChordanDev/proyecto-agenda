-- Privileges of the API roles over the tables.
--
-- Row level security decides which rows a role can touch, but only where the
-- role has the privilege, and it does not apply to truncate at all. So the
-- privileges are a second barrier, and this file pins them down:
--
--   1. Each table gives each API role exactly the privileges expected, no more.
--   2. Neither role can truncate any table.
--   3. A table created without granting anything is closed to both roles, so a
--      new table never opens by default.
--
-- The way permission tests are written is explained at the top of
-- estructura_permisos.test.sql.
--
-- Run with: npm run db:test

begin;

create extension if not exists pgtap with schema extensions;

select plan(56);

-- Exact privileges ---------------------------------------------------------------

select is(
  coalesce((
    select array_agg(p order by p)
    from unnest(array['DELETE','INSERT','MAINTAIN','REFERENCES','SELECT','TRIGGER','TRUNCATE','UPDATE']) as p
    where has_table_privilege('anon', 'public.asociaciones', p)
  ), array[]::text[]),
  array['SELECT']::text[],
  'anon has exactly the expected privileges on asociaciones'
);

select is(
  coalesce((
    select array_agg(p order by p)
    from unnest(array['DELETE','INSERT','MAINTAIN','REFERENCES','SELECT','TRIGGER','TRUNCATE','UPDATE']) as p
    where has_table_privilege('anon', 'public.distritos', p)
  ), array[]::text[]),
  array['SELECT']::text[],
  'anon has exactly the expected privileges on distritos'
);

select is(
  coalesce((
    select array_agg(p order by p)
    from unnest(array['DELETE','INSERT','MAINTAIN','REFERENCES','SELECT','TRIGGER','TRUNCATE','UPDATE']) as p
    where has_table_privilege('anon', 'public.iglesias', p)
  ), array[]::text[]),
  array['SELECT']::text[],
  'anon has exactly the expected privileges on iglesias'
);

select is(
  coalesce((
    select array_agg(p order by p)
    from unnest(array['DELETE','INSERT','MAINTAIN','REFERENCES','SELECT','TRIGGER','TRUNCATE','UPDATE']) as p
    where has_table_privilege('anon', 'public.eventos', p)
  ), array[]::text[]),
  array['SELECT']::text[],
  'anon has exactly the expected privileges on eventos'
);

select is(
  coalesce((
    select array_agg(p order by p)
    from unnest(array['DELETE','INSERT','MAINTAIN','REFERENCES','SELECT','TRIGGER','TRUNCATE','UPDATE']) as p
    where has_table_privilege('anon', 'public.eventos_fechas', p)
  ), array[]::text[]),
  array['SELECT']::text[],
  'anon has exactly the expected privileges on eventos_fechas'
);

select is(
  coalesce((
    select array_agg(p order by p)
    from unnest(array['DELETE','INSERT','MAINTAIN','REFERENCES','SELECT','TRIGGER','TRUNCATE','UPDATE']) as p
    where has_table_privilege('anon', 'public.iglesias_sumadas', p)
  ), array[]::text[]),
  array['SELECT']::text[],
  'anon has exactly the expected privileges on iglesias_sumadas'
);

select is(
  coalesce((
    select array_agg(p order by p)
    from unnest(array['DELETE','INSERT','MAINTAIN','REFERENCES','SELECT','TRIGGER','TRUNCATE','UPDATE']) as p
    where has_table_privilege('anon', 'public.cargos', p)
  ), array[]::text[]),
  array[]::text[],
  'anon has exactly the expected privileges on cargos'
);

select is(
  coalesce((
    select array_agg(p order by p)
    from unnest(array['DELETE','INSERT','MAINTAIN','REFERENCES','SELECT','TRIGGER','TRUNCATE','UPDATE']) as p
    where has_table_privilege('anon', 'public.lugares', p)
  ), array[]::text[]),
  array['SELECT']::text[],
  'anon has exactly the expected privileges on lugares'
);

select is(
  coalesce((
    select array_agg(p order by p)
    from unnest(array['DELETE','INSERT','MAINTAIN','REFERENCES','SELECT','TRIGGER','TRUNCATE','UPDATE']) as p
    where has_table_privilege('anon', 'public.perfiles', p)
  ), array[]::text[]),
  array[]::text[],
  'anon has exactly the expected privileges on perfiles'
);

select is(
  coalesce((
    select array_agg(p order by p)
    from unnest(array['DELETE','INSERT','MAINTAIN','REFERENCES','SELECT','TRIGGER','TRUNCATE','UPDATE']) as p
    where has_table_privilege('anon', 'public.chat_consentimientos', p)
  ), array[]::text[]),
  array[]::text[],
  'anon has exactly the expected privileges on chat_consentimientos'
);

select is(
  coalesce((
    select array_agg(p order by p)
    from unnest(array['DELETE','INSERT','MAINTAIN','REFERENCES','SELECT','TRIGGER','TRUNCATE','UPDATE']) as p
    where has_table_privilege('anon', 'public.chat_consultas', p)
  ), array[]::text[]),
  array[]::text[],
  'anon has exactly the expected privileges on chat_consultas'
);

select is(
  coalesce((
    select array_agg(p order by p)
    from unnest(array['DELETE','INSERT','MAINTAIN','REFERENCES','SELECT','TRIGGER','TRUNCATE','UPDATE']) as p
    where has_table_privilege('anon', 'public.chat_gastos', p)
  ), array[]::text[]),
  array[]::text[],
  'anon has exactly the expected privileges on chat_gastos'
);

select is(
  coalesce((
    select array_agg(p order by p)
    from unnest(array['DELETE','INSERT','MAINTAIN','REFERENCES','SELECT','TRIGGER','TRUNCATE','UPDATE']) as p
    where has_table_privilege('authenticated', 'public.asociaciones', p)
  ), array[]::text[]),
  array['SELECT']::text[],
  'authenticated has exactly the expected privileges on asociaciones'
);

select is(
  coalesce((
    select array_agg(p order by p)
    from unnest(array['DELETE','INSERT','MAINTAIN','REFERENCES','SELECT','TRIGGER','TRUNCATE','UPDATE']) as p
    where has_table_privilege('authenticated', 'public.distritos', p)
  ), array[]::text[]),
  array['SELECT']::text[],
  'authenticated has exactly the expected privileges on distritos'
);

select is(
  coalesce((
    select array_agg(p order by p)
    from unnest(array['DELETE','INSERT','MAINTAIN','REFERENCES','SELECT','TRIGGER','TRUNCATE','UPDATE']) as p
    where has_table_privilege('authenticated', 'public.iglesias', p)
  ), array[]::text[]),
  array['SELECT']::text[],
  'authenticated has exactly the expected privileges on iglesias'
);

select is(
  coalesce((
    select array_agg(p order by p)
    from unnest(array['DELETE','INSERT','MAINTAIN','REFERENCES','SELECT','TRIGGER','TRUNCATE','UPDATE']) as p
    where has_table_privilege('authenticated', 'public.eventos', p)
  ), array[]::text[]),
  array['DELETE', 'INSERT', 'SELECT', 'UPDATE']::text[],
  'authenticated has exactly the expected privileges on eventos'
);

select is(
  coalesce((
    select array_agg(p order by p)
    from unnest(array['DELETE','INSERT','MAINTAIN','REFERENCES','SELECT','TRIGGER','TRUNCATE','UPDATE']) as p
    where has_table_privilege('authenticated', 'public.eventos_fechas', p)
  ), array[]::text[]),
  array['DELETE', 'INSERT', 'SELECT', 'UPDATE']::text[],
  'authenticated has exactly the expected privileges on eventos_fechas'
);

select is(
  coalesce((
    select array_agg(p order by p)
    from unnest(array['DELETE','INSERT','MAINTAIN','REFERENCES','SELECT','TRIGGER','TRUNCATE','UPDATE']) as p
    where has_table_privilege('authenticated', 'public.iglesias_sumadas', p)
  ), array[]::text[]),
  array['SELECT']::text[],
  'authenticated has exactly the expected privileges on iglesias_sumadas'
);

select is(
  coalesce((
    select array_agg(p order by p)
    from unnest(array['DELETE','INSERT','MAINTAIN','REFERENCES','SELECT','TRIGGER','TRUNCATE','UPDATE']) as p
    where has_table_privilege('authenticated', 'public.cargos', p)
  ), array[]::text[]),
  array['SELECT']::text[],
  'authenticated has exactly the expected privileges on cargos'
);

select is(
  coalesce((
    select array_agg(p order by p)
    from unnest(array['DELETE','INSERT','MAINTAIN','REFERENCES','SELECT','TRIGGER','TRUNCATE','UPDATE']) as p
    where has_table_privilege('authenticated', 'public.lugares', p)
  ), array[]::text[]),
  array['INSERT', 'SELECT']::text[],
  'authenticated has exactly the expected privileges on lugares'
);

select is(
  coalesce((
    select array_agg(p order by p)
    from unnest(array['DELETE','INSERT','MAINTAIN','REFERENCES','SELECT','TRIGGER','TRUNCATE','UPDATE']) as p
    where has_table_privilege('authenticated', 'public.perfiles', p)
  ), array[]::text[]),
  array['SELECT']::text[],
  'authenticated has exactly the expected privileges on perfiles'
);

-- chat_consentimientos also has insert on its usuario_id column, which is a
-- column privilege and not one of the table; chat_limites.test.sql checks it.
select is(
  coalesce((
    select array_agg(p order by p)
    from unnest(array['DELETE','INSERT','MAINTAIN','REFERENCES','SELECT','TRIGGER','TRUNCATE','UPDATE']) as p
    where has_table_privilege('authenticated', 'public.chat_consentimientos', p)
  ), array[]::text[]),
  array['SELECT']::text[],
  'authenticated has exactly the expected privileges on chat_consentimientos'
);

select is(
  coalesce((
    select array_agg(p order by p)
    from unnest(array['DELETE','INSERT','MAINTAIN','REFERENCES','SELECT','TRIGGER','TRUNCATE','UPDATE']) as p
    where has_table_privilege('authenticated', 'public.chat_consultas', p)
  ), array[]::text[]),
  array[]::text[],
  'authenticated has exactly the expected privileges on chat_consultas'
);

select is(
  coalesce((
    select array_agg(p order by p)
    from unnest(array['DELETE','INSERT','MAINTAIN','REFERENCES','SELECT','TRIGGER','TRUNCATE','UPDATE']) as p
    where has_table_privilege('authenticated', 'public.chat_gastos', p)
  ), array[]::text[]),
  array[]::text[],
  'authenticated has exactly the expected privileges on chat_gastos'
);

-- Truncate --------------------------------------------------------------------
-- The privilege check comes first, so the tables are not touched.

set local role anon;

select throws_ok(
  $$ truncate public.asociaciones $$,
  '42501', 'permission denied for table asociaciones', 'anon cannot truncate asociaciones'
);
select throws_ok(
  $$ truncate public.distritos $$,
  '42501', 'permission denied for table distritos', 'anon cannot truncate distritos'
);
select throws_ok(
  $$ truncate public.iglesias $$,
  '42501', 'permission denied for table iglesias', 'anon cannot truncate iglesias'
);
select throws_ok(
  $$ truncate public.eventos $$,
  '42501', 'permission denied for table eventos', 'anon cannot truncate eventos'
);
select throws_ok(
  $$ truncate public.eventos_fechas $$,
  '42501', 'permission denied for table eventos_fechas', 'anon cannot truncate eventos_fechas'
);
select throws_ok(
  $$ truncate public.iglesias_sumadas $$,
  '42501', 'permission denied for table iglesias_sumadas', 'anon cannot truncate iglesias_sumadas'
);
select throws_ok(
  $$ truncate public.cargos $$,
  '42501', 'permission denied for table cargos', 'anon cannot truncate cargos'
);
select throws_ok(
  $$ truncate public.lugares $$,
  '42501', 'permission denied for table lugares', 'anon cannot truncate lugares'
);

select throws_ok(
  $$ truncate public.perfiles $$,
  '42501', 'permission denied for table perfiles', 'anon cannot truncate perfiles'
);
select throws_ok(
  $$ truncate public.chat_consentimientos $$,
  '42501', 'permission denied for table chat_consentimientos', 'anon cannot truncate chat_consentimientos'
);
select throws_ok(
  $$ truncate public.chat_consultas $$,
  '42501', 'permission denied for table chat_consultas', 'anon cannot truncate chat_consultas'
);
select throws_ok(
  $$ truncate public.chat_gastos $$,
  '42501', 'permission denied for table chat_gastos', 'anon cannot truncate chat_gastos'
);

reset role;

set local role authenticated;

select throws_ok(
  $$ truncate public.asociaciones $$,
  '42501', 'permission denied for table asociaciones', 'authenticated cannot truncate asociaciones'
);
select throws_ok(
  $$ truncate public.distritos $$,
  '42501', 'permission denied for table distritos', 'authenticated cannot truncate distritos'
);
select throws_ok(
  $$ truncate public.iglesias $$,
  '42501', 'permission denied for table iglesias', 'authenticated cannot truncate iglesias'
);
select throws_ok(
  $$ truncate public.eventos $$,
  '42501', 'permission denied for table eventos', 'authenticated cannot truncate eventos'
);
select throws_ok(
  $$ truncate public.eventos_fechas $$,
  '42501', 'permission denied for table eventos_fechas', 'authenticated cannot truncate eventos_fechas'
);
select throws_ok(
  $$ truncate public.iglesias_sumadas $$,
  '42501', 'permission denied for table iglesias_sumadas', 'authenticated cannot truncate iglesias_sumadas'
);
select throws_ok(
  $$ truncate public.cargos $$,
  '42501', 'permission denied for table cargos', 'authenticated cannot truncate cargos'
);
select throws_ok(
  $$ truncate public.lugares $$,
  '42501', 'permission denied for table lugares', 'authenticated cannot truncate lugares'
);

select throws_ok(
  $$ truncate public.perfiles $$,
  '42501', 'permission denied for table perfiles', 'authenticated cannot truncate perfiles'
);
select throws_ok(
  $$ truncate public.chat_consentimientos $$,
  '42501', 'permission denied for table chat_consentimientos', 'authenticated cannot truncate chat_consentimientos'
);
select throws_ok(
  $$ truncate public.chat_consultas $$,
  '42501', 'permission denied for table chat_consultas', 'authenticated cannot truncate chat_consultas'
);
select throws_ok(
  $$ truncate public.chat_gastos $$,
  '42501', 'permission denied for table chat_gastos', 'authenticated cannot truncate chat_gastos'
);

reset role;

-- A new table starts closed ----------------------------------------------------
-- Created here, as the migrations do, and granted nothing.

create table public.tabla_de_prueba (id integer primary key);

set local role anon;

select throws_ok(
  $$ select * from public.tabla_de_prueba $$,
  '42501', 'permission denied for table tabla_de_prueba', 'anon cannot read a new table'
);
select throws_ok(
  $$ insert into public.tabla_de_prueba (id) values (1) $$,
  '42501', 'permission denied for table tabla_de_prueba', 'anon cannot insert into a new table'
);
select throws_ok(
  $$ update public.tabla_de_prueba set id = 2 $$,
  '42501', 'permission denied for table tabla_de_prueba', 'anon cannot update a new table'
);
select throws_ok(
  $$ delete from public.tabla_de_prueba $$,
  '42501', 'permission denied for table tabla_de_prueba', 'anon cannot delete from a new table'
);

reset role;

set local role authenticated;

select throws_ok(
  $$ select * from public.tabla_de_prueba $$,
  '42501', 'permission denied for table tabla_de_prueba', 'authenticated cannot read a new table'
);
select throws_ok(
  $$ insert into public.tabla_de_prueba (id) values (1) $$,
  '42501', 'permission denied for table tabla_de_prueba', 'authenticated cannot insert into a new table'
);
select throws_ok(
  $$ update public.tabla_de_prueba set id = 2 $$,
  '42501', 'permission denied for table tabla_de_prueba', 'authenticated cannot update a new table'
);
select throws_ok(
  $$ delete from public.tabla_de_prueba $$,
  '42501', 'permission denied for table tabla_de_prueba', 'authenticated cannot delete from a new table'
);

reset role;

select * from finish();
rollback;
