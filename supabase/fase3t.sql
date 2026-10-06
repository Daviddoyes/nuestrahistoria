-- ═══════════════════════════════════════════════════════════
-- GooALS — Fase 3t: quién puede ver la foto de cada gooal conseguido
--
-- Una columna nueva en user_gooals:
--
--   visibilidad   'privada' | 'amigos' | 'publica'     por defecto, 'amigos'
--
-- ── POR QUÉ ────────────────────────────────────────────────
--
-- Hoy las fotos que sube la gente son PÚBLICAS, y no por descuido de un día:
-- el cubo 'gooals-media' tiene lectura pública y, además, la app reparte las
-- direcciones. Medido el 5-10-2026: con la clave pública que viaja en cada
-- visita se leen `muro_posts` y `user_gooals`, cada fila trae la dirección de
-- su foto, y esa dirección la sirve Supabase a cualquiera sin cuenta.
--
-- O sea: no hay que adivinar nada ni colarse en ningún sitio. Por eso no vale
-- "poner direcciones difíciles de acertar": una dirección deja de ser secreta en
-- cuanto alguien la comparte, y no caduca nunca.
--
-- Esta columna es la primera mitad del arreglo. La segunda es el cubo privado y
-- las direcciones firmadas, que no es SQL.
--
-- ── POR QUÉ 'amigos' POR DEFECTO ───────────────────────────
--
-- Porque es lo que la gente espera de una foto suya, y porque el valor por
-- defecto es el que va a tener casi todo el mundo: el que se elige sin pensar
-- tiene que ser el prudente, no el cómodo.
--
-- "Amigo" es, de momento, que os sigáis los dos. Eso NO se decide aquí: vive en
-- una sola función del código (src/lib/permisos.ts), para que el día que haya
-- solicitudes de amistad de verdad se cambie ahí y en ningún sitio más.
--
-- ── LO QUE ESTO NO HACE ────────────────────────────────────
--
-- NO cambia ninguna fila: la columna nace con su valor por defecto en las que ya
-- hay. Hoy son 2. El bloque saca una huella de la tabla antes y después y, si
-- cambia algo que no sea esa columna, lanza un error y no se guarda nada.
--
-- NO cierra todavía nada: mientras el cubo siga siendo público, esta columna es
-- una intención escrita, no una cerradura. La cerradura es el cubo privado.
--
-- SEGURIDAD: un único bloque "do". Se puede pegar dos veces.
-- ═══════════════════════════════════════════════════════════

do $$
declare
  huella_antes   text;
  huella_despues text;
  columnas       integer;
  n_amigos       integer;
  n_total        integer;
begin
  -- La huella NO incluye `visibilidad` a propósito: la columna va a existir
  -- después y no antes. Se vigila que no cambie nada de lo que ya había.
  select md5(coalesce(string_agg(
           id::text || ':' || estado || ':' || coalesce(foto_url, '') || ':' || puntos_ganados,
           ',' order by id), 'tabla vacia'))
    into huella_antes
  from user_gooals;

  -- ── 1. La columna ───────────────────────────────────────
  alter table user_gooals add column if not exists visibilidad text not null default 'amigos';

  -- ── 2. Su cerradura ─────────────────────────────────────
  -- Sin esto la columna es texto libre, que es exactamente como `estado` estuvo
  -- desde fase3.sql hasta fase3q: aceptando cualquier palabra inventada sin que
  -- nadie se enterara. Aquí la cerradura va desde el primer día.
  alter table user_gooals drop constraint if exists user_gooals_visibilidad_valida;
  alter table user_gooals add constraint user_gooals_visibilidad_valida
    check (visibilidad in ('privada', 'amigos', 'publica'));

  comment on column user_gooals.visibilidad is
    'Quien puede ver la foto o el video de esta fila: privada (solo su dueno), amigos (quienes se siguen mutuamente) o publica. Por defecto amigos. Quien decide es puedeVerLaFoto() en src/lib/permisos.ts.';

  -- ── 3. Que no se haya movido nada de lo que ya había ────
  select md5(coalesce(string_agg(
           id::text || ':' || estado || ':' || coalesce(foto_url, '') || ':' || puntos_ganados,
           ',' order by id), 'tabla vacia'))
    into huella_despues
  from user_gooals;
  if huella_despues is distinct from huella_antes then
    raise exception 'Ha cambiado alguna fila de user_gooals, y esto no debia cambiar ninguna. No se guarda nada.';
  end if;

  select count(*) into columnas
  from information_schema.columns
  where table_schema = 'public' and table_name = 'user_gooals' and column_name = 'visibilidad';
  if columnas <> 1 then
    raise exception 'La columna visibilidad no esta. No se guarda nada.';
  end if;

  select count(*) filter (where visibilidad = 'amigos'), count(*) into n_amigos, n_total from user_gooals;
  raise notice 'Columna visibilidad lista. % de % filas quedan en amigos, que es el valor por defecto.', n_amigos, n_total;
end $$;


-- ═══════════════════════════════════════════════════════════
-- COMPROBACIÓN. Cada consulta por separado.
-- ═══════════════════════════════════════════════════════════

-- 1 · La columna y su explicación.
select column_name as columna, data_type as tipo, column_default as por_defecto, is_nullable as admite_vacio,
       col_description('public.user_gooals'::regclass, ordinal_position) as para_que
from information_schema.columns
where table_schema = 'public' and table_name = 'user_gooals' and column_name = 'visibilidad';
--   visibilidad | text | 'amigos'::text | NO | con su explicación

-- 2 · Qué visibilidad tiene lo que hay.
select visibilidad, count(*) as filas from user_gooals group by visibilidad order by filas desc;
--   amigos 2

-- 3 · Y que la cerradura cierra. Se deshace sola.
do $$
declare cuantas integer;
begin
  select count(*) into cuantas from user_gooals;
  if cuantas = 0 then
    raise notice 'La tabla esta vacia: saltate esta comprobacion.';
    return;
  end if;
  begin
    update user_gooals set visibilidad = 'solo_los_martes'
    where id = (select id from user_gooals order by id limit 1);
    raise exception 'MAL: la base acepta una visibilidad inventada.';
  exception
    when check_violation then
      raise notice 'BIEN: la base rechaza una visibilidad inventada.';
  end;
end $$;
--   Un único aviso: "BIEN: la base rechaza una visibilidad inventada".
