import { useIglesiaElegida } from '@/features/iglesias/datos/useIglesiaElegida';
import { useIglesias } from '@/features/iglesias/datos/useIglesias';

/**
 * The iglesia whose calendario this phone shows: the iglesia elegida, with its
 * nombre and the one of its distrito for the header.
 *
 * `iglesiaId` is null when there is no iglesia elegida. `iglesia` is undefined
 * until the iglesias are read; `refetch` reads them again after a failure.
 */
export function useIglesiaDeCalendario() {
  const { data: iglesiaElegida } = useIglesiaElegida();
  const { data: iglesias, refetch } = useIglesias();

  const iglesia = iglesias?.find((candidate) => candidate.id === iglesiaElegida);
  // An iglesia elegida that is not among the iglesias no longer exists: it
  // counts as none, so the screen offers to choose another one instead of
  // failing to load a calendario for ever.
  const exists = iglesias === undefined || iglesia !== undefined;

  return {
    iglesiaId: iglesiaElegida != null && exists ? iglesiaElegida : null,
    iglesia,
    refetch,
  };
}
