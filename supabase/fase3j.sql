-- ═══════════════════════════════════════════════════════════
-- GooALS — Fase 3j: los gooals de la pantalla de Inicio
--
--   gooals_inicio   la lista curada de "¿qué de esto ya has hecho?": qué gooals
--                   salen y EN QUÉ ORDEN.
--
-- Es una tabla aparte y no una columna "comun" en gooals_v2 por dos razones:
-- el orden es un dato que un sí/no no sabe guardar, y así cambiar la lista
-- entera son 60 filas de una tabla pequeña, sin tocar el catálogo de 4.726 ni
-- su historial.
--
-- ORDEN: DESPUÉS de importar los 60 gooals nuevos. Esta tabla solo guarda
-- referencias: si el gooal no existe todavía, no se puede apuntar.
--
-- Se pega entero en el SQL Editor. Se puede lanzar dos veces sin romper nada.
-- ═══════════════════════════════════════════════════════════

create table if not exists gooals_inicio (
  gooal_id uuid primary key references gooals_v2(id) on delete cascade
);

alter table gooals_inicio add column if not exists orden     integer     not null default 0;
-- Para retirar uno de la pantalla sin perder su sitio ni volver a buscarlo.
alter table gooals_inicio add column if not exists activo    boolean     not null default true;
alter table gooals_inicio add column if not exists creado_en timestamptz not null default now();

-- Índice, NO único: con un único, intercambiar el 3 y el 4 chocaría a mitad de
-- camino y habría que inventarse números temporales. Los empates se deshacen en
-- la consulta, por gooal_id, así que la lista nunca baila.
create index if not exists gooals_inicio_orden_idx on gooals_inicio (orden, gooal_id);

-- Sin políticas, como el resto: la pantalla de Inicio la lee el servidor con el
-- service role. La clave pública no puede tocar esta tabla.
alter table gooals_inicio enable row level security;


-- ── Cómo se llena ──────────────────────────────────────────
-- Por título, que es lo que se tiene a mano al elegirlos. Si algún título no
-- existe o está escrito distinto, esa fila no entra y el recuento del final lo
-- delata. Ejemplo con tres; el orden es el número de la lista:
--
--   insert into gooals_inicio (gooal_id, orden)
--   select g.id, v.orden
--   from (values
--     ('Hacer surf', 1),
--     ('Ir a un concierto en un estadio', 2),
--     ('Probar sushi', 3)
--   ) as v(titulo, orden)
--   join gooals_v2 g on g.titulo = v.titulo
--   on conflict (gooal_id) do update set orden = excluded.orden, activo = true;
--
-- Y para vaciarla y volver a empezar:
--
--   delete from gooals_inicio;


-- ── Comprobación ───────────────────────────────────────────
-- El editor solo enseña el resultado de la última consulta: lanza cada una por separado.
select count(*) as en_la_pantalla from gooals_inicio where activo;
--   0 recién creada

-- La lista tal como la pintará la app: solo lo verificado y activo, en su orden.
select i.orden, g.titulo, g.categoria, g.puntos, g.ambito
from gooals_inicio i
join gooals_v2 g on g.id = i.gooal_id
where i.activo and g.activo and g.estado = 'verificado'
order by i.orden, i.gooal_id;

-- Si alguno saliera aquí, está apuntado en la pantalla pero la app no lo
-- enseñaría: o está en borrador, o está inactivo.
select g.titulo, g.estado, g.activo
from gooals_inicio i
join gooals_v2 g on g.id = i.gooal_id
where i.activo and (not g.activo or g.estado <> 'verificado');
--   0 filas
