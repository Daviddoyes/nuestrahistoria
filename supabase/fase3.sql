-- ═══════════════════════════════════════════════════════════
-- GooALS — Fase 3: gamificación (catálogo v2, puntos, muro, follows)
-- Ejecutar en el SQL Editor de Supabase.
--
--   gooals_v2    = catálogo de retos con dificultad y puntos
--   user_gooals  = qué gooals tiene cada usuario (pendiente/completado)
--   muro_posts   = feed social; una fila por gooal completado
--   muro_likes   = likes (fuente de verdad; muro_posts.likes es un contador)
--   reportes     = denuncias de una prueba (aún sin código que la use)
--   follows      = quién sigue a quién
--
-- OJO: este fichero llegó a describir una base que no existía (post_likes en
-- vez de muro_likes, columnas con otro nombre) y por eso completar un gooal
-- estuvo roto en producción sin que el código diera ningún error visible.
-- Si tocas la base a mano, actualiza este fichero en el mismo momento.
--
-- Cotejado con la base real el 14-09-2026: nombres y tipos de columnas de
-- user_gooals, muro_posts, muro_likes, reportes y follows. Lo que no se ve desde
-- la API (NOT NULL, claves foráneas, índices) queda como estaba diseñado.
-- gooals_v2 no se repasó en ese cotejo: tiene además latitud/longitud y las
-- columnas de fase3e.sql.
-- ═══════════════════════════════════════════════════════════

-- ── Catálogo ───────────────────────────────────────────────
create table if not exists gooals_v2 (
  id uuid default gen_random_uuid() primary key,
  titulo text not null,
  descripcion text,
  categoria text not null,
  -- 'facil' | 'dificil' | 'epico'. Los puntos se derivan de aquí en la API,
  -- pero se guardan en la fila para que un cambio de baremo no reescriba el
  -- histórico de puntos ya ganados.
  dificultad text not null default 'facil',
  puntos integer not null default 1,
  ciudad text,
  pais text,
  imagen_url text,
  activo boolean not null default true,
  veces_completado integer not null default 0,
  created_at timestamptz default now()
);

create index if not exists gooals_v2_activo_idx on gooals_v2 (activo, categoria);
create index if not exists gooals_v2_created_idx on gooals_v2 (created_at desc);

-- ── Gooals de cada usuario ─────────────────────────────────
create table if not exists user_gooals (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  gooal_id uuid not null references gooals_v2(id) on delete cascade,
  estado text not null default 'pendiente',   -- 'pendiente' | 'completado'
  foto_url text,
  video_url text,
  descripcion text,
  puntos_ganados integer not null default 0,
  reportes integer default 0,
  completado_at timestamp,
  created_at timestamp default now(),
  -- Un usuario no puede tener el mismo gooal dos veces: el "añadir" es
  -- idempotente y "ya lo hice" reutiliza la fila pendiente si existe.
  unique (user_id, gooal_id)
);

create index if not exists user_gooals_user_idx on user_gooals (user_id, estado);
create index if not exists user_gooals_gooal_idx on user_gooals (gooal_id, estado);

-- ── Muro social ────────────────────────────────────────────
create table if not exists muro_posts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  gooal_id uuid references gooals_v2(id) on delete set null,
  user_gooal_id uuid references user_gooals(id) on delete cascade,
  foto_url text,
  video_url text,
  descripcion text,
  -- Contador desnormalizado: se recalcula desde muro_likes en cada toggle,
  -- así no hay deriva aunque dos likes lleguen a la vez.
  likes integer not null default 0,
  created_at timestamp default now(),
  puntos integer not null default 0
);

create index if not exists muro_posts_user_idx on muro_posts (user_id, created_at desc);
create index if not exists muro_posts_created_idx on muro_posts (created_at desc);

create table if not exists muro_likes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid not null references muro_posts(id) on delete cascade,
  created_at timestamp default now(),
  unique (post_id, user_id)
);

create index if not exists muro_likes_post_idx on muro_likes (post_id);
create index if not exists muro_likes_user_idx on muro_likes (user_id);

-- ── Reportes ───────────────────────────────────────────────
-- Existe en la base, pero todavía no hay botón ni código que la use.
create table if not exists reportes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  user_gooal_id uuid references user_gooals(id) on delete cascade,
  motivo text,
  created_at timestamp default now()
);

-- ── Seguidores ─────────────────────────────────────────────
create table if not exists follows (
  id uuid default gen_random_uuid() primary key,
  follower_id uuid not null references auth.users(id) on delete cascade,
  following_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamp default now(),
  unique (follower_id, following_id),
  constraint follows_no_self check (follower_id <> following_id)
);

create index if not exists follows_follower_idx on follows (follower_id);
create index if not exists follows_following_idx on follows (following_id);

-- ── Columnas de gamificación en profiles ───────────────────
-- puntos_totales y los contadores sociales se RECALCULAN desde las tablas
-- fuente (user_gooals, follows) en cada acción; son caché de lectura, no la
-- verdad. Por eso un incremento perdido no corrompe nada permanentemente.
alter table profiles add column if not exists puntos_totales integer default 0;
alter table profiles add column if not exists nivel text default 'Principiante';
alter table profiles add column if not exists seguidores integer default 0;
alter table profiles add column if not exists siguiendo integer default 0;

-- ── RLS ────────────────────────────────────────────────────
-- Lectura pública SOLO del catálogo (Explorar lo consulta desde el navegador).
-- Todo lo demás se lee y escribe con el service role desde Server Actions, que
-- salta la RLS: no se crean políticas a propósito, para que la anon key —que es
-- pública— no pueda insertar likes, follows ni posts en nombre de nadie.
alter table gooals_v2 enable row level security;
drop policy if exists "public read gooals_v2" on gooals_v2;
create policy "public read gooals_v2" on gooals_v2 for select using (true);

alter table user_gooals enable row level security;
alter table muro_posts enable row level security;
alter table muro_likes enable row level security;
alter table reportes enable row level security;
alter table follows enable row level security;

-- ── Storage: pruebas de gooals completados ─────────────────
insert into storage.buckets (id, name, public)
values ('gooals-media', 'gooals-media', true)
on conflict (id) do nothing;

-- Los mismos límites que aplica la app (src/lib/prueba-media.ts). El bucket
-- solo admite un tope por fichero, así que aquí va el del vídeo; los 10 MB de
-- la foto los comprueban el navegador y completarGooal.
update storage.buckets
set file_size_limit = 52428800,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime']
where id = 'gooals-media';

-- Subir: solo con sesión y solo dentro de tu carpeta (<tu id>/...). La versión
-- anterior dejaba subir a cualquiera, incluso sin sesión.
drop policy if exists "allow gooals media upload" on storage.objects;
drop policy if exists "gooals media: subir solo a tu carpeta" on storage.objects;
create policy "gooals media: subir solo a tu carpeta" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'gooals-media'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "allow gooals media read" on storage.objects;
create policy "allow gooals media read" on storage.objects
for select using (bucket_id = 'gooals-media');
