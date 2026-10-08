-- ═══════════════════════════════════════════════════════════
-- ¿Puede alguien escribirse sus propios puntos?
--
-- SOLO LEE. Se pega entera en el SQL Editor de Supabase y se ejecuta de una
-- vez: devuelve UNA tabla con todo, por apartados.
--
-- Mira dos tablas, no una. `user_gooals` es donde vive `puntos_ganados`, pero
-- el total también está guardado en `profiles.puntos_totales`, y el navegador
-- escribe en `profiles` de verdad (el onboarding y "editar perfil" lo hacen con
-- la clave pública). Si solo se mirara user_gooals, la respuesta estaría a
-- medias — y una comprobación a medias es peor que ninguna.
--
-- Qué hay que leer en el resultado:
--
--  · RLS ENCENDIDA — si dice NO, lo demás da igual: la tabla está abierta.
--  · POLÍTICA — el USING dice QUÉ FILAS ve o toca; el WITH CHECK, QUÉ PUEDE
--    DEJAR ESCRITO. Ojo al matiz: en una política FOR ALL o FOR UPDATE, si no
--    hay WITH CHECK, Postgres reutiliza el USING. En FOR INSERT no: sin WITH
--    CHECK no se puede insertar nada.
--  · PERMISO DE COLUMNA — una política decide filas, NUNCA columnas. Que
--    `authenticated` pueda tocar la columna es un GRANT, y es lo que decide si
--    alguien puede escribir en `puntos_ganados` o en `es_admin`.
--  · ÍNDICE ÚNICO — es lo que impide cobrar dos veces el mismo gooal.
-- ═══════════════════════════════════════════════════════════
with tablas as (
  select unnest(array['user_gooals', 'profiles']) as t
),
todo as (

  -- ── 1. ¿Está encendida la RLS? ──────────────────────────
  select 1 as orden, 0 as orden2, c.relname::text as tabla,
         'RLS ENCENDIDA'::text as apartado,
         (case when c.relrowsecurity then 'SÍ' else 'NO — la tabla está abierta de par en par' end)::text as detalle
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relname in (select t from tablas)

  -- ── 2. Cuántas políticas tiene cada tabla ───────────────
  -- Va aparte porque una tabla SIN políticas no aparecería en el apartado 3, y
  -- "no sale nada" se confunde con "no se ha mirado".
  union all
  select 2, 0, t.t,
         'POLÍTICAS EN TOTAL',
         count(p.policyname)::text
  from tablas t
  left join pg_policies p on p.schemaname = 'public' and p.tablename = t.t
  group by t.t

  -- ── 3. Cada política, en tres líneas ────────────────────
  union all
  select 3, 1, p.tablename::text,
         'POLÍTICA · ' || p.policyname,
         'para ' || array_to_string(p.roles::text[], ', ')
           || ' · ' || p.cmd
           || ' · ' || (case when p.permissive = 'PERMISSIVE' then 'PERMISIVA (se suma con O a las demás)' else 'restrictiva (se suma con Y)' end)
  from pg_policies p
  where p.schemaname = 'public' and p.tablename in (select t from tablas)

  union all
  select 3, 2, p.tablename::text,
         'POLÍTICA · ' || p.policyname,
         'USING → ' || coalesce(p.qual, '(ninguno)')
  from pg_policies p
  where p.schemaname = 'public' and p.tablename in (select t from tablas)

  union all
  select 3, 3, p.tablename::text,
         'POLÍTICA · ' || p.policyname,
         'WITH CHECK → ' || coalesce(
           p.with_check,
           case when p.cmd in ('ALL', 'UPDATE')
                then '(ninguno — en ' || p.cmd || ', Postgres reutiliza el USING de arriba)'
                else '(ninguno)' end)
  from pg_policies p
  where p.schemaname = 'public' and p.tablename in (select t from tablas)

  -- ── 4. Índices y restricciones ──────────────────────────
  union all
  select 4, 1, i.tablename::text,
         'ÍNDICE · ' || i.indexname,
         i.indexdef
  from pg_indexes i
  where i.schemaname = 'public' and i.tablename in (select t from tablas)

  union all
  select 4, 2, rel.relname::text,
         'RESTRICCIÓN · ' || con.conname,
         pg_get_constraintdef(con.oid)
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace n on n.oid = rel.relnamespace
  where n.nspname = 'public' and rel.relname in (select t from tablas)

  -- ── 5. Columnas, con su valor por defecto ───────────────
  union all
  select 5, c.ordinal_position::int, c.table_name::text,
         'COLUMNA · ' || c.column_name,
         c.data_type
           || (case when c.is_nullable = 'YES' then ' · admite nulos' else ' · NOT NULL' end)
           || ' · por defecto: ' || coalesce(c.column_default, '(ninguno)')
  from information_schema.columns c
  where c.table_schema = 'public' and c.table_name in (select t from tablas)

  -- ── 6. Disparadores ─────────────────────────────────────
  union all
  select 6, 0, cl.relname::text,
         'DISPARADOR · ' || tg.tgname,
         pg_get_triggerdef(tg.oid)
  from pg_trigger tg
  join pg_class cl on cl.oid = tg.tgrelid
  join pg_namespace n on n.oid = cl.relnamespace
  where n.nspname = 'public' and cl.relname in (select t from tablas) and not tg.tgisinternal

  -- ── 7. Permisos de tabla de las dos claves públicas ─────
  union all
  select 7, 0, g.table_name::text,
         'PERMISOS DE TABLA · ' || g.grantee,
         string_agg(distinct g.privilege_type, ', ' order by g.privilege_type)
  from information_schema.role_table_grants g
  where g.table_schema = 'public' and g.table_name in (select t from tablas)
    and g.grantee in ('anon', 'authenticated')
  group by g.table_name, g.grantee

  -- ── 8. Y lo que de verdad importa: ¿puede tocar ESAS columnas? ──
  -- Una política decide filas; una columna se protege con un GRANT. Si aquí
  -- sale "SÍ", quien tenga sesión puede escribir ese número en su propia fila.
  union all
  select 8, 0, x.tabla,
         'PUEDE ESCRIBIR LA COLUMNA · ' || x.col,
         (case when has_column_privilege('authenticated', 'public.' || x.tabla, x.col, 'UPDATE') then 'authenticated SÍ' else 'authenticated no' end)
         || ' · ' ||
         (case when has_column_privilege('anon', 'public.' || x.tabla, x.col, 'UPDATE') then 'anon SÍ' else 'anon no' end)
  from (values
    ('user_gooals', 'puntos_ganados'),
    ('user_gooals', 'estado'),
    ('user_gooals', 'user_id'),
    ('user_gooals', 'gooal_id'),
    ('user_gooals', 'completado_at'),
    ('profiles', 'puntos_totales'),
    ('profiles', 'nivel'),
    ('profiles', 'es_admin')
  ) as x(tabla, col)
)
select apartado, tabla, detalle
from todo
order by orden, tabla, orden2, apartado;
