import { useQuery } from '@tanstack/react-query';

import { getEvento } from './getEvento';

/** The evento of a detail screen, with the nombre of its duenio. */
export function useEvento(id: string) {
  return useQuery({ queryKey: ['evento', id], queryFn: () => getEvento(id) });
}
