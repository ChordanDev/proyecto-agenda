import {
  seVePorAlcance,
  type IglesiaEnEstructura,
} from '@/features/calendario/dominio/armarCalendario';
import { nombrarConNivel } from '@/features/calendario/dominio/calendarioTexts';
import type { Cargo } from '@/features/sesion/dominio/cargo';
import {
  cargosAbarcanDuenio,
  type DuenioEnEstructura,
} from '@/features/sesion/dominio/cargosAbarcanDuenio';

/** An iglesia sumada of an evento, with its place in the structure and its nombre. */
export type IglesiaSumada = IglesiaEnEstructura & { nombre: string };

/**
 * Who looks at the detail: a usuario with cargos, or a hermano (or a usuario
 * without cargos) with the iglesia elegida of the phone, if any.
 */
export type QuienMira = { cargos: readonly Cargo[] } | { iglesiaElegida: string | null };

function cubreDuenio(quien: QuienMira, duenio: DuenioEnEstructura): boolean {
  return 'cargos' in quien && cargosAbarcanDuenio(quien.cargos, duenio);
}

function esDeQuienMira(quien: QuienMira, iglesia: IglesiaSumada): boolean {
  if ('cargos' in quien) {
    return cargosAbarcanDuenio(quien.cargos, {
      alcance: 'iglesia',
      iglesiaId: iglesia.id,
      distritoId: iglesia.distritoId,
      asociacionId: iglesia.asociacionId,
    });
  }

  return iglesia.id === quien.iglesiaElegida;
}

/**
 * The iglesias sumadas for which the evento is really shared. One that also
 * sees it by its alcance (it moved to the distrito of the duenio) has it as
 * any other iglesia there: it is not shared with her.
 */
function sumadasVigentes(
  duenio: DuenioEnEstructura,
  sumadas: readonly IglesiaSumada[],
): IglesiaSumada[] {
  return sumadas.filter((iglesia) => !seVePorAlcance(iglesia, duenio));
}

/**
 * The iglesias sumadas a usuario can quitar the evento from: those their cargos
 * cover. Whoever covers the duenio too edits the evento instead (and can take
 * the iglesia out from Editar), so they get none; so does the hermano.
 */
export function getIglesiasParaQuitar(
  quien: QuienMira,
  duenio: DuenioEnEstructura,
  sumadas: readonly IglesiaSumada[],
): IglesiaSumada[] {
  if (!('cargos' in quien) || cubreDuenio(quien, duenio)) {
    return [];
  }

  return sumadasVigentes(duenio, sumadas).filter((iglesia) => esDeQuienMira(quien, iglesia));
}

/** The section "Compartido con" of the detail. */
export type CompartidoDelDetalle = {
  /** The iglesias sumadas by nombre, those of whoever looks first. */
  iglesias: { id: string; nombre: string; esMia: boolean }[];
  /** Who shares the evento, for an iglesia sumada; null for the duenio. */
  compartidoPor: string | null;
};

/**
 * What the detail says about the iglesias an evento is shared with; null when
 * it is not shared. `nombreDelDuenio` is the one of the row "Evento de".
 *
 * Whoever covers the duenio sees the list alone. Whoever looks from an iglesia
 * sumada also reads who shares it, and finds their iglesia first.
 */
export function getCompartidoDelDetalle(
  quien: QuienMira,
  duenio: DuenioEnEstructura,
  nombreDelDuenio: string,
  sumadas: readonly IglesiaSumada[],
): CompartidoDelDetalle | null {
  const vigentes = sumadasVigentes(duenio, sumadas);

  if (vigentes.length === 0) {
    return null;
  }

  const delDuenio = cubreDuenio(quien, duenio);
  const iglesias = vigentes
    .map((iglesia) => ({
      id: iglesia.id,
      nombre: nombrarConNivel('iglesia', iglesia.nombre),
      esMia: !delDuenio && esDeQuienMira(quien, iglesia),
    }))
    .sort((a, b) => Number(b.esMia) - Number(a.esMia) || a.nombre.localeCompare(b.nombre, 'es'));

  return {
    iglesias,
    compartidoPor: iglesias.some((iglesia) => iglesia.esMia) ? nombreDelDuenio : null,
  };
}

/** What Quitar asks before going ahead. */
export function getConfirmacionDeQuitar(
  nombreDeIglesia: string,
  nombreDelDuenio: string,
): { titulo: string; mensaje: string } {
  return {
    titulo: '¿Quitar de tu calendario?',
    mensaje: `Este evento ya no se va a ver en el calendario de ${nombreDeIglesia}. ${nombreDelDuenio} lo va a seguir teniendo.`,
  };
}

/** Under the button Quitar: only that iglesia loses the evento. */
export function getAvisoDeQuitar(nombreDeIglesia: string): string {
  return `Solo lo quita de ${nombreDeIglesia}. Las demás iglesias lo siguen viendo.`;
}

/** What the detail says once the evento was quitado. */
export function getQuitadoDe(nombreDeIglesia: string): string {
  return `Ya no aparece en el calendario de ${nombreDeIglesia}.`;
}
