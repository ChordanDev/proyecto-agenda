import { useQuery } from '@tanstack/react-query';

import { getIglesias } from './getIglesias';

export function useIglesias() {
  return useQuery({ queryKey: ['iglesias'], queryFn: getIglesias });
}
