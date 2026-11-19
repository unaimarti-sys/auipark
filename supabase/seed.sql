-- =====================================================================
--  AuiPark · Datos iniciales: servicios y parkings de demostración
--  Ejecutar DESPUÉS de schema.sql (Supabase → SQL Editor)
-- =====================================================================
insert into public.servicios (clave, nombre) values
 ('covered','Cubierto'), ('security','Videovigilancia'), ('ev_charging','Recarga eléctrica'),
 ('disabled_access','Acceso PMR'), ('washing','Lavado'), ('lift','Ascensor'),
 ('card_access','Acceso con tarjeta'), ('pet-friendly','Admite mascotas');

insert into public.parkings (nombre, direccion, ciudad, lat, lon, tipo, precio_hora, capacidad, disponibles, valoracion, resenas, abierto_24h, horario) values
 ('Parking Plaça de Catalunya', 'Plaça de Catalunya, 08002 Barcelona, España', 'Barcelona', 41.386200, 2.170600, 'subterraneo', 4.59, 340, 340, 4.0, 156, true, '24/7'),
 ('Parking Passeig de Gràcia', 'Passeig de Gràcia, 08007 Barcelona, España', 'Barcelona', 41.391700, 2.164900, 'multinivel', 4.03, 410, 410, 4.3, 81, true, '24/7'),
 ('Parking Barceloneta', 'Passeig Marítim, 08003 Barcelona, España', 'Barcelona', 41.378400, 2.192500, 'superficie', 3.60, 90, 90, 4.2, 13, false, '08:00-22:00'),
 ('Parking Puerta del Sol', 'Puerta del Sol, 28013 Madrid, España', 'Madrid', 40.416900, -3.703500, 'subterraneo', 1.76, 50, 50, 4.1, 182, true, '24/7'),
 ('Parking Gran Vía', 'Gran Vía, 28013 Madrid, España', 'Madrid', 40.420300, -3.699400, 'multinivel', 1.38, 370, 370, 4.4, 338, true, '24/7'),
 ('Parking Retiro', 'Calle de Alfonso XII, 28014 Madrid, España', 'Madrid', 40.415300, -3.684500, 'superficie', 2.00, 300, 300, 3.9, 268, false, '07:00-23:00'),
 ('Parking Plaça de l''Ajuntament', 'Plaça de l''Ajuntament, 46002 València, España', 'Valencia', 39.469600, -0.376900, 'subterraneo', 5.94, 40, 40, 4.0, 226, true, '24/7'),
 ('Parking Mercat Central', 'Plaça del Mercat, 46001 València, España', 'Valencia', 39.475400, -0.375800, 'multinivel', 4.95, 360, 360, 4.5, 13, false, '07:00-22:00'),
 ('Parking Plaza de España', 'Av. de Isabel la Católica, 41004 Sevilla, España', 'Sevilla', 37.377200, -5.986700, 'superficie', 1.90, 420, 420, 3.7, 366, false, '08:00-23:00'),
 ('Parking Santa Cruz', 'Calle Mateos Gago, 41004 Sevilla, España', 'Sevilla', 37.384700, -5.991400, 'subterraneo', 5.54, 100, 100, 3.6, 97, true, '24/7');

-- Servicios de cada parking (por orden de inserción)
insert into public.parking_servicio (parking_id, servicio_id)
select p.id, s.id from (values
  (1, 'covered'),
  (1, 'card_access'),
  (1, 'washing'),
  (1, 'ev_charging'),
  (2, 'covered'),
  (2, 'card_access'),
  (2, 'lift'),
  (2, 'security'),
  (3, 'card_access'),
  (3, 'ev_charging'),
  (3, 'washing'),
  (4, 'covered'),
  (4, 'card_access'),
  (4, 'lift'),
  (5, 'covered'),
  (5, 'card_access'),
  (5, 'washing'),
  (6, 'disabled_access'),
  (7, 'covered'),
  (7, 'card_access'),
  (7, 'washing'),
  (8, 'covered'),
  (8, 'lift'),
  (8, 'security'),
  (8, 'disabled_access'),
  (9, 'lift'),
  (10, 'covered'),
  (10, 'card_access'),
  (10, 'washing')
) as v(n, clave)
join (select id, row_number() over (order by id) n from public.parkings) p on p.n = v.n
join public.servicios s on s.clave = v.clave
on conflict do nothing;
