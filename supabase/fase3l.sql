-- ═══════════════════════════════════════════════════════════
-- GooALS — Fase 3l: el cambio de catálogo, de una vez
--
-- Retira el catálogo generado y publica el escrito a mano EN LA MISMA
-- OPERACIÓN. No hay ni un instante con el catálogo vacío: o pasa todo, o no
-- pasa nada.
--
-- Por eso va todo dentro de un único bloque "do": un bloque es una sola
-- sentencia para Postgres, así que se ejecuta entero o se deshace entero. Si
-- cualquier comprobación falla, el bloque lanza un error y la base se queda
-- exactamente como estaba. No hace falta BEGIN ni COMMIT.
--
-- QUÉ HACE, EN ORDEN:
--   1. Comprueba que el corte de fecha sigue siendo válido.
--   2. Añade el estado 'retirado' y las dos columnas para deshacerlo.
--   3. Publica (verificado) todo lo creado desde el corte.
--   4. Traspasa un pendiente al gooal nuevo que lo sustituye.
--   5. Retira todo lo anterior al corte que no tenga nadie.
--
-- SE PEGA ENTERO. Se puede lanzar dos veces sin romper nada.
-- ═══════════════════════════════════════════════════════════

do $$
declare
  -- El corte. Lo anterior se retira, lo posterior se publica.
  corte            constant timestamptz := '2026-10-01';

  -- El único traspaso: el pendiente de la fila vieja pasa a la nueva.
  --
  -- Solo se traspasa cuando es EL MISMO GOOAL mejor escrito. "Visitar Parque
  -- Güell" y "Visitar el Park Güell" son la misma acción con el nombre
  -- arreglado, así que mover el pendiente no le cambia a nadie aquello a lo que
  -- se apuntó.
  --
  -- NO se traspasa "Visitar Torre Eiffel" a "Subir a la Torre Eiffel", aunque
  -- sea el mismo sitio: visitarla y subirla NO son la misma acción (una cuesta
  -- una entrada y dos horas de cola). Es la misma regla del verbo que gobierna
  -- el criterio del catálogo. Ese gooal viejo se queda publicado —el paso 5
  -- respeta lo que alguien tiene— y esa persona conserva su pendiente tal cual.
  guell_viejo      constant uuid := '4316d487-ca71-4b3e-9365-a989e3f89af2';  -- Visitar Parque Güell
  guell_nuevo      constant uuid := '50aa31f7-6614-4483-8b98-962a6bdbbea9';  -- Visitar el Park Güell

  ultimo_viejo     timestamptz;
  primero_nuevo    timestamptz;
  n_publicados     integer;
  n_retirados      integer;
  n_traspasos      integer := 0;
  n_movidas        integer;
  par              record;
begin
  -- ── 1. El corte sigue siendo válido ──────────────────────
  -- Entre el catálogo generado y el escrito a mano hay un hueco de doce días
  -- sin una sola fila. Si alguien ha creado algo en medio, el corte deja de
  -- separar lo uno de lo otro y aquí se para todo.
  select max(created_at) into ultimo_viejo  from gooals_v2 where created_at <  corte;
  select min(created_at) into primero_nuevo from gooals_v2 where created_at >= corte;

  if ultimo_viejo is null or primero_nuevo is null then
    raise exception 'No hay filas a los dos lados del corte (%). No se toca nada.', corte;
  end if;
  if primero_nuevo - ultimo_viejo < interval '2 days' then
    raise exception 'El hueco del corte es de solo %. Lo último viejo es de % y lo primero nuevo de %. Revísalo antes de seguir.',
      primero_nuevo - ultimo_viejo, ultimo_viejo, primero_nuevo;
  end if;

  -- ── 2. El estado nuevo y lo que hace falta para deshacerlo ──
  alter table gooals_v2 drop constraint if exists gooals_v2_estado_valido;
  alter table gooals_v2 add constraint gooals_v2_estado_valido
    check (estado in ('borrador', 'verificado', 'retirado'));

  -- estado_previo es lo que hace el deshacer de verdad reversible: sin ella,
  -- al volver atrás todo iría a 'verificado' y publicaría de golpe los 303 que
  -- estaban en borrador, que es lo contrario de lo que se quiere.
  alter table gooals_v2 add column if not exists retirado_en   timestamptz;
  alter table gooals_v2 add column if not exists estado_previo text;

  -- Escrito con "is not null" a los dos lados de un igual, y no con la forma
  -- natural (estado = 'retirado' and estado_previo in (...)). Es la trampa de
  -- los nulos: "null in ('borrador','verificado')" no es falso, es nulo, y una
  -- restricción CHECK que sale nula SE CUMPLE. Con la versión natural se podía
  -- dejar una fila retirada sin estado_previo, justo lo que impediría
  -- deshacerla. Comprobado en un Postgres de verdad: pasaba.
  alter table gooals_v2 drop constraint if exists gooals_v2_retirada_completa;
  alter table gooals_v2 add constraint gooals_v2_retirada_completa
    check (
      (estado = 'retirado') = (retirado_en is not null)
      and (estado = 'retirado') = (estado_previo is not null)
      and (estado_previo is null or estado_previo in ('borrador', 'verificado'))
    );

  create index if not exists gooals_v2_estado_idx on gooals_v2 (estado);

  -- ── 3. Publicar lo escrito a mano ────────────────────────
  -- Antes del traspaso: así el pendiente que se mueve nunca apunta, ni por un
  -- instante, a un gooal que todavía está en borrador.
  update gooals_v2
  set estado = 'verificado'
  where created_at >= corte and estado = 'borrador';
  get diagnostics n_publicados = row_count;

  -- ── 4. El traspaso ───────────────────────────────────────
  -- Solo PENDIENTES, nunca un conquistado: mover un conquistado llevaría su
  -- foto y sus puntos a otro gooal, y eso no se hace por detrás.
  --
  -- Si esa persona ya tuviera el gooal nuevo, el unique (user_id, gooal_id) de
  -- user_gooals haría fallar esto y se desharía TODO el bloque. Es lo correcto:
  -- mejor no cambiar nada que dejarle dos filas del mismo gooal.
  for par in
    select * from (values
      (guell_viejo, guell_nuevo)
    ) as v(viejo, nuevo)
  loop
    -- Que los dos ids sigan existiendo y cada uno esté en su lado del corte.
    -- Si no, es que un id está mal copiado y no se toca nada.
    if not exists (select 1 from gooals_v2 where id = par.viejo and created_at <  corte) then
      raise exception 'El gooal viejo % no existe o no es anterior al corte.', par.viejo;
    end if;
    if not exists (select 1 from gooals_v2 where id = par.nuevo and created_at >= corte) then
      raise exception 'El gooal nuevo % no existe o no es posterior al corte.', par.nuevo;
    end if;

    update user_gooals
    set gooal_id = par.nuevo
    where gooal_id = par.viejo and estado = 'pendiente';
    get diagnostics n_movidas = row_count;
    n_traspasos := n_traspasos + n_movidas;
  end loop;

  -- ── 5. Retirar el catálogo viejo ─────────────────────────
  -- "no lo tiene nadie" se evalúa AHORA, después del traspaso: la fila que
  -- acaba de quedarse libre entra aquí sola, sin nombrarla. Las tres que siguen
  -- teniendo algo de alguien se quedan publicadas.
  update gooals_v2
  set estado        = 'retirado',
      estado_previo = estado,
      retirado_en   = now()
  where created_at < corte
    and estado <> 'retirado'
    and id not in (select gooal_id from user_gooals);
  get diagnostics n_retirados = row_count;

  raise notice 'Publicados: % · traspasos: % · retirados: %', n_publicados, n_traspasos, n_retirados;
end $$;


-- ═══════════════════════════════════════════════════════════
-- COMPROBACIÓN. Lanza cada consulta POR SEPARADO: el editor solo enseña el
-- resultado de la última. Si algo no cuadra, el apartado de deshacer está abajo.
-- ═══════════════════════════════════════════════════════════

-- 1 · El reparto por estado. Es la foto de que ha ido bien.
select estado, count(*) from gooals_v2 group by estado order by count(*) desc;
--   retirado    4.709
--   verificado    446
--   (borrador NO debe aparecer: tiene que quedar en cero)

-- 2 · Lo que ve la gente en la app. Tiene que ser 446, nunca 3.
select count(*) as lo_que_ve_la_gente from gooals_v2 where estado = 'verificado' and activo;
--   446   = los 443 escritos a mano + los 3 viejos que esa persona tiene

-- 3 · Que no queda ni un borrador suelto.
select count(*) as borradores from gooals_v2 where estado = 'borrador';
--   0

-- 4 · Los cuatro gooals de esa persona, después del cambio.
select g.titulo, g.estado, u.estado as lo_tiene_como, g.created_at::date as creado
from user_gooals u join gooals_v2 g on g.id = u.gooal_id
order by u.estado, g.titulo;
--   Recorrer el carril bici más largo del mundo     verificado  completado  2026-09-18
--   Subirte a un skateboard y avanzar con control   verificado  completado  2026-08-29
--   Visitar Torre Eiffel                            verificado  pendiente   2026-08-29
--   Visitar el Park Güell                           verificado  pendiente   2026-10-01
--
--   Los dos conquistados, intactos. La Torre Eiffel sigue siendo la VIEJA
--   (creada el 29-08) y sigue publicada: no se traspasó a propósito.
--   El Park Güell sí apunta ya al nuevo, creado el 1-10.
--   NINGUNO de los cuatro debe salir como 'retirado'.

-- 5 · La fila vieja del Park Güell, la única que se liberó, tiene que estar retirada.
select titulo, estado, estado_previo from gooals_v2
where id in ('4316d487-ca71-4b3e-9365-a989e3f89af2', '219a87c2-685e-4b47-97ec-9730bf325e99');
--   Visitar Parque Güell    retirado    verificado
--   Visitar Torre Eiffel    verificado  (vacío)      ← esta NO se retira

-- 6 · Que nadie ha perdido nada: siguen siendo cuatro filas.
select count(*) as filas_de_la_gente from gooals_v2 g right join user_gooals u on u.gooal_id = g.id;
--   4

-- 7 · De qué estado salió lo retirado. Es lo que permite deshacerlo bien.
select estado_previo, count(*) from gooals_v2 where estado = 'retirado' group by estado_previo;
--   verificado  4.406
--   borrador      303


-- ═══════════════════════════════════════════════════════════
-- DESHACER. Devuelve cada fila al estado del que salió.
-- ═══════════════════════════════════════════════════════════
-- El traspaso NO se deshace solo: es una fila y se devuelve a mano (la vieja
-- vuelve a estar publicada al deshacer la retirada).
--
--   do $$
--   begin
--     update user_gooals set gooal_id = '4316d487-ca71-4b3e-9365-a989e3f89af2'
--     where gooal_id = '50aa31f7-6614-4483-8b98-962a6bdbbea9' and estado = 'pendiente';
--
--     update gooals_v2
--     set estado = estado_previo, estado_previo = null, retirado_en = null
--     where estado = 'retirado';
--
--     update gooals_v2 set estado = 'borrador' where created_at >= '2026-10-01';
--   end $$;
