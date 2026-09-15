-- ═══════════════════════════════════════════════════════════
-- GooALS — Fase 3h: la consulta para el geocodificador
--
--   geo_consulta  texto con el que buscar el sitio en el mapa, cuando el
--                 título no basta ("Atomium, Bruselas, Bélgica"). Lo trae la
--                 importación CSV del panel (columna consulta_mapa) y lo usará
--                 el geocodificador después. No se enseña en la app.
--
-- Hasta ahora esa consulta solo vivía en scripts/seed-gooals/gooals.json.
--
-- Se pega entero en el SQL Editor. Se puede lanzar dos veces sin romper nada.
--
-- ORDEN: ANTES de publicar la importación CSV. Al revés, importar fallaría
-- porque la columna todavía no existiría.
-- ═══════════════════════════════════════════════════════════

alter table gooals_v2 add column if not exists geo_consulta text;


-- ── Comprobación ───────────────────────────────────────────
select count(*) as filas, count(geo_consulta) as con_consulta from gooals_v2;
--   filas 4726 · con_consulta 0
