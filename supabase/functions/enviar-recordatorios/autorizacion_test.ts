// Unit tests of the check that only the schedule calls the function.
// Run: `deno test` in this folder.

import assert from 'node:assert/strict';

import { esLlamadaDelCron } from './autorizacion.ts';

/** The shape of the legacy service_role key: a JWT, the value of SUPABASE_SERVICE_ROLE_KEY. */
const SERVICE_ROLE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.firma';

/** A new secret key has this prefix; the rest is made up. */
const NUEVA_CLAVE = ['sb', 'secret', 'clave-de-la-prueba'].join('_');

Deno.test('accepts the service_role key the function sees', () => {
  assert.equal(esLlamadaDelCron(`Bearer ${SERVICE_ROLE}`, SERVICE_ROLE), true);
});

Deno.test('rejects a call without a key', () => {
  assert.equal(esLlamadaDelCron(null, SERVICE_ROLE), false);
  assert.equal(esLlamadaDelCron('', SERVICE_ROLE), false);
});

Deno.test(
  'rejects a new secret key (sb_secret_...) saved in Vault instead of the service_role key',
  () => {
    assert.equal(esLlamadaDelCron(`Bearer ${NUEVA_CLAVE}`, SERVICE_ROLE), false);
  },
);

Deno.test('rejects another key of the same length', () => {
  const otra = SERVICE_ROLE.slice(0, -1) + 'X';

  assert.equal(esLlamadaDelCron(`Bearer ${otra}`, SERVICE_ROLE), false);
});

Deno.test('rejects the key without the Bearer scheme', () => {
  assert.equal(esLlamadaDelCron(SERVICE_ROLE, SERVICE_ROLE), false);
});
