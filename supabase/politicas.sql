-- ═══════════════════════════════════════════════════════════
-- GooALS — TODAS las políticas de RLS, y por qué cada una
--
-- ESTE FICHERO ES LA VERDAD. Si la base y este fichero no coinciden, uno de los
-- dos está mal y hay que averiguar cuál antes de seguir.
--
-- Nació porque el esquema vivía solo en el panel de Supabase: alguien añadió a
-- mano una política de lectura en `profiles` para arreglar algo, se quedó, y
-- durante meses cualquiera con la clave pública del navegador podía leer los 53
-- correos de los usuarios. El repo no lo contaba porque el repo no lo sabía.
--
-- Lanzarlo entero deja la base en el estado correcto. Es idempotente.
--
--
-- LO PRIMERO QUE HAY QUE ENTENDER DE ESTE PROYECTO
--
-- `anon` y `authenticated` tienen TODOS los permisos sobre TODAS las tablas:
-- es el reparto por defecto de Supabase y no se ha tocado. Así que **la RLS es
-- lo único que protege cada tabla**. No hay una segunda cerradura.
--
-- De ahí tres consecuencias que conviene tener delante:
--
--   1. Cualquier política permisiva que alguien añada ABRE la tabla al
--      instante, sin más pasos.
--   2. Una tabla sin políticas está cerrada a cal y canto. No es un olvido:
--      es la forma de decir "a esto solo entra el servidor".
--   3. Las políticas de un mismo tipo SE SUMAN con O. Basta UNA que diga
--      `true` para que las demás no sirvan de nada. Así se abrió `profiles`:
--      la política ancha convivía con la correcta y la anulaba.
--
-- Y el reparto del proyecto, que explica por qué hay tan pocas políticas:
-- casi todo lo lee y lo escribe el servidor con el service role, que se salta
-- la RLS. Del navegador solo salen las consultas a `profiles` (la fila propia)
-- y la llamada a `username_libre()`.
-- ═══════════════════════════════════════════════════════════

-- ── La RLS, encendida en las doce tablas ───────────────────
-- Sin esto, las políticas de abajo no se aplican y las tablas quedan abiertas,
-- porque los permisos de rol están abiertos.
alter table profiles            enable row level security;
alter table gooals_v2           enable row level security;
alter table user_gooals         enable row level security;
alter table muro_posts          enable row level security;
alter table muro_likes          enable row level security;
alter table follows             enable row level security;
alter table reportes            enable row level security;
alter table invitaciones_email  enable row level security;
alter table gooal_sugerencias   enable row level security;
alter table gooals_revision     enable row level security;
alter table emails_enviados     enable row level security;
alter table emails_campanas     enable row level security;


-- ═══════════════════════════════════════════════════════════
-- profiles · 3 políticas
-- La tabla con datos personales: correos, códigos de invitación y de pareja,
-- y quién es admin. Cada uno ve y toca SU fila, y nada más.
-- ═══════════════════════════════════════════════════════════
drop policy if exists "users can read own profile" on profiles;
create policy "users can read own profile" on profiles
  for select using (auth.uid() = id);

drop policy if exists "users can update own profile" on profiles;
create policy "users can update own profile" on profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "users can insert own profile" on profiles;
create policy "users can insert own profile" on profiles
  for insert with check (auth.uid() = id);

-- QUITADA el 2-10-2026: "allow read profiles" (SELECT, qual true).
-- Era el agujero. No se vuelve a crear. Si alguien necesita leer el perfil de
-- otra persona desde el navegador, la respuesta NO es una política ancha: es
-- una vista con solo las columnas públicas, o una Server Action.
drop policy if exists "allow read profiles" on profiles;


-- ═══════════════════════════════════════════════════════════
-- gooals_v2 · 1 política
-- El catálogo. Contenido público a propósito, pero solo lo publicado.
-- ═══════════════════════════════════════════════════════════
drop policy if exists "public read gooals_v2 verificados" on gooals_v2;
create policy "public read gooals_v2 verificados" on gooals_v2
  for select using (estado = 'verificado' and activo);
-- Los borradores y lo retirado NO salen. Es la misma regla que aplica la app.


-- ═══════════════════════════════════════════════════════════
-- user_gooals · 2 políticas
-- Lo conquistado es público (es lo que hace público el muro); lo pendiente, no.
-- ═══════════════════════════════════════════════════════════
drop policy if exists "public read completed" on user_gooals;
create policy "public read completed" on user_gooals
  for select using (estado = 'completado');

drop policy if exists "users manage own gooals" on user_gooals;
create policy "users manage own gooals" on user_gooals
  for all using (auth.uid() = user_id);
-- OJO, PENDIENTE DE MIRAR: esta deja a alguien con sesión insertar una fila
-- suya directamente, con estado 'completado' y los puntos que quiera, sin pasar
-- por la app. Habría que comprobar si eso infla sus puntos visibles o no.
-- Anotado el 2-10-2026; no se toca sin medirlo primero.


-- ═══════════════════════════════════════════════════════════
-- muro_posts · 1 política
-- ═══════════════════════════════════════════════════════════
drop policy if exists "public read posts" on muro_posts;
create policy "public read posts" on muro_posts
  for select using (true);
-- ABIERTA A PROPÓSITO, y mirado columna por columna antes de decidirlo:
-- un post lleva el texto, la foto o el vídeo, el gooal, los puntos y los likes.
-- Ni correo, ni ubicación, ni un dato del perfil. El user_id es un
-- identificador en bruto que, con profiles cerrada, no se puede convertir en
-- una persona sin el servidor. Y las fotos ya están en un bucket público.
-- Lo único que permite es leer el muro de golpe, y eso es el muro.

-- QUITADA el 2-10-2026: "users create posts" (INSERT, with_check auth.uid() =
-- user_id). Comprobaba bien la autoría —se probó: con el user_id de otro falla—,
-- pero permitía publicar saltándose las reglas de la app (los puntos, el gooal
-- asociado). Los posts los crea el servidor.
drop policy if exists "users create posts" on muro_posts;


-- ═══════════════════════════════════════════════════════════
-- muro_likes · 1 política
-- ═══════════════════════════════════════════════════════════
drop policy if exists "users manage likes" on muro_likes;
create policy "users manage likes" on muro_likes
  for all using (auth.uid() = user_id);
-- Sin lectura pública: el recuento de likes viaja en la fila del post.


-- ═══════════════════════════════════════════════════════════
-- follows · 1 política
-- ═══════════════════════════════════════════════════════════
drop policy if exists "users manage follows" on follows;
create policy "users manage follows" on follows
  for all using (auth.uid() = follower_id);

-- QUITADA el 2-10-2026: "public read follows" (SELECT, qual true). Permitía
-- descargarse el grafo social entero. Quién sigue a quién se pinta en el perfil
-- desde el servidor, de una persona a la vez.
drop policy if exists "public read follows" on follows;


-- ═══════════════════════════════════════════════════════════
-- reportes · 1 política
-- ═══════════════════════════════════════════════════════════
drop policy if exists "users create reportes" on reportes;
create policy "users create reportes" on reportes
  for insert with check (auth.uid() = user_id);
-- Solo crear. Nadie lee los reportes de nadie: eso es del panel.


-- ═══════════════════════════════════════════════════════════
-- invitaciones_email · 1 política
-- ═══════════════════════════════════════════════════════════
drop policy if exists "users can create invitations" on invitaciones_email;
create policy "users can create invitations" on invitaciones_email
  for insert with check (auth.uid() = invitado_por);

-- QUITADAS el 2-10-2026, las dos:
--   "public read by token" (SELECT, qual true). El nombre engaña: no filtraba
--   por token, dejaba leerlas TODAS, con el correo de la persona invitada
--   dentro. Comprobado con una invitación de verdad: el anónimo la leía.
--   "update used" (UPDATE, qual true). Dejaba a cualquiera marcar como usada
--   la invitación de otro y dejarla inservible. Comprobado: lo hacía.
-- La invitación la lee y la cierra el servidor (src/app/api/invitar/route.ts).
drop policy if exists "public read by token" on invitaciones_email;
drop policy if exists "update used" on invitaciones_email;


-- ═══════════════════════════════════════════════════════════
-- LAS CUATRO TABLAS SIN NINGUNA POLÍTICA
--
--   gooal_sugerencias · gooals_revision · emails_enviados · emails_campanas
--
-- NO ES UN OLVIDO. Es el estado correcto y hay que dejarlo así.
--
-- Con la RLS encendida y sin ninguna política, no entra nadie: ni el anónimo ni
-- quien tenga sesión. Solo el servidor con el service role, que se salta la RLS.
-- Y eso es exactamente lo que son: cosas del panel de administración.
--
--   gooal_sugerencias  lo que propone la gente, a la espera de moderación
--   gooals_revision    el repaso de títulos con IA (tabla temporal)
--   emails_enviados    a quién se le ha mandado qué campaña
--   emails_campanas    los correos que se mandan desde el panel
--
-- SI ALGÚN DÍA ALGO "NO FUNCIONA" CON UNA DE ESTAS CUATRO, la solución no es
-- añadirle una política. Es mirar si quien la consulta debería estar usando el
-- service role desde el servidor. Añadirle una política permisiva la abre al
-- instante a todo internet, porque los permisos de rol están abiertos.
-- ═══════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════
-- COMPROBACIÓN. Cada consulta por separado.
-- ═══════════════════════════════════════════════════════════

-- 1 · Las 11 políticas que debe haber, y ni una más.
select tablename, policyname, cmd, permissive, qual, with_check
from pg_policies where schemaname = 'public'
order by tablename, policyname;
--   follows              users manage follows           ALL
--   gooals_v2            public read gooals_v2 verif.   SELECT
--   invitaciones_email   users can create invitations   INSERT
--   muro_likes           users manage likes             ALL
--   muro_posts           public read posts              SELECT
--   profiles             users can insert own profile   INSERT
--   profiles             users can read own profile      SELECT
--   profiles             users can update own profile   UPDATE
--   reportes             users create reportes          INSERT
--   user_gooals          public read completed          SELECT
--   user_gooals          users manage own gooals        ALL
--   (y ninguna en gooal_sugerencias, gooals_revision, emails_enviados ni emails_campanas)

-- 2 · La RLS, encendida en las doce.
select relname as tabla, relrowsecurity as rls
from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r'
order by relname;
--   las doce con rls = true

-- 3 · La única política de lectura con qual 'true' que debe quedar es la del muro.
select tablename, policyname from pg_policies
where schemaname = 'public' and cmd in ('SELECT', 'ALL') and qual = 'true'
order by tablename;
--   muro_posts  public read posts
--   Si sale cualquier otra, es una tabla abierta a todo internet.

-- Y para comprobarlo de verdad, desde fuera y no desde el esquema:
--   node --env-file=.env.local scripts/comprobar-rls.mjs
--   → 15 de 15
