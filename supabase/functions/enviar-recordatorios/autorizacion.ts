// Only the schedule of pg_cron may run the sending. It calls with the value
// Vault keeps as `service_role_key`, which must be exactly the value the
// function sees as SUPABASE_SERVICE_ROLE_KEY: the legacy service_role key, a
// JWT that starts with `eyJ` (Project Settings, API Keys, Legacy API keys).
// A new secret key (`sb_secret_...`) does not match and gets a 401.

/** Compares in constant time, so the time of the answer says nothing of the key but its length. */
function esIgual(a: string, b: string): boolean {
  const bytesA = new TextEncoder().encode(a);
  const bytesB = new TextEncoder().encode(b);

  if (bytesA.length !== bytesB.length) {
    return false;
  }

  let diferencia = 0;
  for (let i = 0; i < bytesA.length; i++) {
    diferencia |= bytesA[i] ^ bytesB[i];
  }

  return diferencia === 0;
}

/** Whether the Authorization header carries the service_role key: `Bearer <key>`. */
export function esLlamadaDelCron(authorization: string | null, serviceRoleKey: string): boolean {
  return esIgual(authorization ?? '', `Bearer ${serviceRoleKey}`);
}
