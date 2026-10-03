-- ═══════════════════════════════════════════════════════════
-- GOOALS — Biblioteca de experiencias (curada desde /admin)
-- Ejecutar en el SQL Editor de Supabase.
-- ═══════════════════════════════════════════════════════════

create table if not exists experiencias (
  id uuid default gen_random_uuid() primary key,
  titulo text not null,
  descripcion text,
  categoria text not null,
  subcategoria text,
  ciudad text,
  pais text default 'España',
  lugar_nombre text,
  lugar_direccion text,
  dificultad text default 'facil',
  duracion text,
  tags text[],
  -- Coordenadas: las rellena el script de scripts/generar-experiencias
  -- (vienen de Google Places). Nulas para las creadas a mano o por IA.
  latitud double precision,
  longitud double precision,
  -- false = experiencia concreta y localizada (Google Places, festival, icónica);
  -- reservado por si más adelante entran sugerencias genéricas sin lugar real.
  es_generico boolean default false,
  verificada boolean default false,
  -- Se incrementa cuando un usuario añade la experiencia a su lista.
  veces_anadida integer default 0,
  created_at timestamp default now()
);

create index if not exists experiencias_created_idx on experiencias (created_at desc);
create index if not exists experiencias_categoria_idx on experiencias (categoria);

-- Si la tabla ya existía de antes, añade las columnas de coordenadas sin tocar el resto.
alter table experiencias add column if not exists latitud double precision;
alter table experiencias add column if not exists longitud double precision;
alter table experiencias add column if not exists es_generico boolean default false;

alter table experiencias enable row level security;

-- Lectura pública (el feed la usará más adelante). La escritura va siempre por
-- el service role desde /api/admin/*, que salta la RLS: no hay política de
-- insert/update/delete a propósito, para que nadie pueda tocarla desde el cliente.
drop policy if exists "experiencias lectura publica" on experiencias;
create policy "experiencias lectura publica" on experiencias
for select using (true);
