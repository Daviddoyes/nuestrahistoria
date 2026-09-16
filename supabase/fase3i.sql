-- ═══════════════════════════════════════════════════════════
-- GooALS — Fase 3i: campañas de correo (pestaña Comunicaciones del panel)
--
--   emails_campanas   un correo escrito en el panel y a qué grupo se mandó.
--                     Guarda el texto tal cual se envió, para verlo después.
--   emails_enviados   ya existía (fase3d): una fila por persona y campaña.
--                     Gana campana_id, que apunta a la campaña.
--
-- Las 52 filas del relanzamiento NO se tocan: se quedan con campana_id vacío
-- y el panel las enseña como "campaña anterior".
--
-- Se pega entero en el SQL Editor. Se puede lanzar dos veces sin romper nada.
--
-- ORDEN: ANTES de publicar la pestaña Comunicaciones. Al revés, la pestaña
-- fallaría al cargar porque la tabla todavía no existiría.
-- ═══════════════════════════════════════════════════════════


-- ── 1. Campañas ────────────────────────────────────────────
create table if not exists emails_campanas (
  id uuid primary key default gen_random_uuid()
);

-- Columna a columna con "if not exists": si la tabla ya existiera a medias, se
-- completa en vez de fallar.
alter table emails_campanas add column if not exists asunto        text        not null default '';
-- Texto plano por párrafos (separados por una línea en blanco). Nunca HTML:
-- la plantilla lo escapa al pintarlo.
alter table emails_campanas add column if not exists cuerpo        text        not null default '';
-- El botón opcional. No estaban en la lista original, pero sin ellos el
-- historial no podría enseñar el correo tal como se mandó.
alter table emails_campanas add column if not exists boton_texto   text;
alter table emails_campanas add column if not exists boton_url     text;
alter table emails_campanas add column if not exists grupo         text        not null default 'todos';
alter table emails_campanas add column if not exists destinatarios integer     not null default 0;
alter table emails_campanas add column if not exists enviados      integer     not null default 0;
alter table emails_campanas add column if not exists fallidos      integer     not null default 0;
alter table emails_campanas add column if not exists estado        text        not null default 'borrador';
alter table emails_campanas add column if not exists creado_por    uuid        references auth.users(id) on delete set null;
alter table emails_campanas add column if not exists creado_en     timestamptz not null default now();
-- Cuándo se empezó a enviar. Mientras está 'enviando' se actualiza en cada
-- lote: si deja de moverse, el panel sabe que el envío se cortó.
alter table emails_campanas add column if not exists enviado_en    timestamptz;

alter table emails_campanas drop constraint if exists emails_campanas_estado_valido;
alter table emails_campanas add constraint emails_campanas_estado_valido
  check (estado in ('borrador', 'enviando', 'enviado', 'fallido'));

alter table emails_campanas drop constraint if exists emails_campanas_grupo_valido;
alter table emails_campanas add constraint emails_campanas_grupo_valido
  check (grupo in ('todos', 'activos', 'inactivos', 'sin_onboarding'));

create index if not exists emails_campanas_creado_idx on emails_campanas (creado_en desc);

-- Como emails_enviados: sin políticas. Solo la toca el service role, desde el servidor.
alter table emails_campanas enable row level security;


-- ── 2. Enlace de cada envío con su campaña ─────────────────
-- Sin "on delete cascade": borrar una campaña no debe borrar el registro de a
-- quién se le escribió, que es lo que impide escribirle dos veces.
alter table emails_enviados add column if not exists campana_id uuid references emails_campanas(id);

create index if not exists emails_enviados_campana_id_idx on emails_enviados (campana_id, estado);


-- ── 3. Comprobación ────────────────────────────────────────
-- El editor solo enseña el resultado de la última consulta: lanza cada una por separado.
select count(*) as campanas from emails_campanas;
--   0

select count(*) as filas, count(campana_id) as con_campana from emails_enviados;
--   filas 52 · con_campana 0
