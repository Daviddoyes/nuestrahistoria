-- ═══════════════════════════════════════════════════════════
-- GooALS — Fase 3y: la segunda cerradura, la de las columnas
--
-- Se pega en el SQL Editor de Supabase. Es idempotente.
--
-- ── QUÉ SE ARREGLA ────────────────────────────────────────
--
-- La RLS de `profiles` estaba BIEN: cada uno solo toca su fila. El agujero
-- estaba un piso más abajo. **Una política decide QUÉ FILAS tocas; nunca QUÉ
-- COLUMNAS.** Y como `anon` y `authenticated` tenían todos los permisos sobre
-- todas las columnas, tu propia fila incluía tu propio `es_admin`: una petición
-- desde el navegador y cualquiera era administrador de /admin, que lee los
-- correos de los 53.
--
-- `puntos_totales` y `nivel` iban por el mismo camino, y en `user_gooals`
-- cualquiera podía insertarse una fila con estado 'completado' y los puntos que
-- quisiera, saltándose además el portero que impide conseguir un gooal retirado.
--
-- ── LO QUE NO ES ──────────────────────────────────────────
--
-- No es una política nueva. Las políticas de `profiles` se quedan como están,
-- porque son correctas. Lo que cambia son los PERMISOS, que es la otra
-- cerradura y hasta hoy no estaba echada.
-- ═══════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════
-- PARTE 1 · profiles — lo urgente, es_admin
--
-- Se le quita a las dos claves públicas todo permiso de escritura, y se le
-- devuelve a `authenticated` SOLO sobre las columnas que el navegador escribe
-- de verdad. La lista no es de memoria: sale de leer los tres únicos sitios
-- donde el navegador escribe en esta tabla.
--
--   el alta        src/app/page.tsx                 insert (id, nombre, email)
--   el onboarding  src/app/onboarding/page.tsx      update (onboarding_completado,
--                                                           nombre, username,
--                                                           intereses, con_quien_vive)
--   editar perfil  src/components/EditarPerfilModal.tsx  update (nombre, foto_perfil_url)
--
-- Ninguno de los tres usa upsert: un upsert manda TODAS las columnas y se
-- rompería contra un permiso por columna. Se comprobó uno a uno.
--
-- Las trece columnas que quedan fuera —`es_admin`, `puntos_totales`, `nivel`,
-- `seguidores`, `siguiendo`, `acepta_emails`, `codigo_invitacion`,
-- `codigo_amigos`, `codigo_pareja`, `pareja_id`, `created_at`— las escribe solo
-- el servidor con el service role, que se salta todo esto.
-- ═══════════════════════════════════════════════════════════

-- El SELECT NO se toca: la RLS ya lo limita a la fila propia, y el navegador
-- necesita leerla. Además, un UPDATE con `where id = ...` necesita poder LEER
-- esa columna para resolver el where.
revoke insert, update, delete, truncate, references, trigger on table profiles from anon;
revoke insert, update, delete, truncate, references, trigger on table profiles from authenticated;

grant insert (id, nombre, email) on table profiles to authenticated;
grant update (nombre, username, intereses, con_quien_vive, onboarding_completado, foto_perfil_url)
  on table profiles to authenticated;

-- A `anon` no se le devuelve NADA de escritura, ni una columna. Y no rompe el
-- alta: el alta no puede estar corriendo hoy como `anon`, porque su política de
-- insert exige `auth.uid() = id` y `anon` no tiene uid. Si corriera como anon,
-- ya estaría fallando antes de este cambio.


-- ═══════════════════════════════════════════════════════════
-- PARTE 2 · user_gooals — se cierra entera
--
-- Aquí el navegador no entra NI A LEER. Se repasaron uno a uno los ficheros con
-- 'use client' y ninguno nombra la tabla; y los dos sitios del servidor que usan
-- el cliente de sesión (`fotos-privadas.ts` y `admin-auth.ts`) lo usan solo para
-- `auth.getUser()`, y la tabla la tocan con el service role.
--
-- Así que se le quita todo a las dos claves públicas y la tabla se queda como
-- las otras diez: a esto solo entra el servidor.
-- ═══════════════════════════════════════════════════════════

revoke all on table user_gooals from anon;
revoke all on table user_gooals from authenticated;

-- Y la política se va con ellos. Sin permisos no se puede ejercer, pero dejarla
-- escrita diría que el navegador gestiona sus gooals, y eso dejaría de ser
-- verdad hoy. Una regla que describe un mundo que ya no existe es justo lo que
-- este repo ha aprendido a no dejar por ahí.
drop policy if exists "users manage own gooals" on user_gooals;


-- ═══════════════════════════════════════════════════════════
-- LA COMPROBACIÓN — tiene que salir todo "no"
-- ═══════════════════════════════════════════════════════════
select
  x.tabla || '.' || x.col as columna,
  case when has_column_privilege('authenticated', 'public.' || x.tabla, x.col, 'UPDATE')
       then 'authenticated SÍ  ← MAL' else 'authenticated no' end as authenticated,
  case when has_column_privilege('anon', 'public.' || x.tabla, x.col, 'UPDATE')
       then 'anon SÍ  ← MAL' else 'anon no' end as anon
from (values
  ('profiles', 'es_admin'),
  ('profiles', 'puntos_totales'),
  ('profiles', 'nivel'),
  ('profiles', 'email'),
  ('profiles', 'nombre'),
  ('user_gooals', 'puntos_ganados'),
  ('user_gooals', 'estado')
) as x(tabla, col)
order by 1;
-- `profiles.nombre` sale "authenticated SÍ" a propósito: es la única de la lista
-- que el navegador tiene que poder escribir. Si sale "no", algo se ha pasado de
-- frenada y editar perfil deja de funcionar.
