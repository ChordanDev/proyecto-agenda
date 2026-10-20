-- The Expo tickets of the daily sending, until their receipt is read (issue #211).
--
-- Expo answers each notification with a ticket at once, but many uninstalls
-- are only reported by Apple or Google later, in the receipt of that ticket
-- (/--/api/v2/push/getReceipts). So the sending keeps the id of every ticket
-- Expo took, with the token it was sent to, and an hourly run of the same
-- function reads the receipts of the tickets older than 15 minutes: a
-- DeviceNotRegistered receipt turns the phone off.
--
-- A row lives only until its receipt is read, or for a day when the receipt
-- never comes (Expo keeps receipts for about a day). Turning a phone off, or
-- deleting it, does not need its rows: deleting it deletes them.
--
-- Like dispositivos, the table is closed to the API roles: only the server
-- function writes and reads it, with the service_role.

create table public.recibos_pendientes (
  ticket text primary key,
  token text not null references public.dispositivos (token) on delete cascade,
  enviado_at timestamptz not null default now()
);

-- The hourly run reads the tickets old enough to have their receipt.
create index recibos_pendientes_enviado_at_idx on public.recibos_pendientes (enviado_at);
-- Deleting a phone looks for its tickets.
create index recibos_pendientes_token_idx on public.recibos_pendientes (token);

alter table public.recibos_pendientes enable row level security;

-- No policy and no privilege: no API role reaches this table.
revoke all on public.recibos_pendientes from anon, authenticated;
