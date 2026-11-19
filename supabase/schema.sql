-- =====================================================================
--  AuiPark · Esquema de la base de datos en Supabase (PostgreSQL)
--  Ejecutar en Supabase → SQL Editor → New query → Run
-- =====================================================================

-- ---------------------------------------------------------------------
-- Limpieza (permite volver a ejecutar el script)
-- ---------------------------------------------------------------------
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user() cascade;
drop function if exists public.crear_reserva cascade;
drop function if exists public.cambiar_estado_reserva cascade;
drop function if exists public.estadisticas cascade;
drop table if exists public.reservas cascade;
drop table if exists public.vehiculos cascade;
drop table if exists public.parking_servicio cascade;
drop table if exists public.servicios cascade;
drop table if exists public.profiles cascade;
drop table if exists public.parkings cascade;

-- ---------------------------------------------------------------------
-- PARKINGS
-- ---------------------------------------------------------------------
create table public.parkings (
  id              bigint generated always as identity primary key,
  nombre          text not null check (char_length(nombre) between 3 and 150),
  direccion       text not null default '',
  ciudad          text not null default '',
  lat             numeric(9,6) not null check (lat between -90 and 90),
  lon             numeric(9,6) not null check (lon between -180 and 180),
  tipo            text not null default 'superficie'
                  check (tipo in ('subterraneo','multinivel','azotea','superficie')),
  precio_hora     numeric(6,2) not null check (precio_hora > 0),
  capacidad       integer not null check (capacidad > 0),
  disponibles     integer not null,
  valoracion      numeric(2,1) not null default 4.0 check (valoracion between 0 and 5),
  resenas         integer not null default 0,
  abierto_24h     boolean not null default false,
  horario         text not null default '07:00-23:00',
  activo          boolean not null default true,
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now(),
  constraint ck_parkings_plazas check (disponibles between 0 and capacidad)
);
create index idx_parkings_coords on public.parkings (lat, lon);

-- ---------------------------------------------------------------------
-- PERFILES: datos y rol de cada usuario de Supabase Auth
-- ---------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  nombre      text not null,
  email       text not null unique,
  telefono    text,
  rol         text not null default 'cliente' check (rol in ('cliente','empleado','admin')),
  parking_id  bigint references public.parkings(id) on delete set null,  -- parking del empleado
  activo      boolean not null default true,
  creado_en   timestamptz not null default now(),
  constraint ck_empleado_parking check (rol = 'empleado' or parking_id is null)
);

-- Al registrarse en Supabase Auth se crea su perfil, SIEMPRE con rol «cliente»
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, nombre, email, telefono)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'nombre'), ''), split_part(new.email, '@', 1)),
    lower(new.email),
    nullif(trim(new.raw_user_meta_data->>'telefono'), '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- SERVICIOS y relación N:M con PARKINGS
-- ---------------------------------------------------------------------
create table public.servicios (
  id      smallint generated always as identity primary key,
  clave   text not null unique,
  nombre  text not null
);

create table public.parking_servicio (
  parking_id   bigint   not null references public.parkings(id) on delete cascade,
  servicio_id  smallint not null references public.servicios(id) on delete cascade,
  primary key (parking_id, servicio_id)
);

-- ---------------------------------------------------------------------
-- VEHÍCULOS (de cada usuario)
-- ---------------------------------------------------------------------
create table public.vehiculos (
  id          bigint generated always as identity primary key,
  usuario_id  uuid not null references public.profiles(id) on delete cascade,
  matricula   text not null,
  tipo        text not null check (tipo in ('turismo','suv_4x4','monovolumen','furgoneta','deportivo','electrico','moto','otro')),
  marca       text not null default '',
  modelo      text not null default '',
  color       text not null default '',
  creado_en   timestamptz not null default now(),
  unique (usuario_id, matricula)
);

-- ---------------------------------------------------------------------
-- RESERVAS
-- ---------------------------------------------------------------------
create table public.reservas (
  id                bigint generated always as identity primary key,
  codigo            text not null unique,
  usuario_id        uuid   not null references public.profiles(id),
  parking_id        bigint not null references public.parkings(id),
  vehiculo_id       bigint not null references public.vehiculos(id),
  titular_nombre    text not null,
  titular_email     text not null,
  titular_telefono  text not null,
  entrada           timestamptz not null,
  salida            timestamptz not null,
  horas             integer not null check (horas >= 1),
  plazas            integer not null check (plazas between 1 and 5),
  precio_hora       numeric(6,2) not null,
  precio_total      numeric(8,2) not null,
  estado            text not null default 'confirmada' check (estado in ('confirmada','finalizada','cancelada')),
  notas             text not null default '' check (char_length(notas) <= 500),
  creado_en         timestamptz not null default now(),
  actualizado_en    timestamptz not null default now(),
  constraint ck_reservas_fechas check (salida > entrada)
);
create index idx_reservas_usuario on public.reservas (usuario_id);
create index idx_reservas_parking_estado on public.reservas (parking_id, estado);

-- ---------------------------------------------------------------------
-- FUNCIÓN: crear una reserva de forma atómica
-- Bloquea la fila del parking (FOR UPDATE): dos reservas simultáneas no
-- pueden coger la misma plaza. Calcula el precio en la base de datos.
-- ---------------------------------------------------------------------
create function public.crear_reserva(
  p_usuario uuid, p_parking bigint,
  p_matricula text, p_tipo text, p_marca text, p_modelo text, p_color text,
  p_titular_nombre text, p_titular_email text, p_titular_telefono text,
  p_entrada timestamptz, p_salida timestamptz, p_plazas integer, p_notas text
) returns bigint
language plpgsql
set search_path = public
as $$
declare
  v_parking  parkings%rowtype;
  v_vehiculo bigint;
  v_horas    integer;
  v_codigo   text;
  v_id       bigint;
  v_abc      constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
begin
  select * into v_parking from parkings where id = p_parking for update;
  if not found or not v_parking.activo then
    raise exception 'PARKING_NO_EXISTE';
  end if;
  if v_parking.disponibles < p_plazas then
    raise exception 'SIN_PLAZAS';
  end if;

  -- Vehículo del usuario (se crea o se actualiza con los últimos datos)
  insert into vehiculos (usuario_id, matricula, tipo, marca, modelo, color)
  values (p_usuario, p_matricula, p_tipo, p_marca, p_modelo, p_color)
  on conflict (usuario_id, matricula)
  do update set tipo = excluded.tipo, marca = excluded.marca, modelo = excluded.modelo, color = excluded.color
  returning id into v_vehiculo;

  -- Precio: horas redondeadas hacia arriba (mínimo 1) × precio/hora × plazas
  v_horas := greatest(1, ceil(extract(epoch from (p_salida - p_entrada)) / 3600.0)::integer);

  -- Código único AUP-XXXXXX
  loop
    v_codigo := 'AUP-';
    for i in 1..6 loop
      v_codigo := v_codigo || substr(v_abc, 1 + floor(random() * length(v_abc))::integer, 1);
    end loop;
    exit when not exists (select 1 from reservas where codigo = v_codigo);
  end loop;

  insert into reservas (codigo, usuario_id, parking_id, vehiculo_id, titular_nombre, titular_email,
                        titular_telefono, entrada, salida, horas, plazas, precio_hora, precio_total, notas)
  values (v_codigo, p_usuario, p_parking, v_vehiculo, p_titular_nombre, p_titular_email, p_titular_telefono,
          p_entrada, p_salida, v_horas, p_plazas, v_parking.precio_hora,
          round(v_horas * v_parking.precio_hora * p_plazas, 2), coalesce(p_notas, ''))
  returning id into v_id;

  update parkings set disponibles = disponibles - p_plazas, actualizado_en = now() where id = p_parking;
  return v_id;
end;
$$;

-- ---------------------------------------------------------------------
-- FUNCIÓN: finalizar o cancelar una reserva y devolver las plazas
-- ---------------------------------------------------------------------
create function public.cambiar_estado_reserva(p_codigo text, p_estado text)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_res reservas%rowtype;
begin
  if p_estado not in ('finalizada', 'cancelada') then
    raise exception 'ESTADO_NO_VALIDO';
  end if;
  select * into v_res from reservas where codigo = upper(p_codigo) for update;
  if not found then
    raise exception 'RESERVA_NO_EXISTE';
  end if;
  if v_res.estado <> 'confirmada' then
    raise exception 'RESERVA_NO_CONFIRMADA';
  end if;
  update reservas set estado = p_estado, actualizado_en = now() where id = v_res.id;
  update parkings set disponibles = least(capacidad, disponibles + v_res.plazas), actualizado_en = now()
   where id = v_res.parking_id;
end;
$$;

-- ---------------------------------------------------------------------
-- FUNCIÓN: estadísticas para el panel de administración
-- ---------------------------------------------------------------------
create function public.estadisticas()
returns json
language sql
stable
set search_path = public
as $$
  select json_build_object(
    'parkings',  (select count(*) from parkings where activo),
    'capacity',  (select coalesce(sum(capacidad), 0) from parkings where activo),
    'available', (select coalesce(sum(disponibles), 0) from parkings where activo),
    'revenue',   (select coalesce(sum(precio_total), 0) from reservas where estado <> 'cancelada'),
    'reservations', (select coalesce(json_object_agg(estado, n), '{}'::json)
                       from (select estado, count(*) n from reservas group by estado) t),
    'users',     (select coalesce(json_object_agg(rol, n), '{}'::json)
                       from (select rol, count(*) n from profiles group by rol) t),
    'last7days', (select coalesce(json_agg(json_build_object('day', d::date, 'count', coalesce(n, 0)) order by d), '[]'::json)
                    from generate_series(current_date - 6, current_date, interval '1 day') d
                    left join (select creado_en::date dia, count(*) n from reservas
                                where estado <> 'cancelada' group by 1) r on r.dia = d::date),
    'topParkings', (select coalesce(json_agg(t), '[]'::json) from (
                      select p.id, p.nombre as name, p.ciudad as city, count(r.id) as count,
                             coalesce(sum(r.precio_total), 0) as amount
                        from reservas r join parkings p on p.id = r.parking_id
                       where r.estado <> 'cancelada'
                       group by p.id order by count(r.id) desc limit 5) t)
  );
$$;

-- ---------------------------------------------------------------------
-- SEGURIDAD (Row Level Security)
-- La API Express se conecta como propietaria de las tablas, así que no le
-- afecta. Con la clave pública (publishable) desde el navegador solo se
-- pueden LEER los parkings activos y los servicios; todo lo demás está
-- bloqueado y pasa obligatoriamente por la API.
-- ---------------------------------------------------------------------
alter table public.parkings          enable row level security;
alter table public.profiles          enable row level security;
alter table public.servicios         enable row level security;
alter table public.parking_servicio  enable row level security;
alter table public.vehiculos         enable row level security;
alter table public.reservas          enable row level security;

create policy "Parkings activos visibles" on public.parkings for select to anon, authenticated using (activo);
create policy "Servicios visibles" on public.servicios for select to anon, authenticated using (true);
create policy "Servicios de parkings visibles" on public.parking_servicio for select to anon, authenticated using (true);
create policy "Cada usuario ve su perfil" on public.profiles for select to authenticated using (id = auth.uid());

-- Las funciones solo las puede ejecutar el servidor
revoke execute on function public.crear_reserva(uuid, bigint, text, text, text, text, text, text, text, text, timestamptz, timestamptz, integer, text) from public, anon, authenticated;
revoke execute on function public.cambiar_estado_reserva(text, text) from public, anon, authenticated;
revoke execute on function public.estadisticas() from public, anon, authenticated;
