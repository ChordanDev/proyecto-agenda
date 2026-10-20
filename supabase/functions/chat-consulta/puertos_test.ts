import assert from 'node:assert/strict';

import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '../../../src/shared/database.types.ts';
import { crearPuertos } from './puertos.ts';

/** The max_rows of the API (supabase/config.toml): a read never gets more. */
const MAX_ROWS = 1000;

type Fila = Record<string, unknown>;

/**
 * A Supabase client that serves `tablas` the way PostgREST does: a read gets
 * at most MAX_ROWS rows, or the range it asks for. `falla` names a table whose
 * read fails.
 */
function fakeCliente(tablas: Record<string, Fila[]>, { falla }: { falla?: string } = {}) {
  const filtros: { tabla: string; columna: string; valor: unknown }[] = [];
  const cliente = {
    from(tabla: string) {
      let rango: [number, number] | null = null;
      const builder = {
        select: () => builder,
        order: () => builder,
        eq: (columna: string, valor: unknown) => {
          filtros.push({ tabla, columna, valor });
          return builder;
        },
        range: (desde: number, hasta: number) => {
          rango = [desde, hasta];
          return builder;
        },
        then<T>(resolve: (value: unknown) => T, reject: (reason: unknown) => T) {
          const filas = tablas[tabla] ?? [];
          const [desde, hasta] = rango ?? [0, filas.length - 1];
          const resultado =
            tabla === falla
              ? { data: null, error: { message: `${tabla} down` } }
              : {
                  data: filas.slice(desde, Math.min(hasta + 1, desde + MAX_ROWS)),
                  error: null,
                };
          return Promise.resolve(resultado).then(resolve, reject);
        },
      };
      return builder;
    },
  };

  return { cliente: cliente as unknown as SupabaseClient<Database>, filtros };
}

const ESTRUCTURA = {
  asociaciones: [{ id: 'a1', nombre: 'Asociación Central' }],
  distritos: [{ id: 'd1', nombre: 'Centro', asociacion_id: 'a1' }],
  iglesias: [{ id: 'i1', nombre: 'Central', distrito_id: 'd1' }],
};

function puertos(cliente: SupabaseClient<Database>) {
  return crearPuertos({
    usuarioId: 'usuario-1',
    usuario: cliente,
    servidor: cliente,
    proveedor: {
      responder: () => Promise.reject(new Error('The provider is not called here')),
    },
  });
}

Deno.test(
  'leerCargos reads the cargos of the usuario with their nivel, and the structure',
  async () => {
    const { cliente, filtros } = fakeCliente({
      ...ESTRUCTURA,
      cargos: [
        { id: 'c1', iglesia_id: 'i1', distrito_id: null, asociacion_id: null },
        { id: 'c2', iglesia_id: null, distrito_id: 'd1', asociacion_id: null },
        { id: 'c3', iglesia_id: null, distrito_id: null, asociacion_id: 'a1' },
      ],
    });

    assert.deepEqual(await puertos(cliente).leerCargos(), {
      cargos: [
        { nivel: 'iglesia', iglesiaId: 'i1' },
        { nivel: 'distrito', distritoId: 'd1' },
        { nivel: 'asociacion', asociacionId: 'a1' },
      ],
      estructura: {
        asociaciones: [{ id: 'a1', nombre: 'Asociación Central' }],
        distritos: [{ id: 'd1', nombre: 'Centro', asociacionId: 'a1' }],
        iglesias: [{ id: 'i1', nombre: 'Central', distritoId: 'd1' }],
      },
    });
    // A gestor also reads the cargos they oversee: only their own count.
    assert.deepEqual(filtros, [{ tabla: 'cargos', columna: 'usuario_id', valor: 'usuario-1' }]);
  },
);

Deno.test('leerCargos reads every iglesia even past the max_rows of the API', async () => {
  const iglesias = Array.from({ length: MAX_ROWS + 200 }, (_, i) => ({
    id: `i${i}`,
    nombre: `Iglesia ${i}`,
    distrito_id: 'd1',
  }));
  const { cliente } = fakeCliente({ ...ESTRUCTURA, iglesias, cargos: [] });

  const { estructura } = await puertos(cliente).leerCargos();

  assert.equal(estructura.iglesias.length, MAX_ROWS + 200);
  assert.equal(estructura.iglesias.at(-1)?.id, `i${MAX_ROWS + 199}`);
});

Deno.test(
  'leerCargos fails when any read fails, so the consulta answers without proposing',
  async () => {
    for (const tabla of ['cargos', 'asociaciones', 'distritos', 'iglesias']) {
      const { cliente } = fakeCliente({ ...ESTRUCTURA, cargos: [] }, { falla: tabla });

      await assert.rejects(puertos(cliente).leerCargos(), new RegExp(`${tabla} down`));
    }
  },
);

Deno.test('leerCargos fails on a cargo without nivel instead of guessing one', async () => {
  const { cliente } = fakeCliente({
    ...ESTRUCTURA,
    cargos: [{ id: 'c1', iglesia_id: null, distrito_id: null, asociacion_id: null }],
  });

  await assert.rejects(puertos(cliente).leerCargos(), /Cargo c1 has no nivel/);
});
