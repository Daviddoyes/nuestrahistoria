-- ═══════════════════════════════════════════════════════════
-- GooALS — Fase 3c: administración por rol
-- Ejecutar en el SQL Editor de Supabase, después de fase3b.sql.
--
-- Sustituye la contraseña compartida que viajaba en el bundle del navegador
-- (cualquiera podía leerla en las devtools y llamar a /api/admin/*) por el rol
-- real del usuario que hace la petición.
-- ═══════════════════════════════════════════════════════════

alter table profiles add column if not exists es_admin boolean not null default false;

-- Solo el service role lo consulta, desde el servidor. Nadie más lo lee ni lo
-- escribe: no hay política de RLS que lo exponga, y el cliente no lo recibe.
create index if not exists profiles_es_admin_idx on profiles (es_admin) where es_admin;

-- ── Date acceso a ti mismo ─────────────────────────────────
-- Cambia el email por el tuyo y ejecútalo. Hasta que hagas esto, /admin no deja
-- entrar a nadie: es lo que se pretende.
--
--   update profiles set es_admin = true
--   where id = (select id from auth.users where email = 'TU-EMAIL-AQUI');
--
-- Para comprobar quién es admin ahora mismo:
--
--   select p.id, u.email, p.es_admin
--   from profiles p join auth.users u on u.id = p.id
--   where p.es_admin;
--
-- Para quitarle el acceso a alguien:
--
--   update profiles set es_admin = false
--   where id = (select id from auth.users where email = 'OTRO-EMAIL');
