-- ═══════════════════════════════════════════════════════════
-- GooALS — Fase 3r: de dónde sale cada foto del catálogo
--
-- Tres columnas nuevas en gooals_v2. Nada más: ni una fila cambia.
--
--   foto_autor      quién hizo la foto
--   foto_licencia   con qué licencia la cedió
--   foto_origen     su página en Wikimedia Commons
--
-- ── POR QUÉ HACEN FALTA ────────────────────────────────────
--
-- Las fotos del catálogo vienen de Wikimedia Commons, y **203 de las 223
-- elegidas exigen citar al autor**: es la condición de poder usarlas. Si no se
-- guarda ahora, no se puede reconstruir después — la foto estará en nuestro
-- almacén, ya sin rastro de quién la hizo.
--
-- Por eso van en la MISMA FILA que la foto y no en una tabla aparte: así es
-- imposible tener una sin la otra por un descuido al leer.
--
-- ── QUÉ GUARDA CADA UNA ────────────────────────────────────
--
-- `foto_origen` es la PÁGINA de Commons (commons.wikimedia.org/wiki/File:...),
-- no la dirección del fichero de imagen. Es a propósito: esa página es la que
-- enseña el autor, la licencia y el historial, que es lo que hay que poder
-- enseñar y comprobar. El fichero suelto no dice nada de eso.
--
-- `imagen_url` —que ya existía y lleva vacía desde siempre— guardará la foto YA
-- EN NUESTRO ALMACÉN de Supabase, no la de Commons. Si Commons cambia o borra
-- su copia, la nuestra sigue ahí.
--
-- ── LO QUE ESTO NO HACE ────────────────────────────────────
--
-- NO escribe ninguna foto: las columnas nacen vacías en las 5.142 filas. Las
-- rellena después el guion que sube las fotos. El bloque saca una huella de la
-- tabla antes y después y, si cambia una sola fila, lanza un error y no se
-- guarda nada.
--
-- PENDIENTE DE DECIDIR, y a propósito no se hace aquí: poner una restricción
-- que impida tener `imagen_url` sin `foto_autor`. Protegería justo lo que nos
-- importa, pero el panel de admin tiene un campo para pegar una dirección de
-- imagen a mano y NINGUNO para el autor, así que crear un gooal con foto desde
-- el panel empezaría a fallar. O se añaden esos campos al panel, o no se pone.
-- Ver el final de este fichero.
--
-- SEGURIDAD: un único bloque "do". Se puede pegar dos veces.
-- Se pega entero en el SQL Editor.
-- ═══════════════════════════════════════════════════════════

do $$
declare
  huella_antes   text;
  huella_despues text;
  filas_antes    integer;
  filas_despues  integer;
  columnas       integer;
  con_foto       integer;
begin
  -- ── 1. Huella de la tabla, antes de tocar nada ──────────
  -- id + lo que ya hubiera de foto, en orden. Si al final no sale la misma
  -- cadena, es que algo cambió una fila y esto no debía cambiar ninguna.
  select count(*), md5(coalesce(string_agg(id::text || ':' || coalesce(imagen_url, ''), ',' order by id), 'tabla vacia'))
    into filas_antes, huella_antes
  from gooals_v2;

  -- ── 2. Las tres columnas ────────────────────────────────
  -- `if not exists` para poder pegar esto dos veces sin que la segunda falle.
  -- Añadir una columna que admite nulos no reescribe las filas: Postgres solo
  -- apunta que existe y la da por vacía en las que ya había.
  alter table gooals_v2 add column if not exists foto_autor    text;
  alter table gooals_v2 add column if not exists foto_licencia text;
  alter table gooals_v2 add column if not exists foto_origen   text;

  -- El porqué, también dentro de la base: quien mire la tabla desde Supabase y
  -- no tenga este fichero delante, tiene que poder entenderlas.
  comment on column gooals_v2.foto_autor    is 'Quien hizo la foto de imagen_url. Casi todas las licencias de Commons obligan a citarlo: sin esto no podemos usar la foto.';
  comment on column gooals_v2.foto_licencia is 'Licencia de la foto, tal como la declara Commons (CC BY-SA 4.0, Public domain...).';
  comment on column gooals_v2.foto_origen   is 'Pagina de la foto en Wikimedia Commons, no el fichero: es la que enseña autor, licencia e historial.';

  -- ── 3. Que no se haya movido ni una fila ────────────────
  select count(*), md5(coalesce(string_agg(id::text || ':' || coalesce(imagen_url, ''), ',' order by id), 'tabla vacia'))
    into filas_despues, huella_despues
  from gooals_v2;

  if filas_despues <> filas_antes then
    raise exception 'La tabla tenia % filas y ahora tiene %. No se guarda nada.', filas_antes, filas_despues;
  end if;
  if huella_despues is distinct from huella_antes then
    raise exception 'Ha cambiado alguna fila de gooals_v2, y esto no debia cambiar ninguna. No se guarda nada.';
  end if;

  -- ── 4. Que las tres estén de verdad ─────────────────────
  select count(*) into columnas
  from information_schema.columns
  where table_schema = 'public' and table_name = 'gooals_v2'
    and column_name in ('foto_autor', 'foto_licencia', 'foto_origen');

  if columnas <> 3 then
    raise exception 'Se esperaban las 3 columnas de la foto y hay %. No se guarda nada.', columnas;
  end if;

  -- ── El parte ────────────────────────────────────────────
  select count(*) into con_foto from gooals_v2 where imagen_url is not null and imagen_url <> '';
  raise notice 'Tres columnas listas. Filas sin tocar: %. Con foto a dia de hoy: % (se rellenan despues).',
    filas_antes, con_foto;
end $$;


-- ═══════════════════════════════════════════════════════════
-- COMPROBACIÓN. Cada consulta por separado.
-- ═══════════════════════════════════════════════════════════

-- 1 · Que las tres columnas están, y qué dice cada una.
select column_name as columna, data_type as tipo, is_nullable as admite_vacio,
       col_description('public.gooals_v2'::regclass, ordinal_position) as para_que
from information_schema.columns
where table_schema = 'public' and table_name = 'gooals_v2'
  and column_name like 'foto\_%'
order by column_name;
--   Tres filas: foto_autor, foto_licencia, foto_origen · text · YES · con su
--   explicación. Si sale alguna menos, el bloque de arriba no llegó a correr.

-- 2 · Que no hay nada escrito todavía y que la tabla sigue entera.
select count(*)                                                          as filas,
       count(*) filter (where foto_autor is not null)                    as con_autor,
       count(*) filter (where imagen_url is not null and imagen_url <> '') as con_foto
from gooals_v2;
--   5142 · 0 · 0. Las tres columnas nacen vacías: las rellena el guion que sube
--   las fotos, en el paso siguiente.


-- ═══════════════════════════════════════════════════════════
-- PENDIENTE DE DECIDIR — NO PEGAR TODAVÍA
--
-- Esto impediría guardar una foto sin saber quién la hizo. Es la cerradura que
-- de verdad protege lo que nos importa, y es de la misma familia que la de
-- user_gooals.estado: hoy no hay nada que impida que alguien deje una foto
-- huérfana de autor, y entonces habría que borrarla.
--
-- NO SE PEGA SIN ARREGLAR ANTES EL PANEL: el formulario de crear un gooal tiene
-- un campo para pegar la dirección de una imagen y ninguno para el autor ni la
-- licencia, así que a partir de esto crear un gooal con foto desde el panel
-- daría error al guardar. O se añaden esos dos campos, o esta restricción se
-- queda sin poner.
--
-- alter table gooals_v2 add constraint gooals_v2_foto_con_autor
--   check (
--     imagen_url is null or imagen_url = ''
--     or (foto_autor is not null and foto_licencia is not null)
--   );
-- ═══════════════════════════════════════════════════════════
