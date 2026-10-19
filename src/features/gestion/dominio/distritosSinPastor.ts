// The aviso of the distritos sin pastor, in the tab Distritos of the admin
// (diseno/pantallas/09-gestion-admin.html, line 55).

/** A distrito of the asociacion, as the tab Distritos of the admin lists it. */
export type DistritoDelAdmin = {
  id: string;
  nombre: string;
  cantidadDeIglesias: number;
  /** The nombres of whoever holds a cargo de pastor on it; empty without one. */
  pastores: string[];
};

/** The distritos without any cargo de pastor, in the order given. */
export function getDistritosSinPastor(distritos: readonly DistritoDelAdmin[]): DistritoDelAdmin[] {
  return distritos.filter((distrito) => distrito.pastores.length === 0);
}

/**
 * The aviso above the list of distritos: how many have no pastor, and which
 * ones. Null when every distrito has one.
 */
export function getAvisoDeDistritosSinPastor(
  distritos: readonly DistritoDelAdmin[],
): { titulo: string; texto: string } | null {
  const sinPastor = getDistritosSinPastor(distritos);

  if (sinPastor.length === 0) {
    return null;
  }

  const uno = sinPastor.length === 1;
  return {
    titulo: `${sinPastor.length} ${uno ? 'distrito' : 'distritos'} sin pastor`,
    texto: `${enumerar(sinPastor.map((distrito) => distrito.nombre))} ${
      uno ? 'no tiene' : 'no tienen'
    } quién gestione sus encargados.`,
  };
}

/** "A", "A y B", "A, B y C". */
export function enumerar(nombres: readonly string[]): string {
  if (nombres.length <= 1) {
    return nombres.join('');
  }

  return `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`;
}
