-- ═══════════════════════════════════════════════════════════
-- GooALS — Fase 3m: cerrar las políticas de lectura demasiado anchas
--
-- Qué estaba pasando, medido contra la base real el 2-10-2026:
--
--   profiles            cualquiera con la clave pública del navegador leía las
--                       53 filas ENTERAS: correos, códigos de invitación, de
--                       pareja y de amigos, y quién es admin.
--   invitaciones_email  cualquiera podía leer TODAS las invitaciones (con el
--                       correo de la persona invitada) y modificar cualquiera.
--                       La tabla está vacía hoy; se filtraría en cuanto alguien
--                       invitara a un amigo.
--   follows             cualquiera podía descargarse el grafo social entero.
--   muro_posts          cualquiera podía leer todos los posts, y cualquiera con
--                       cuenta podía escribir uno directamente, saltándose las
--                       reglas de la app (puntos, gooal asociado).
--
-- Ninguna de esas políticas hacía falta. Comprobado fichero a fichero: el
-- navegador solo consulta `profiles`, y solo la fila propia. Todo lo demás
-- (muro, follows, likes, invitaciones, catálogo) lo lee y lo escribe el
-- servidor con el service role, que se salta la RLS. Es el diseño que ya
-- describe CLAUDE.md: "no se crean políticas de RLS a propósito".
--
-- La escritura NUNCA estuvo abierta: se comprobó tabla por tabla. Y nadie podía
-- publicar en el muro en nombre de otro: esa política sí comprueba la autoría
-- (se probó con una cuenta de prueba, que se borró después).
--
-- Se pega entero en el SQL Editor. Se puede lanzar dos veces sin romper nada.
-- ═══════════════════════════════════════════════════════════

-- ── 1. profiles ────────────────────────────────────────────
-- Fuera la ancha. Convivía con la correcta, y las políticas de SELECT SE SUMAN:
-- basta con que una diga "true" para que la otra no sirva de nada.
drop policy if exists "allow read profiles" on profiles;

-- Y nos asegura de que la correcta está: cada uno lee su propia ficha entera.
drop policy if exists "users can read own profile" on profiles;
create policy "users can read own profile" on profiles
  for select using (auth.uid() = id);

-- Escribir y crear, solo lo propio. Estaba así; se deja escrito para que el
-- esquema del repo diga la verdad.
drop policy if exists "users can update own profile" on profiles;
create policy "users can update own profile" on profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "users can insert own profile" on profiles;
create policy "users can insert own profile" on profiles
  for insert with check (auth.uid() = id);


-- ── 2. El hueco que deja cerrar profiles ───────────────────
-- El onboarding comprueba si un nombre de usuario está libre, y para eso mira
-- las filas de OTROS. Con la política de arriba ya no puede, y sin esto diría
-- siempre "libre" y acabaríais con nombres repetidos.
--
-- Una función que contesta sí o no. No devuelve ni una fila ni una columna, así
-- que no se puede usar para sacar datos: solo para preguntar por un nombre
-- concreto que ya conoces.
--
-- security definer: se ejecuta con los permisos de quien la creó, para poder
-- mirar la tabla por encima de la RLS. El search_path se fija a propósito: sin
-- eso, una función security definer se puede engañar con una tabla falsa en
-- otro esquema.
create or replace function username_libre(nombre_pedido text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select not exists (
    select 1 from profiles
    -- El parámetro se llama nombre_pedido y NO nombre a propósito: profiles
    -- tiene una columna "nombre", y ante la duda Postgres prefiere la columna.
    -- Con el parámetro llamado "nombre", esto comparaba el username con el
    -- NOMBRE de la persona y contestaba cualquier cosa. Lo pilló la prueba.
    where lower(username) = lower(btrim(nombre_pedido))
      and (auth.uid() is null or id <> auth.uid())
  );
$$;

revoke all on function username_libre(text) from public;
grant execute on function username_libre(text) to anon, authenticated;

-- Y el cinturón, porque la función es solo el aviso.
--
-- Hasta hoy, lo ÚNICO que impedía dos usuarios con el mismo nombre era esa
-- comprobación del navegador: no había índice único. Dos personas registrándose
-- a la vez podían quedarse con el mismo @usuario, y nadie se habría enterado.
--
-- Único y sin distinguir mayúsculas, que es como se compara en la app. Los
-- nulos no estorban: un índice único admite varios (hay 3 perfiles sin username).
-- Comprobado antes de escribir esto: 50 usernames y ni uno repetido, así que el
-- índice entra sin pelearse con los datos.
create unique index if not exists profiles_username_unico
  on profiles (lower(btrim(username))) where username is not null;


-- ── 3. invitaciones_email ──────────────────────────────────
-- Las dos fuera. "public read by token" no filtraba por token: dejaba leerlas
-- todas. Y la de update dejaba modificar cualquier invitación, no solo la tuya.
-- El servidor (src/app/api/invitar/route.ts) usa el service role y no las
-- necesita.
drop policy if exists "public read by token" on invitaciones_email;
drop policy if exists "update used" on invitaciones_email;


-- ── 4. follows y muro_posts ────────────────────────────────
-- Quién sigue a quién se pinta desde el servidor, así que dejar su lectura
-- abierta solo permite descargarse el grafo social entero de una vez.
drop policy if exists "public read follows" on follows;

-- La de CREAR posts sí comprobaba la autoría (probado con una cuenta de prueba:
-- con el user_id de otro falla, con el propio funciona). Se quita igualmente
-- porque permite publicar saltándose las reglas de la app —los puntos, el gooal
-- asociado—, y la app crea los posts en el servidor.
drop policy if exists "users create posts" on muro_posts;

-- Y la de LEER el muro SE QUEDA, a propósito.
--
-- Primero se escribió un drop para ella y estaba mal: era cerrar por costumbre.
-- Mirando las columnas, un post lleva solo lo que la persona publica para que
-- se vea: el texto, la foto o el vídeo, qué gooal conquistó, los puntos y los
-- likes. Ni correo, ni ubicación, ni un dato del perfil. El user_id es un
-- identificador en bruto que, con profiles ya cerrada, no se puede convertir en
-- una persona sin pasar por el servidor. Y las fotos y vídeos ya están en un
-- bucket público.
--
-- Lo único que permite es leer el muro de golpe en vez de post a post, y en un
-- muro público eso no es una fuga: es el muro.


-- ── 5. Lo que NO se toca, y por qué ────────────────────────
--   gooals_v2       la política de lectura pública de los verificados se queda:
--                   es el catálogo, es contenido público a propósito.
--   user_gooals     la que enseña solo los conquistados se queda: es lo que
--                   hace público el muro. Los pendientes siguen cerrados.
--   todo lo demás   ya estaba cerrado.


-- ═══════════════════════════════════════════════════════════
-- COMPROBACIÓN. Cada consulta por separado.
-- ═══════════════════════════════════════════════════════════

-- 1 · Las políticas que quedan en profiles. Ni una con "true".
select policyname, cmd, qual, with_check from pg_policies
where schemaname = 'public' and tablename = 'profiles' order by policyname;
--   users can insert own profile  INSERT  (vacío)        auth.uid() = id
--   users can read own profile    SELECT  auth.uid() = id
--   users can update own profile  UPDATE  auth.uid() = id  auth.uid() = id

-- 2 · Que no queda NINGUNA política de lectura abierta en toda la base.
select tablename, policyname, cmd from pg_policies
where schemaname = 'public' and cmd in ('SELECT', 'ALL') and qual = 'true'
order by tablename;
--   NINGUNA FILA. Eso es lo correcto.
--
--   Las dos políticas de lectura que se quedan (los gooals verificados y los
--   conquistados) no tienen qual = 'true': tienen una condición, y por eso no
--   salen aquí. Si apareciera cualquier fila, es una política que deja leer
--   todo y hay que mirarla.

--   NOTA AÑADIDA EL 8-10-2026 — esa razón caducó.
--   Arriba pone "las dos políticas de lectura que se quedan (los gooals
--   verificados y los conquistados)". Era verdad el día que se escribió. Desde
--   el 7-10-2026 ya no: la de los conquistados ("public read completed", sobre
--   user_gooals) se quitó, porque dejaba listar con la clave pública quién
--   había conseguido qué y la ruta de su foto. Y el 8-10-2026 se quitó también
--   "users manage own gooals", así que user_gooals no tiene ninguna política.
--   La de lectura que se queda es UNA: la del catálogo.
--
--   La línea de arriba NO se corrige: este fichero es el acta de lo que se
--   ejecutó aquel día y eso no se reescribe. Quien quiera saber cómo están las
--   cosas HOY, que mire supabase/politicas.sql, que es el que se mantiene al
--   día. Ver CLAUDE.md, «Un fichero de migración es un acta; politicas.sql es
--   un estado».

-- 3 · Que la función contesta.
select username_libre('david') as deberia_decir_si_esta_libre;
select username_libre('un-nombre-que-no-existe-12345') as deberia_ser_true;

-- 4 · Y que sigue habiendo 53 perfiles, que esto no borra nada.
select count(*) as perfiles from profiles;
--   53
