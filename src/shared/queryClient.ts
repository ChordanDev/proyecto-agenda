import { QueryClient } from '@tanstack/react-query';

// No persistence yet: the offline cache belongs to another ticket.
export const queryClient = new QueryClient();
