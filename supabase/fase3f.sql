-- ═══════════════════════════════════════════════════════════
-- GooALS — Fase 3f: estado, ámbito y dificultad deducida de los puntos
--
--   estado      'borrador' | 'verificado'. La app solo enseña los verificados.
--   ambito      'lugar' | 'personal'. Lugar va al mapa (aunque aún le falte el
--               pin); personal no necesita coordenadas nunca.
--   dificultad  deja de escribirse a mano: la calcula un disparador a partir
--               de los puntos (1-3 facil · 4-7 dificil · 8-10 epico).
--
-- Se pega entero en el SQL Editor. Se puede lanzar dos veces: el relleno de
-- estado y ámbito SOLO ocurre la primera vez, al crear la columna. Si no, una
-- segunda pasada devolvería a borrador lo que ya se hubiera verificado a mano.
--
-- ORDEN: esto va ANTES de publicar el código que filtra por estado. Al revés,
-- Explorar y el mapa fallarían porque la columna todavía no existiría.
-- ═══════════════════════════════════════════════════════════


-- ── 0. Comprobación previa (solo lee) ──────────────────────
-- Si algún número no coincide con el comentario, PARA y mándamelo.
select
  count(*)                                        as total,            -- 4726
  count(*) filter (where lat is not null)         as con_coordenadas,  -- 3232
  count(*) filter (where dificultad = 'epico')    as a_borrador,       -- 320
  count(*) filter (where not (
    (dificultad = 'facil'   and puntos between 1 and 3)  or
    (dificultad = 'dificil' and puntos between 4 and 7)  or
    (dificultad = 'epico'   and puntos between 8 and 10)
  ))                                              as desincronizados   -- 0
from gooals_v2;


begin;

-- ── 1. Estado y ámbito (relleno solo al crearlas) ──────────
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'gooals_v2' and column_name = 'estado'
  ) then
    alter table gooals_v2 add column estado text not null default 'borrador';
    -- Los épicos se revisan antes de publicarse. Los geo = 'revisar' NO van a
    -- borrador: se comprobó una muestra el 1-9-2026 y sus pines están bien;
    -- esa marca mide lo famoso que es el sitio, no si el pin acierta.
    update gooals_v2 set estado = case
      when dificultad = 'epico' then 'borrador'
      else 'verificado'
    end;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'gooals_v2' and column_name = 'ambito'
  ) then
    alter table gooals_v2 add column ambito text;
    -- No basta con "tiene coordenadas": Troya, los Museos Vaticanos o el
    -- Cotopaxi son sitios aunque todavía no tengan pin. Con ciudad, o con país
    -- en cultura y aventura, es un lugar. Gastronomía "solo país" mezcla platos
    -- y sitios: queda personal y se afina a mano en el panel.
    update gooals_v2 set ambito = case
      when lat is not null                                           then 'lugar'
      when ciudad is not null                                        then 'lugar'
      when pais is not null and categoria in ('cultura', 'aventura') then 'lugar'
      else 'personal'
    end;
    alter table gooals_v2 alter column ambito set not null;
    -- Lo que se da de alta sin decirlo (una sugerencia aprobada, sin ciudad) nace personal.
    alter table gooals_v2 alter column ambito set default 'personal';
  end if;
end $$;

alter table gooals_v2 drop constraint if exists gooals_v2_estado_valido;
alter table gooals_v2 add constraint gooals_v2_estado_valido
  check (estado in ('borrador', 'verificado'));

alter table gooals_v2 drop constraint if exists gooals_v2_ambito_valido;
alter table gooals_v2 add constraint gooals_v2_ambito_valido
  check (ambito in ('lugar', 'personal'));

-- Lo personal no va al mapa NUNCA: no puede tener coordenadas.
-- Lo de lugar sí puede no tenerlas todavía: es la cola de "falta el pin".
alter table gooals_v2 drop constraint if exists gooals_v2_personal_sin_coordenadas;
alter table gooals_v2 add constraint gooals_v2_personal_sin_coordenadas
  check (ambito = 'lugar' or (lat is null and lng is null));


-- ── 2. La dificultad sale de los puntos ────────────────────
-- Disparador y no columna calculada: hoy varios sitios siguen escribiendo la
-- dificultad (panel, sugerencias, scripts de siembra). Con una columna
-- calculada esas altas darían error; con el disparador, simplemente se
-- recalcula. Cuando nada la escriba ya, se puede pasar a columna calculada.
alter table gooals_v2 drop constraint if exists gooals_v2_puntos_rango;
alter table gooals_v2 add constraint gooals_v2_puntos_rango
  check (puntos between 1 and 10);

create or replace function public.gooals_v2_dificultad_desde_puntos()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- Se ignora cualquier dificultad que venga escrita: mandan los puntos.
  new.dificultad := case
    when new.puntos between 1 and 3  then 'facil'
    when new.puntos between 4 and 7  then 'dificil'
    when new.puntos between 8 and 10 then 'epico'
  end;
  -- Fuera de 1-10 queda null, y lo rechazan gooals_v2_puntos_rango y el NOT NULL.
  return new;
end;
$$;

drop trigger if exists gooals_v2_dificultad on gooals_v2;
create trigger gooals_v2_dificultad
  before insert or update of puntos, dificultad on gooals_v2
  for each row execute function public.gooals_v2_dificultad_desde_puntos();

-- gooals_v2_puntos_en_banda (de fase3e) se queda: ahora se cumple siempre, y si
-- alguien quitara el disparador seguiría protegiendo.


-- ── 3. Índices ─────────────────────────────────────────────
-- Con 4.726 filas Postgres va sobrado incluso sin ellos; son baratos y esto crece.
-- Parciales: solo cubren lo que ve la app, que es lo que más se consulta.
create index if not exists gooals_v2_catalogo_verificado_idx
  on gooals_v2 (categoria, veces_completado desc, created_at desc, id)
  where estado = 'verificado' and activo;

create index if not exists gooals_v2_mapa_verificado_idx
  on gooals_v2 (lat, lng)
  where estado = 'verificado' and activo and lat is not null;

-- Para la cola del panel de admin.
create index if not exists gooals_v2_revision_idx
  on gooals_v2 (estado, created_at desc);


-- ── 4. Que la clave pública no lea borradores ──────────────
-- Antes la política dejaba leer TODO gooals_v2 con la anon key, que es pública:
-- cualquiera podía listar los borradores. La app no lee esta tabla desde el
-- navegador (todo va por el servidor), así que cerrarlo no rompe nada. Si tras
-- esto Explorar o el mapa fallaran, la causa sería una lectura desde el
-- navegador que creíamos que no existía.
drop policy if exists "public read gooals_v2" on gooals_v2;
drop policy if exists "public read gooals_v2 verificados" on gooals_v2;
create policy "public read gooals_v2 verificados" on gooals_v2
  for select using (estado = 'verificado' and activo);

commit;


-- ── 5. Comprobación ────────────────────────────────────────
select estado, ambito, count(*) from gooals_v2 group by 1, 2 order by 1, 2;
--   borrador   | lugar    |  252
--   borrador   | personal |   68
--   verificado | lugar    | 3367
--   verificado | personal | 1039

select count(*) as desincronizados from gooals_v2 where not (
  (dificultad = 'facil'   and puntos between 1 and 3)  or
  (dificultad = 'dificil' and puntos between 4 and 7)  or
  (dificultad = 'epico'   and puntos between 8 and 10)
);  -- 0
