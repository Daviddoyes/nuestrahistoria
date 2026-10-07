-- ═══════════════════════════════════════════════════════════
-- GooALS — Fase 3x: lo que has pasado en Descubrir
--
-- Descubrir enseña gooals de uno en uno y hay tres salidas: paso, a mi lista,
-- ya lo hice. Las dos últimas dejan rastro en `user_gooals`; la primera no
-- dejaba ninguno, y sin eso la pantalla te enseñaría lo mismo una y otra vez.
--
-- ── POR QUÉ UNA TABLA Y NO EL NAVEGADOR ───────────────────
--
-- Se podría guardar en el propio móvil (localStorage) y no tocar la base. Se
-- descarta por una razón concreta: esto es una PWA que se instala en el móvil, y
-- "borrar los datos del sitio" es de las primeras cosas que hace cualquiera
-- cuando algo le va raro. Perderías los 221 que ya has pasado y volverías a
-- verlos todos. Con una tabla, sobrevive al móvil nuevo y a la reinstalación.
--
-- ── SIN POLÍTICAS, COMO TODO LO DEMÁS ─────────────────────
--
-- RLS encendida y NINGUNA política: la tabla queda cerrada salvo para el
-- servidor, que es quien escribe. No es un olvido; no le añadas una "para que
-- funcione", porque funciona. Si algún día algo "no puede leerla" desde el
-- navegador, la respuesta es una Server Action y no una política.
--
-- SEGURIDAD: se puede pegar dos veces sin hacer daño.
-- ═══════════════════════════════════════════════════════════

create table if not exists gooals_pasados (
  id uuid default gen_random_uuid() primary key,
  -- on delete cascade en los dos: si se borra la cuenta, sus pasados se van con
  -- ella; si se borra un gooal del catálogo, deja de tener sentido haberlo
  -- pasado. No hay nada aquí que merezca sobrevivir a su dueño.
  user_id uuid not null references auth.users(id) on delete cascade,
  gooal_id uuid not null references gooals_v2(id) on delete cascade,
  created_at timestamptz not null default now(),
  -- Pasar dos veces el mismo gooal es pasarlo una vez. Esto además es el índice
  -- con el que se consulta ("¿qué ha pasado esta persona?"), así que no hace
  -- falta ningún otro.
  unique (user_id, gooal_id)
);

alter table gooals_pasados enable row level security;

-- Por si alguna vez se creó a mano con alguna política suelta: aquí no va
-- ninguna, y esto lo deja como debe estar.
do $$
declare p record;
begin
  for p in select policyname from pg_policies
           where schemaname = 'public' and tablename = 'gooals_pasados'
  loop
    execute format('drop policy if exists %I on gooals_pasados', p.policyname);
    raise notice 'Quitada la politica "%" de gooals_pasados', p.policyname;
  end loop;
end $$;


-- ═══════════════════════════════════════════════════════════
-- COMPROBACIÓN. Cada consulta por separado.
-- ═══════════════════════════════════════════════════════════

-- 1 · La tabla, con sus columnas.
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'gooals_pasados'
order by ordinal_position;
--   id · user_id · gooal_id · created_at

-- 2 · Que la RLS está encendida y que NO tiene ninguna política.
select relname as tabla, relrowsecurity as rls
from pg_class where relnamespace = 'public'::regnamespace and relname = 'gooals_pasados';
--   rls = true

select policyname from pg_policies
where schemaname = 'public' and tablename = 'gooals_pasados';
--   Ninguna fila. Es lo correcto: solo la toca el servidor.

-- 3 · Y que sigue sin haber ninguna lectura abierta a todo internet.
select tablename, policyname from pg_policies
where schemaname = 'public' and cmd in ('SELECT', 'ALL') and qual = 'true'
order by tablename;
--   Ninguna fila.


-- ═══════════════════════════════════════════════════════════
-- Y DESPUÉS, DESDE FUERA:
--
--   node --env-file=.env.local scripts/comprobar-rls.mjs
--
-- Tiene que seguir dando 15 de 15. Esta tabla no cambia nada de lo que ya se
-- comprobaba; si bajara, es que se le ha colado una política.
-- ═══════════════════════════════════════════════════════════
