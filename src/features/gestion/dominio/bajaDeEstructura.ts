// The texts and the rules of dar de baja and reactivar, in the gestion of the
// admin (diseno/pantallas/09-gestion-admin.html, 09b-iglesia.html and
// 09c-distrito.html). Nothing of the structure is deleted from the app.

/** A distrito dado de baja, as the tab Distritos of the admin lists it apart. */
export type DistritoDeBaja = {
  id: string;
  nombre: string;
};

/** An iglesia dada de baja, as the tab Iglesias of the admin lists it apart. */
export type IglesiaDeBaja = {
  id: string;
  nombre: string;
  /** Nombre of the distrito it was in when it was given de baja. */
  distritoNombre: string;
  /** That distrito is de baja too: the iglesia waits for it to be reactivado. */
  distritoDeBaja: boolean;
};

/** The titulo and the paragraphs of a confirmation. */
export type Confirmacion = { titulo: string; textos: string[] };

function cuantos(cantidad: number, ninguno: string, uno: string, varios: string): string {
  if (cantidad === 0) return ninguno;
  return cantidad === 1 ? uno : varios.replace('{n}', String(cantidad));
}

/** "¿Dar de baja…?" of an iglesia, with how many encargados lose the cargo. */
export function getConfirmacionDeBajaDeIglesia(nombre: string, encargados: number): Confirmacion {
  const cargos = cuantos(
    encargados,
    'No tiene encargados.',
    'Su encargado pierde el cargo.',
    'Sus {n} encargados pierden el cargo.',
  );

  return {
    titulo: `¿Dar de baja ${nombre}?`,
    textos: [
      `Deja de aparecer en el buscador, en el calendario y en la gestión. ${cargos}`,
      'Sus eventos quedan guardados y vuelven si la reactivás.' +
        (encargados === 0 ? '' : ' Los encargados no vuelven solos.'),
    ],
  };
}

/** "¿Reactivar…?" of an iglesia dada de baja. */
export function getConfirmacionDeReactivarIglesia(nombre: string): Confirmacion {
  return {
    titulo: `¿Reactivar ${nombre}?`,
    textos: [
      'Vuelve a aparecer en el buscador, en el calendario y en la gestión, con sus eventos.',
      'Sus encargados no vuelven solos: hay que agregarlos de nuevo.',
    ],
  };
}

/** "¿Dar de baja…?" of a distrito without active iglesias, with its pastores. */
export function getConfirmacionDeBajaDeDistrito(nombre: string, pastores: number): Confirmacion {
  const cargos = cuantos(
    pastores,
    'No tiene pastor.',
    'Su pastor pierde el cargo.',
    'Sus {n} pastores pierden el cargo.',
  );
  const noVuelven = cuantos(
    pastores,
    '',
    ' El pastor no vuelve solo.',
    ' Los pastores no vuelven solos.',
  );

  return {
    titulo: `¿Dar de baja ${nombre}?`,
    textos: [
      `Deja de aparecer en la gestión y sus eventos de distrito dejan de verse. ${cargos}`,
      `Sus eventos quedan guardados y vuelven si lo reactivás.${noVuelven}`,
    ],
  };
}

/** "¿Reactivar…?" of a distrito dado de baja. */
export function getConfirmacionDeReactivarDistrito(nombre: string): Confirmacion {
  return {
    titulo: `¿Reactivar ${nombre}?`,
    textos: [
      'Vuelve a aparecer en la gestión, con sus eventos de distrito.',
      'Su pastor no vuelve solo: hay que nombrarlo de nuevo. Sus iglesias dadas de baja siguen de baja hasta que las reactives.',
    ],
  };
}

/**
 * Why a distrito cannot be given de baja yet: it still has active iglesias,
 * which the admin moves to another distrito first. Null when it can.
 */
export function getBloqueoDeBajaDeDistrito(iglesiasActivas: number): string | null {
  if (iglesiasActivas === 0) {
    return null;
  }

  return `Para darlo de baja, pasá antes ${
    iglesiasActivas === 1 ? 'su iglesia' : `sus ${iglesiasActivas} iglesias`
  } a otro distrito.`;
}

/** An active iglesia is always in an active distrito. */
export function puedeReactivarIglesia(iglesia: IglesiaDeBaja): boolean {
  return !iglesia.distritoDeBaja;
}

/** What goes under an iglesia dada de baja: the distrito it was in. */
export function getSubtituloDeIglesiaDeBaja(iglesia: IglesiaDeBaja): string {
  return puedeReactivarIglesia(iglesia)
    ? `Era del ${iglesia.distritoNombre}`
    : `Era del ${iglesia.distritoNombre}, que está dado de baja: reactivá antes el distrito.`;
}
