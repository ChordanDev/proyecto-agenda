import { FunctionsHttpError } from '@supabase/supabase-js';

/**
 * The falla a server function of the gestion answered, from the error of
 * `functions.invoke`. An answer that is not one of `fallas` is an
 * `error_servidor`. When the function was never reached (no connection), it
 * throws: there is no answer to read.
 */
export async function leerFalla<Falla extends string>(
  error: unknown,
  fallas: readonly Falla[],
): Promise<Falla | 'error_servidor'> {
  if (!(error instanceof FunctionsHttpError)) {
    throw new Error(
      `Could not reach the server function: ${error instanceof Error ? error.message : error}`,
    );
  }

  try {
    const body: unknown = await error.context.json();
    const falla = (body as { falla?: unknown } | null)?.falla;
    return fallas.find((conocida) => conocida === falla) ?? 'error_servidor';
  } catch {
    return 'error_servidor';
  }
}
