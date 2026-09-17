-- ═══════════════════════════════════════════════════════════
-- Candidatos a "gooals comunes" para la pantalla de inicio.
-- SOLO LEE: no cambia nada. Se puede lanzar las veces que haga falta.
-- ═══════════════════════════════════════════════════════════
with candidatos as (
  select
    g.id, g.titulo, g.categoria, g.puntos, g.ambito, g.geo,
    nullif(concat_ws(', ', g.ciudad, g.pais), '') as lugar,
    -- Una mayúscula a mitad del título casi siempre es un nombre propio
    -- ("Probar pintxos en San Sebastián"): eso es un sitio concreto, no algo
    -- que cualquiera haya hecho en cualquier parte.
    (g.titulo ~ '[[:space:]][A-ZÁÉÍÓÚÑ]') as nombre_propio
  from gooals_v2 g
  where g.estado = 'verificado'
    and g.activo
    and not g.categoria_dudosa
    and g.puntos in (1, 2)
    and (
      -- Lo que no depende de ir a ningún sitio.
      g.ambito = 'personal'
      -- De lugar, pero escrito en genérico ("Ver orcas en libertad").
      or g.titulo !~ '[[:space:]][A-ZÁÉÍÓÚÑ]'
      -- De lugar y sitio CONOCIDO: el geocodificador marcó 'fiable' lo que es
      -- famoso, y de lo famoso la gente suele tener foto.
      or g.geo = 'fiable'
    )
),
ordenados as (
  select
    c.*,
    row_number() over (
      partition by c.categoria
      order by
        (c.ambito = 'personal') desc,  -- 1. no hace falta viajar
        (not c.nombre_propio) desc,    -- 2. genérico antes que sitio concreto
        (c.geo = 'fiable') desc,       -- 3. si es un sitio, que sea conocido
        c.puntos,                      -- 4. lo más fácil primero
        -- 5. entre lo personal, título corto = sin condiciones ("Hacer surf"
        --    antes que "Hacer surf en una ola de más de dos metros"). En los
        --    sitios no se aplica: ahí un título corto solo significa que el
        --    pueblo tiene el nombre corto, no que sea más conocido.
        case when c.ambito = 'personal' then length(c.titulo) else 0 end,
        c.titulo                       -- 6. alfabético, para que no baile entre consultas
    ) as puesto
  from candidatos c
)
select puesto, categoria, titulo, puntos, ambito, lugar, id
from ordenados
where puesto <= 33
order by categoria, puesto;
