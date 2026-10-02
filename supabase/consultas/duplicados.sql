-- ═══════════════════════════════════════════════════════════
-- Títulos duplicados del catálogo: el mismo gooal escrito dos veces.
--
-- SOLO LEE. Se pega en el SQL Editor de Supabase.
--
-- Los pares se distinguen por una tilde, un artículo, un signo suelto o una
-- coletilla. Cada par da puntos DOS VECES por el mismo recuerdo, que es justo
-- lo que el catálogo no debe hacer.
--
-- La última columna dice CON CUÁL QUEDARSE y por qué. El criterio, en orden:
--   1. Si alguien lo tiene en su lista o conquistado, ese gana. Lo de la gente
--      no se toca: borrar su fila le quitaría el recuerdo del perfil.
--   2. Si no, gana el mejor escrito: con tildes, con artículo, sin signos raros
--      y sin coletillas.
--   3. Si siguen empatados, el más antiguo.
--
-- No borra nada. El borrado se hace después, a mano y mirando la lista.
-- ═══════════════════════════════════════════════════════════
with normalizado as (
  select
    g.id,
    g.titulo,
    g.categoria,
    g.estado,
    g.activo,
    g.created_at,
    -- La clave que hace iguales a dos títulos: sin tildes, sin mayúsculas, sin
    -- signos, sin espacios de más y sin los artículos sueltos. Se usa translate
    -- y no unaccent porque esa extensión no está instalada en esta base.
    btrim(regexp_replace(
      regexp_replace(
        translate(lower(g.titulo), 'áéíóúüñàèìòùâêîôûçÁÉÍÓÚÜÑ', 'aeiouunaeiouaeioucAEIOUUN'),
        '[^a-z0-9 ]', ' ', 'g'),
      '\y(el|la|los|las|un|una|unos|unas|de|del|al)\y', ' ', 'g')) as clave_larga,
    -- Cuánta gente lo tiene: quien tenga filas en user_gooals manda.
    (select count(*) from user_gooals u where u.gooal_id = g.id) as lo_tienen,
    -- Señales de "está mejor escrito", de más a menos importante.
    (g.titulo ~ '[áéíóúüñÁÉÍÓÚÑ]')::int                as con_tildes,
    (g.titulo ~* '\y(el|la|los|las|un|una)\y')::int    as con_articulo,
    (g.titulo !~ '[*?¿¡#_|~^<>{}\[\]\\]')::int         as sin_signos_raros,
    length(g.titulo)                                   as largo
  from gooals_v2 g
),
-- La clave de arriba colapsa los espacios que dejan los artículos al quitarlos.
limpio as (
  select n.*, regexp_replace(n.clave_larga, '[[:space:]]+', ' ', 'g') as clave
  from normalizado n
),
grupos as (
  select clave
  from limpio
  group by clave
  having count(*) > 1
)
select
  l.clave                                as se_repite,
  l.titulo,
  l.categoria,
  l.estado,
  l.activo,
  l.lo_tienen,
  case
    when l.lo_tienen > 0
      and l.lo_tienen = max(l.lo_tienen) over (partition by l.clave)
      then 'QUEDARSE — alguien lo tiene en su lista'
    when row_number() over (
           partition by l.clave
           order by l.lo_tienen desc, l.sin_signos_raros desc, l.con_tildes desc,
                    l.con_articulo desc, l.largo desc, l.created_at
         ) = 1
      then 'QUEDARSE — mejor escrito'
    else 'borrar'
  end                                    as que_hacer,
  l.id
from limpio l
join grupos gr on gr.clave = l.clave
order by l.clave, l.lo_tienen desc, l.sin_signos_raros desc, l.con_tildes desc,
         l.con_articulo desc, l.largo desc, l.created_at;


-- ── Cuántos pares hay ──────────────────────────────────────
-- Lánzala por separado: el editor solo enseña el resultado de la última.
--
--   with ... (el mismo with de arriba)
--   select count(distinct clave) as grupos_repetidos, count(*) as filas_implicadas
--   from limpio l join grupos gr on gr.clave = l.clave;


-- ── Antes de borrar ────────────────────────────────────────
-- Comprobar SIEMPRE que la fila que se va no la tiene nadie. Con esto no hace
-- falta fiarse de la columna lo_tienen:
--
--   select count(*) from user_gooals where gooal_id = '<el id que vas a borrar>';
--   --   tiene que dar 0
--
-- user_gooals tiene "on delete cascade": borrar un gooal que alguien tenga le
-- quita el recuerdo de su perfil sin avisar.
