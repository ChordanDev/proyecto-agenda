-- Coordinates of each iglesia, to measure the distancia to it from the phone.
--
-- Both are optional: an iglesia can lack them until the developers load them
-- with a data migration (geocoding its direccion and checking by hand). The
-- app never writes them: iglesias has no write privilege for anon or
-- authenticated, and the read policy already covers the new columns.

alter table public.iglesias
  add column latitud double precision,
  add column longitud double precision,
  add constraint iglesias_latitud_range check (latitud between -90 and 90),
  add constraint iglesias_longitud_range check (longitud between -180 and 180),
  -- A point needs both values: one without the other cannot be measured.
  add constraint iglesias_coordenadas_complete check ((latitud is null) = (longitud is null));
