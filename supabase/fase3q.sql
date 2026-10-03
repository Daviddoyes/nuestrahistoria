-- ═══════════════════════════════════════════════════════════
-- GooALS — Fase 3q: tres estados para el gooal de un usuario
--
-- Hasta hoy un gooal era 'pendiente' o 'completado'. Pasan a ser tres, en
-- escalera:
--
--   pendiente    quiero hacerlo
--   vivido       lo hice, pero no tengo foto que lo demuestre
--   completado   lo hice y lo demuestro con foto
--
-- DOS AVISOS SOBRE LOS NOMBRES, PARA QUIEN LEA ESTO DENTRO DE UN AÑO:
--
-- 1. En la base el tercer estado se sigue llamando 'completado'. En la pantalla
--    el usuario lee "conquistado". Son la misma cosa y NO se renombra a
--    propósito: renombrar obligaría a reescribir las filas y a recalcular los
--    puntos de todo el mundo, y todo eso por una palabra que nadie ve.
-- 2. 'vivido' no da puntos ni sube de nivel. Los puntos los da la foto, siempre.
--    Eso no se decide aquí: lo decide la app, que suma solo las filas
--    'completado' (sincronizarPuntos, en src/lib/actions.ts). Esta migración no
--    toca ni un punto de nadie.
--
-- ── LO QUE DE VERDAD ARREGLA ESTO ──────────────────────────
--
-- La columna `estado` NUNCA ha tenido restricción. Es texto a secas con un
-- comentario al lado. Comprobado contra producción el 3-10-2026: se le puede
-- meter 'LO_QUE_SEA_123' y la base lo acepta tan contenta. Lleva así desde
-- fase3.sql y no nos habíamos enterado.
--
-- Así que esto no es solo "añadir un estado": es poner por fin la cerradura.
-- A partir de aquí, un fallo de la app que escriba una palabra inventada falla
-- en el sitio y en el momento, en vez de dejar una fila huérfana que no sale en
-- ninguna pantalla y que nadie encuentra hasta que cuadra mal un número.
--
-- ── LO QUE ESTO NO HACE ────────────────────────────────────
--
-- NO cambia ni una sola fila. Ni el estado, ni los puntos, ni las fechas. Es
-- solo una restricción nueva. El bloque saca una huella de la tabla antes y
-- después y, si no coinciden, lanza un error y no se guarda nada.
--
-- Al aplicarlo había 2 filas, las dos 'completado'. Si cuando lo pegues hay
-- más, da igual: el bloque no mira cuántas hay, mira que ninguna cambie.
--
-- SEGURIDAD: un único bloque "do". Cualquier aviso deshace TODO, la restricción
-- incluida.
--
-- Se pega entero en el SQL Editor.
-- ═══════════════════════════════════════════════════════════

do $$
declare
  huella_antes   text;
  huella_despues text;
  invalidas      integer;
  n_pendiente    integer;
  n_vivido       integer;
  n_completado   integer;
  n_total        integer;
begin
  -- ── 1. Huella de la tabla, antes de tocar nada ──────────
  -- id + estado de cada fila, en orden. Si al final no sale la misma cadena,
  -- es que algo cambió una fila y esto no debía cambiar ninguna.
  select md5(coalesce(string_agg(id::text || ':' || estado, ',' order by id), 'tabla vacia'))
    into huella_antes
  from user_gooals;

  -- ── 2. ¿Hay ya alguna fila que la restricción rechazaría? ──
  --
  -- Lo de `estado is null or` no sobra. En SQL, `null not in ('a','b')` NO es
  -- cierto: es null, que no cuenta como cierto, así que una fila con el estado
  -- vacío se escaparía del recuento y luego haría fallar el ALTER con un error
  -- de Postgres que no explica nada. Mejor contarla aquí y decirlo claro.
  select count(*) into invalidas
  from user_gooals
  where estado is null
     or estado not in ('pendiente', 'vivido', 'completado');

  if invalidas > 0 then
    raise exception
      'Hay % fila(s) con un estado que no es ninguno de los tres. No se ha puesto la restricción y no se ha guardado nada. Para verlas: select estado, count(*) from user_gooals group by 1 order by 2 desc;',
      invalidas;
  end if;

  -- ── 3. La restricción ───────────────────────────────────
  --
  -- `drop ... if exists` primero para poder pegar esto dos veces sin que la
  -- segunda falle por "ya existe".
  --
  -- La columna sigue siendo `not null`, y hace falta que lo siga siendo: un
  -- CHECK que da null se considera cumplido, así que con el estado vacío esta
  -- restricción no protegería de nada. El not null es la otra mitad.
  alter table user_gooals drop constraint if exists user_gooals_estado_valido;

  alter table user_gooals add constraint user_gooals_estado_valido
    check (estado in ('pendiente', 'vivido', 'completado'));

  -- ── 4. Que no se haya movido ni una fila ────────────────
  select md5(coalesce(string_agg(id::text || ':' || estado, ',' order by id), 'tabla vacia'))
    into huella_despues
  from user_gooals;

  if huella_despues is distinct from huella_antes then
    raise exception
      'Ha cambiado alguna fila de user_gooals, y esto no debía cambiar ninguna. No se guarda nada.';
  end if;

  -- ── El parte ────────────────────────────────────────────
  select
    count(*) filter (where estado = 'pendiente'),
    count(*) filter (where estado = 'vivido'),
    count(*) filter (where estado = 'completado'),
    count(*)
  into n_pendiente, n_vivido, n_completado, n_total
  from user_gooals;

  raise notice 'Restriccion puesta. Filas sin tocar: % pendiente, % vivido, % completado (total %).',
    n_pendiente, n_vivido, n_completado, n_total;
end $$;


-- ═══════════════════════════════════════════════════════════
-- COMPROBACIÓN. Cada consulta por separado.
-- ═══════════════════════════════════════════════════════════

-- 1 · Que la restricción está puesta y con los tres valores.
select conname as nombre, pg_get_constraintdef(oid) as dice
from pg_constraint
where conrelid = 'user_gooals'::regclass and contype = 'c';
--   Una fila:
--   user_gooals_estado_valido | CHECK (estado = ANY (ARRAY['pendiente'::text, 'vivido'::text, 'completado'::text]))

-- 2 · Qué estados hay de verdad en la tabla.
select estado, count(*) as filas
from user_gooals
group by estado
order by filas desc;
--   Lo mismo que había antes de pegar esto. Hoy: completado 2. Ni una fila nueva
--   ni una menos, y ningún 'vivido' todavía: los creará la app.

-- 3 · Y que la cerradura cierra de verdad: se intenta meter a propósito el
--     estado inventado y se comprueba que la base lo rechaza.
--
--     NO HACE FALTA DESHACER NADA A MANO. Cuando un bloque "begin ... exception"
--     caza el error, Postgres deshace solo todo lo que ese bloque hubiera hecho.
--     Y si la restricción NO estuviera puesta, el cambio sí se haría, pero el
--     "raise exception" de la línea siguiente tumba el bloque entero y también
--     se deshace. Pase lo que pase, la tabla se queda como estaba.
do $$
declare
  cuantas integer;
begin
  select count(*) into cuantas from user_gooals;
  if cuantas = 0 then
    raise notice 'La tabla esta vacia: no hay ninguna fila con la que probar. Saltate esta comprobacion.';
    return;
  end if;

  begin
    update user_gooals
    set estado = 'LO_QUE_SEA_123'
    where id = (select id from user_gooals order by id limit 1);

    raise exception 'MAL: la base ha aceptado un estado inventado. La restriccion NO esta protegiendo.';
  exception
    when check_violation then
      raise notice 'BIEN: la base ha rechazado el estado inventado. La restriccion protege.';
  end;
end $$;
--   Tiene que salir un único aviso: "BIEN: la base ha rechazado el estado
--   inventado". Sin errores en rojo y sin ninguna fila cambiada.
--   Si sale "MAL", la restricción no se puso: vuelve a pegar el bloque de
--   arriba y mira qué dijo.
