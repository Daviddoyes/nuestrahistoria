-- ═══════════════════════════════════════════════════════════
-- GOOALS — arquitectura de gooals genéricos + múltiples lugares
-- Ejecutar en el SQL Editor de Supabase.
--
--   gooal          = el concepto ("Practicar Karting", "Asistir al FIB")
--   gooal_lugares   = dónde conseguirlo (uno o varios sitios reales)
-- ═══════════════════════════════════════════════════════════

create table if not exists gooals (
  id uuid default gen_random_uuid() primary key,
  titulo text not null unique,
  categoria text not null,
  subcategoria text,
  descripcion text,
  imagen_url text,
  tags text[] default '{}',
  dificultad text default 'facil',
  duracion text,
  veces_añadido integer default 0,
  created_at timestamp default now()
);

create table if not exists gooal_lugares (
  id uuid default gen_random_uuid() primary key,
  gooal_id uuid references gooals(id) on delete cascade,
  nombre_lugar text not null,
  ciudad text,
  pais text default 'España',
  latitud numeric,
  longitud numeric,
  rating numeric,
  direccion text,
  created_at timestamp default now()
);

create index if not exists idx_gooal_lugares_location
  on gooal_lugares (latitud, longitud)
  where latitud is not null and longitud is not null;

create index if not exists idx_gooal_lugares_gooal on gooal_lugares (gooal_id);

-- ── RLS ──────────────────────────────────────────────────────
-- Lectura pública (Explorar la consulta desde el navegador). La ESCRITURA va
-- solo por el service role (migración + /api/admin/*), que salta la RLS, así
-- que NO se crea política de escritura pública.
--
-- ⚠️ El spec original traía `for all using (true)`, que deja a cualquiera con la
-- anon key (que es pública) insertar/actualizar/borrar gooals. Eso permitiría
-- vaciar la tabla desde fuera. Como el admin ya escribe con service role, esa
-- política es innecesaria y peligrosa; se omite a propósito. Si de verdad
-- quieres escritura desde el cliente, añádela tú, pero no es recomendable.

alter table gooals enable row level security;
drop policy if exists "public read gooals" on gooals;
create policy "public read gooals" on gooals for select using (true);

alter table gooal_lugares enable row level security;
drop policy if exists "public read lugares" on gooal_lugares;
create policy "public read lugares" on gooal_lugares for select using (true);
