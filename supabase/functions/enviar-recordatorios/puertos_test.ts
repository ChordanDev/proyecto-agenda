import assert from 'node:assert/strict';

import { toDispositivosDelEnvio } from './puertos.ts';

function iglesia(id: string, { deBaja = false, asociacionId = 'a1' } = {}) {
  return {
    iglesias: {
      id,
      distrito_id: 'd1',
      de_baja: deBaja,
      distritos: { asociacion_id: asociacionId },
    },
  };
}

Deno.test('a phone does not follow an iglesia dada de baja', () => {
  const filas = [
    {
      token: 'activa-y-de-baja',
      dispositivos_iglesias: [iglesia('i1'), iglesia('i2', { deBaja: true })],
    },
  ];

  assert.deepEqual(toDispositivosDelEnvio(filas, 'a1'), [
    {
      token: 'activa-y-de-baja',
      iglesias: [{ id: 'i1', distritoId: 'd1', asociacionId: 'a1' }],
    },
  ]);
});

Deno.test(
  'a phone that only follows iglesias de baja, or of another asociacion, is left out',
  () => {
    const filas = [
      { token: 'solo-de-baja', dispositivos_iglesias: [iglesia('i2', { deBaja: true })] },
      { token: 'de-otra', dispositivos_iglesias: [iglesia('i3', { asociacionId: 'a2' })] },
    ];

    assert.deepEqual(toDispositivosDelEnvio(filas, 'a1'), []);
  },
);
