-- ═══════════════════════════════════════════════════════════
-- GooALS — Fase 3p: tres pines que estaban en otro sitio, y un dato falso
--
-- Sale de medir la distancia entre cada pin y la ciudad de su gooal. De 47
-- pines marcados "revisar", nueve se pasaban de 50 km; de esos nueve, tres
-- estaban de verdad en otro sitio, tres eran correctos (lo que fallaba era mi
-- referencia de ciudad) y tres son sitios enormes donde la distancia es normal.
--
-- Las cuatro consultas se probaron una a una contra Nominatim antes de
-- escribirlas, y de cada una se comprobó que cae en el país correcto.
--
-- TRES DE LAS CUATRO YA TIENEN PIN, el equivocado. Cambiarles la consulta no
-- basta: el geocodificador solo mira las filas SIN coordenadas, así que aquí se
-- les quita el pin malo para que vuelva a buscarlas. Es el paso que se escapa
-- si solo se piensa en la consulta.
--
-- EL CASO DEL NIÁGARA ES DISTINTO y conviene no confundirlo: ahí el pin está
-- BIEN y se queda. Lo que está mal es el gooal, que dice que las cataratas del
-- Niágara están en Toronto. Están en Niagara Falls, a 66 km. No se corrige una
-- consulta: se corrige un dato falso del catálogo.
--
-- SEGURIDAD: un único bloque "do". Si las cuentas no cuadran, lanza un error y
-- NO SE GUARDA NADA. Los updates exigen estado = 'verificado', así que no
-- pueden tocar un retirado ni un borrador.
--
-- Se pega entero en el SQL Editor.
-- ═══════════════════════════════════════════════════════════

do $$
declare
  esperadas_consultas constant integer := 4;
  esperados_pines     constant integer := 3;
  esperadas_ciudades  constant integer := 1;
  tocadas_consultas   integer;
  tocados_pines       integer;
  tocadas_ciudades    integer;
begin
  -- ── 1. Las cuatro consultas, con lo que devolvió cada una ──
  with nuevas(id, consulta) as (values
    ('d53e84df-9318-4be1-b54e-8609f1e5d197'::uuid, 'Lake Louise, Alberta, Canada'),
    -- Ver el lago Louise → Lake Louise [hamlet] 51.4250, -116.1775 · Canadá.
    -- El pin anterior estaba en QUEBEC, a 3.260 km: hay otro lago Louise allí.

    ('278db022-b26b-4000-b4e2-cf6a84c6bdfe'::uuid, 'Buñol, Valencia, España'),
    -- Tirar tomates en La Tomatina → Buñol [administrative] 39.4190, -0.7910 ·
    -- España. El pin anterior estaba en la costa de Granada, a 381 km. La
    -- Tomatina no es un sitio: es Buñol el día que se celebra.

    ('6aa39291-2879-4afe-b9e7-aafbb3f8388e'::uuid, 'Plaça de l''Ajuntament, València'),
    -- Ver la cremà de las Fallas → Plaça de l'Ajuntament [pedestrian] 39.4706,
    -- -0.3768 · España. El pin anterior estaba cerca de Alicante, a 116 km.
    -- Hay tres plazas del Ayuntamiento en la Comunidad Valenciana; la buena es
    -- la primera que devuelve, la de València capital, donde se quema la falla.

    ('6e75b6f5-c606-4aa1-8902-ea669450cd2a'::uuid, 'Vaitape, Bora-Bora')
    -- Dormir en un bungalow sobre el agua en Bora Bora → Vaitape [town]
    -- -16.5065, -151.7514. Tercer y último intento, y sale.
    --
    -- OJO: OSM da este sitio con el país FRANCIA, no Polinesia Francesa, porque
    -- es una colectividad francesa. La comprobación de país del geocodificador
    -- acepta ya los dos códigos para este caso; sin eso rechazaría una
    -- respuesta correcta, que es lo que hacía.
  )
  update gooals_v2 g
  set geo_consulta = n.consulta
  from nuevas n
  where g.id = n.id
    and g.estado = 'verificado';

  get diagnostics tocadas_consultas = row_count;

  -- ── 2. Quitar los tres pines equivocados ────────────────
  -- Sin esto, el geocodificador no los vuelve a mirar: solo busca los que no
  -- tienen coordenadas. Bora Bora no está aquí porque nunca tuvo pin.
  update gooals_v2
  set lat = null, lng = null, geo = null
  where id in (
    'd53e84df-9318-4be1-b54e-8609f1e5d197',   -- lago Louise, el pin estaba en Quebec
    '278db022-b26b-4000-b4e2-cf6a84c6bdfe',   -- La Tomatina, el pin estaba en Granada
    '6aa39291-2879-4afe-b9e7-aafbb3f8388e'    -- las Fallas, el pin estaba en Alicante
  )
    and estado = 'verificado';

  get diagnostics tocados_pines = row_count;

  -- ── 3. El dato falso ────────────────────────────────────
  -- Las cataratas del Niágara no están en Toronto. Su pin está bien puesto y NO
  -- se toca; era la ciudad la que mentía, y por eso la comprobación de
  -- distancia lo marcó como "a 66 km de su ciudad".
  update gooals_v2
  set ciudad = 'Niagara Falls'
  where id = '0d80bea8-9285-440c-b207-2f157d24f4ee'
    and ciudad = 'Toronto'
    and estado = 'verificado';

  get diagnostics tocadas_ciudades = row_count;

  -- ── Los frenos ──────────────────────────────────────────
  if tocadas_consultas <> esperadas_consultas then
    raise exception 'Se esperaban % consultas y se han tocado %. No se guarda nada.',
      esperadas_consultas, tocadas_consultas;
  end if;
  if tocados_pines <> esperados_pines then
    raise exception 'Se esperaba quitar % pines y se han tocado %. No se guarda nada.',
      esperados_pines, tocados_pines;
  end if;
  if tocadas_ciudades <> esperadas_ciudades then
    raise exception 'Se esperaba % ciudad corregida y se han tocado %. No se guarda nada. ¿Ya estaba corregida?',
      esperadas_ciudades, tocadas_ciudades;
  end if;

  raise notice 'Consultas: % · pines quitados: % · ciudades: %',
    tocadas_consultas, tocados_pines, tocadas_ciudades;
end $$;


-- ═══════════════════════════════════════════════════════════
-- COMPROBACIÓN. Cada consulta por separado.
-- ═══════════════════════════════════════════════════════════

-- 1 · Los cinco gooals que toca esto.
select titulo, ciudad, geo_consulta, lat is null as sin_pin from gooals_v2
where id in (
  'd53e84df-9318-4be1-b54e-8609f1e5d197', '278db022-b26b-4000-b4e2-cf6a84c6bdfe',
  '6aa39291-2879-4afe-b9e7-aafbb3f8388e', '6e75b6f5-c606-4aa1-8902-ea669450cd2a',
  '0d80bea8-9285-440c-b207-2f157d24f4ee')
order by titulo;
--   Los cuatro primeros: consulta nueva y sin_pin = true (esperando al
--   geocodificador). El Niágara: ciudad = Niagara Falls y sin_pin = FALSE,
--   porque su pin estaba bien y no se toca.

-- 2 · Que el Niágara ya no dice Toronto.
select count(*) as sigue_en_toronto from gooals_v2
where titulo = 'Ver las cataratas del Niágara' and ciudad = 'Toronto';
--   0

-- 3 · Cuántos de lugar quedan sin pin.
select count(*) as sin_pin from gooals_v2
where ambito = 'lugar' and estado = 'verificado' and lat is null;
--   5  = los cuatro de arriba esperando al geocodificador, más «Recorrer el
--        carril bici más largo del mundo», que se queda sin pin a propósito
--        porque no es un sitio concreto.
