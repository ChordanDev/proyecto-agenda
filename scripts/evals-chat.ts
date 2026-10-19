// Runs the evals of the chat (issue #143): loads the calendario de prueba into
// the local Supabase, asks each caso to the real chat-consulta function (which
// calls OpenAI) and prints whether it passed, plus a total.
//
// Run by hand, never in CI: every run costs money and the model does not
// always answer the same. How, when and with which key: docs/evals-chat.md.
//
//   npm run evals:chat                       every caso
//   npm run evals:chat -- simple-hora fuera   only the casos whose id starts so
//
// It needs no dependency beyond the app's: Node strips the types itself.

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { getEventosParaCargar, IDS, type CalendarioDePrueba } from './evals-chat/calendario.ts';
import { CASOS } from './evals-chat/casos.ts';
import {
  evaluarCaso,
  getAnclaje,
  getCodigoDeSalida,
  getHoy,
  resumir,
  type Caso,
  type Evaluacion,
} from './evals-chat/evaluar.ts';

const CALENDARIO: CalendarioDePrueba = JSON.parse(
  readFileSync('scripts/evals-chat/calendario-de-prueba.json', 'utf8'),
);

type Local = { url: string; anonKey: string; serviceRoleKey: string };

/** The URL and keys of the local Supabase. The evals never write to a remote project. */
function getLocal(): Local {
  let salida: string;
  try {
    salida = execFileSync('npx', ['supabase', 'status', '-o', 'json'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    throw new Error('The local Supabase is not running: start it with `npm run db:start`.');
  }
  const estado = JSON.parse(salida.slice(salida.indexOf('{')));
  return {
    url: estado.API_URL,
    anonKey: estado.ANON_KEY,
    serviceRoleKey: estado.SERVICE_ROLE_KEY,
  };
}

/** The data of a call to Supabase, or the error it gave, saying what failed. */
function exigir<T>(
  resultado: { data: T; error: null } | { data: unknown; error: { message: string } },
  que: string,
): T {
  if (resultado.error) {
    throw new Error(`Could not ${que}: ${resultado.error.message}`);
  }
  return resultado.data as T;
}

/** Deletes what an earlier run left: the eventos, the iglesias, the distrito and the asociacion. */
async function limpiar(servidor: SupabaseClient) {
  const iglesias = CALENDARIO.iglesias.map((_, posicion) => IDS.iglesia(posicion));
  exigir(
    await servidor
      .from('eventos')
      .delete()
      .or(
        [
          `duenio_iglesia_id.in.(${iglesias.join(',')})`,
          `duenio_distrito_id.eq.${IDS.distrito}`,
          `duenio_asociacion_id.eq.${IDS.asociacion}`,
        ].join(','),
      ),
    'delete the eventos de prueba',
  );
  // Cargos on these iglesias of usuarios of an interrupted run.
  exigir(await servidor.from('cargos').delete().in('iglesia_id', iglesias), 'delete the cargos');
  exigir(await servidor.from('iglesias').delete().in('id', iglesias), 'delete the iglesias');
  exigir(await servidor.from('distritos').delete().eq('id', IDS.distrito), 'delete the distrito');
  exigir(
    await servidor.from('asociaciones').delete().eq('id', IDS.asociacion),
    'delete the asociacion',
  );
}

async function cargarCalendario(servidor: SupabaseClient, anclaje: string) {
  exigir(
    await servidor.from('asociaciones').insert({
      id: IDS.asociacion,
      nombre: CALENDARIO.asociacion,
      zona_horaria: CALENDARIO.zonaHoraria,
    }),
    'create the asociacion',
  );
  exigir(
    await servidor
      .from('distritos')
      .insert({ id: IDS.distrito, asociacion_id: IDS.asociacion, nombre: CALENDARIO.distrito }),
    'create the distrito',
  );
  exigir(
    await servidor.from('iglesias').insert(
      CALENDARIO.iglesias.map((iglesia, posicion) => ({
        id: IDS.iglesia(posicion),
        distrito_id: IDS.distrito,
        ...iglesia,
        // Out of "Elegir iglesia" of whoever uses this local Supabase.
        excluida_del_buscador: true,
      })),
    ),
    'create the iglesias',
  );

  for (const { fila, fechas } of getEventosParaCargar(CALENDARIO, anclaje)) {
    const { id } = exigir(
      await servidor.from('eventos').insert(fila).select('id').single<{ id: string }>(),
      `create the evento ${fila.titulo}`,
    );
    exigir(
      await servidor
        .from('eventos_fechas')
        .insert(fechas.map((fecha) => ({ evento_id: id, fecha }))),
      `create the fechas of ${fila.titulo}`,
    );
  }
}

/** A respuesta of the model takes a few seconds; one that takes this long is stuck. */
const ESPERA_MAXIMA_MS = 60_000;

/** The iglesia of the cargo, failing loudly when the file names one it does not have. */
function getIglesiaDelEncargado(): string {
  const posicion = CALENDARIO.iglesias.findIndex(
    (iglesia) => iglesia.nombre === CALENDARIO.encargadoDe,
  );
  if (posicion === -1) {
    throw new Error(
      `encargadoDe names an iglesia the calendario does not have: ${CALENDARIO.encargadoDe}`,
    );
  }
  return IDS.iglesia(posicion);
}

/**
 * A new encargado for this run, so the limite diario of an earlier one does
 * not count. `alCrearlo` gets their id as soon as they exist, so the run
 * deletes them even when a later step fails.
 */
async function crearEncargado(
  local: Local,
  servidor: SupabaseClient,
  alCrearlo: (usuarioId: string) => void,
) {
  const iglesiaId = getIglesiaDelEncargado();
  const correo = `evals-${Date.now()}@evals.test`;
  const { user } = exigir(
    await servidor.auth.admin.createUser({ email: correo, email_confirm: true }),
    'create the encargado',
  );
  alCrearlo(user.id);

  exigir(
    await servidor.from('cargos').insert({ usuario_id: user.id, iglesia_id: iglesiaId }),
    'give the cargo',
  );
  exigir(
    await servidor.from('chat_consentimientos').insert({ usuario_id: user.id }),
    'save the consentimiento',
  );

  // A sesion without a correo: the link the admin API makes, verified here.
  const { properties } = exigir(
    await servidor.auth.admin.generateLink({ type: 'magiclink', email: correo }),
    'make the link de acceso',
  );
  const anonimo = createClient(local.url, local.anonKey, { auth: { persistSession: false } });
  const { session } = exigir(
    await anonimo.auth.verifyOtp({ type: 'magiclink', token_hash: properties.hashed_token }),
    'open the sesion',
  );
  if (!session) {
    throw new Error('Could not open the sesion: no session came back');
  }
  return session.access_token;
}

type Resultado = { evaluacion: Evaluacion; texto: string | null; conRespuesta: boolean };

async function preguntar(
  local: Local,
  jwt: string,
  caso: Caso,
  anclaje: string,
): Promise<Resultado> {
  let respuesta: Response;
  try {
    respuesta = await fetch(`${local.url}/functions/v1/chat-consulta`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${jwt}`,
        apikey: local.anonKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ mensaje: caso.mensaje, tramo: caso.tramo ?? [] }),
      signal: AbortSignal.timeout(ESPERA_MAXIMA_MS),
    });
  } catch (error) {
    const causa = error instanceof Error ? error.message : String(error);
    return {
      evaluacion: { acierto: false, fallos: [`falla: ${causa}`] },
      texto: null,
      conRespuesta: false,
    };
  }
  const body = await respuesta.json().catch(() => null);

  if (!respuesta.ok || !body?.respuesta) {
    const falla = body?.falla ?? `HTTP ${respuesta.status}`;
    return {
      evaluacion: { acierto: false, fallos: [`falla: ${falla}`] },
      texto: null,
      conRespuesta: false,
    };
  }
  return {
    evaluacion: evaluarCaso(caso.esperado, body.respuesta, anclaje),
    texto: body.respuesta.texto as string,
    conRespuesta: true,
  };
}

function imprimir(caso: Caso, evaluacion: Evaluacion, texto: string | null) {
  console.log(`${evaluacion.acierto ? '✔' : '✘'} ${caso.id}: ${caso.mensaje}`);
  if (!evaluacion.acierto) {
    for (const fallo of evaluacion.fallos) {
      console.log(`    ${fallo}`);
    }
    if (texto !== null) {
      console.log(`    respondió: ${texto.replace(/\s+/g, ' ')}`);
    }
  }
}

/**
 * Deletes the encargado (who takes their cargo, consentimiento and counters
 * with them) and the calendario de prueba. A failure here is reported, never
 * thrown: it must not hide the error or the result of the run.
 */
async function limpiarAlFinal(servidor: SupabaseClient, usuarioId: string | null) {
  try {
    if (usuarioId !== null) {
      const { error } = await servidor.auth.admin.deleteUser(usuarioId);
      if (error) {
        throw new Error(`Could not delete the encargado ${usuarioId}: ${error.message}`);
      }
    }
    await limpiar(servidor);
  } catch (error) {
    console.error(
      `Cleanup failed, the next run cleans the calendario: ${error instanceof Error ? error.message : error}`,
    );
  }
}

async function main() {
  const filtros = process.argv.slice(2);
  const casos = CASOS.filter(
    (caso) => filtros.length === 0 || filtros.some((filtro) => caso.id.startsWith(filtro)),
  );
  if (casos.length === 0) {
    throw new Error(`No caso matches ${filtros.join(', ')}`);
  }

  const local = getLocal();
  const servidor = createClient(local.url, local.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const anclaje = getAnclaje(getHoy(new Date(), CALENDARIO.zonaHoraria));

  await limpiar(servidor);
  let usuarioId: string | null = null;
  try {
    await cargarCalendario(servidor, anclaje);
    const jwt = await crearEncargado(local, servidor, (id) => {
      usuarioId = id;
    });

    console.log(`Evals del chat: ${casos.length} casos, anclaje (dia 0) ${anclaje}\n`);
    const evaluaciones: Evaluacion[] = [];
    let sinRespuesta = 0;
    for (const caso of casos) {
      const { evaluacion, texto, conRespuesta } = await preguntar(local, jwt, caso, anclaje);
      imprimir(caso, evaluacion, texto);
      evaluaciones.push(evaluacion);
      if (!conRespuesta) {
        sinRespuesta += 1;
      }
    }

    const { aciertos, total } = resumir(evaluaciones);
    console.log(`\nTotal: ${aciertos} de ${total} (${Math.round((aciertos / total) * 100)} %)`);
    if (sinRespuesta > 0) {
      console.log(
        `${sinRespuesta} casos no tuvieron respuesta: la corrida no midió el chat. ¿Está servida la función?`,
      );
    }
    process.exitCode = getCodigoDeSalida({ aciertos, total, sinRespuesta });
  } finally {
    await limpiarAlFinal(servidor, usuarioId);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 2;
});
