import { useOnlineStatus } from '@/shared/useOnlineStatus';
import { ConfirmDialog, DialogText } from '@/shared/ui';

import { useSignOut } from '../datos/useLeaveSesion';
import { useLeaveToFirstScreen } from './useLeaveToFirstScreen';

/**
 * Asks before signing out: an older usuario can tap it by mistake, and signing
 * in again is not easy. What signing out does is not changed.
 */
export function ConfirmSignOut({ onClose }: { onClose: () => void }) {
  const signOut = useSignOut();
  const leaveToFirstScreen = useLeaveToFirstScreen();
  const isOnline = useOnlineStatus();

  return (
    <ConfirmDialog
      title="¿Cerrar sesión?"
      confirmLabel="Cerrar sesión"
      tone="primary"
      busy={signOut.isPending || signOut.isSuccess}
      onConfirm={() =>
        signOut.mutate(undefined, {
          // Ajustes stays mounted under the first screen: the dialog closes
          // before leaving, or it would stay on top.
          onSuccess: () => {
            onClose();
            leaveToFirstScreen();
          },
        })
      }
      onCancel={onClose}
    >
      {!isOnline && <DialogText>Para volver a entrar vas a necesitar conexión.</DialogText>}
      {/* A state the mockup does not draw. */}
      {signOut.isError && (
        <DialogText color="peligro" accessibilityRole="alert">
          No se pudo cerrar la sesión. Probá de nuevo.
        </DialogText>
      )}
    </ConfirmDialog>
  );
}
