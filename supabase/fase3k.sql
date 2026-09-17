-- ═══════════════════════════════════════════════════════════
-- GooALS — Fase 3k: el repaso de los títulos del catálogo
--
--   gooals_revision   lo que la IA opina de cada título: si cumple las cinco
--                     reglas, cuál rompe, por qué, y qué título pondría ella.
--
-- Tabla aparte y no columnas nuevas en gooals_v2, por lo mismo que
-- gooals_inicio: es un trabajo temporal. Cuando el repaso termine, esto se
-- borra entero con un `drop table` y el catálogo no se entera. Además, una
-- columna "propuesta" en gooals_v2 viajaría en cada consulta de la app (mapa,
-- Explorar, muro) para no usarse nunca.
--
-- Se pega entero en el SQL Editor. Se puede lanzar dos veces sin romper nada.
-- ═══════════════════════════════════════════════════════════

create table if not exists gooals_revision (
  -- Una fila por gooal: la última opinión, no un histórico. Con el gooal_id de
  -- clave primaria, la pasada puede reanudarse sola (lo que ya tiene fila no se
  -- vuelve a preguntar) y relanzarla no duplica nada.
  gooal_id uuid primary key references gooals_v2(id) on delete cascade
);

-- El título TAL COMO ESTABA cuando la IA lo juzgó. Si luego alguien lo cambia a
-- mano, el panel lo compara y avisa de que la propuesta se juzgó sobre otro
-- texto, en vez de ofrecer a ciegas una propuesta que ya no viene a cuento.
alter table gooals_revision add column if not exists titulo_original text not null default '';

alter table gooals_revision add column if not exists cumple boolean not null default true;
-- Cuál de las cinco reglas de src/lib/criterio-gooals.ts rompe. null si cumple.
alter table gooals_revision add column if not exists regla smallint;
alter table gooals_revision add column if not exists motivo text;
alter table gooals_revision add column if not exists titulo_propuesto text;

--   ok           la IA lo dio por bueno: no hay nada que decidir
--   pendiente    hay propuesta esperando a que David la mire
--   aceptado     se aplicó la propuesta tal cual
--   editado      se aplicó un título escrito por David
--   descartado   el título se queda como estaba
alter table gooals_revision add column if not exists estado text not null default 'ok';
-- 'traduccion' (el título está mal escrito: inglés a medias, tildes, falta el
-- verbo) o 'criterio' (rompe una de las cinco reglas). Son dos trabajos
-- distintos y el panel los separa: las traducciones se confirman en bloque, el
-- criterio se decide de una en una. Ver fase3k-traducciones.sql.
alter table gooals_revision add column if not exists tipo text not null default 'criterio';
-- Lo que se guardó de verdad en gooals_v2, para poder mirar después qué cambió.
alter table gooals_revision add column if not exists titulo_final text;
alter table gooals_revision add column if not exists resuelto_en timestamptz;

-- En qué tanda salió y con qué modelo, para comparar la muestra de 200 con la
-- pasada completa si se cambia de modelo a mitad.
alter table gooals_revision add column if not exists tanda  integer not null default 0;
alter table gooals_revision add column if not exists modelo text;
alter table gooals_revision add column if not exists creado_en timestamptz not null default now();

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'gooals_revision_estado_valido') then
    alter table gooals_revision add constraint gooals_revision_estado_valido
      check (estado in ('ok', 'pendiente', 'aceptado', 'editado', 'descartado'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'gooals_revision_regla_valida') then
    alter table gooals_revision add constraint gooals_revision_regla_valida
      check (regla is null or regla between 1 and 5);
  end if;

  -- Un fallo tiene que decir QUÉ REGLA rompe. El motivo y la propuesta pueden
  -- faltar; la regla no, porque es lo que ordena el trabajo en el panel.
  if not exists (select 1 from pg_constraint where conname = 'gooals_revision_fallo_con_regla') then
    alter table gooals_revision add constraint gooals_revision_fallo_con_regla
      check (cumple or regla is not null);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'gooals_revision_tipo_valido') then
    alter table gooals_revision add constraint gooals_revision_tipo_valido
      check (tipo in ('criterio', 'traduccion'));
  end if;

  -- Una traducción sin recambio escrito no es una traducción: es un título que
  -- hay que decidir a mano.
  if not exists (select 1 from pg_constraint where conname = 'gooals_revision_traduccion_con_propuesta') then
    alter table gooals_revision add constraint gooals_revision_traduccion_con_propuesta
      check (tipo <> 'traduccion' or (titulo_propuesto is not null and btrim(titulo_propuesto) <> ''));
  end if;
end $$;

-- Al principio esto exigía una propuesta en toda fila que no cumpliera. Fue un
-- error: esa obligación es justo la que empujaba a la IA a inventarse otro gooal
-- cuando el título no tenía arreglo. Ahora puede decir "está mal y no sé
-- arreglarlo sin cambiarlo", y esas filas salen en el panel para decidirlas a
-- mano. Si la tabla es nueva, esta línea no hace nada.
alter table gooals_revision drop constraint if exists gooals_revision_fallo_con_propuesta;

-- Índice parcial: la pantalla solo pregunta por las pendientes, y así el índice
-- ocupa lo que ocupan las pendientes, no las 4.726.
create index if not exists gooals_revision_pendientes_idx
  on gooals_revision (tipo, gooal_id) where estado = 'pendiente';

-- Sin políticas, como el resto del panel: esto lo lee y lo escribe el servidor
-- con el service role. La clave pública no puede ver ni tocar el repaso.
alter table gooals_revision enable row level security;


-- ── Comprobación ───────────────────────────────────────────
-- El editor solo enseña el resultado de la última consulta: lanza cada una por separado.
select count(*) as filas_de_repaso from gooals_revision;
--   0 recién creada

-- Cómo va el repaso. Recién creada no devuelve ninguna fila.
select estado, count(*) from gooals_revision group by estado order by count(*) desc;

-- Cuánto queda por preguntarle a la IA.
select
  (select count(*) from gooals_v2) as titulos_del_catalogo,
  (select count(*) from gooals_revision) as ya_repasados,
  (select count(*) from gooals_v2) - (select count(*) from gooals_revision) as por_repasar;


-- ── Cuando el repaso termine ───────────────────────────────
-- Ya no hace falta guardar nada: los títulos buenos están en gooals_v2.
--
--   drop table gooals_revision;
