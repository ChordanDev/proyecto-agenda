// The database side of a consulta: the ports of the domain, bound to the
// usuario who asks.
//
// Two clients, on purpose:
// - `usuario` carries the JWT of the usuario, so row level security and
//   auth.uid() decide what it reads: their consentimiento, their zona horaria
//   and, above all, the busqueda of eventos.
// - `servidor` is service_role, only for the counters (chat_consultas and
//   chat_gastos), which no usuario can read or write: it reserves a consulta
//   before the model is called, then confirms or frees it.

import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '../../../src/shared/database.types.ts';
import { MAX_COINCIDENCIAS } from '../../../src/features/chat/dominio/ambiguedad.ts';
import type {
  PuertosDeConsulta,
  ResultadoDeReserva,
} from '../../../src/features/chat/dominio/consulta.ts';
import {
  LIMITE_DIARIO,
  PRESUPUESTO_MENSUAL_USD,
} from '../../../src/features/chat/dominio/limites.ts';

/** The default of asociaciones.zona_horaria, for a usuario without cargos. */
const ZONA_HORARIA_POR_DEFECTO = 'America/Argentina/Buenos_Aires';

type Cliente = SupabaseClient<Database>;

export function crearPuertos({
  usuarioId,
  usuario,
  servidor,
  proveedor,
}: {
  usuarioId: string;
  usuario: Cliente;
  servidor: Cliente;
  proveedor: PuertosDeConsulta['proveedor'];
}): PuertosDeConsulta {
  return {
    ahora: () => new Date(),
    proveedor,

    // Only the cause reaches the logs of the function, never the mensaje.
    informarError(causa) {
      console.error('chat-consulta failed:', causa);
    },

    async leerEstado() {
      const [consentimiento, zonaHoraria, consultas, gasto] = await Promise.all([
        usuario.from('chat_consentimientos').select('usuario_id').maybeSingle(),
        usuario.rpc('get_zona_horaria_de_usuario'),
        // The last counter of the usuario and the last gasto: the domain knows
        // whether they are of today and of this mes.
        servidor
          .from('chat_consultas')
          .select('dia, cantidad')
          .eq('usuario_id', usuarioId)
          .order('dia', { ascending: false })
          .limit(1)
          .maybeSingle(),
        servidor
          .from('chat_gastos')
          .select('mes, usd')
          .order('mes', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      for (const { error } of [consentimiento, zonaHoraria, consultas, gasto]) {
        if (error) {
          throw new Error(`Could not read the estado of the chat: ${error.message}`);
        }
      }

      return {
        consentimiento: consentimiento.data !== null,
        zonaHoraria: zonaHoraria.data ?? ZONA_HORARIA_POR_DEFECTO,
        consultas: consultas.data,
        gasto: gasto.data ? { mes: gasto.data.mes, usd: Number(gasto.data.usd) } : null,
      };
    },

    async buscarEventos({ desde, hasta, texto }) {
      const { data, error } = await usuario.rpc('buscar_eventos', {
        desde,
        hasta,
        texto: texto ?? undefined,
        maximo: MAX_COINCIDENCIAS,
      });

      if (error) {
        throw new Error(`Could not search the eventos: ${error.message}`);
      }

      return {
        total: data.length > 0 ? Number(data[0].total) : 0,
        eventos: data.map((fila) => ({
          id: fila.evento_id,
          titulo: fila.titulo,
          fecha: fila.fecha,
          fechaFin: fila.fecha_fin,
          hora: fila.hora,
          lugar: fila.lugar,
          descripcion: fila.descripcion,
          enfasis: fila.enfasis,
          alcance: fila.alcance,
          duenio: fila.duenio,
        })),
      };
    },

    async reservarConsulta({ dia, mes }) {
      const { data, error } = await servidor.rpc('reservar_consulta', {
        usuario_id: usuarioId,
        dia,
        mes,
        limite_diario: LIMITE_DIARIO,
        presupuesto_usd: PRESUPUESTO_MENSUAL_USD,
      });

      if (error) {
        throw new Error(`Could not reserve the consulta: ${error.message}`);
      }
      return data as ResultadoDeReserva;
    },

    async confirmarConsulta({ dia, mes, costoUsd }) {
      const { data, error } = await servidor
        .rpc('confirmar_consulta', { usuario_id: usuarioId, dia, mes, costo_usd: costoUsd })
        .single();

      if (error) {
        throw new Error(`Could not confirm the consulta: ${error.message}`);
      }
      return { consultasDelDia: data.consultas_del_dia };
    },

    async liberarConsulta({ dia }) {
      const { error } = await servidor.rpc('liberar_consulta', { usuario_id: usuarioId, dia });

      if (error) {
        throw new Error(`Could not free the consulta: ${error.message}`);
      }
    },
  };
}
