import { getOwnedOrSumada } from '@/features/calendario/datos/getCalendarioDeUsuario';
import { getFechasDelMes } from '@/features/calendario/datos/getFechasDelMes';
import type { Month } from '@/features/calendario/dominio/getMonthRange';
import { supabase } from '@/shared/supabase';

import { nombreDeEncargado } from '../dominio/encargados';
import {
  contarEventosDelMes,
  getMesDeLaAsociacion,
  type EncargadoDelPastor,
  type IglesiaDelPastor,
} from '../dominio/gestionPastor';

/** The default of asociaciones.zona_horaria, when it cannot be read. */
const ZONA_HORARIA_POR_DEFECTO = 'America/Argentina/Buenos_Aires';

export type GestionDelPastor = {
  /** Nombres of the distritos of the pastor, ordered. */
  distritos: string[];
  /** The month in course in the asociacion, which the eventos del mes count. */
  mes: Month;
  /** Ordered by nombre. */
  iglesias: IglesiaDelPastor[];
  encargados: EncargadoDelPastor[];
};

/**
 * The iglesias of the distritos of the pastor, with their encargados and the
 * eventos their calendarios show in the month in course of the asociacion.
 *
 * The policies let the pastor read the cargos of the iglesias of their distrito,
 * with their nombres and correos (20261018000000_create_perfiles_y_secretaria.sql),
 * and the eventos every iglesia sees. The count follows the rule of the
 * calendario (contarEventosDelMes), never a stored number.
 */
export async function getGestionDelPastor(
  distritoIds: readonly string[],
  ahora: Date,
): Promise<GestionDelPastor> {
  const [distritos, iglesias, zona] = await Promise.all([
    supabase.from('distritos').select('nombre').in('id', distritoIds).order('nombre'),
    supabase
      .from('iglesias')
      .select('id, nombre, distrito_id, distritos (asociacion_id)')
      .in('distrito_id', distritoIds)
      .order('nombre'),
    supabase.rpc('get_zona_horaria_de_usuario'),
  ]);

  if (distritos.error) {
    throw new Error(`Could not read the distritos: ${distritos.error.message}`);
  }
  if (iglesias.error) {
    throw new Error(`Could not read the iglesias: ${iglesias.error.message}`);
  }
  if (zona.error) {
    throw new Error(`Could not read the zona horaria: ${zona.error.message}`);
  }

  const mes = getMesDeLaAsociacion(ahora, zona.data ?? ZONA_HORARIA_POR_DEFECTO);
  const enEstructura = iglesias.data.map((iglesia) => ({
    id: iglesia.id,
    nombre: iglesia.nombre,
    distritoId: iglesia.distrito_id,
    asociacionId: iglesia.distritos.asociacion_id,
  }));
  const iglesiaIds = enEstructura.map((iglesia) => iglesia.id);

  if (iglesiaIds.length === 0) {
    return { distritos: distritos.data.map((d) => d.nombre), mes, iglesias: [], encargados: [] };
  }

  const [cargos, correos, fechas] = await Promise.all([
    supabase
      .from('cargos')
      .select('id, usuario_id, iglesia_id, funcion, es_secretaria')
      .in('iglesia_id', iglesiaIds),
    supabase.rpc('get_usuario_emails'),
    getOwnedOrSumada(enEstructura).then((ownedOrSumada) => getFechasDelMes(ownedOrSumada, mes)),
  ]);

  if (cargos.error) {
    throw new Error(`Could not read the cargos: ${cargos.error.message}`);
  }
  if (correos.error) {
    throw new Error(`Could not read the correos: ${correos.error.message}`);
  }

  const usuarioIds = [...new Set(cargos.data.map((cargo) => cargo.usuario_id))];
  const perfiles =
    usuarioIds.length === 0
      ? { data: [], error: null }
      : await supabase.from('perfiles').select('usuario_id, nombre').in('usuario_id', usuarioIds);

  if (perfiles.error) {
    throw new Error(`Could not read the perfiles: ${perfiles.error.message}`);
  }

  const nombres = new Map(perfiles.data.map((perfil) => [perfil.usuario_id, perfil.nombre]));
  const correoDe = new Map(correos.data.map((fila) => [fila.usuario_id, fila.email]));
  const iglesiaDe = new Map(enEstructura.map((iglesia) => [iglesia.id, iglesia]));

  const encargados = cargos.data.flatMap((cargo): EncargadoDelPastor[] => {
    const iglesia = cargo.iglesia_id === null ? undefined : iglesiaDe.get(cargo.iglesia_id);
    if (iglesia === undefined) {
      return [];
    }
    const correo = correoDe.get(cargo.usuario_id) ?? null;
    const nombreDelPerfil = nombres.get(cargo.usuario_id) ?? null;
    return [
      {
        cargoId: cargo.id,
        usuarioId: cargo.usuario_id,
        nombre: nombreDeEncargado(nombreDelPerfil, correo),
        nombreDelPerfil,
        correo,
        funcion: cargo.funcion,
        esSecretaria: cargo.es_secretaria,
        iglesia: { id: iglesia.id, nombre: iglesia.nombre },
      },
    ];
  });

  return {
    distritos: distritos.data.map((distrito) => distrito.nombre),
    mes,
    iglesias: enEstructura.map((iglesia): IglesiaDelPastor => {
      const suyos = encargados.filter((encargado) => encargado.iglesia.id === iglesia.id);
      return {
        ...iglesia,
        encargados: suyos.length,
        conSecretaria: suyos.some((encargado) => encargado.esSecretaria),
        eventosDelMes: contarEventosDelMes(iglesia, fechas.fechas, mes),
      };
    }),
    encargados,
  };
}
