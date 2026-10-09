-- ═══════════════════════════════════════════════════════════
-- GooALS — Fase 3z: de dónde viene cada foto
--
-- ── QUÉ RESUELVE ──────────────────────────────────────────
--
-- Hasta hoy todas las fotos venían de Wikimedia Commons y la regla era simple:
-- las cuatro columnas (`imagen_url`, `foto_autor`, `foto_licencia`,
-- `foto_origen`) van siempre juntas. Desde que hay fotos generadas con IA esa
-- regla deja de valer: una imagen generada NO tiene autor ni licencia, y
-- escribir «Generada con IA» en `foto_autor` sería llamar autor a lo que no lo
-- es — dos cosas distintas con el mismo nombre, que es justo la trampa que este
-- repo ya ha pagado una vez.
--
-- Así que la regla pasa a ser CONDICIONAL: depende de de dónde venga la foto.
--
-- ── POR QUÉ UNA COLUMNA NUEVA Y NO REUSAR foto_origen ─────
--
-- La idea era que `foto_origen` dijera 'commons' o 'ia'. No se hace, y la razón
-- está escrita en CLAUDE.md: **si cambia el significado, cambia el nombre.**
--
-- `foto_origen` guarda HOY la dirección de la página de Commons, y
-- `CreditoFoto.tsx` la usa como `href` del enlace. Si pasara a guardar la
-- palabra 'commons', ese enlace apuntaría a una página que no existe **y nada
-- daría error**: el tipo sigue siendo texto, compila igual, y el crédito
-- seguiría pintándose con un enlace roto para siempre.
--
-- Por eso se añade `foto_fuente`, que es lo que de verdad es nuevo, y
-- `foto_origen` se queda significando lo que significaba.
-- ═══════════════════════════════════════════════════════════


-- ── 1 · Las dos columnas nuevas ───────────────────────────
alter table gooals_v2 add column if not exists foto_fuente text;
alter table gooals_v2 add column if not exists foto_prompt text;

comment on column gooals_v2.foto_fuente is
  'De dónde sale la imagen: commons o ia. Decide qué otras columnas son obligatorias.';
comment on column gooals_v2.foto_prompt is
  'Solo para foto_fuente = ia: el prompt exacto con el que se generó. Es lo que permite retocarla y volver a generarla.';
comment on column gooals_v2.foto_origen is
  'Solo para foto_fuente = commons: la dirección de la pagina del fichero en Wikimedia Commons. NO es el nombre de la fuente.';


-- ── 2 · Lo que ya hay viene todo de Commons ───────────────
-- Las 275 filas con foto de hoy son de Commons sin excepción: el guion que las
-- subió es scripts/fotos-catalogo/subir.mjs y no existía otro camino.
update gooals_v2 set foto_fuente = 'commons'
where imagen_url is not null and foto_fuente is null;


-- ── 3 · Solo esos dos valores ─────────────────────────────
alter table gooals_v2 drop constraint if exists gooals_v2_foto_fuente_valida;
alter table gooals_v2 add constraint gooals_v2_foto_fuente_valida
  check (foto_fuente is null or foto_fuente in ('commons', 'ia'));


-- ── 4 · La restricción que llevaba pendiente desde el 5-10 ──
--
-- Deja de ser «siempre autor» y pasa a ser «autor SI viene de Commons».
--
-- Las tres situaciones legales, y ninguna más:
--   · sin foto            → da igual todo lo demás
--   · foto de Commons     → autor, licencia y origen obligatorios; sin prompt
--   · foto generada       → ni autor ni licencia; prompt obligatorio
--
-- Lo que impide: una foto de Commons sin saber quién la hizo (que obligaría a
-- borrarla), y una foto generada sin el prompt (que no se podría retocar nunca,
-- y entonces habría que volver a inventarla de cero).
alter table gooals_v2 drop constraint if exists gooals_v2_foto_con_autor;
alter table gooals_v2 add constraint gooals_v2_foto_con_autor
  check (
    imagen_url is null or imagen_url = ''
    or (
      foto_fuente = 'commons'
      and foto_autor is not null and foto_autor <> ''
      and foto_licencia is not null and foto_licencia <> ''
      and foto_origen is not null and foto_origen <> ''
    )
    or (
      foto_fuente = 'ia'
      and (foto_autor is null or foto_autor = '')
      and (foto_licencia is null or foto_licencia = '')
      and foto_prompt is not null and foto_prompt <> ''
    )
  );


-- ── LA COMPROBACIÓN ───────────────────────────────────────
select
  coalesce(foto_fuente, '(sin fuente)') as fuente,
  count(*) filter (where imagen_url is not null) as con_foto,
  count(*) filter (where imagen_url is null) as sin_foto,
  count(*) filter (where foto_autor is not null) as con_autor,
  count(*) filter (where foto_prompt is not null) as con_prompt
from gooals_v2
group by 1 order by 1;
--   commons      → 275 con foto, 275 con autor, 0 con prompt
--   (sin fuente) → 0 con foto. Si aquí sale alguna CON foto, es una fila que la
--                  restricción no debería haber dejado pasar: mírala.


-- ═══════════════════════════════════════════════════════════
-- APLICADO el 9-10-2026
--
-- Esto estuvo escrito y SIN PEGAR desde el 5-10 por una razón: el panel de
-- admin mandaba imagen_url a secas, sin autor ni licencia, y con la
-- restricción puesta crear un gooal con foto habría dado error al guardar.
--
-- Se levantó el 9-10 añadiendo los campos al panel. El criterio vive en
-- src/lib/foto-credito.ts y lo comprueban el formulario y la ruta de la API,
-- que es el freno de verdad. Si cambia la restricción de aquí, cambia ese
-- fichero, y al revés.
-- ═══════════════════════════════════════════════════════════
