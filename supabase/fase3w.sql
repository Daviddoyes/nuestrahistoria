-- ═══════════════════════════════════════════════════════════
-- GooALS — Fase 3w: el muro y los logros dejan de leerse desde fuera
--
-- Caen dos políticas de lectura. Las dos abrían su tabla a cualquiera que
-- tenga la clave pública del navegador, que es pública por definición:
--
--   muro_posts   "public read posts"       select using (true)
--   user_gooals  "public read completed"   select using (estado = 'completado')
--
-- ── POR QUÉ AHORA ─────────────────────────────────────────
--
-- Hasta esta semana las fotos de la gente vivían en un cubo público y el muro
-- era público a propósito: no había nada que proteger que no estuviera ya
-- abierto. Eso cambió. Hoy cada foto tiene dueño y su dueño elige quién la ve
-- —solo yo, mis amigos, todo el mundo—, y el servidor ya respeta esa elección
-- en el muro y en el perfil.
--
-- Con estas dos políticas puestas, esa elección no vale nada:
--
--   · "public read posts" deja listar TODOS los posts, incluidos los que el
--     muro ya no enseña.
--   · "public read completed" deja listar quién ha conseguido qué Y la ruta de
--     su foto dentro del cubo. El fichero no sale (el cubo es privado y hace
--     falta una dirección firmada), pero "esta persona hizo esto" sí sale, y
--     eso es exactamente lo que "Solo yo" promete que no pasa.
--
-- ── POR QUÉ NO ROMPE NADA ─────────────────────────────────
--
-- Ninguna pantalla lee estas tablas desde el navegador: se miró fichero por
-- fichero de los que llevan 'use client'. Lo único que el navegador toca
-- directamente es su propia fila de `profiles` y el cubo `avatars`. El muro, el
-- perfil, el mapa y Explorar pasan todos por el servidor con el service role,
-- que se salta la RLS.
--
-- `user_gooals` conserva "users manage own gooals" (ALL, auth.uid() = user_id):
-- cada uno sigue pudiendo leer y escribir SUS filas. Lo que desaparece es poder
-- leer las de los demás.
--
-- SEGURIDAD: se puede pegar dos veces sin hacer daño.
-- ═══════════════════════════════════════════════════════════

drop policy if exists "public read posts" on muro_posts;
drop policy if exists "public read completed" on user_gooals;


-- ═══════════════════════════════════════════════════════════
-- COMPROBACIÓN. Cada consulta por separado.
-- ═══════════════════════════════════════════════════════════

-- 1 · Qué políticas quedan en las dos tablas.
select tablename, policyname, cmd, roles::text, coalesce(qual, with_check) as condicion
from pg_policies
where schemaname = 'public' and tablename in ('muro_posts', 'user_gooals')
order by tablename, policyname;
--   SOLO una fila: user_gooals · "users manage own gooals" · ALL · auth.uid() = user_id
--   muro_posts no debe aparecer: se queda sin ninguna política, y eso la cierra
--   del todo salvo para el servidor. Es lo correcto, no un olvido.

-- 2 · Que las dos siguen con la RLS encendida. Sin RLS, no tener políticas
--     significaría justo lo contrario: abierta de par en par.
select relname as tabla, relrowsecurity as rls
from pg_class
where relnamespace = 'public'::regnamespace and relname in ('muro_posts', 'user_gooals');
--   las dos con rls = true

-- 3 · Que no queda NINGUNA lectura abierta a todo internet en ninguna tabla.
select tablename, policyname from pg_policies
where schemaname = 'public' and cmd in ('SELECT', 'ALL') and qual = 'true'
order by tablename;
--   Ninguna fila. Hasta hoy salía "muro_posts · public read posts".
--   Si sale cualquier otra, es una tabla abierta a todo internet.


-- ═══════════════════════════════════════════════════════════
-- Y DESPUÉS, DESDE FUERA, que es la única forma de creérselo:
--
--   node --env-file=.env.local scripts/comprobar-rls.mjs
--
-- Tiene que dar 15 de 15. Antes de pegar esto da 13 de 15, y las dos que
-- fallan son precisamente éstas: la comprobación ya exige que el muro y los
-- logros NO se lean desde fuera.
-- ═══════════════════════════════════════════════════════════
