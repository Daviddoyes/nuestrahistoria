-- ═══════════════════════════════════════════════════════════
-- GooALS — Fase 3b: sugerencias de gooals y rendimiento de Explorar
-- Ejecutar en el SQL Editor de Supabase, después de fase3.sql.
-- ═══════════════════════════════════════════════════════════

-- ── Sugerencias de la comunidad ────────────────────────────
-- El usuario propone título + categoría; la dificultad la decide el admin al
-- aprobar, que es donde está el criterio. Al aprobarse se publica en gooals_v2
-- SIN acreditar a nadie: en el catálogo un gooal sugerido es indistinguible de
-- uno curado. `user_id` se guarda solo para moderar (limitar y bloquear abusos)
-- y no se muestra en ninguna pantalla.
create table if not exists gooal_sugerencias (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete set null,
  titulo text not null,
  categoria text not null,
  -- 'pendiente' | 'aprobada' | 'rechazada'
  estado text not null default 'pendiente',
  -- Gooal publicado al aprobar; null si se rechazó o sigue pendiente.
  gooal_id uuid references gooals_v2(id) on delete set null,
  revisada_at timestamptz,
  created_at timestamptz default now()
);

-- La cola de moderación se lee siempre por estado y en orden de llegada.
create index if not exists gooal_sugerencias_estado_idx
  on gooal_sugerencias (estado, created_at desc);

-- El mismo usuario no puede mandar dos veces la misma idea. Se compara sin
-- mayúsculas para que "ver auroras" y "Ver Auroras" cuenten como una.
create unique index if not exists gooal_sugerencias_unica_idx
  on gooal_sugerencias (user_id, lower(titulo));

-- Sin políticas a propósito: se lee y escribe con el service role desde Server
-- Actions y desde /api/admin, igual que el resto de la Fase 3.
alter table gooal_sugerencias enable row level security;

-- ── Rendimiento de Explorar ────────────────────────────────
-- Explorar pagina el catálogo con .range() ordenando por veces_completado y
-- created_at. Sin un desempate estable, dos filas con los mismos valores pueden
-- salir en páginas distintas o repetirse; `id` cierra el orden.
create index if not exists gooals_v2_orden_idx
  on gooals_v2 (activo, veces_completado desc, created_at desc, id);

-- El buscador hace ilike '%texto%', que sin índice recorre las 4.900 filas.
-- pg_trgm lo resuelve con un GIN.
create extension if not exists pg_trgm;
create index if not exists gooals_v2_titulo_trgm_idx
  on gooals_v2 using gin (titulo gin_trgm_ops);
