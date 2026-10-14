/** What the header needs to know about an iglesia. */
type IglesiaDeEncabezado = {
  nombre: string;
  /** Nombre of its distrito. */
  distrito: string;
};

export type Encabezado = {
  titulo: string;
  subtitulo: string;
};

/**
 * The header of the calendario of a usuario. A single iglesia reads as it does
 * for the hermano. Several are "Mis iglesias", with the distrito when they all
 * belong to the same one (the pastor's case) and their count.
 */
export function getEncabezadoDeCalendario(iglesias: readonly IglesiaDeEncabezado[]): Encabezado {
  if (iglesias.length === 1) {
    return { titulo: iglesias[0].nombre, subtitulo: iglesias[0].distrito };
  }

  const count = `${iglesias.length} iglesias`;
  const distritos = new Set(iglesias.map((iglesia) => iglesia.distrito));

  return {
    titulo: 'Mis iglesias',
    subtitulo: distritos.size === 1 ? `${[...distritos][0]} · ${count}` : count,
  };
}
