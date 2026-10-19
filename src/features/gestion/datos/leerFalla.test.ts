import { FunctionsFetchError, FunctionsHttpError } from '@supabase/supabase-js';

import { leerFalla } from './leerFalla';

const FALLAS = ['sin_permiso', 'correo_en_uso'] as const;

function respuesta(body: string, status: number): FunctionsHttpError {
  return new FunctionsHttpError(new Response(body, { status }));
}

describe('leerFalla', () => {
  it('reads a falla the function answered', async () => {
    expect(await leerFalla(respuesta('{"falla":"sin_permiso"}', 403), FALLAS)).toBe('sin_permiso');
  });

  it('takes an unknown falla as error_servidor', async () => {
    expect(await leerFalla(respuesta('{"falla":"otra"}', 400), FALLAS)).toBe('error_servidor');
  });

  it('takes a body that is not JSON as error_servidor', async () => {
    expect(await leerFalla(respuesta('Bad gateway', 502), FALLAS)).toBe('error_servidor');
  });

  it('throws when the function was never reached', async () => {
    await expect(leerFalla(new FunctionsFetchError('offline'), FALLAS)).rejects.toThrow(
      'Could not reach the server function',
    );
  });
});
