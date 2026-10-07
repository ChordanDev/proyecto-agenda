-- Simulated data for local development. It is NOT the real structure of the
-- asociacion: names, addresses and localities are made up.
-- The ids are fixed so that tests and screenshots can reference them.

insert into public.asociaciones (id, nombre) values
  ('a0000000-0000-4000-8000-000000000001', 'Asociación Argentina Central');

insert into public.distritos (id, asociacion_id, nombre) values
  ('d0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Córdoba Centro'),
  ('d0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'Córdoba Norte'),
  ('d0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', 'Villa María'),
  ('d0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001', 'Río Cuarto');

insert into public.iglesias (id, distrito_id, nombre, direccion, localidad) values
  ('10000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'Córdoba Central', 'Av. Colón 1250', 'Córdoba'),
  ('10000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000001', 'Nueva Córdoba', 'Obispo Trejo 840', 'Córdoba'),
  ('10000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000001', 'Barrio Güemes', 'Belgrano 1175', 'Córdoba'),
  ('10000000-0000-4000-8000-000000000004', 'd0000000-0000-4000-8000-000000000002', 'Argüello', 'Av. Rafael Núñez 5320', 'Córdoba'),
  ('10000000-0000-4000-8000-000000000005', 'd0000000-0000-4000-8000-000000000002', 'Villa Allende', 'Av. Goycoechea 410', 'Villa Allende'),
  ('10000000-0000-4000-8000-000000000006', 'd0000000-0000-4000-8000-000000000002', 'Río Ceballos', 'Av. San Martín 4480', 'Río Ceballos'),
  ('10000000-0000-4000-8000-000000000007', 'd0000000-0000-4000-8000-000000000003', 'Villa María Centro', 'Mendoza 1340', 'Villa María'),
  ('10000000-0000-4000-8000-000000000008', 'd0000000-0000-4000-8000-000000000003', 'Villa Nueva', 'Marcos Juárez 720', 'Villa Nueva'),
  ('10000000-0000-4000-8000-000000000009', 'd0000000-0000-4000-8000-000000000003', 'Bell Ville', 'Bv. Colón 215', 'Bell Ville'),
  ('10000000-0000-4000-8000-000000000010', 'd0000000-0000-4000-8000-000000000004', 'Río Cuarto Central', 'Sobremonte 960', 'Río Cuarto'),
  ('10000000-0000-4000-8000-000000000011', 'd0000000-0000-4000-8000-000000000004', 'Banda Norte', 'Av. Marcelo T. de Alvear 1630', 'Río Cuarto'),
  ('10000000-0000-4000-8000-000000000012', 'd0000000-0000-4000-8000-000000000004', 'Las Higueras', 'Av. San Martín 305', 'Las Higueras');

-- Fictitious church used for internal tests: it never appears in "Elegir iglesia".
insert into public.iglesias (id, distrito_id, nombre, direccion, localidad, excluida_del_buscador) values
  ('10000000-0000-4000-8000-000000000099', 'd0000000-0000-4000-8000-000000000001', 'Iglesia de prueba', 'Calle Ficticia 123', 'Córdoba', true);
