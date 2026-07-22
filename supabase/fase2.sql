-- ═══════════════════════════════════════════════════════════
-- GOOALS — Fase 2: momentos, notificaciones y explorar
-- Ejecutar en el SQL Editor de Supabase.
-- ═══════════════════════════════════════════════════════════

-- ── Momentos (fotos del proceso) ───────────────────────────
create table if not exists plan_momentos (
  id uuid default gen_random_uuid() primary key,
  plan_id uuid references planes(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  nombre_usuario text,
  foto_url text not null,
  descripcion text,
  created_at timestamp default now()
);

create index if not exists plan_momentos_plan_id_idx on plan_momentos (plan_id, created_at);

alter table plan_momentos enable row level security;

drop policy if exists "all access momentos" on plan_momentos;
create policy "all access momentos" on plan_momentos
for all using (true);

-- ── Bucket de storage para momentos ────────────────────────
insert into storage.buckets (id, name, public)
values ('momentos', 'momentos', true)
on conflict (id) do nothing;

drop policy if exists "allow momentos upload" on storage.objects;
create policy "allow momentos upload" on storage.objects
for insert with check (bucket_id = 'momentos');

drop policy if exists "allow momentos read" on storage.objects;
create policy "allow momentos read" on storage.objects
for select using (bucket_id = 'momentos');

-- ── Notificaciones ─────────────────────────────────────────
create table if not exists notificaciones (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  tipo text not null,
  mensaje text not null,
  plan_id uuid references planes(id) on delete cascade,
  leida boolean default false,
  created_at timestamp default now()
);

create index if not exists notificaciones_user_idx on notificaciones (user_id, leida, created_at desc);

alter table notificaciones enable row level security;

drop policy if exists "user notificaciones" on notificaciones;
create policy "user notificaciones" on notificaciones
for all using (auth.uid() = user_id);

-- ── Columnas nuevas en planes ──────────────────────────────
-- URLs de los momentos, en orden cronológico, congeladas al completar el plan.
alter table planes add column if not exists momentos_urls text[];

-- Categoría usada por los chips de la pestaña Explorar.
alter table planes add column if not exists categoria text;
