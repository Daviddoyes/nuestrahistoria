-- ═══════════════════════════════════════════════════════════
-- GooALS — Fase 3n: corregir la consulta de mapa de 82 gooals
--
-- Los 82 gooals de lugar que se quedaron sin pin fallaban casi todos por lo
-- mismo: la consulta estaba escrita en español y OpenStreetMap guarda el
-- nombre en el idioma del sitio. «Puente de Carlos» no existe para Nominatim;
-- «Karlův most» sí.
--
-- Esto SOLO cambia la columna geo_consulta. No pone ni quita pines: eso lo hace
-- después scripts/catalogo-nuevo/geocodificar.mjs --reintentar.
--
-- SEGURIDAD: todo va en un único bloque "do", que para Postgres es una sola
-- sentencia. Si el número de filas tocadas no es exactamente 82, lanza un
-- error y NO SE GUARDA NADA. Y el update exige estado = 'verificado', así que no
-- puede tocar una fila retirada ni un borrador aunque se le pidiera.
--
-- Cruzado por id y no por título: los ids salen de cruzar el CSV con la base, y
-- un título se puede haber editado por el camino.
--
-- Se pega entero en el SQL Editor.
-- ══════════════════════════════════════════════════════════

do $$
declare
  esperadas constant integer := 82;
  tocadas   integer;
begin
  with nuevas(id, consulta) as (values
    ('1996c13d-ae47-45ff-a364-7503c485c770'::uuid, 'Marina Bay Sands, Singapore'),  -- Bañarte en la piscina del Marina Bay Sands
    ('016e9239-8b3c-40ad-a427-367a79ca2f54'::uuid, 'Perissa, Santorini, Greece'),  -- Bañarte en una playa de arena negra de Santorini
    ('09816d8c-50b3-497c-bc02-17a376b137d7'::uuid, 'Kepulauan Raja Ampat, Indonesia'),  -- Bucear en Raja Ampat
    ('392eed83-8878-4958-90e2-a4b38e42f0c1'::uuid, 'Chatuchak Weekend Market, Bangkok, Thailand'),  -- Comer en el mercado de Chatuchak
    ('60c2a35e-1a27-4e08-a7cf-690757ef1979'::uuid, 'Mercat de Sant Josep la Boqueria, Barcelona'),  -- Comer en el mercado de La Boqueria
    ('8b450183-299a-4826-be90-ade3bd0aed16'::uuid, 'Plaza de Toros de Pamplona, Pamplona, España'),  -- Correr un encierro de San Fermín
    ('4e5c426f-2414-45aa-8787-aa40f11ddacd'::uuid, 'Bosphorus, Istanbul, Turkey'),  -- Cruzar el Bósforo en barco
    ('8e82c462-45aa-445f-b68e-588ca5bec933'::uuid, 'Capilano Suspension Bridge, North Vancouver, Canada'),  -- Cruzar el puente colgante de Capilano
    ('2f0865aa-f867-4c16-b592-fd31ab01b2b0'::uuid, 'Brooklyn Bridge, New York, United States'),  -- Cruzar el puente de Brooklyn
    ('622d7ef2-2def-4a9c-98f3-bf50b1354229'::uuid, 'Karluv most, Praha, Czechia'),  -- Cruzar el Puente de Carlos
    ('eae208d6-d668-4112-bdd2-bb3bdb194494'::uuid, 'Ponte Luis I, Porto, Portugal'),  -- Cruzar el puente Don Luis I
    ('6e75b6f5-c606-4aa1-8902-ea669450cd2a'::uuid, 'Bora-Bora, French Polynesia'),  -- Dormir en un bungalow sobre el agua en Bora Bora
    ('9201888d-e26d-42f1-9212-d62f4a8ba937'::uuid, 'Bourbon Street, New Orleans, United States'),  -- Escuchar jazz en directo en Bourbon Street
    ('b86ddf89-1d4c-40f7-8fe5-8791e6e1cdcd'::uuid, 'Dead Sea'),  -- Flotar en el mar Muerto
    ('688b9de9-d3b1-40ee-bcc7-aeed5b43c254'::uuid, 'Kilimanjaro, Tanzania'),  -- Hacer cumbre en el Kilimanjaro
    ('a9dcc5b8-6e3d-4c46-8485-0a383ebcd194'::uuid, 'Maasai Mara National Reserve, Kenya'),  -- Hacer un safari en el Masái Mara
    ('f6a956ad-3f89-4222-88e3-76abb1201474'::uuid, 'Dubai Desert Conservation Reserve, United Arab Emirates'),  -- Hacer un safari por el desierto de Dubái
    ('47aea84f-edd0-47c8-9205-7afab7005d3b'::uuid, 'Los Remedios, Sevilla, España'),  -- Ir a la Feria de Abril
    ('a254315a-ce1f-428a-acb4-22deeb05acb1'::uuid, 'Piazza San Marco, Venezia, Italia'),  -- Ir al Carnaval de Venecia
    ('9889a40f-aa0c-40a6-9316-559c3e23bda5'::uuid, 'Mathura, Uttar Pradesh, India'),  -- Jugar al Holi en India
    ('db29e17c-5b71-425a-a566-c50cfeb3c1ee'::uuid, 'Old Course, St Andrews, Scotland'),  -- Jugar en el Old Course de St Andrews
    ('ceb6c137-23ba-4c79-bb55-a16436f46e4f'::uuid, 'Everest Base Camp, Nepal'),  -- Llegar al campo base del Everest
    ('ee1834e6-fd8a-49bd-ba4d-24e83223bfd5'::uuid, 'Chiang Mai, Thailand'),  -- Mojarte en el Songkran
    ('62e70c5e-7121-4af8-af7a-140499c6b9e0'::uuid, 'London Eye, Lambeth, London'),  -- Montar en el London Eye
    ('4483a63c-9c88-488d-949c-c196f6b2051e'::uuid, 'Praca Martim Moniz, Lisboa, Portugal'),  -- Montar en el tranvía 28 de Lisboa
    ('77c9ceb0-025e-4485-99dd-573a9b918145'::uuid, 'Amazon River, Peru'),  -- Navegar por el Amazonas
    ('5741b32a-4583-4d41-87e7-7dbf9a1d5c3e'::uuid, 'Okavango Delta, Botswana'),  -- Navegar por el delta del Okavango
    ('5ca4b7f0-c2e8-46fa-9e34-1d60f7a33e8e'::uuid, 'Canal Grande, Venezia, Italia'),  -- Pasear en góndola por Venecia
    ('45bf28c5-3352-4ef5-a264-ba89f81d2ad8'::uuid, 'Arashiyama, Kyoto, Japan'),  -- Pasear por el bosque de bambú de Arashiyama
    ('0902cad5-78d8-46aa-a878-3dc546c77d53'::uuid, 'The Bund, Shanghai, China'),  -- Pasear por el Bund
    ('06663193-7e8f-4bd1-b99e-320fc18c178d'::uuid, 'Hoan Kiem, Hanoi, Vietnam'),  -- Pasear por el casco antiguo de Hanói
    ('3890df16-3ee0-4398-96da-f1fc8463d9da'::uuid, 'Malecon, La Habana, Cuba'),  -- Pasear por el Malecón de La Habana
    ('9896bc44-68bb-4b7c-bcfd-89e0a3271278'::uuid, 'Miraflores, Lima, Perú'),  -- Pasear por el Malecón de Miraflores
    ('8fc33d17-9e17-4012-a91a-8c75b049bda5'::uuid, 'Hollywood Walk of Fame, Los Angeles, United States'),  -- Pasear por el Paseo de la Fama
    ('9766f1e8-eed1-4ee2-8589-3eaf13c7b33b'::uuid, 'Staromestske namesti, Praha, Czechia'),  -- Pasear por la Plaza de la Ciudad Vieja de Praga
    ('c26a7f4a-686e-4328-8b18-d83c3ea178dd'::uuid, 'Royal Mile, Edinburgh, Scotland'),  -- Pasear por la Royal Mile
    ('889e9209-80c2-46f1-bc86-3a4b15794cf6'::uuid, 'Souk Semmarine, Marrakech, Morocco'),  -- Perderte en los zocos de Marrakech
    ('78dc2d7a-3247-4c87-be51-f29eac578a4e'::uuid, 'Annapurna Conservation Area, Nepal'),  -- Recorrer el circuito del Annapurna
    ('0cad314e-62ba-433d-a6a7-4b6184a3b7e9'::uuid, 'Thingvellir, Iceland'),  -- Recorrer el Círculo Dorado
    ('25f5ca3c-20d7-4e03-ad62-dae6d84f8f4b'::uuid, 'Xi''an City Wall, Xi''an, China'),  -- Recorrer la muralla de Xi'an
    ('a4551383-34c9-4717-ad59-1620a205da4c'::uuid, 'Lofoten, Norway'),  -- Recorrer las islas Lofoten
    ('f0033255-f41a-497f-a4ce-68e7d4ac8b25'::uuid, 'Stari Grad, Dubrovnik, Croatia'),  -- Recorrer las murallas de Dubrovnik
    ('19cb0130-49bb-462e-98a8-ef8638a2c8ee'::uuid, 'Chiang Mai, Thailand'),  -- Soltar un farolillo en el Yi Peng
    ('d934f31e-ccd3-452e-807e-2ca1a47b79c6'::uuid, 'Vinicunca, Pitumarca, Perú'),  -- Subir a la Montaña de Colores
    ('8c7d0d3e-a5b0-4f88-a33a-a21c3e4fd0d2'::uuid, 'CN Tower, Toronto, Canada'),  -- Subir a la Torre CN
    ('ffc990b1-1908-46d5-8167-82abd1687be1'::uuid, 'N Seoul Tower, Seoul, South Korea'),  -- Subir a la Torre Namsan
    ('c803e2bf-df17-4000-8e91-e4c8539e309d'::uuid, 'Srd, Dubrovnik, Croatia'),  -- Subir al monte Srd en teleférico
    ('890acd73-e4e3-4088-a06f-5ebc5b5652f3'::uuid, 'Pao de Acucar, Rio de Janeiro, Brasil'),  -- Subir al Pan de Azúcar
    ('9a2dea75-a0e3-480a-b166-0a8b0325863a'::uuid, 'Alto del Angliru, Asturias, España'),  -- Subir en bici al Angliru
    ('587d0020-80f3-4dd8-95ff-6ea5e358d4d6'::uuid, 'Gunung Batur, Bali, Indonesia'),  -- Ver el amanecer desde el monte Batur
    ('808ffe02-7234-4ce4-a935-6341bf3483a7'::uuid, 'Hollywood Sign, Los Angeles, United States'),  -- Ver el cartel de Hollywood
    ('4a79645f-e753-4388-acfc-f991b50371bb'::uuid, 'Ngorongoro Crater, Tanzania'),  -- Ver el cráter del Ngorongoro
    ('eb686a10-6e61-4540-bf51-1673afb682e2'::uuid, 'Valle de la Luna, San Pedro de Atacama, Chile'),  -- Ver el desierto de Atacama
    ('60048c13-edff-4301-b1bd-fb69edd7b092'::uuid, 'Prazsky orloj, Praha, Czechia'),  -- Ver el Reloj Astronómico de Praga
    ('40837144-b98b-4127-a94d-b5161ab3f9b5'::uuid, 'The Dubai Fountain, Dubai'),  -- Ver la Fuente de Dubái
    ('47379ba7-d572-465f-85b8-5058354a8011'::uuid, 'Cenacolo Vinciano, Milano, Italia'),  -- Ver La Última Cena de Leonardo
    ('0d80bea8-9285-440c-b207-2f157d24f4ee'::uuid, 'Niagara Falls, Ontario, Canada'),  -- Ver las cataratas del Niágara
    ('ce9c0c40-6ca7-4452-945c-f902089c813c'::uuid, 'Victoria Falls, Zambia'),  -- Ver las cataratas Victoria
    ('055ed457-a06a-44e2-9e1a-953c2e81ac2a'::uuid, 'Chouara Tannery, Fes, Morocco'),  -- Ver las curtidurías de Fez
    ('10eba2ed-7288-4655-ac2e-f91686bd997d'::uuid, 'Fountains of Bellagio, Las Vegas, United States'),  -- Ver las fuentes del Bellagio
    ('e7bd6ad6-2c4c-4bb6-ba5d-56e15907f497'::uuid, 'Tegalalang Rice Terrace, Bali, Indonesia'),  -- Ver las terrazas de arroz de Tegallalang
    ('46e5d3d8-1fc4-4bba-8b4e-e3c4a318f5e7'::uuid, 'Deadvlei, Namib-Naukluft, Namibia'),  -- Ver los árboles muertos de Deadvlei
    ('551c92fd-a569-494a-a5d8-b1e0f2a898c4'::uuid, 'Ilulissat Icefjord, Greenland'),  -- Ver un iceberg en Groenlandia
    ('b01b7af9-5378-4eff-b7a7-c296fa869367'::uuid, 'All England Lawn Tennis and Croquet Club, London'),  -- Ver un partido en la pista central de Wimbledon
    ('fc411c07-65de-43e5-8454-b3349465250c'::uuid, 'Circuit de Monaco, Monaco'),  -- Ver una carrera en el circuito de Mónaco
    ('8880bfda-2d71-43fd-973c-36479007a9f6'::uuid, 'Autodromo Nazionale Monza, Monza, Italia'),  -- Ver una carrera en Monza
    ('7770e946-9c8a-4329-b3c6-20200b149a7b'::uuid, 'Silverstone Circuit, Northamptonshire, United Kingdom'),  -- Ver una carrera en Silverstone
    ('052aa589-e1a0-477d-bbd7-b0d94e4db5b2'::uuid, 'Circuit de Spa-Francorchamps, Stavelot, Belgique'),  -- Ver una carrera en Spa-Francorchamps
    ('0472a3a4-76e8-4cba-971e-626af1a2326d'::uuid, 'Catedral de Sevilla, Sevilla, España'),  -- Ver una procesión de la Semana Santa de Sevilla
    ('a4d8653e-310a-4165-a796-3f7f8f30708a'::uuid, 'Prazsky hrad, Praha, Czechia'),  -- Visitar el Castillo de Praga
    ('44c80dbf-c29d-4edb-b21b-b12197590bea'::uuid, 'Denkmal fur die ermordeten Juden Europas, Berlin'),  -- Visitar el Memorial del Holocausto
    ('bea14212-6beb-4002-bfe7-655cc699d470'::uuid, 'Museum of Islamic Art, Doha, Qatar'),  -- Visitar el Museo de Arte Islámico de Doha
    ('877e8c3e-c6ce-4035-aad4-1f91abe988c7'::uuid, 'Topkapi Sarayi, Istanbul, Turkey'),  -- Visitar el Palacio de Topkapi
    ('eb0cba06-8cc2-45ad-af1d-a5dd63b0b977'::uuid, 'Pantheon, Roma, Italia'),  -- Visitar el Panteón de Roma
    ('d56d74fa-7c82-478d-ac47-e6a694ff13e8'::uuid, 'Karnak Temple, Luxor, Egypt'),  -- Visitar el templo de Karnak
    ('de45ef44-4fd9-4c5f-853b-959ba4a2c5a4'::uuid, 'Doi Suthep, Chiang Mai, Thailand'),  -- Visitar el templo Doi Suthep
    ('33c94d36-c3e1-4c42-80ce-75fd219e889e'::uuid, 'Cappella Sistina, Citta del Vaticano'),  -- Visitar la Capilla Sixtina
    ('7865a52a-2582-4ddb-9385-278331cd8960'::uuid, 'Anne Frank Huis, Amsterdam, Nederland'),  -- Visitar la Casa de Ana Frank
    ('6f08d172-9656-4f08-a7c9-0c268b7cddde'::uuid, 'Galleria degli Uffizi, Firenze, Italia'),  -- Visitar la Galería Uffizi
    ('5040124b-7cd5-4b77-96f6-ad47aced9168'::uuid, 'Museumsinsel, Berlin, Deutschland'),  -- Visitar la Isla de los Museos
    ('f6b3d89f-efc2-4d60-8e56-d9cc7ab0882f'::uuid, 'Piazza San Marco, Venezia, Italia'),  -- Visitar la Plaza de San Marcos
    ('3a0d52c7-a4f1-4790-88af-c20b5951356d'::uuid, 'Tivoli, Kobenhavn, Danmark')  -- Visitar los Jardines de Tivoli
  )
  update gooals_v2 g
  set geo_consulta = n.consulta
  from nuevas n
  where g.id = n.id
    and g.estado = 'verificado';   -- nunca un retirado, nunca un borrador

  get diagnostics tocadas = row_count;

  if tocadas <> esperadas then
    raise exception
      'Se esperaban % filas y se han tocado %. No se guarda nada. Alguna de las 82 ha cambiado de estado o ya no existe: hay que volver a cruzar el CSV.',
      esperadas, tocadas;
  end if;

  raise notice 'Consultas de mapa corregidas: %', tocadas;
end $$;


-- ══════════════════════════════════════════════════════════
-- COMPROBACIÓN. Cada consulta por separado.
-- ══════════════════════════════════════════════════════════

-- 1 · Cuántos de lugar siguen sin pin. Tienen que seguir siendo 83:
--     esto corrige la consulta, NO pone el pin.
--
--     Y son 83, no 82, a propósito: las 82 del CSV son las escritas a mano, y
--     la que sobra es «Recorrer el carril bici más largo del mundo», uno de los
--     viejos que se quedaron publicados porque alguien lo tiene conquistado.
--     Ese nunca tuvo pin y no está en el CSV.
select count(*) as sin_pin from gooals_v2
where ambito = 'lugar' and estado = 'verificado' and lat is null;
--   83

-- 2 · Y que ninguna se quedó con la consulta vieja en español.
select count(*) as en_espanol from gooals_v2
where ambito = 'lugar' and estado = 'verificado' and lat is null
  and geo_consulta ~* '^(Puente|Catedral|Capilla|Mercado|Circuito|Templo|Palacio|Museo) de ';
--   0

-- 3 · Una muestra, para verla con los ojos.
select titulo, geo_consulta from gooals_v2
where ambito = 'lugar' and estado = 'verificado' and lat is null
order by titulo limit 10;
