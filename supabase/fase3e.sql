-- ═══════════════════════════════════════════════════════════
-- GooALS — Fase 3e: el mapa y la escala de puntos
--
-- Dos cosas que hasta ahora faltaban:
--
--   1. Las coordenadas. Se llevan geocodificando desde hace días, pero vivían
--      solo en gooals.json, en el portátil. La base de datos no sabía dónde
--      está nada, así que el mapa no podía existir.
--
--   2. Una guarda para los puntos. Ahora que 'facil' puede valer 1, 2 o 3,
--      nada impedía que algo escribiera un 47 en un gooal fácil.
--
-- Se pega entero en el SQL Editor de Supabase. Se puede lanzar dos veces sin
-- romper nada.
-- ═══════════════════════════════════════════════════════════


-- ── 1. Coordenadas ─────────────────────────────────────────
-- lat/lng en grados decimales, como las da OpenStreetMap.
-- Nulas a propósito en todo lo deslocalizado: deporte entero, las fusiones de
-- aventura y los eventos abiertos (una final de Champions cambia de ciudad
-- cada año). Esos no van al mapa porque no están en ningún sitio.
alter table gooals_v2 add column if not exists lat double precision;
alter table gooals_v2 add column if not exists lng double precision;

-- Cómo de fiable es el pin, para poder repasarlos en /admin:
--   'fiable'      OpenStreetMap encontró el sitio exacto y lo conoce bien
--   'revisar'     lo encontró, pero con poca confianza — conviene mirarlo
--   'solo-ciudad' no encontró el sitio y cayó en el centro de la ciudad
alter table gooals_v2 add column if not exists geo text;

-- Para "qué gooals hay por esta zona": la consulta filtra por un cuadrado de
-- lat/lng. Con 3.000 filas se notaría poco, pero el índice es gratis y esto
-- va a crecer.
create index if not exists gooals_v2_mapa_idx
  on gooals_v2 (lat, lng)
  where lat is not null;


-- ── 2. Los puntos, dentro de su banda ──────────────────────
-- La dificultad es la etiqueta; los puntos son un número dentro de ella:
--   facil 1-3 · dificil 4-7 · epico 8-10
--
-- Antes de crear la guarda, esta consulta enseña quién se saldría. Si devuelve
-- filas, PARA y mándamelas: significa que hay algo con puntos raros y hay que
-- mirarlo antes de bloquearlo.
select id, titulo, categoria, dificultad, puntos
from gooals_v2
where not (
  (dificultad = 'facil'   and puntos between 1 and 3)  or
  (dificultad = 'dificil' and puntos between 4 and 7)  or
  (dificultad = 'epico'   and puntos between 8 and 10)
);

-- Si la de arriba no devuelve nada, esta pasa sin problema.
alter table gooals_v2 drop constraint if exists gooals_v2_puntos_en_banda;
alter table gooals_v2 add constraint gooals_v2_puntos_en_banda check (
  (dificultad = 'facil'   and puntos between 1 and 3)  or
  (dificultad = 'dificil' and puntos between 4 and 7)  or
  (dificultad = 'epico'   and puntos between 8 and 10)
);


-- ── 3. Comprobación ────────────────────────────────────────
-- Ahora mismo debería salir 0 en las tres columnas de coordenadas: todavía no
-- se han subido. Después de lanzar insertar.mjs, la primera pasará de 2.900.
select
  count(*)                                as gooals,
  count(*) filter (where lat is not null) as con_coordenadas,
  count(*) filter (where geo = 'revisar') as por_revisar,
  count(distinct categoria)               as categorias
from gooals_v2;
