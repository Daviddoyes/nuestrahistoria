-- ═══════════════════════════════════════════════════════════
-- GooALS — Fase 3s: fuera el estado 'vivido'. Vuelven dos.
--
--   pendiente    quiero hacerlo
--   completado   lo conseguí
--
-- ── POR QUÉ SE DESHACE LO DE HACE DOS DÍAS ─────────────────
--
-- 'vivido' existía para poder decir "esto ya lo hice" sin foto, y no daba
-- puntos: los daba la prueba. El criterio ha cambiado, y con razón: **la foto
-- nunca fue una prueba**. Nadie comprueba que ese Taj Mahal sea tuyo. Era una
-- barrera, no una verificación.
--
-- Si conseguir un gooal da puntos lleve foto o no, entonces 'vivido' y
-- 'completado' solo se diferencian en si hay foto — y eso ya lo dice la propia
-- foto, que está en la misma fila. Un estado que no decide nada sobra.
--
-- 'completado' NO se renombra, aunque el usuario lea "conseguido": renombrarlo
-- obligaría a reescribir las filas de todo el mundo por una palabra que nadie
-- ve. Es la misma decisión que se tomó en fase3q.
--
-- ── NO SE MUEVE EL PUNTO DE NADIE ──────────────────────────
--
-- Comprobado contra producción el 5-10-2026: **cero filas con 'vivido'**. Las
-- que hubo eran de cuentas de prueba, ya borradas. Así que esto no convierte ni
-- recalcula nada: solo estrecha la restricción para que no se pueda volver a
-- escribir ese estado por error.
--
-- Si cuando lo pegues hubiera aparecido alguna fila 'vivido', el bloque SE PARA
-- y no cambia nada: habría que decidir antes qué hacer con ella.
--
-- Sustituye a la restricción de supabase/fase3q.sql.
-- SEGURIDAD: un único bloque "do". Se puede pegar dos veces.
-- ═══════════════════════════════════════════════════════════

do $$
declare
  huella_antes   text;
  huella_despues text;
  vividas        integer;
  invalidas      integer;
  n_pendiente    integer;
  n_completado   integer;
begin
  select md5(coalesce(string_agg(id::text || ':' || estado, ',' order by id), 'tabla vacia'))
    into huella_antes
  from user_gooals;

  -- ── 1. ¿Ha aparecido algún 'vivido' desde que se midió? ──
  select count(*) into vividas from user_gooals where estado = 'vivido';
  if vividas > 0 then
    raise exception
      'Hay % fila(s) con estado vivido. Esto las dejaria fuera de la restriccion y no se ha decidido que hacer con ellas. No se guarda nada. Para verlas: select * from user_gooals where estado = ''vivido'';',
      vividas;
  end if;

  -- ── 2. Y ningún otro estado raro ────────────────────────
  -- `estado is null or` no sobra: en SQL, `null not in (...)` no es cierto, es
  -- null, y una fila con el estado vacio se escaparia del recuento.
  select count(*) into invalidas
  from user_gooals
  where estado is null or estado not in ('pendiente', 'completado');
  if invalidas > 0 then
    raise exception 'Hay % fila(s) con un estado que no es ninguno de los dos. No se guarda nada.', invalidas;
  end if;

  -- ── 3. La restricción, ahora con dos ────────────────────
  alter table user_gooals drop constraint if exists user_gooals_estado_valido;
  alter table user_gooals add constraint user_gooals_estado_valido
    check (estado in ('pendiente', 'completado'));

  -- ── 4. Que no se haya movido ni una fila ────────────────
  select md5(coalesce(string_agg(id::text || ':' || estado, ',' order by id), 'tabla vacia'))
    into huella_despues
  from user_gooals;
  if huella_despues is distinct from huella_antes then
    raise exception 'Ha cambiado alguna fila de user_gooals, y esto no debia cambiar ninguna. No se guarda nada.';
  end if;

  select count(*) filter (where estado = 'pendiente'), count(*) filter (where estado = 'completado')
    into n_pendiente, n_completado
  from user_gooals;
  raise notice 'Restriccion con dos estados. Filas sin tocar: % pendiente, % completado.', n_pendiente, n_completado;
end $$;


-- ═══════════════════════════════════════════════════════════
-- COMPROBACIÓN. Cada consulta por separado.
-- ═══════════════════════════════════════════════════════════

-- 1 · La restricción, ahora con dos valores.
select conname as nombre, pg_get_constraintdef(oid) as dice
from pg_constraint
where conrelid = 'user_gooals'::regclass and contype = 'c';
--   user_gooals_estado_valido | CHECK (estado = ANY (ARRAY['pendiente'::text, 'completado'::text]))

-- 2 · Qué estados hay de verdad.
select estado, count(*) as filas from user_gooals group by estado order by filas desc;
--   Lo mismo que antes de pegar esto. Hoy: completado 2.

-- 3 · Y que la cerradura rechaza el estado retirado.
--     Se deshace sola: cuando un bloque "begin ... exception" caza el error,
--     Postgres deshace todo lo que ese bloque hubiera hecho.
do $$
declare cuantas integer;
begin
  select count(*) into cuantas from user_gooals;
  if cuantas = 0 then
    raise notice 'La tabla esta vacia: saltate esta comprobacion.';
    return;
  end if;
  begin
    update user_gooals set estado = 'vivido'
    where id = (select id from user_gooals order by id limit 1);
    raise exception 'MAL: la base todavia acepta vivido.';
  exception
    when check_violation then
      raise notice 'BIEN: la base ya no acepta vivido.';
  end;
end $$;
--   Un único aviso: "BIEN: la base ya no acepta vivido". Sin errores en rojo y
--   sin ninguna fila cambiada.
