-- =====================================================================
--  AuiPark · Roles y reservas de las cuentas de demostración
--  1) Crear antes en Supabase → Authentication → Users → "Add user"
--     (marcando "Auto Confirm User"):
--        admin@auipark.com    / Admin1234!
--        empleado@auipark.com / Empleado1234!
--        cliente@auipark.com  / Cliente1234!
--  2) Ejecutar este script en el SQL Editor
-- =====================================================================
update public.profiles set nombre = 'Administrador AuiPark', telefono = '600000001', rol = 'admin'
 where email = 'admin@auipark.com';

update public.profiles set nombre = 'Marta Empleada', telefono = '600000002', rol = 'empleado',
       parking_id = (select id from public.parkings where nombre = 'Parking Plaça de Catalunya')
 where email = 'empleado@auipark.com';

update public.profiles set nombre = 'Laura García Sánchez', telefono = '612345678'
 where email = 'cliente@auipark.com';

-- Reservas de ejemplo de la clienta (se crean con la misma función que usa la API)
select public.crear_reserva(
  (select id from public.profiles where email = 'cliente@auipark.com'),
  (select id from public.parkings where nombre = 'Parking Plaça de Catalunya'),
  '1234BCD', 'turismo', 'Seat', 'León', 'Blanco',
  'Laura García Sánchez', 'cliente@auipark.com', '612345678',
  date_trunc('day', now()) + interval '1 day 9 hours', date_trunc('day', now()) + interval '1 day 13 hours',
  1, 'Plaza cerca del ascensor, por favor');

select public.crear_reserva(
  (select id from public.profiles where email = 'cliente@auipark.com'),
  (select id from public.parkings where nombre = 'Parking Plaça de Catalunya'),
  '5678FGH', 'electrico', 'Tesla', 'Model 3', 'Gris',
  'Laura García Sánchez', 'cliente@auipark.com', '612345678',
  now() - interval '1 hour', now() + interval '3 hours', 1, '');

select public.crear_reserva(
  (select id from public.profiles where email = 'cliente@auipark.com'),
  (select id from public.parkings where nombre = 'Parking Gran Vía'),
  '1234BCD', 'turismo', 'Seat', 'León', 'Blanco',
  'Laura García Sánchez', 'cliente@auipark.com', '612345678',
  date_trunc('day', now()) + interval '2 days 10 hours', date_trunc('day', now()) + interval '2 days 13 hours',
  1, '');
