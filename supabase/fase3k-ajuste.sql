-- ═══════════════════════════════════════════════════════════
-- GooALS — Ajuste de fase3k, tras la muestra de 200
--
-- Dos cosas, en este orden:
--   1. Dejar que la IA diga "está mal y no sé arreglarlo sin cambiar el gooal".
--   2. Vaciar las 36 propuestas de la primera muestra para repetirla.
--
-- Por qué la 1: la tabla obligaba a que toda fila marcada como incorrecta
-- trajera un título de recambio. Esa obligación es la que empujaba a la IA a
-- inventarse otro gooal (más difícil, en otro sitio, con otra cifra) cuando el
-- título original no tenía arreglo posible. Quitándola puede señalar el problema
-- y callarse la solución, que es lo que hace una persona sensata.
--
-- Se pega entero en el SQL Editor. Se puede lanzar dos veces sin romper nada.
-- ═══════════════════════════════════════════════════════════

-- ── 1. La restricción ──────────────────────────────────────
alter table gooals_revision drop constraint if exists gooals_revision_fallo_con_propuesta;

-- En su lugar, lo único que se sigue exigiendo: si está mal, di qué regla rompe.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'gooals_revision_fallo_con_regla') then
    alter table gooals_revision add constraint gooals_revision_fallo_con_regla
      check (cumple or regla is not null);
  end if;
end $$;


-- ── 2. Vaciar la primera muestra ───────────────────────────
-- Las 36 propuestas de la tanda anterior se van: se vuelven a pedir con el
-- criterio nuevo. No se pierde ningún trabajo tuyo, porque todavía no has
-- aceptado ni descartado ninguna.
--
-- OJO: si ya hubieras decidido alguna en el panel, esta línea se la llevaría por
-- delante. La consulta de debajo lo comprueba antes.
select count(*) as ya_decididas from gooals_revision where estado in ('aceptado', 'editado', 'descartado');
--   0 → adelante con el delete de abajo
--   más de 0 → páramelo y lo hablamos: habría trabajo tuyo que salvar

delete from gooals_revision;


-- ── Comprobación ───────────────────────────────────────────
-- El editor solo enseña el resultado de la última consulta: lanza cada una por separado.
select count(*) as filas_de_repaso from gooals_revision;
--   0

-- Que la restricción vieja ya no está y la nueva sí. El filtro por contype deja
-- fuera los "not null", que en las versiones nuevas de Postgres también salen
-- aquí y solo harían ruido.
select conname from pg_constraint
where conrelid = 'gooals_revision'::regclass and contype in ('c', 'f', 'p')
order by conname;
--   gooals_revision_estado_valido
--   gooals_revision_fallo_con_regla
--   gooals_revision_gooal_id_fkey
--   gooals_revision_pkey
--   gooals_revision_regla_valida
