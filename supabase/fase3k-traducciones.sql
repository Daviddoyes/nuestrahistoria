-- ═══════════════════════════════════════════════════════════
-- GooALS — fase3k, segunda parte: separar traducciones de criterio
--
-- PEGAR DESPUÉS de fase3k-ajuste.sql.
--
-- El repaso hace dos trabajos que no se parecen en nada:
--
--   traduccion   el gooal está bien y el título está mal ESCRITO: medio en
--                inglés, sin tildes o sin verbo. Arreglarlo es mecánico y no
--                cambia lo que hace la persona. Se leen y se confirman en bloque.
--   criterio     el título rompe una de las cinco reglas. Eso se decide de una
--                en una, mirando cada caso.
--
-- Mezclados, las 1.100 traducciones del catálogo entierran las decisiones de
-- verdad. Por eso el panel los separa en dos filtros, y esto es lo que se lo
-- permite.
--
-- Se pega entero en el SQL Editor. Se puede lanzar dos veces sin romper nada.
-- ═══════════════════════════════════════════════════════════

-- Por defecto 'criterio': lo que ya hubiera guardado es de criterio, y en la
-- duda es mejor que algo acabe en la lista que se mira de una en una.
alter table gooals_revision add column if not exists tipo text not null default 'criterio';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'gooals_revision_tipo_valido') then
    alter table gooals_revision add constraint gooals_revision_tipo_valido
      check (tipo in ('criterio', 'traduccion'));
  end if;
end $$;

-- Una traducción SIN propuesta no existe: si no hay recambio escrito, no es una
-- traducción, es un título que hay que decidir a mano.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'gooals_revision_traduccion_con_propuesta') then
    alter table gooals_revision add constraint gooals_revision_traduccion_con_propuesta
      check (tipo <> 'traduccion' or (titulo_propuesto is not null and btrim(titulo_propuesto) <> ''));
  end if;
end $$;

-- El índice de lo pendiente ahora separa por tipo: son dos pantallas distintas.
drop index if exists gooals_revision_pendientes_idx;
create index if not exists gooals_revision_pendientes_idx
  on gooals_revision (tipo, gooal_id) where estado = 'pendiente';


-- ── Comprobación ───────────────────────────────────────────
-- El editor solo enseña el resultado de la última consulta: lanza cada una por separado.
select tipo, estado, count(*) from gooals_revision group by tipo, estado order by tipo, estado;
--   ninguna fila si la tabla está vacía, que es como debe estar ahora

select conname from pg_constraint
where conrelid = 'gooals_revision'::regclass and contype in ('c', 'f', 'p')
order by conname;
--   gooals_revision_estado_valido
--   gooals_revision_fallo_con_regla
--   gooals_revision_gooal_id_fkey
--   gooals_revision_pkey
--   gooals_revision_regla_valida
--   gooals_revision_tipo_valido
--   gooals_revision_traduccion_con_propuesta
