-- ═══════════════════════════════════════════════════════════
-- GooALS — Fase 3o: las siete consultas que faltaban, y una errata de país
--
-- De los ocho gooals que seguían sin pin, SIETE tienen arreglo. Cada consulta
-- de aquí se probó una a una contra Nominatim antes de escribirla, y de cada
-- una se comprobó que el resultado cae en el país correcto. No hay ninguna
-- escrita a ojo.
--
-- El octavo, «Dormir en un bungalow sobre el agua en Bora Bora», se queda sin
-- pin: dos intentos y ninguno devuelve nada en Polinesia Francesa.
--
-- Y «Recorrer el carril bici más largo del mundo» se queda sin pin a propósito,
-- porque no es un sitio concreto. A ese se le arregla solo el país, que estaba
-- escrito «Korea del sud».
--
-- Esto SOLO cambia geo_consulta y un país. No pone ningún pin: eso lo hace
-- después scripts/catalogo-nuevo/geocodificar.mjs --reintentar.
--
-- SEGURIDAD: un único bloque "do", que para Postgres es una sola sentencia. Si
-- las cuentas no cuadran, lanza un error y NO SE GUARDA NADA. Los dos updates
-- exigen estado = 'verificado', así que no pueden tocar un retirado ni un
-- borrador aunque se les pidiera.
--
-- Se pega entero en el SQL Editor.
-- ═══════════════════════════════════════════════════════════

do $$
declare
  esperadas_consultas constant integer := 7;
  esperadas_paises    constant integer := 1;
  tocadas_consultas   integer;
  tocadas_paises      integer;
begin
  -- ── Las siete consultas, con lo que devolvió cada una al probarla ──
  with nuevas(id, consulta) as (values
    ('b86ddf89-1d4c-40f7-8fe5-8791e6e1cdcd'::uuid, 'Ein Bokek, Israel'),
    -- Flotar en el mar Muerto → עין בוקק [village] 31.2014, 35.3639 · Israel
    -- La orilla israelí, como decidiste: el mar Muerto hace frontera y OSM lo
    -- asignaba a Territorios Palestinos.

    ('a9dcc5b8-6e3d-4c46-8485-0a383ebcd194'::uuid, 'Masai Mara National Reserve, Kenya'),
    -- Hacer un safari en el Masái Mara → Masai Mara National Reserve
    -- [nature_reserve] -1.4881, 35.1054 · Kenia. Con una sola "a": "Maasai" no
    -- devolvía nada.

    ('0cad314e-62ba-433d-a6a7-4b6184a3b7e9'::uuid, 'Þingvellir, Iceland'),
    -- Recorrer el Círculo Dorado → Þingvellir [locality] 64.2591, -21.1213 ·
    -- Islandia. La Þ islandesa es lo que lo arregla: escrito "Thingvellir"
    -- devolvía un Thingvellir que está en REINO UNIDO.

    ('c803e2bf-df17-4000-8e91-e4c8539e309d'::uuid, 'Srđ, Dubrovnik, Croatia'),
    -- Subir al monte Srd en teleférico → Srđ [peak] 42.6506, 18.1097 · Croacia.
    -- Con la đ croata: sin ella devolvía "Sardoal", que está en PORTUGAL.

    ('9a2dea75-a0e3-480a-b166-0a8b0325863a'::uuid, 'L''Angliru, Riosa, Asturias'),
    -- Subir en bici al Angliru → L'Angliru [meadow] 43.2198, -5.9407 · España.
    -- Así lo llama OSM, en asturiano.

    ('60048c13-edff-4301-b1bd-fb69edd7b092'::uuid, 'Staroměstská radnice, Praha'),
    -- Ver el Reloj Astronómico de Praga → Staroměstská radnice [attraction]
    -- 50.0870, 14.4203 · Chequia. El reloj no está en OSM como objeto propio:
    -- es parte del ayuntamiento de la Ciudad Vieja, que es donde está el reloj.
    -- "Pražský orloj" con diacríticos tampoco devolvía nada.

    ('b01b7af9-5378-4eff-b7a7-c296fa869367'::uuid, 'Centre Court, Wimbledon, London')
    -- Ver un partido en la pista central de Wimbledon → Centre Court [stadium]
    -- 51.4338, -0.2140 · Reino Unido. La pista, no el club entero.
  )
  update gooals_v2 g
  set geo_consulta = n.consulta
  from nuevas n
  where g.id = n.id
    and g.estado = 'verificado';   -- nunca un retirado, nunca un borrador

  get diagnostics tocadas_consultas = row_count;

  -- ── La errata del país ──────────────────────────────────
  -- Un solo gooal lo tenía escrito «Korea del sud»: «Recorrer el carril bici
  -- más largo del mundo». Los otros 53 de ese país dicen «Corea del Sur».
  -- No es cosmético: el geocodificador traduce el país a código ISO para
  -- comprobar que el pin cae donde debe, y un país mal escrito rompe esa
  -- comprobación.
  update gooals_v2
  set pais = 'Corea del Sur'
  where pais = 'Korea del sud'
    and estado = 'verificado';

  get diagnostics tocadas_paises = row_count;

  -- ── Los frenos ──────────────────────────────────────────
  if tocadas_consultas <> esperadas_consultas then
    raise exception
      'Se esperaban % consultas y se han tocado %. No se guarda nada. Alguna ha cambiado de estado o ya no existe.',
      esperadas_consultas, tocadas_consultas;
  end if;
  if tocadas_paises <> esperadas_paises then
    raise exception
      'Se esperaba % país corregido y se han tocado %. No se guarda nada.',
      esperadas_paises, tocadas_paises;
  end if;

  raise notice 'Consultas corregidas: % · países corregidos: %', tocadas_consultas, tocadas_paises;
end $$;


-- ═══════════════════════════════════════════════════════════
-- COMPROBACIÓN. Cada consulta por separado.
-- ═══════════════════════════════════════════════════════════

-- 1 · Que ya no queda ningún país mal escrito.
select count(*) as mal_escritos from gooals_v2 where pais = 'Korea del sud';
--   0

-- 2 · Las siete consultas nuevas, para verlas.
select titulo, geo_consulta, lat is null as sin_pin from gooals_v2
where id in (
  'b86ddf89-1d4c-40f7-8fe5-8791e6e1cdcd', 'a9dcc5b8-6e3d-4c46-8485-0a383ebcd194',
  '0cad314e-62ba-433d-a6a7-4b6184a3b7e9', 'c803e2bf-df17-4000-8e91-e4c8539e309d',
  '9a2dea75-a0e3-480a-b166-0a8b0325863a', '60048c13-edff-4301-b1bd-fb69edd7b092',
  'b01b7af9-5378-4eff-b7a7-c296fa869367')
order by titulo;
--   las siete con su consulta nueva y sin_pin = true
--   (el pin lo pone el geocodificador después, no esto)

-- 3 · Cuántos de lugar siguen sin pin. Tienen que seguir siendo 9:
--     esto corrige las consultas, no pone los pines.
select count(*) as sin_pin from gooals_v2
where ambito = 'lugar' and estado = 'verificado' and lat is null;
--   9
