// Writes supabase/tests/cargos_regla.test.sql from the table of cases of the
// cargos rule, the same file the Jest tests of the domain assert.
//
// Run from the root of the repository: npm run db:casos-cargos
// It needs no dependency: Node strips the types itself.

import { readFileSync, writeFileSync } from 'node:fs';

const ORIGEN = 'src/features/sesion/dominio/cargosAbarcanDuenio.casos.json';
const DESTINO = 'supabase/tests/cargos_regla.test.sql';

type Tabla = {
  estructura: {
    asociaciones: string[];
    distritos: Record<string, string>;
    iglesias: Record<string, string>;
  };
  usuarios: Record<string, string[]>;
  casos: { usuario: string; duenio: string; abarca: boolean }[];
};

const tabla: Tabla = JSON.parse(readFileSync(ORIGEN, 'utf8'));
const { asociaciones, distritos, iglesias } = tabla.estructura;

// Deterministic ids, one prefix per kind of row.
function uuid(prefijo: string, posicion: number): string {
  return `${prefijo}-0000-4000-8000-${String(posicion + 1).padStart(12, '0')}`;
}

const idsDeAsociacion = new Map(asociaciones.map((id, i) => [id, uuid('aaaaaaaa', i)]));
const idsDeDistrito = new Map(Object.keys(distritos).map((id, i) => [id, uuid('dddddddd', i)]));
const idsDeIglesia = new Map(Object.keys(iglesias).map((id, i) => [id, uuid('11111111', i)]));
const idsDeUsuario = new Map(Object.keys(tabla.usuarios).map((id, i) => [id, uuid('bbbbbbbb', i)]));

function buscar(ids: Map<string, string>, id: string): string {
  const encontrado = ids.get(id);
  if (encontrado === undefined) throw new Error(`Unknown id in the table: ${id}`);
  return encontrado;
}

const literal = (texto: string): string => `'${texto.replaceAll("'", "''")}'`;
const idONulo = (id: string | undefined): string =>
  id === undefined ? 'null::uuid' : `'${id}'::uuid`;

// The three columns of a cargo or of a duenio: the level it is on, the rest null.
function columnas(id: string): [string | undefined, string | undefined, string | undefined] {
  if (idsDeIglesia.has(id)) return [buscar(idsDeIglesia, id), undefined, undefined];
  if (idsDeDistrito.has(id)) return [undefined, buscar(idsDeDistrito, id), undefined];
  return [undefined, undefined, buscar(idsDeAsociacion, id)];
}

function generar(): string {
  const lineas: string[] = [];
  const agregar = (...nuevas: string[]) => lineas.push(...nuevas);

  agregar(
    '-- GENERATED FILE, DO NOT EDIT.',
    `-- It comes from ${ORIGEN}.`,
    '-- Change the cases there and run `npm run db:casos-cargos`.',
    '-- CI fails when this file is out of date.',
    '--',
    '-- Asserts every case of the table against public.cargos_abarcan_duenio, the',
    '-- rule of the database, acting as a usuario that holds the cargos of the case.',
    '-- The same cases are asserted against the rule of the domain by',
    '-- cargosAbarcanDuenio.test.ts, so the two rules cannot drift apart.',
    '--',
    '-- The function is called directly and not through the writes of the eventos:',
    '-- this tests the rule, and cargos_permisos.test.sql tests the policies.',
    '--',
    '-- Run with: npm run db:test',
    '',
    'begin;',
    '',
    'create extension if not exists pgtap with schema extensions;',
    '',
    `select plan(${tabla.casos.length});`,
    '',
    '-- Fixtures, loaded by the superuser ------------------------------------------',
    '',
    'insert into public.asociaciones (id, nombre) values',
    asociaciones.map((id) => `  ('${buscar(idsDeAsociacion, id)}', ${literal(id)})`).join(',\n') +
      ';',
    '',
    'insert into public.distritos (id, asociacion_id, nombre) values',
    Object.entries(distritos)
      .map(
        ([id, asociacion]) =>
          `  ('${buscar(idsDeDistrito, id)}', '${buscar(idsDeAsociacion, asociacion)}', ${literal(id)})`,
      )
      .join(',\n') + ';',
    '',
    'insert into public.iglesias (id, distrito_id, nombre, direccion, localidad) values',
    Object.entries(iglesias)
      .map(
        ([id, distrito]) =>
          `  ('${buscar(idsDeIglesia, id)}', '${buscar(idsDeDistrito, distrito)}', ${literal(id)}, 'Calle 1', 'Localidad')`,
      )
      .join(',\n') + ';',
    '',
    '-- The usuarios: only what the foreign key of cargos and auth.uid() need.',
    'insert into auth.users (id, aud, role, email) values',
    [...idsDeUsuario]
      .map(
        ([nombre, id]) =>
          `  ('${id}', 'authenticated', 'authenticated', ${literal(`${nombre}@casos.example.com`)})`,
      )
      .join(',\n') + ';',
    '',
  );

  const cargos = Object.entries(tabla.usuarios).flatMap(([usuario, ids]) =>
    ids.map((id) => {
      const [iglesia, distrito, asociacion] = columnas(id);
      return `  ('${buscar(idsDeUsuario, usuario)}', ${idONulo(iglesia)}, ${idONulo(distrito)}, ${idONulo(asociacion)})`;
    }),
  );
  if (cargos.length > 0) {
    agregar(
      'insert into public.cargos (usuario_id, iglesia_id, distrito_id, asociacion_id) values',
      cargos.join(',\n') + ';',
      '',
    );
  }

  agregar('-- The cases ---------------------------------------------------------------------', '');
  for (const caso of tabla.casos) {
    const [iglesia, distrito, asociacion] = columnas(caso.duenio);
    const usuario = buscar(idsDeUsuario, caso.usuario);
    const descripcion = `${caso.usuario} ${caso.abarca ? 'covers' : 'does not cover'} ${caso.duenio}`;
    agregar(
      `set local role authenticated;`,
      `set local request.jwt.claims to '{"sub": "${usuario}", "role": "authenticated"}';`,
      `select is(public.cargos_abarcan_duenio(${idONulo(iglesia)}, ${idONulo(distrito)}, ${idONulo(asociacion)}), ${caso.abarca}, ${literal(descripcion)});`,
      'reset role;',
      '',
    );
  }

  agregar('select * from finish();', '', 'rollback;', '');
  return lineas.join('\n');
}

writeFileSync(DESTINO, generar());
