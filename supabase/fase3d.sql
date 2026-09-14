-- ═══════════════════════════════════════════════════════════
-- GooALS — Fase 3d: envío de correo a los usuarios existentes
-- Ejecutar en el SQL Editor de Supabase, después de fase3c.sql.
-- ═══════════════════════════════════════════════════════════

-- ── Baja de correos ────────────────────────────────────────
-- Todo correo que no sea estrictamente de servicio lleva enlace de baja, y
-- quien se da de baja deja de entrar en los envíos. Por defecto true: son
-- usuarios que se registraron ellos mismos en la app.
alter table profiles add column if not exists acepta_emails boolean not null default true;

-- ── Registro de envíos ─────────────────────────────────────
-- Una fila por usuario y campaña. El índice único es lo que impide de verdad
-- mandar dos veces el mismo correo a la misma persona: aunque se pulse el
-- botón dos veces, el segundo intento choca aquí y no llega a Resend.
create table if not exists emails_enviados (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  campana text not null,
  -- 'enviando' | 'enviado' | 'error'
  estado text not null default 'enviando',
  error text,
  created_at timestamptz default now(),
  unique (user_id, campana)
);

create index if not exists emails_enviados_campana_idx
  on emails_enviados (campana, estado);

-- Solo el service role la toca, desde el servidor.
alter table emails_enviados enable row level security;

-- ── Comprobar a cuánta gente se escribiría ─────────────────
--
--   select count(*) from profiles p
--   join auth.users u on u.id = p.id
--   where p.acepta_emails
--     and u.email is not null
--     and not exists (
--       select 1 from emails_enviados e
--       where e.user_id = p.id and e.campana = 'relanzamiento'
--     );
--
-- Y para ver cómo fue el envío:
--
--   select estado, count(*) from emails_enviados
--   where campana = 'relanzamiento' group by estado;
