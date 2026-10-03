-- ═══════════════════════════════════════════════════════════
-- ¿Cuántos gooals publicados tienen imagen propia?
--
-- Se pega en el SQL Editor de Supabase. Solo lee: no cambia nada.
--
-- Hace falta para decidir si la pantalla de Descubrir (deslizar tarjetas) se
-- puede construir. Una tarjeta para deslizar vive de la foto; si casi ninguno
-- tiene, serían seis degradados repetidos y hay que replantearla.
-- ═══════════════════════════════════════════════════════════

-- 1 · El número, que es lo que se pregunta.
--     Una cadena vacía no es una imagen, por eso se mira también el <> ''.
select
  count(*)                                                              as publicados,
  count(*) filter (where imagen_url is not null and imagen_url <> '')   as con_imagen_propia,
  count(*) filter (where imagen_url is null or imagen_url = '')         as con_el_degradado
from gooals_v2
where estado = 'verificado';
--   Medido el 3-10-2026:  445 publicados · 0 con imagen · 445 con degradado.


-- 2 · Lo mismo en TODA la tabla, retirados incluidos, por si la respuesta
--     anterior pareciera un problema de qué está publicado y qué no.
select
  count(*)                                                              as todas_las_filas,
  count(*) filter (where imagen_url is not null and imagen_url <> '')   as con_imagen_propia
from gooals_v2;
--   Medido el 3-10-2026:  5.142 filas · 0 con imagen.
--   O sea: la columna imagen_url no se ha usado nunca.


-- 3 · Si algún día hay imágenes, de dónde salen.
--     La columna guarda una URL suelta en texto que la app pinta tal cual. Hoy
--     la única forma de poner una es pegar a mano una dirección en el panel:
--     no hay subida de archivo y no se guarda nada en nuestro almacén, así que
--     si esa dirección se cae, el hueco se queda roto.
select
  split_part(split_part(imagen_url, '//', 2), '/', 1) as de_donde,
  count(*)                                            as cuantas
from gooals_v2
where imagen_url is not null and imagen_url <> ''
group by 1
order by cuantas desc;
--   Medido el 3-10-2026: ninguna fila. Cuando las haya, aquí se verá si vienen
--   de nuestro almacén (<ref>.supabase.co) o de una web ajena.
