import assert from 'node:assert/strict';

import { quitarLoDeBaja } from './puertos.ts';

function fila(
  id: string,
  {
    iglesiaDeBaja = null,
    distritoDeBaja = null,
    sumadas = [],
  }: {
    iglesiaDeBaja?: boolean | null;
    distritoDeBaja?: boolean | null;
    sumadas?: [string, boolean][];
  } = {},
) {
  return {
    id,
    eventos: {
      iglesias: iglesiaDeBaja === null ? null : { de_baja: iglesiaDeBaja },
      distritos: distritoDeBaja === null ? null : { de_baja: distritoDeBaja },
      iglesias_sumadas: sumadas.map(([iglesia_id, de_baja]) => ({
        iglesia_id,
        iglesias: { de_baja },
      })),
    },
  };
}

Deno.test('leaves out the eventos of an iglesia or a distrito de baja', () => {
  const filas = [
    fila('de-iglesia-activa', { iglesiaDeBaja: false }),
    fila('de-iglesia-de-baja', { iglesiaDeBaja: true, sumadas: [['sumada', false]] }),
    fila('de-distrito-activo', { distritoDeBaja: false }),
    fila('de-distrito-de-baja', { distritoDeBaja: true }),
    fila('de-asociacion'),
  ];

  assert.deepEqual(
    quitarLoDeBaja(filas).map(({ id }) => id),
    ['de-iglesia-activa', 'de-distrito-activo', 'de-asociacion'],
  );
});

Deno.test('an iglesia sumada de baja stops being sumada', () => {
  const [evento] = quitarLoDeBaja([
    fila('compartido', {
      iglesiaDeBaja: false,
      sumadas: [
        ['activa', false],
        ['de-baja', true],
      ],
    }),
  ]);

  assert.deepEqual(
    evento.eventos.iglesias_sumadas.map(({ iglesia_id }) => iglesia_id),
    ['activa'],
  );
});
