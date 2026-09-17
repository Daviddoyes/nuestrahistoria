-- ═══════════════════════════════════════════════════════════
-- Títulos que huelen a fila mal generada.
--
-- SOLO LEE. Se pega en el SQL Editor de Supabase y se corrigen los que salgan
-- desde el panel (/admin/gooals, buscando por el título).
--
-- No filtra a ciegas: cada fila viene con el MOTIVO por el que sospecha, y las
-- más graves salen primero. Muchos títulos cortos son correctos ("Probar udon"),
-- así que la lista es para mirarla con ojo, no para borrar en bloque.
-- ═══════════════════════════════════════════════════════════
with limpio as (
  select
    g.id, g.titulo, g.categoria, g.puntos, g.estado, g.activo,
    btrim(g.titulo) as t,
    -- Sin tildes ni mayúsculas, para comparar títulos entre sí sin depender de
    -- la extensión unaccent, que en esta base no está instalada.
    translate(lower(regexp_replace(btrim(g.titulo), '[[:space:]]+', ' ', 'g')),
              'áéíóúüñàèìòùâêîôûç', 'aeiouunaeiouaeiouc') as clave
  from gooals_v2 g
),
marcado as (
  select
    l.*,
    array_remove(array[
      case when l.t !~ '[[:space:]]' then 'una sola palabra' end,
      case when length(l.t) < 12 then 'muy corto (' || length(l.t) || ' caracteres)' end,
      case when l.t ~* '[[:space:]](de|del|en|y|o|con|para|por|al|el|la|los|las|un|una|sin|sobre|entre|tu|su|mi)$' then 'acaba en palabra suelta: parece cortado' end,
      case when l.t ~ '[,;:(\[«"''–—-]$' then 'acaba en un signo raro' end,
      case when (length(l.t) - length(replace(l.t, '(', ''))) <> (length(l.t) - length(replace(l.t, ')', '')))
             or (length(l.t) - length(replace(l.t, '[', ''))) <> (length(l.t) - length(replace(l.t, ']', '')))
             or (length(l.t) - length(replace(l.t, '«', ''))) <> (length(l.t) - length(replace(l.t, '»', '')))
        then 'paréntesis o comillas sin cerrar' end,
      case when g.titulo <> l.t or l.t ~ '[[:space:]]{2,}' then 'espacios de más' end,
      case when l.t ~ '\[|\]|\yD[1-5]\y|^[0-9]{3,4}[[:space:]]' then 'resto del PDF (corchetes, D1-D5, número de ficha)' end,
      case when l.t <> regexp_replace(l.t, '[[:cntrl:]]', '', 'g')
             or position(chr(160) in l.t) > 0      -- espacio duro
             or position(chr(65533) in l.t) > 0    -- el rombo de interrogación de una codificación rota
        then 'caracteres raros o invisibles' end,
      case when length(l.t) > 3 and l.t = upper(l.t) then 'todo en mayúsculas' end,
      case when l.t ~ '^[a-záéíóúñ]' then 'empieza en minúscula' end,
      case when length(l.t) > 90 then 'larguísimo (' || length(l.t) || ' caracteres)' end,
      case when count(*) over (partition by l.clave) > 1 then 'título repetido en otra fila' end,
      -- El caso "Acumular": el título es solo el verbo con el que empiezan
      -- decenas de gooals, así que se quedó a medias.
      case when l.t !~ '[[:space:]]'
             and count(*) over (partition by split_part(l.clave, ' ', 1)) > 2
        then 'es solo el verbo de una familia de títulos' end
    ], null) as motivos
  from limpio l
  join gooals_v2 g on g.id = l.id
)
select
  categoria,
  titulo,
  puntos,
  estado,
  activo,
  array_to_string(motivos, ' · ') as motivos,
  id
from marcado
where array_length(motivos, 1) > 0
order by
  -- Primero lo más probable que esté roto de verdad.
  ('es solo el verbo de una familia de títulos' = any(motivos)) desc,
  ('título repetido en otra fila' = any(motivos)) desc,
  ('una sola palabra' = any(motivos)) desc,
  ('acaba en palabra suelta: parece cortado' = any(motivos)) desc,
  array_length(motivos, 1) desc,
  categoria,
  titulo;
