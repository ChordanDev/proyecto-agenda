import { onlineManager } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';

/** Whether the phone has a connection, as the query client knows it. */
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(onlineManager.subscribe.bind(onlineManager), () =>
    onlineManager.isOnline(),
  );
}
