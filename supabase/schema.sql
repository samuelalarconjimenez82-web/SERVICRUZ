-- SERVICRUZ · Base de datos
-- Pega todo este archivo en Supabase → SQL Editor → New query → Run.

-- Quién puede usar el panel (pon aquí tu correo, el mismo con el que entras al panel)
create table if not exists public.admins (
  email text primary key
);
-- Tu correo de administrador se agrega aparte (ver README, paso 3),
-- así no queda escrito en el código público.

create or replace function public.es_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where email = (auth.jwt() ->> 'email'));
$$;

-- Negocios
create table if not exists public.negocios (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  categoria text not null,
  barrio text,
  zona text,
  anillo int,
  lat double precision not null,
  lng double precision not null,
  telefono text default '',
  estado text not null default 'pendiente'
    check (estado in ('pendiente','nocontesta','interesado','inscrito')),
  nota text default '',
  simulado boolean not null default false,
  creado timestamptz not null default now()
);

-- Solicitudes que dejan los técnicos desde la web
create table if not exists public.solicitudes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (char_length(nombre) between 2 and 80),
  categoria text not null,
  telefono text not null check (char_length(telefono) between 6 and 20),
  barrio text check (char_length(barrio) <= 80),
  creado timestamptz not null default now()
);

-- Seguridad
alter table public.admins enable row level security;
alter table public.negocios enable row level security;
alter table public.solicitudes enable row level security;

-- El público solo ve negocios INSCRITOS
drop policy if exists "publico ve inscritos" on public.negocios;
create policy "publico ve inscritos" on public.negocios
  for select using (estado = 'inscrito');

-- El administrador ve y edita todo
drop policy if exists "admin todo negocios" on public.negocios;
create policy "admin todo negocios" on public.negocios
  for all to authenticated using (public.es_admin()) with check (public.es_admin());

-- Cualquiera puede enviar una solicitud, pero solo el administrador las lee o borra
drop policy if exists "cualquiera envia solicitud" on public.solicitudes;
create policy "cualquiera envia solicitud" on public.solicitudes
  for insert with check (true);
drop policy if exists "admin lee solicitudes" on public.solicitudes;
create policy "admin lee solicitudes" on public.solicitudes
  for select to authenticated using (public.es_admin());
drop policy if exists "admin borra solicitudes" on public.solicitudes;
create policy "admin borra solicitudes" on public.solicitudes
  for delete to authenticated using (public.es_admin());

-- La tabla de administradores no se expone a nadie desde la web
