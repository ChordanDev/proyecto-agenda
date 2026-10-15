import { skipToken, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Cargo } from '@/features/sesion/dominio/cargo';

import { armarCalendarioDeIglesia, type CalendarioDeIglesia } from '../dominio/calendarioDeIglesia';
import type { Month } from '../dominio/getMonthRange';
import {
  getCalendarioDeIglesia,
  getIglesiaDeCalendario,
  type LecturaDeIglesia,
} from './getCalendarioDeIglesia';
import { getCalendarioDeUsuario, getOwnedOrSumada } from './getCalendarioDeUsuario';
import type { Calendario } from './getFechasDelMes';
import type { IglesiaConEstructura } from './getIglesiasEnEstructura';

/** Whose calendario to read: the iglesia elegida of the hermano, or a usuario's cargos. */
export type FuenteDeCalendario =
  | { tipo: 'iglesia'; iglesiaId: string }
  | {
      tipo: 'usuario';
      cargos: readonly Cargo[];
      /** The iglesias their cargos cover. */
      iglesias: readonly IglesiaConEstructura[];
    };

/**
 * The calendario of a month. Only that of an iglesia knows its own nombres: it
 * is null when the iglesia no longer exists.
 */
export type CalendarioDelMes = Calendario & { iglesia?: CalendarioDeIglesia['iglesia'] };

/**
 * What every month of the source needs, read once: an iglesia with the filter of
 * its eventos, or the filter of the eventos of a usuario's iglesias. Null is an
 * iglesia that does not exist (any more).
 */
type LecturaDeFuente = LecturaDeIglesia | { ownedOrSumada: string | null };

async function readFuente(fuente: FuenteDeCalendario): Promise<LecturaDeFuente | null> {
  return fuente.tipo === 'iglesia'
    ? getIglesiaDeCalendario(fuente.iglesiaId)
    : { ownedOrSumada: await getOwnedOrSumada(fuente.iglesias) };
}

function readMonth(
  fuente: FuenteDeCalendario,
  lectura: LecturaDeFuente,
  month: Month,
): Promise<CalendarioDelMes> {
  return fuente.tipo === 'iglesia'
    ? // The source of an iglesia is read by `getIglesiaDeCalendario`.
      getCalendarioDeIglesia(lectura as LecturaDeIglesia, month)
    : getCalendarioDeUsuario(fuente.cargos, fuente.iglesias, lectura.ownedOrSumada, month);
}

/**
 * The calendario of an iglesia elegida that was deleted: it has no months to
 * read. Module level, so it keeps its identity between renders.
 */
const SIN_IGLESIA = armarCalendarioDeIglesia(null, [], {});

/**
 * The calendario of the source for a month. The iglesia (its distrito, its
 * asociacion and the eventos sumados to it) is read once per source, and each
 * month only reads its eventos. Both stay valid for the vigencia of the query
 * client, so going back to a month already seen makes no request.
 */
export function useCalendario(fuente: FuenteDeCalendario, month: Month) {
  const queryClient = useQueryClient();
  const fuenteKey =
    fuente.tipo === 'iglesia'
      ? [fuente.iglesiaId]
      : ['usuario', fuente.iglesias.map((iglesia) => iglesia.id).join(',')];

  const lectura = useQuery({
    queryKey: ['calendario', ...fuenteKey],
    queryFn: () => readFuente(fuente),
  });
  const lecturaData = lectura.data;

  // The filter is part of the key: when the eventos sumados change, the
  // months are read again instead of keeping those of the old filter.
  const filtroIndex = 1 + fuenteKey.length;
  const mesKey = [
    'calendario',
    ...fuenteKey,
    lecturaData?.ownedOrSumada ?? null,
    month.year,
    month.month,
  ];
  const mes = useQuery({
    queryKey: mesKey,
    queryFn: lecturaData ? () => readMonth(fuente, lecturaData, month) : skipToken,
    // While the month is read again for a new filter, it keeps what it showed.
    // Only the filter may differ: another source or month starts empty.
    placeholderData: (previous, previousQuery) => {
      const previousKey = previousQuery?.queryKey;
      const sameMonth =
        previousKey?.length === mesKey.length &&
        mesKey.every((part, i) => i === filtroIndex || part === previousKey[i]);
      return sameMonth ? previous : undefined;
    },
  });

  // The month kept on screen was downloaded with the previous filter: its
  // query, the one holding that same data, tells when.
  const mesUpdatedAt = mes.isPlaceholderData
    ? (queryClient
        .getQueryCache()
        .findAll({ queryKey: ['calendario', ...fuenteKey] })
        .find((query) => query.state.data === mes.data)?.state.dataUpdatedAt ?? 0)
    : mes.dataUpdatedAt;

  return {
    data: lecturaData === null ? SIN_IGLESIA : mes.data,
    isError: lectura.isError || mes.isError,
    isFetching: lectura.isFetching || mes.isFetching,
    // When the calendario on screen was downloaded, 0 while nothing was.
    dataUpdatedAt: lecturaData === null ? lectura.dataUpdatedAt : mesUpdatedAt,
    refetch: () => (lectura.isError ? lectura.refetch() : mes.refetch()),
  };
}
