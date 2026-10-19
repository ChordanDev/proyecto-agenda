// The correo de bienvenida goes out through Resend. Changing the provider is
// changing this file alone: the domain only knows the port enviarCorreo. The
// key lives in the secrets of the server (`supabase secrets set
// RESEND_API_KEY=...`), never in the repository nor in the app.

import type { PuertosDeInvitacion } from '../../../src/features/gestion/dominio/invitacion.ts';

const URL_DE_RESEND = 'https://api.resend.com/emails';

/** A call that takes longer counts as a correo not sent. */
const TIEMPO_MAXIMO_MS = 10_000;

/**
 * @param remitente The sender, of the domain of the asociacion, for example
 *   `Agenda de iglesia <agenda@asociacion.org>`.
 */
export function crearEnvioDeCorreo(
  apiKey: string,
  remitente: string,
): PuertosDeInvitacion['enviarCorreo'] {
  return async ({ para, asunto, texto }) => {
    const response = await fetch(URL_DE_RESEND, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(TIEMPO_MAXIMO_MS),
      body: JSON.stringify({ from: remitente, to: [para], subject: asunto, text: texto }),
    });

    if (!response.ok) {
      // Never the body nor the correo: only what failed.
      throw new Error(`Resend answered ${response.status}`);
    }
  };
}
