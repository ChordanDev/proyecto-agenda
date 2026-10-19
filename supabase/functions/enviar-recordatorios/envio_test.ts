// The daily sending against a local Supabase, with a double of Expo Push.
//
// Run with the local stack up (`npm run db:start`), from this folder:
//   SUPABASE_URL=http://127.0.0.1:54321 SUPABASE_SERVICE_ROLE_KEY=<from `supabase status`> \
//     deno test --allow-env --allow-net envio_test.ts
// Without those variables it is skipped. It writes its own asociacion, in a
// zona horaria no other data uses, and deletes it at the end.

import assert from 'node:assert/strict';

import { createClient } from '@supabase/supabase-js';

import type { Database } from '../../../src/shared/database.types.ts';
import { enviarRecordatorios } from '../../../src/features/recordatorios/dominio/envio.ts';
import { crearEnviador } from './expo.ts';
import { crearPuertos } from './puertos.ts';

const url = Deno.env.get('SUPABASE_URL');
const clave = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

/** Tokyo has no summer time and no other asociacion uses it: only this test is at its 20 h. */
const ZONA_HORARIA = 'Asia/Tokyo';
/** 20:00 in Tokyo on 23 October; tomorrow is 24 October. */
const A_LAS_20 = new Date('2026-10-23T11:00:00Z');
const MANIANA = '2026-10-24';

const sufijo = crypto.randomUUID().slice(0, 8);
const token = (nombre: string) => `ExponentPushToken[envio-${nombre}-${sufijo}]`;

Deno.test({
  name: 'two phones that follow different iglesias get their aviso, one turned off gets none',
  ignore: !url || !clave,
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    const db = createClient<Database>(url!, clave!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const unico = <T>(r: { data: T; error: { message: string } | null }): NonNullable<T> => {
      if (r.error || r.data === null || r.data === undefined)
        throw new Error(r.error?.message ?? 'no row');
      return r.data;
    };

    const asociacion = unico(
      await db
        .from('asociaciones')
        .insert({ nombre: `Envío ${sufijo}`, zona_horaria: ZONA_HORARIA })
        .select('id')
        .single(),
    );

    try {
      const distrito = unico(
        await db
          .from('distritos')
          .insert({ nombre: 'Distrito', asociacion_id: asociacion.id })
          .select('id')
          .single(),
      );
      const [central, norte] = unico(
        await db
          .from('iglesias')
          .insert(
            ['Central', 'Norte'].map((nombre) => ({
              nombre,
              distrito_id: distrito.id,
              direccion: 'Calle 1',
              ciudad: 'Ciudad',
              provincia: 'Provincia',
            })),
          )
          .select('id, nombre')
          .order('nombre'),
      );

      const eventos = unico(
        await db
          .from('eventos')
          .insert([
            {
              titulo: 'Congreso de Jóvenes',
              enfasis: 'nuevas_generaciones',
              alcance: 'iglesia',
              duenio_iglesia_id: central.id,
              hora: '19:00',
            },
            {
              titulo: 'Escuela Sabática',
              enfasis: null,
              alcance: 'iglesia',
              duenio_iglesia_id: central.id,
              hora: '09:00',
            },
            {
              titulo: 'Culto joven',
              enfasis: 'identidad',
              alcance: 'iglesia',
              duenio_iglesia_id: norte.id,
              hora: '20:00',
            },
          ])
          .select('id, titulo'),
      );
      unico(
        await db
          .from('eventos_fechas')
          .insert(eventos.map(({ id }) => ({ evento_id: id, fecha: MANIANA })))
          .select('evento_id'),
      );

      const telefonos = unico(
        await db
          .from('dispositivos')
          .insert([
            { token: token('central'), encendido: true },
            { token: token('norte'), encendido: true },
            { token: token('apagado'), encendido: false },
          ])
          .select('id, token'),
      );
      const idDe = (t: string) => telefonos.find((fila) => fila.token === t)!.id;
      unico(
        await db
          .from('dispositivos_iglesias')
          .insert([
            { dispositivo_id: idDe(token('central')), iglesia_id: central.id },
            { dispositivo_id: idDe(token('norte')), iglesia_id: norte.id },
            { dispositivo_id: idDe(token('apagado')), iglesia_id: central.id },
          ])
          .select('dispositivo_id'),
      );

      // The double of Expo Push: the phone of Norte was uninstalled.
      const recibidos: { to: string; body: string }[] = [];
      const expoDoble = (async (_url: string | URL | Request, init?: RequestInit) => {
        const body = JSON.parse(String(init?.body)) as { to: string; body: string }[];
        recibidos.push(...body);
        return new Response(
          JSON.stringify({
            data: body.map(({ to }) =>
              to === token('norte')
                ? { status: 'error', details: { error: 'DeviceNotRegistered' } }
                : { status: 'ok', id: 'ticket' },
            ),
          }),
        );
      }) as typeof fetch;

      const resultado = await enviarRecordatorios(
        crearPuertos({
          servidor: db,
          enviar: crearEnviador({ fetch: expoDoble }),
          ahora: () => A_LAS_20,
        }),
      );

      assert.deepEqual(
        recibidos.map(({ to, body }) => ({ to, body })).sort((a, b) => a.to.localeCompare(b.to)),
        [
          { to: token('central'), body: 'Mañana: Congreso de Jóvenes' },
          { to: token('norte'), body: 'Mañana: Culto joven' },
        ],
      );
      assert.deepEqual(resultado, { enviados: 1, desactivados: 1, fallidos: 0 });

      const despues = unico(
        await db
          .from('dispositivos')
          .select('token, encendido')
          .in(
            'token',
            telefonos.map((t) => t.token),
          ),
      );
      assert.deepEqual(Object.fromEntries(despues.map((fila) => [fila.token, fila.encendido])), {
        [token('central')]: true,
        [token('norte')]: false,
        [token('apagado')]: false,
      });
    } finally {
      // Deletes everything this test wrote, in the order of the foreign keys.
      const { data: distritos } = await db
        .from('distritos')
        .select('id, iglesias (id)')
        .eq('asociacion_id', asociacion.id);
      const iglesiaIds = (distritos ?? []).flatMap((d) => d.iglesias.map((i) => i.id));
      await db.from('dispositivos').delete().like('token', `%-${sufijo}]`);
      await db.from('eventos').delete().in('duenio_iglesia_id', iglesiaIds);
      await db.from('iglesias').delete().in('id', iglesiaIds);
      await db.from('distritos').delete().eq('asociacion_id', asociacion.id);
      await db.from('asociaciones').delete().eq('id', asociacion.id);
    }
  },
});
