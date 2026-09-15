-- ═══════════════════════════════════════════════════════════
-- GooALS — Fase 3g: seis categorías en vez de siete
--
--   viajes · naturaleza · eventos · deporte · gastronomia · vida
--
--   Desaparecen cultura, musica y aventura. espectaculos pasa a llamarse eventos.
--   La regla para repartir: lo que VES o DÓNDE ESTÁS es naturaleza, HACER la
--   actividad es deporte y el TÍTULO que consigues (cursos, certificaciones) es vida.
--
--   categoria_dudosa  true donde la regla no estaba segura. Esas filas llevan
--                     la mejor apuesta, siguen publicadas y se repasan en el panel.
--   geo = 'rehacer'   pines de viajes que OpenStreetMap sitúa en un comercio, un
--                     bar o una parada de al lado, no en el propio sitio.
--
-- Se pega entero en el SQL Editor. Todo va dentro de una transacción: si una
-- comprobación falla, se deshace entero y la base queda como estaba.
--
-- ORDEN: pégalo justo antes de publicar el código de las seis categorías. Entre
-- una cosa y otra, la app aún conoce las siete viejas: los filtros de Explorar y
-- del mapa no encontrarán nada, y crear un gooal en el panel dará error.
-- ═══════════════════════════════════════════════════════════


-- ── 0. Comprobación previa (solo lee) ──────────────────────
-- Si algún número no coincide con el comentario, PARA y mándamelo.
select categoria, count(*) from gooals_v2 group by 1 order by 1;
--   aventura     |   225
--   cultura      |   437
--   deporte      |   605
--   espectaculos |   808
--   gastronomia  |   598
--   musica       |    53
--   viajes       |  2000


begin;

-- ── 1. Salvaguarda ─────────────────────────────────────────
-- Las listas de ids de abajo salen de una copia del catálogo leída el 15-9-2026.
-- Si la base ha cambiado desde entonces, no se toca nada.
do $$
declare
  hay int;
begin
  select count(*) into hay from gooals_v2 where categoria = 'viajes';
  if hay <> 2000 then raise exception 'viajes: esperaba 2000, hay %', hay; end if;
  select count(*) into hay from gooals_v2 where categoria = 'deporte';
  if hay <> 605 then raise exception 'deporte: esperaba 605, hay %', hay; end if;
  select count(*) into hay from gooals_v2 where categoria = 'musica';
  if hay <> 53 then raise exception 'musica: esperaba 53, hay %', hay; end if;
  select count(*) into hay from gooals_v2 where categoria = 'gastronomia';
  if hay <> 598 then raise exception 'gastronomia: esperaba 598, hay %', hay; end if;
  select count(*) into hay from gooals_v2 where categoria = 'cultura';
  if hay <> 437 then raise exception 'cultura: esperaba 437, hay %', hay; end if;
  select count(*) into hay from gooals_v2 where categoria = 'aventura';
  if hay <> 225 then raise exception 'aventura: esperaba 225, hay %', hay; end if;
  select count(*) into hay from gooals_v2 where categoria = 'espectaculos';
  if hay <> 808 then raise exception 'espectaculos: esperaba 808, hay %', hay; end if;
  select count(*) into hay from gooals_v2;
  if hay <> 4726 then raise exception 'total: esperaba 4726, hay %', hay; end if;
end $$;


-- ── 2. La columna categoria_dudosa ─────────────────────────
alter table gooals_v2 add column if not exists categoria_dudosa boolean not null default false;


-- ── 3. Mover cada gooal ────────────────────────────────────
-- Primero las excepciones, fila a fila; después el resto de cada categoría vieja
-- va a su destino por defecto. En ese orden, porque viajes y deporte existen
-- antes y después: moviendo primero "todo cultura a viajes" ya no se sabría qué
-- viajes eran viajes de origen.
-- La condición "and categoria = ..." evita mover una fila que no sea de donde creemos.
drop table if exists fase3g_excepciones;
create temp table fase3g_excepciones (id uuid primary key, vieja text not null, nueva text not null);

-- viajes → naturaleza: 888
insert into fase3g_excepciones (id, vieja, nueva)
select id::uuid, 'viajes', 'naturaleza' from unnest(array[
    '00753960-fa26-45f7-ac7b-22db184a4654', '007a5eff-d3ca-4169-95ee-838c65051df1', '00d5017c-27e9-4d9d-8d6f-c469323925b1',
    '015ec561-d201-4c2b-9d43-05e96fda9028', '016523cd-558c-4dd4-b1be-5643a72ebc0b', '01b41f46-cb5c-4a97-9a0a-37aca5295ce7',
    '01d4084e-b2e1-49aa-b3f0-303b73003521', '02b59483-1e6a-4e81-98b5-451fcc154ce7', '02e11274-381e-419c-867f-0e2c430c6c43',
    '033a981e-8db1-423a-9c14-a2f716bc7abf', '03cd75a4-5994-445e-bb5e-1019a4038744', '0466be07-e7dd-493d-aa5a-9c48f5e18fbd',
    '04ee9324-5178-4c60-82f9-f273ba4b5c12', '05348d88-c49f-4d54-b4f1-1d4c1d211835', '0591521c-8b00-4ca4-9d38-bba06b3c1786',
    '0613424e-02b5-4e7f-b179-3be9c201ee55', '068422dc-4777-4487-ad75-1288194e0ec6', '06d59c48-c883-4750-be67-3afbb0f929d1',
    '073911f0-c526-470f-9036-463523fd55a2', '079aaff1-9a21-482f-aac3-d152020073e0', '07a4383b-ae05-4ea1-a22c-a5c88c66ccc1',
    '07e75fc4-791c-433b-8fb3-e594c90f4272', '07fe5fb1-02e1-4733-8271-0d12c003d09d', '08c14a72-3d04-4df0-ba33-d05b17439b35',
    '090c6e4b-bdd6-41e0-a489-408c0f0f767b', '0966b3c6-e3c0-4b23-9aaa-e3bfd6c9a50b', '0974e38c-05bc-4751-ae01-75188fd63f0c',
    '09980ac4-b766-49e6-a444-61380af815de', '0a096f43-d0bf-4ea5-8c2f-5c29c2f92146', '0a63043e-c1c1-4540-92d5-d845cbfc70de',
    '0a700ab1-fe75-4f4b-9abb-c89ca809c811', '0a701658-d6c4-48cc-8484-87270be3e6f1', '0a8aae9f-d3d0-4987-b879-9e9a3b6060cd',
    '0add2255-ed1d-4a20-98fb-bd83d1a94375', '0b0a1d87-35b7-4d36-bd7b-d1a8d26b4c98', '0baa8264-5eed-4f43-b0dd-1423333607b1',
    '0bfb1d48-b168-4eef-925e-577d953fd0e8', '0c586cb1-4118-47b7-a9d4-767d15c86660', '0cb17dff-f9e6-4982-964e-7520adb22432',
    '0ccc404f-3e00-4790-badc-05af88aac31b', '0d241c10-5758-43bb-88ac-512b4e8a99b3', '0d74e7b7-1639-427e-918f-332a34de8183',
    '0d9c6375-6538-4ffd-a3bd-cc210066113b', '0dcd8f8d-aad9-479c-8d9f-bd0e22e0829c', '0dd427e8-8aa2-4931-8541-427ed55df52b',
    '0ddac44f-c668-4021-83ab-4f37d401299a', '0dfdd579-aeda-4291-92ba-c6b40f6a3792', '0e1115dd-e3c6-40c7-8813-305449da6d46',
    '0e2c6eff-6cc0-422d-8059-95eba5e5e48e', '0eac1aca-d79e-4349-bec2-a96208b7ae28', '0f0cdf42-2e2c-4f42-87cc-1e87ef7ed7fc',
    '0f19a2b6-7612-46f5-aee3-cef7d010e339', '0f49b4bc-c093-41f6-9b90-1d200d43fecd', '0f677bd9-6aa5-4e89-8140-f20432c871dc',
    '1016f2e0-389d-42df-ad0a-05de19ebbe7b', '101fac50-77ad-4c3b-87b2-452bf3f9dc45', '1022d623-1e57-40d3-83ff-2f353012d0c1',
    '10b72a64-d087-42fe-a21d-b13c889f41ff', '10bdbac2-2871-40c9-a2b1-d4d60298dc19', '10cf61dc-b12e-4fac-9873-c30c79c86d93',
    '10f6b598-b4d5-40fb-9eb0-aa341f7f254e', '110fbb7b-fd15-47ae-9f32-7047629e7a6f', '1182b5b3-b587-4055-ac88-d9fa89c8b3ae',
    '122174bf-51a6-42f0-b20f-b6576d2fd19f', '12494b0e-d20e-451f-91dc-fd0e362b289e', '125e6c60-efb1-4621-8b03-92a9361c2e32',
    '1268edd8-8f08-4b34-b115-bba6c9de0f37', '129473c7-d76f-4fed-a756-4c04293606a1', '1294e04e-be45-4d32-bab1-298125b35e84',
    '12a8574f-53da-4048-bf79-9e14d84367b6', '12b63116-275a-4e92-af4a-503547f487c0', '12b8462c-9b10-476d-9bef-b9ed2370ee5a',
    '131988c8-a031-4cb8-8ce8-51a2431dcc4c', '1338d1f5-903d-4383-85c0-58f81979b183', '136c168b-0814-4752-a3bd-a7dc37e13d92',
    '1389aeaf-baed-4773-8309-80d0d412003e', '138f2c40-7349-4cde-b2cc-f4adaeb479e2', '13ea3b23-9dda-44b7-b973-057804d9f907',
    '13fc9094-be7a-429d-b4f0-a1dc9d677519', '141adbd2-fab0-42c5-b7eb-732803d027f8', '14439411-a09a-49ed-a598-96b70d2ab0b3',
    '14487bc4-dd30-4784-8f9e-71000ea2b56a', '150a799b-d030-4de2-ac35-23d87fcdda8e', '152a874e-c472-44dc-b466-38917c655c26',
    '158106bd-7fe0-4f8f-bede-cb820b762b04', '159711e2-f83d-4150-bd43-84e050731c80', '15c318d8-d3bf-4002-b7d4-54bfe4eb6980',
    '15fb76ab-ef46-4a5c-a67e-4be5876422d1', '160008e8-ec3b-4b3a-8bdf-873a0843b2aa', '170227f2-3e6d-4801-845d-e2232798c04f',
    '17447733-344f-43ff-a247-9a817ad90009', '17ca1973-eef9-4589-977c-0bcef227b918', '17caac97-0566-4ea2-97a4-2b4aee3117b0',
    '17d629c6-52f8-4c4a-a998-8aed2382a2cb', '17eddc49-d643-4623-a83a-b00447d72d83', '17f6b36c-94c9-47e5-9119-46c053dd0f00',
    '18678169-c884-4275-9c9d-4e1663f125b3', '186ec07e-6380-41ea-8301-8d03a9b908a1', '189131a3-092d-4ce4-90e4-2657b405a87e',
    '18fac920-dcb5-497e-9adb-f9bebdce9d00', '19132a59-e38b-44ae-aa7e-d5ca1c8f3f52', '19b3e583-c387-4781-b555-d37f6af6a306',
    '1ae58fe1-8995-44c5-93d2-ea8561c2d223', '1b1d593d-ad8e-4caf-ba08-93637ec306d0', '1b50068f-4c98-485d-b4c9-7e81858411bb',
    '1bea2b03-ac88-4d6e-aec5-85134f72f246', '1c1894d5-7feb-4097-b11a-a376c7093dad', '1c56311d-041a-4c9d-abbf-c9cbf707f95e',
    '1c97762f-d367-45be-816a-83f4317770fb', '1d23cac1-b898-41f9-9c62-1e7947894f25', '1dad74fe-a4dd-4f16-a390-58096633f903',
    '1dbdfac6-4641-4f00-90a9-4e4207585d07', '1e8ef33a-e11d-4bd6-81de-876501b7c602', '1e8f32d9-05ba-40a9-b2dd-f724a4fa4ee0',
    '1ee94b23-f9b8-4db8-bb25-552f064fd5f5', '1fd80ef4-5762-47dd-a753-b8348ca85866', '1fef56c7-f100-4dd5-aa04-80b8c83c3b18',
    '205c0936-131b-4ba1-8520-cb142e682216', '205fd7b2-a24f-418d-9885-2e3c8bb6830e', '2189b1be-e3c8-44de-ac7a-4c6f002078f4',
    '21da2024-1843-49ea-9d6c-6dadd56346af', '21e0affd-9de7-438b-9003-c7756c65459b', '2289e9ca-f508-4465-b89d-d85d6b08156f',
    '22f21c12-9eab-4db5-a147-7d46a4d482ee', '23513cb8-6cb5-4052-b911-3cc0dc7abcc3', '23708cd1-2317-4d62-bb08-610515b32a8f',
    '23aa8c76-c175-42b9-a40f-ec0378c6eb06', '23c68409-c68e-4e99-858e-1dadec25b4c7', '240f1b6d-c3fb-4253-80f0-f8c3d5c048a9',
    '2421cfaf-ed09-49a8-b5a1-fc695fe910da', '2483ae49-9fdd-4621-8326-18c39767ef30', '24a9eccb-ec57-498c-ab57-f66c1b210d18',
    '24d4a6ac-dc3c-4085-be72-7e54bdb94f64', '2552b4b3-1efa-4bd3-a352-0e1c48a26aef', '258685ce-7ea2-4542-8f3f-75fc5858a132',
    '258fffb5-7107-4308-a781-198dfc098606', '25be9a4d-cda7-4ede-b036-6f259de060c0', '25f153ed-ea36-47ed-afc3-686130d47dbf',
    '25f7ceaf-0a20-48a1-9e98-16decb89b3c2', '261c205d-5c40-42e0-9f56-43614309accf', '2660cb95-e2f8-45ba-85ae-cbb6ec02465f',
    '2660dca2-e1b4-496b-8d20-f98fed30a424', '2678e76e-0854-4e4e-b602-9b7dc56cfb8f', '26b7e3f0-e22c-496b-a852-aea54bbdb426',
    '2720ebdc-49c1-4c19-8c94-5e78b8f09a79', '27228d87-8d79-49b2-aeb2-4b8ceff83a3d', '2722cf5b-47ad-42cc-99fb-0e3ae581b61e',
    '27360f18-6c50-4e2b-870f-75511e12e9ea', '274565d3-efa5-4f1b-9a9f-5ada8972e3e0', '274a8a34-02f1-4295-a7f8-7beed9efe866',
    '27511219-7354-41da-b7da-6c67d99eabc9', '2752b86b-b84d-4f28-995c-8fbba60fbd1f', '2820f5fe-4c30-4a54-a26a-2aeacfaa0d4b',
    '282eeaf1-a4a7-41e3-8242-82e23efe3ead', '2848c456-67ea-4f38-b92d-5483e48bbe6e', '293a7029-87fe-4c0b-a19e-3a01eb426d48',
    '2942d153-a4a3-4340-a29f-ef435c72d8c3', '2970bbdb-07d1-4e49-a0f9-9bee9a2bca60', '2a01f93c-37b5-4d31-a73a-111cbb6b09da',
    '2a166938-fee1-42a1-bfe0-493d75eaff7b', '2a1a211e-c6a6-4f09-9206-79220585ee9a', '2a746263-5b23-407c-9c8e-4d218d40178b',
    '2a990e5f-dcfc-41cc-b623-8be6c7c91d82', '2a9d389e-edee-4083-a877-a59fc9e3373a', '2aa19d8e-23b3-43ef-904b-5c87c54e57f8',
    '2ad3f395-9bf7-4601-ade7-4335cd14ae9c', '2b50aabb-eec2-42b0-b7f7-28ab6f601d65', '2b679e6f-37e6-42fc-acd2-b0b204996d47',
    '2bf10fc5-c555-4523-a6f5-f3da1e5e55fd', '2c29832a-ace7-4e5d-89f6-766e5e91c58b', '2c4faac2-b0d9-490a-8e54-4e966f4671ac',
    '2c71917e-0b18-4ef4-a361-f017ff270baa', '2c732492-9c26-469e-864e-c046e6e808ea', '2cb66443-30f9-406a-bd30-feeb8fb33934',
    '2ccdacab-5b9c-452f-aaab-b767b3170fab', '2cf967dc-3655-44ba-ba6c-11839672aac7', '2e5cc3f2-a325-46be-9396-f60584a58a8c',
    '2e95abad-f8a9-4cf9-a068-ab4defb2919b', '2f763b27-ea47-4f3e-b232-1227c64af941', '2faf0ade-9815-4010-83cc-ccdc301c1373',
    '2fe46433-f4cd-4c8e-8f88-8b9f1ba1728d', '30063334-be6d-4158-9f4f-7b382d43e042', '3050f8eb-e6f1-4211-9ac6-3c4252e553a2',
    '306c6e56-e9e3-4650-8b4b-ea83e0523539', '30b2bece-894b-4ff9-b537-2c5eaa67ba2c', '30bb9db7-423c-4d2b-8d10-3e1a912fb248',
    '30eee8ab-eaa0-4ce2-8f34-45a74bff19b5', '31250b31-b410-4aab-9985-364bdbfdad2a', '328b2ea4-c590-4284-b7fd-17afc56eca3c',
    '32acc48c-6ada-455c-a4a5-5cada7072a2a', '32d8eab1-3331-468d-a6bb-5261761a3acc', '33799de7-ad3e-446d-a84b-e39df4a4d610',
    '3387e3f7-ca51-485c-b380-13d2318cc326', '33c6f24e-b23d-4c41-890b-48c8bfa855e7', '33e4d781-7502-44d7-9a20-aec7202d2f58',
    '3448ead7-709e-421e-9b08-1a263724016f', '3459e951-ff68-47e0-80af-7bf7f084939a', '352f654e-bee7-4128-8510-58c0f31ada1d',
    '3536e971-9d7a-44f1-8939-1ff822fe27fc', '35e83a05-916b-486e-9d05-44ade3cc2bf4', '3654f47d-3e62-46e0-8180-8d9838323190',
    '36cfcf4e-43ae-466b-821a-e596d4de328c', '36d1071b-4912-4a2a-a144-608997ecf528', '36e49407-01b3-4665-9c82-a0337cd1146f',
    '3786258a-86ab-4d17-b12b-81dcf767efd5', '379306e5-5ca6-4824-bad5-04e79bd2de99', '37a184ee-e839-4b9c-a2cd-c5162d12a948',
    '37aaae9d-d492-414c-a77e-8fccff5ccae5', '37bc9b7f-73d8-4ab5-8694-93edad9b9c8b', '3812236f-b7c5-4718-b5bb-57ead41ac761',
    '383b4628-1581-497b-95ce-68b12c4418a5', '38487b3b-7144-4072-a31e-4eb5f9d08bce', '38589cad-edb8-47ab-8c08-c51b1ff64057',
    '3891484e-952c-43ca-8ae4-a25eb5868d0c', '38c801dd-1854-4bbc-8de8-4582b78b20e4', '3973249e-617d-4b14-a86e-0b0a211924d9',
    '3a08fe30-a3b9-491b-8e07-505e16fa9394', '3a55bd26-7c7b-4f2e-946e-cb74fbe039de', '3a6544c9-de89-424c-9ddb-2c5c7401b5a1',
    '3a8e4752-a08b-429a-8624-12397fadf041', '3b4a6081-4936-40f9-9710-bd4711dbe442', '3b7fc714-be2c-4dff-b413-c629fcd63963',
    '3b8a772f-2275-4114-a14f-83f9e9d95231', '3b916c85-3d81-4a95-90a4-90503a6466a4', '3bda75b2-d418-4a51-a58e-645db9723d1f',
    '3bea2f39-4719-419d-8bbc-93f765b1267e', '3c3393cb-306e-4708-8f01-90be09b53713', '3c48c9a3-d63a-4742-a81d-fecf0795513b',
    '3c94baf9-8b97-4773-b8af-d408db900ae9', '3c9b2cb3-21df-44c7-9b2e-b4f8487450fb', '3cdf6969-41a3-4048-9e82-dc5fcb164382',
    '3d184119-fb61-44d6-a549-88abebb9ca6b', '3d1f2cc0-0175-48c4-b950-fc24e8c5ced7', '3dc06906-2ea2-4640-8973-776d101f67cc',
    '3e0b2a6f-d4c9-4544-ac44-8097ccfe683c', '3e26a28a-79ca-4d79-884b-b7192c4281ea', '3e4ea4ba-9b74-431b-a793-3d580105bc5b',
    '3ec82cfb-98a6-4655-aff8-16397d777fbf', '3f93c88e-02fc-4ebb-9516-c7388b6e6544', '3f98b3b6-cba7-4163-a88e-b70414160136',
    '3fce43f7-6233-49e2-9259-e012ce09cad9', '4004574a-3c3c-4178-a59c-bf7877c673b5', '408f3b03-844e-47df-b74d-719d8ecb99e8',
    '409fc3fc-ac18-4d2d-a371-7aa98871e839', '410445e3-f048-4e2c-9a3f-742996a4624b', '41658c9c-5b7a-4153-aa1e-e3eeccb81d04',
    '418d8e7e-f060-4d38-9a3e-891db77e0e6a', '41cd88e5-c142-41f4-ab17-04b8ee54c103', '41fb6dc1-a106-4abe-8eef-02fc79349eab',
    '4316d487-ca71-4b3e-9365-a989e3f89af2', '439d3efc-1df2-4523-8afb-b6dfb20d0693', '43a30834-e037-4206-857d-19befbe353cf',
    '43af8a8b-dc84-4674-92de-ad3117efd8ff', '43bfd383-deda-4c76-b6ee-0431a0230784', '43ea623b-aa3d-4cff-a100-23e24b6228ef',
    '4436e37f-f8ec-41c5-8358-6c8278de721d', '446ade11-d37c-4759-8f26-d85242be280a', '4474a3b4-0971-4d98-8c6a-b09e51eae8cd',
    '4474de15-1bff-4174-976b-f4ee0b163fc0', '450c0840-fa6f-4251-822b-5466c0714819', '452f57b5-134f-48fe-8aef-168acc8e83a1',
    '459797d7-479f-438b-becf-6de15992d6d7', '45ab5043-8c8c-4ff5-a54f-d555e1305bb3', '45f47bb5-c4db-4189-86c3-85336463ba5e',
    '460d10fd-1ef7-497c-bacc-781acb846e64', '465b9779-c564-4e83-99da-94e445718293', '46f17b90-18ac-46c4-99b2-0e3340bf0504',
    '4711a664-0c3d-4ade-a8f0-94d4ce6f47cf', '47581f19-29bd-43a8-8ee0-f07eaab433ad', '4769f8b3-8d99-488b-a980-3874c1ac4478',
    '4834c69e-9fa0-4366-b5b8-ebdb16a88ada', '484fc4e6-ba31-41d6-86a7-f6e72db2a553', '48512668-8ca4-44d2-831e-de9254391240',
    '48fb85e5-3924-4ae6-99a5-71064b8a81a5', '4925d6bb-8d7d-4ac0-a7a4-4f33cb364793', '49a41751-3cc0-4eb1-bf55-a28578b25793',
    '4b19c36e-09f2-4b36-be84-f78646630e8b', '4b4d1b0d-a1c7-433f-b467-07509c6bff01', '4b8d53bf-7d05-451a-aacb-d16e59ad1328',
    '4bc237c4-9032-45e7-8f85-0994a7c2a0bd', '4be403dc-878f-487d-8cc0-3e89d52ee2da', '4bec2c9e-6f10-4216-8291-494f28ad73ff',
    '4c60b888-ac1e-4374-9051-18bda74955c6', '4c7751bf-c7d3-43a3-8602-f3d8d6fbfe50', '4d491473-aac3-4d9c-a1ae-224bebed8121',
    '4e18cce6-4f15-486c-8c2e-f316f7384d36', '4e341a92-7910-4407-83ab-e78f65630f62', '4e51fa66-2971-4f47-b186-da59f0afa94f',
    '4ebcb276-d45a-486f-8d11-741d0f60c339', '4fe21690-4655-4431-b3ff-af7654ae67a6', '5150ccc0-6402-412c-b775-852b6ccf83e4',
    '518304cb-e900-45ba-9f2f-1ecdacd72752', '51955d4a-8341-4968-b482-db7db2713753', '51a9097b-1a0a-4b17-a395-6693251b344f',
    '52a2bdd3-b694-41d3-ab43-3db97f8388d1', '52e50331-a18c-484e-aaa5-14726d44662d', '530d02a5-6cdd-4f2e-bfe3-79923c46c449',
    '539dc890-2e2b-40ce-b287-22c22458e8a5', '53a1f26f-d47a-474b-ac3d-2ed74b7b4b52', '548bd21e-f4e0-4dfe-b0a0-248e13414aa5',
    '54e4c8f2-90a8-4ed7-b653-3457c90e8d96', '55664b5e-c0bf-45c5-86ea-dc5ebf39ca0d', '5595474c-0e61-4ca4-94dc-4ee93bceac22',
    '559fff6a-65a5-4459-9371-febda9c5b800', '564371f0-70bd-4780-b071-66441d066dfe', '56e7c31c-a559-4d0f-a143-b5bf611a2f85',
    '56f34523-c1de-4924-8568-726b75560218', '57333630-2385-4792-bca1-daececbc51db', '57f8041c-7448-40d7-9587-9541ed8d7d89',
    '5806bee5-b450-4f7d-9ca8-c94f8b606008', '58519bd0-2c3a-4a41-ac96-257d9678e238', '58af6ad7-2c57-4708-8c78-39e56d59c068',
    '58c5de0d-6e6a-4f4f-a044-da8b87320f3c', '58d6ed1b-825b-46a7-b949-b24e26ccaab2', '58dd0e0a-921f-4625-963e-6946260f06a6',
    '58fdef8c-eabf-40a0-a5a1-587b134b03ce', '5983c266-8cbf-4d10-92cf-b1c5569d5d8f', '59ca288c-8afc-49f4-8cdc-a77a0ac48c49',
    '59e6498f-9b35-4e17-9766-6416ac3a4315', '5a342c90-e982-4323-8d85-9f8731f39db6', '5aa749df-58df-40e6-9b7f-f68a98e2ac08',
    '5ae8545f-826e-4c96-b418-4e06f02cec2e', '5af960b7-ba59-4b45-a4e5-abde4edfef16', '5b6a1c5f-301a-4eab-a4c4-a0f073166efe',
    '5c1f11e0-1c04-4d24-b716-478c89d4ca72', '5c763f84-fa6a-4631-8477-bd515fe05490', '5ce33e59-4659-4514-8870-78316350347a',
    '5d17c122-0502-4da8-8f4c-1c922662d163', '5d420287-00d6-44a3-8237-5ead35e19c7a', '5d44cb2a-e499-4bb0-893f-2f2ed4b6d546',
    '5d8416f6-d3dd-4980-9a60-65af82afe486', '5e2713a4-24e1-4ae2-a5d9-bf59ff8f9d56', '5e5d0f63-aada-4820-a6de-4027550e0681',
    '5e609ca7-1951-4f08-b2c3-292419057079', '5ecec8e6-8a00-42c5-b894-c70cb41697f4', '5edfa72e-41a2-422f-8ffe-2b4fd27e1cef',
    '5f3b7c13-b2da-4551-be95-ffa130cb43db', '6013ac25-e578-4465-8c5d-691a29ba0ee7', '60141754-6776-4d8a-96dc-cc9ce21ada17',
    '6069d98a-25e3-49a7-8202-020f6b3c90a6', '608d60c4-f888-4c7d-8804-c2609f087c6a', '6196048f-8e52-409b-9287-9e61ab44640e',
    '61bc8b9d-6d47-41b4-a8df-20794b0f2ea0', '61d9c2b5-341e-439b-bd37-551d79ee095e', '6261ae56-9bbe-4fc4-b5d5-7161fa89274e',
    '6272d68c-c67c-4e83-ae66-f27dd3b376fd', '62d8a769-d10f-44de-9330-d8031ade1ffa', '6311817f-7099-49bb-9230-bfae1f19509f',
    '633a7e26-f3c9-464f-ba2c-4ee32162e442', '638aada1-305b-4d7b-b773-af233dbf7e75', '63b0c077-987d-412e-9df8-5d4ffaa8d67a',
    '645cb437-feed-4b99-bed1-ae36c6d5c20b', '6468c5a3-552d-4143-a934-f1dce9a4726d', '64ce86e4-76a8-4e1a-8e58-db8a39105c1a',
    '64d683c3-1d5b-4967-9a3b-436bc7113e44', '64e8ae96-c76d-4189-9fd9-992c3db5b846', '653c7762-5751-4432-87f5-c8b0a8847777',
    '657abe72-64f4-4fd0-a847-bde62c135cd0', '659a278b-11ab-4525-98f3-2d33cb7c5b2a', '65cafbdb-2eab-42d4-8b38-3c0adb740ea9',
    '65f011b0-7a87-4c04-b9cd-cb16efb55b57', '66267016-2f45-4362-9333-b613e6aca0e9', '66781daa-4048-4852-b985-8ff89b529baf',
    '6716e896-872d-45ad-b860-c031411c41a9', '67c2de45-d9ba-4ab9-a15b-ef72dcc37b55', '686b0872-68c0-4fc6-a039-8904864851fe',
    '6893bd40-08d7-4e88-9c91-591df4aa5e5e', '68dd7d46-2e04-4cc1-827e-55ef1ee51dce', '69d164fa-a52f-4b96-a53e-ac41e0188645',
    '6a36e96e-cd63-40bb-abac-24f9b048d59b', '6a519c03-a5e1-4c63-8ba4-0a7d85d0f5d2', '6a8bbbd1-773e-442e-9692-0e6c4eb3c821',
    '6a8d760c-2c86-454b-b654-25381c42fdc2', '6b18be63-a821-4dca-9b3a-ea848099a037', '6b44def0-3c94-461e-9bac-223502f30cdf',
    '6bae5411-4ac7-4312-a479-aa5b370c03e2', '6bf4632b-088e-4ff6-b1dc-f29c8a19d2f0', '6c2675e9-afb3-4e66-9d63-7e70d094efe4',
    '6c2b7f3d-4e5f-450b-8a72-8bd0c3316b29', '6c53309a-4b11-453c-aab6-9f483795d99b', '6c916792-b896-43c7-8705-7927ea885aa9',
    '6ca2de78-c795-4485-a5c4-caee936054ef', '6ce36d5c-7dd9-431a-b4f9-72292a9b0488', '6df41fd5-73eb-4691-9a5f-0642cb4660d0',
    '6e211710-2374-4df0-ae22-916bc8cb2721', '6e6ce40c-4f6d-4428-962f-9b86fe2f446e', '6e707a71-73aa-4ae1-8818-ab1c0f572896',
    '6e712daa-dd95-45bd-b260-1b055e4aaa43', '6eae3e89-c191-4531-a2c1-137fbc54db88', '6f3a7c99-4b84-4753-8076-43ecb6286b2d',
    '6f7c1006-6a72-44ca-9c1c-496810433def', '6fca2458-7045-43a4-89f7-2340409a134a', '6fdf86cf-5bef-48f7-92ec-ded3c9638f6f',
    '70075461-fac1-4836-88e7-401184dbdaaa', '70b9203e-b849-4b0f-9d30-fe76ebe41919', '70c683d1-8fad-42eb-854c-808187de05ac',
    '70d5f0cc-7812-409d-b598-ddb78a7fca04', '70f442c4-11dd-4102-8ea8-ed23bfd11a06', '71cdee3b-2b8f-427e-893a-cb1f14ebc673',
    '720450d5-db75-48db-9449-c6440b46020e', '7223137f-b619-42db-9224-a59a30e4773b', '725e6b7b-4fc3-4a41-99ea-8d58b32d1109',
    '735bf6ab-f66f-4471-bbb4-1645213b95e2', '74436d2a-ed04-4aed-b90b-e8dc722ee4b1', '746b3542-337f-4359-83dd-0fd3232aa3a3',
    '7486190b-54d8-41c6-bbcc-2d32bece4eb2', '74b0f7aa-0a63-4350-a993-52f2f2b5e70d', '74e4c4d3-4e4a-4421-9100-8d9c163a0fa5',
    '74f3b0c6-576b-4d80-95ee-6fd44ae6e2d4', '75147139-08fa-465c-a842-bcecadbec2a3', '754637e7-e874-46c3-964c-6d3bc4c1f3dc',
    '756c40d1-f879-4ea4-a98a-169c02caae83', '7580d4a9-9c40-4059-a1e8-6da5a83a14c7', '7610f53c-82ed-4be8-a1d4-15b081e1f8ed',
    '76cb423c-2d42-4190-aea9-0637307ba871', '76f3411b-e0a2-4cd5-830d-1a389e563429', '7757cb22-df08-40a8-8441-9acb67d39c82',
    '779352ef-f66f-4126-9e02-88cc4f9ecdf5', '779f9a59-d0f6-45c2-9313-30ac494028d9', '77a3289c-5c9b-44a9-8627-5f2a268650c6',
    '77b3ce79-c85a-465f-b505-0dcba4156153', '77fdd4e8-1eb5-439a-bf27-3f57908cffc8', '780a1530-58ae-4a84-ab7f-e380a01603fd',
    '784b327b-37cb-4711-9b57-4dd1b5dc9037', '794ad6be-b147-4cc8-8f76-bdd099836f0f', '79af54ff-ff51-4eaf-a2d8-367356e6f5bc',
    '79ed4f69-81bf-4bb0-ad77-b0cb6e4dc60e', '7a04cecf-f989-49db-b57b-076a9bc76ae2', '7a6daede-ca0b-4a49-b13f-4e1de7ec4cb2',
    '7a9cd28a-e97a-46a4-8bf3-7330b2f7ba22', '7ac9a80a-c92e-436c-b619-e53d4ae4d318', '7b1f7e11-fd0a-4fef-8567-eb0f0b844282',
    '7b43a7c1-2087-44f3-9239-7938f1ab4212', '7b8f57ad-5cbc-4ae4-af8b-43776a96ed76', '7ba8a64d-9a15-4ab6-a80e-4d502f36a4b7',
    '7c5af613-8e0e-4ad8-9795-243603c0a07d', '7c862d3e-9de2-4f97-a92d-787ff4e5cd76', '7c8eb0a1-a741-41f2-9d54-764740c1fefd',
    '7cce0f25-5bc7-4f2c-81ae-dbc182b092d2', '7d2f772b-f748-4050-857b-394b74373614', '7d38513b-7656-4989-8aa0-ae996b4817db',
    '7e18d65d-1e64-4593-9f43-2c90e7d6905b', '7e7c624d-0bc8-484f-a82b-036b4d27fca0', '7f0e212f-5162-45d7-bcc2-5ab0c67e2b28',
    '7f51ebfa-886d-4231-b90d-75409d98846a', '7f5f294a-7329-431c-adec-2a374c710454', '7f92da5a-fdbe-4fb3-9337-99d2b669900a',
    '807dce05-ee90-4b5e-b66f-d3eadfafe8c2', '8122ab8b-fec7-4c8e-a6ee-b9ae0f8f5a2d', '82177e6c-b851-438e-8e69-494386daa335',
    '8222c0c3-a0fc-42a5-812b-aacfa319c6e7', '8227d42d-b7f1-49b4-8963-ddad124479f0', '829cb64b-dddb-4440-b81f-acdd1969772f',
    '82b4a63f-0124-491c-a36a-22361f07d5c5', '82bab8ab-9574-463a-8a38-e58e7afa008c', '830bbf44-074b-4967-bd48-632ac8d43ef6',
    '8319ab65-5414-4a94-a6e5-1040a572ea32', '831e5cc0-c756-44a1-a115-a9aa12023295', '834089ef-bd5c-464d-8f7e-36f011f43c23',
    '8341d9ee-f932-4ef8-bc43-3d65c05450c6', '834f7b02-6baa-495a-9fd1-4425d05c9723', '836969a1-96a6-4572-ada5-ff5714b6d4b7',
    '83ebb409-ed9b-49f0-a774-365cd2eb04cf', '842fe773-9512-44e3-be45-833d1cf0d9bf', '8430bed8-a90a-40b2-8364-8eccc3d181cb',
    '848c3d96-5acf-448b-8bbb-7c389f60ad8b', '84b51cef-ea29-4bd0-bb9d-15d72744bd59', '84e11f91-732c-4030-973d-d3d26aeec9f0',
    '84ec52c9-d3a9-4b94-a20b-1df6a3cecbd1', '85608f34-86e1-4706-a686-b5ef2a33d46d', '8632d33f-3b99-4a20-a913-3ac9d9f5b241',
    '863ee84f-08a5-419e-b3a9-a5c43193c8f5', '86ddbe7b-381d-40dd-aa19-207c51725ede', '870c20d8-3f0c-420b-9444-eb116f8dde4e',
    '87269d8f-6ffe-4396-b167-d2ba75871f0f', '874ddca5-280d-4758-aa72-63086f841b9b', '87ff13be-802b-47f5-a230-2deefaeb297e',
    '88293015-9143-4312-9a3e-a889c11814e2', '8856bde2-744c-47a7-8c07-658eb809ac2e', '88a01c0b-4a81-46d5-8804-bda2c325f0bd',
    '88d6b761-9b41-41ea-824f-dc3abc75e79b', '8915868b-7f3d-41e0-8158-b38b1909e122', '891ee8c4-4087-4475-8d3a-558e3a0b1eca',
    '89961340-08cb-4e03-9d5a-862cda084f76', '89a3d3d0-650e-4f32-a16c-375d1d573ed0', '89a783fb-5faa-4404-a7fa-bccdc5af4767',
    '89d54990-cc55-47db-83e3-b523dadd7f44', '89dd9ba6-c358-4e8f-a0b6-26dfd782f861', '8a2c19e6-523d-474a-b34f-a4f563d44705',
    '8a5862f3-770d-4307-b27b-492105444a52', '8a76d502-62a0-410b-b6c4-950caebdcd5f', '8acd4710-aaa0-4233-a68e-2bfe807ceafa',
    '8b1ad827-e405-4945-924b-5f4c18aa7f27', '8b22b9f7-9cbf-491d-ac90-b3d6d45db187', '8b69e493-39d2-48b0-9912-61dc7a57b4ab',
    '8bc231aa-29b5-4cb8-83d1-9ce703e2022a', '8bd4caee-4e1e-4eb2-aed9-75576446a562', '8c2432e4-5166-4da9-8da4-e9be5c5e4cca',
    '8ca7a4fa-3324-4c75-8891-300b989f3a03', '8d009a28-8bdd-4f56-b772-4d37a0f5b088', '8deec4cd-eb0e-4c2f-9718-42af5c576b75',
    '8e73e3f7-97ba-44d8-8415-d49cadbd39e2', '8e7be8a7-5316-47cc-8b07-cec53d629565', '8ee01a6e-bea6-483b-a998-a96042640f72',
    '8f13552d-d81e-44d3-8c47-e3f964ba0850', '8f4fd04e-4aef-4d19-862c-4ec46b4d45bd', '8f60e5e0-c92f-4ca6-b1ae-5881f3fa92c2',
    '8fcddf58-3e2b-42c2-a8cd-d8213d2cc02d', '9020ffc2-3142-4ad6-a394-01e9acc601ec', '90675664-4fc9-485c-a37f-951b30e2f153',
    '9090ab1c-ac6a-4300-b7e0-b0f127ba0d15', '90aa7c28-58f6-4ee8-8701-a57ff66dcb69', '90cd397a-ccaa-402e-9ce8-dab65d9fbe81',
    '90ec85b0-76a6-4427-8335-d0e97223652d', '9120d8c6-f44a-4ddd-94b6-c9fdc2de0fdf', '926323bb-50e7-4bf5-a07d-0c9c189873b5',
    '92918f91-0ad2-4be5-b00d-b9ccc94a891f', '929afb36-bc45-4346-9a79-2ea1ff39bcde', '92e8472b-b635-4193-a648-049b3563925e',
    '92f6aeac-68ac-44aa-94b9-203ad70ce353', '932d9bab-42f9-4cb5-b899-a01ee742b34a', '93841a42-f4d2-49c8-babd-36ebe5e063ea',
    '940ad2a9-9cf9-456a-ba14-8d64c5b36cb1', '940dbcf5-17a2-4caf-855d-ad57eacf8d49', '9426b7dd-5c9f-4ad4-86d6-ce7e3cb033d2',
    '943f2822-6eaf-49eb-922d-5e1529c5ff02', '94458a17-2284-4257-8c99-1b5e39008c00', '95258367-ddba-44eb-937f-23f9ccad0e92',
    '95559a64-6c06-48ac-9fec-9844faf051f1', '9557d50d-cc5f-4601-aa09-fd2dfe66acbb', '95bd997f-48d8-4371-b2b9-14d7908b6a9b',
    '95da5f1d-f84f-4835-b581-5dd8f3fa6062', '95e945c5-38b3-4123-ab46-245168d25d9c', '9786104c-83de-446a-b8ba-014ba7d930da',
    '978a0f36-04fe-4f0a-9fd5-9f08ed06ba3b', '97c73ef8-f63d-44b6-ae11-4a10d5bd09d1', '97d14940-f2ef-492a-b985-8a67579e1b9e',
    '97d7cde0-d1c9-40ba-aa7f-9ccd70ae61a2', '97f39b80-708e-4f38-b004-d579a88c7e6b', '985cf93a-84b6-484f-b15f-aaae593b0979',
    '9869cc86-e00d-4c0d-8fee-821f6fa5513c', '99002c5a-5b2f-401d-84b7-c536780655a4', '9917f67f-4cc2-47b2-a6e8-72bda4e84ae4',
    '993afaab-553f-42c2-8bd3-42a299b17718', '9a102223-4ff6-4429-b30a-61963143d79b', '9a2c5a39-3947-4c02-a59d-6c9d3dc1a3f8',
    '9a9b7c66-e33b-4941-b4ca-8d2bf877a1fe', '9a9ec1a0-48f4-4f17-bff8-5bcde5c8cc49', '9aa2950e-5355-400d-bbfe-e3a330989b2a',
    '9b91941a-9e7d-4c34-afda-a6010bcad30e', '9bb852e6-101c-47ed-b82e-0fc407a26298', '9bf0f5b8-9d34-485d-8999-679c6922eb4e',
    '9bf2dee0-5e5d-4693-95d0-1d0054404f3f', '9c111cc3-4a54-474b-ba75-39906bec8560', '9c3de1f6-827b-4cb7-98fe-ab9999eb8d4a',
    '9c4dff68-3bbf-484b-874e-3b7897206c76', '9c7eef35-a279-464d-8971-8f94f4fbfbec', '9d3ded98-d6e0-4a1d-ab85-c1471fb233b1',
    '9d63fea0-711c-46d1-b308-402c05f12d83', '9d7b5dcb-9ef1-45ad-a3cb-60fb5735e9ab', '9d8ac44d-6456-4015-a4d9-de2e2ab0e724',
    '9dc77ab5-b253-4690-a40f-2f42c9c2fe60', '9dc87831-27be-4e6c-892b-7308f0e3c7bf', '9dd9dcfc-38b2-45fc-9669-c6d73e59b83a',
    '9ebfd779-43e4-4c21-a6ab-f1e4a5898e58', '9f95bc8f-6aba-43e3-9c8b-a95d27732cf4', '9fcfee26-5807-450d-bdfb-dc4c0b9eb045',
    'a09a4939-a03c-4f0b-8d0f-1325632dfeaa', 'a0cf0a06-cd2b-451e-a4b3-daeec9e32414', 'a10d4b43-e49c-4b8f-9c33-dbdbe84a389f',
    'a1cc0ebc-1ea3-4545-b8a8-3e06dab7eb50', 'a1f9b4b3-9b56-44e7-b215-fcbea94e125b', 'a21412fe-6a17-4ecf-a671-2fbaed51c122',
    'a23e1ef1-380c-4bb5-bb07-6796be3d5bcf', 'a27c61d6-d910-48fc-af5f-c3df6b7c8066', 'a31cc8e7-5d73-483f-9cb1-3529844c2345',
    'a366b960-b87a-481e-81df-7acc11cd797e', 'a36a7ef6-3c70-4fd3-bd50-accf8a6ecad9', 'a43bc6be-6be7-4f1a-a99e-4b8862da444c',
    'a463fdf4-a954-476b-b90d-df5acaffe80e', 'a490b342-b92b-4cb9-9b1d-ae0aa38a03be', 'a4acff5b-2660-4daa-bbcc-91b870aa460d',
    'a54e8114-120e-4560-9f44-e5685edbf9bd', 'a557c015-dd36-4c23-9fa2-5f5604a84de3', 'a5ffb8fd-4e0c-4e03-a8d2-53f1d7accdd4',
    'a6031910-008f-45eb-a9bc-a5fad3a55b42', 'a62ecb55-b820-47d4-a4e4-b9c98e6dcbaf', 'a63ce30d-5e36-411a-8bea-65c92957c242',
    'a6adbc13-1ace-47e5-9bd1-e9632bb7e595', 'a6c8471b-c246-47d6-9bfe-9c9d40d136be', 'a6e562b3-f597-4f90-8c13-18b7ac5c7a36',
    'a7a181a2-60f0-43e3-8353-e0c57e4b1ffd', 'a817987d-7a3e-46cd-b54b-24d61e686e46', 'a8200617-52a9-4107-b9d9-18959726b052',
    'a865f235-2047-4906-94e2-47a8050ddace', 'a8808cc3-7179-462a-aeb0-30aa84a3b4b4', 'a89285d1-b738-4dfa-85c5-2bf5fcf3a479',
    'a8b9f866-0c23-4c6e-9c23-d4532e66b127', 'a8bb80ac-2569-4da3-af55-28617d139228', 'a8d259f5-1f4a-4c9b-8bc3-8e70d4f448b4',
    'a90bb697-457d-4466-b93d-6573c298320e', 'a96eaee6-826c-487c-9725-874844e8b1d2', 'aa187951-b609-4e38-bebb-62c1adb98f6f',
    'aa82b356-a154-42ee-8db8-3b4e2884cd3d', 'ab14972b-d2a7-4759-9c1b-3b8769cf1cb4', 'ab1c02bb-8302-4994-b3b1-59d20eedc65e',
    'ab20646c-c707-44f2-bdd4-aa34e55ad28a', 'ab229f34-c9f6-4cc5-a4b9-1e7bd3b8bc77', 'ab497e6f-7628-4b6f-9d76-eb40a3b41227',
    'ac3c39a2-95b1-4cbd-9779-cd90d1808d27', 'ac686060-7c66-489d-922e-f9c8e49417db', 'acd26845-53e5-4d25-998f-0de717060508',
    'aceb3354-8791-47b2-ad90-fe6f901f75f0', 'ad1b5fd2-573e-4608-a5a9-e2caf8d19dbd', 'ad26327a-d787-4be5-bf19-ab446c46bf6e',
    'adf73de8-d7cf-4142-b249-4ce053f9ee02', 'ae2782fd-3e4b-4bbd-9530-caf2dfbe5ee2', 'ae2aebf0-b7bd-4f8a-a0f8-6dc9ddd013df',
    'ae861ba2-d3df-480e-bdbd-bfa7bab2cd30', 'af12f0c0-ec1c-45a9-8737-49026e88b45e', 'af76a656-6f3d-43f6-97e6-1f563f9b49ba',
    'af9b27af-1c2f-4b5d-9c49-642b8d4cef3b', 'afa7f1c2-1c3e-4858-ac12-ee8d0b2948f8', 'afc6cf51-bc2a-456d-930d-494ce1955056',
    'aff95910-aa9a-4098-ba55-8bbb86584971', 'b01ab6d3-a28b-4688-a2c1-a42c52ac45d5', 'b031cf16-6688-4bf0-a035-be95587ecc1f',
    'b0e6a6b8-2a5f-417a-8dc1-a9de77de17a6', 'b1016f38-5179-45eb-86fc-9f20d77cf02f', 'b116bd8a-3ba2-4b71-8b4f-f36144741549',
    'b1261eb5-b743-4d52-8d65-b3b17ae28312', 'b128db90-0129-4387-84e6-c5641d116250', 'b15d5c3a-9f54-4316-83a6-82e85b946adb',
    'b1679264-5fac-4b55-993e-107d0de5e40e', 'b16a6342-712b-4a35-9d4e-c6a81c16f9cb', 'b1b0d9fd-929c-488b-b862-20ca24324454',
    'b1d474a3-a0d6-40ef-a2d1-eaf29e8cbba0', 'b205f527-b853-4aab-9cf6-7cc1aeba2c75', 'b2064172-eb36-4c44-b6b6-005d0734d809',
    'b26d386a-e5d7-43ff-af14-cf2a8d6fb99c', 'b2902274-59a0-4190-a50e-38acf79e7180', 'b2e07b67-1db3-4b50-a7df-c5ebece0ab73',
    'b2e0b43b-a110-4904-bd5f-5329d2037019', 'b32bbb2f-4b01-4885-8b02-c098a2fc5c53', 'b3b67641-74c8-443d-92bc-99bdcf2572c2',
    'b422b11d-7085-4098-8f9e-31f683929995', 'b4498845-f700-48bf-a26d-df5dea5c2bb0', 'b45db0da-ca5d-455e-8477-9bcc4b2965d9',
    'b4989926-382c-4418-8e6b-1ded3148f72d', 'b56693a7-9b19-449d-8134-4fe08d42bfe7', 'b57a3748-7c30-4cf9-8348-78c1ac47a05d',
    'b6a0190c-b528-41c2-aa0d-64c09ac20cff', 'b6b642ce-d413-4c0d-98bb-9b58d32bf4be', 'b6fcf929-7fad-4d86-a3e5-b42dc0bd5f34',
    'b754d323-c316-483b-96b2-e62f195e8748', 'b757afa4-5e0c-4e5f-b98f-265853aaa926', 'b75a8597-9163-4368-97a4-b93e166f5b8a',
    'b75b095c-376b-4b86-ac3a-b8b6c20b8a1d', 'b7c43fbf-dc2f-453f-8219-a102371bfe40', 'b7c62177-3012-484d-ade7-1a21333fcbb9',
    'b88889d2-022f-4b68-9923-c00b3b60400c', 'b90aeab5-913a-4f3d-a337-40de9844a386', 'b92d12e7-f424-4773-99ee-0062e3dca206',
    'b9737a78-2884-46b4-b4a1-7ef445c4ae8a', 'baac325c-032b-4621-83c2-c320da949d51', 'bae59e76-c648-47dd-b3f9-441621b36c53',
    'bb0132ab-da3e-4085-9f3f-1bfddee3d5e3', 'bb221e19-b3e9-4127-b6c5-22328f8c1043', 'bb4dd64e-7494-4698-bbbf-3bcbfe347987',
    'bb594d76-8d6e-4345-9157-9008ed4f134f', 'bbdf934c-deb3-4879-ba8e-f9631ce89780', 'bbe13fcb-7a96-4fb0-8fa9-596415ef20ba',
    'bcd0a06d-6cb0-43e3-9f21-25597a202dd4', 'bd4503a8-2e26-4e08-b49e-3a8775f81b1f', 'bd45e9ba-a459-4245-a2d9-af1ca5bc799e',
    'bd7edf88-1293-481b-ae9e-09d2112e778a', 'bda0317b-f1e7-4bfe-8935-90d7702ada55', 'bde83a41-e69e-4d57-bf02-919a7c077438',
    'be4e68ae-b7e4-448d-a688-948203097716', 'be8775c0-5bec-43dc-8769-972002fef80e', 'bee55c04-2d08-4006-9654-a446f274e87c',
    'bfbd651a-225c-4ade-9b9b-b7ed52bc542c', 'c014d56e-b86a-4a3f-9b66-1d954f8900f3', 'c042d2de-413b-4a73-921a-45529144b3ca',
    'c0765d08-d6ca-4a1d-af03-ea1dcaaf6517', 'c0a76e25-2d34-4c0d-84c7-6fbb1154ce14', 'c0abb39f-b8d8-4574-b16b-3d6f78147ea5',
    'c0f5ec57-f2a5-4975-bf07-af64a8edcaf3', 'c0f8eedf-8077-4811-8528-e9beda00280b', 'c1217095-9503-4915-96fe-275acbf1cc87',
    'c19c23d0-bc7c-43d9-80b4-23ed9ee5cf6d', 'c21018b3-f8a5-4559-b04d-12a6253cc83b', 'c280f355-45bf-4040-aee3-26a0de7fa745',
    'c2a0d6dd-a9b0-43c2-acfb-a376a340a54c', 'c2dc04e2-8189-49fd-913e-ed417e52ab38', 'c2f6a44d-86f4-4421-9247-eb5057daac7a',
    'c31e5926-67d2-48a1-9d50-6686ccf103f3', 'c36e1055-46ea-41be-b71e-93b52e5150d7', 'c391a2da-de42-4169-9294-1a1e9f94201a',
    'c3b40d19-3c4c-43b9-b051-0b5c49f642a9', 'c3c445da-705d-466c-9e33-abc2598fa113', 'c3c4aae0-226d-4530-812d-1d1f21d20277',
    'c3dc3bb0-f2f5-48d5-abd2-a8a750d224cc', 'c3e86da6-13e6-4d4d-a77a-8ecdcafc9ab9', 'c4093a8d-8db5-46e9-9d1c-553ae475e42d',
    'c4d49719-7ddb-4f25-992d-1eac1b772e20', 'c525788b-e839-4ee2-ad0e-69c0d26c9fa2', 'c52bcece-5fb2-46aa-89d0-bf102baeeb3e',
    'c5ea6cb9-79a0-4ac3-8c65-665207071ea5', 'c6241301-cc7c-48ac-afce-41dcffc52449', 'c6b095fc-e128-44d8-88b2-db2464164c76',
    'c6c01612-2273-4fc0-a4c6-14faf34b630a', 'c6fb9681-4424-4990-a91b-3a355789c55e', 'c7414319-7cc4-4fe2-aa27-db5cf72f341e',
    'c79e9d2e-c651-4e97-bc1f-b680d590af40', 'c82ccd19-1c05-4ae0-aacd-3ce48bd495c2', 'c86a6b02-8119-4e49-9bb2-a5eec3d13cda',
    'c8df84a0-e8d4-4246-8db7-4a6f1a37bbb7', 'c93189c5-7a9b-41c2-9f03-1355e6f97c36', 'c9321a62-6e20-4b81-a148-692a6560fd43',
    'c9f028b9-ce60-4d5b-a568-8a5da00063eb', 'ca2d3c68-9efa-4ab1-b560-dc5ccbc6ae0f', 'caa3472f-a84e-4d28-8a6f-bb0aa35fe781',
    'cb3a6776-ed79-4977-b634-4360e1ed1e43', 'cb3b4eeb-7dda-460c-bef9-82b39cce22ac', 'cb5377a3-7a2f-4958-9b01-74c9de353cbc',
    'cb732a96-ed92-4444-ad45-0878860efa81', 'cbb18e9c-844d-4c55-bad3-dbdaed9d644e', 'cbb7c5d4-5247-4261-833f-f76c4272d8ee',
    'cbeffe6b-68fa-4f7e-938c-3ee3792d2e32', 'cc3eaec7-3939-4c10-916d-8878097f3630', 'cca95e0f-367e-4f2a-8e05-abde8fd628fb',
    'ccd15797-c85a-48a9-a18a-4c28241f4715', 'cd6b6c88-cb4f-442d-9f4e-6cea4045be0d', 'cd6b7f5f-ffea-4359-8fe2-c16be62c2a4c',
    'cdc71429-522d-4270-b8f5-9c2d268643ab', 'cde9eca2-8ac0-4019-a7c6-c10db5df89f7', 'ce2a2e5c-645b-46c0-b4fb-3fe5c5882ee7',
    'ce3f9611-2bf7-40f3-bdfa-58387ab95391', 'cf6990a4-35f8-4a19-80eb-ffde0c5fda0e', 'cfb8221f-af40-4d65-8a26-9d835a150b25',
    'd003d1b9-0133-40c9-aaa4-8947eb3dc33b', 'd0839d46-8522-4c77-adbb-542e51fa77ac', 'd0b94d1d-d31a-4f37-bb6e-178e9c976989',
    'd139d82c-5b59-4cce-98e7-4037c72a9af5', 'd152dbbe-a489-43ba-bbda-663c2bbfc03d', 'd16e98f0-e73f-41ef-bc9e-4bdf4a030e07',
    'd16ec908-b1f2-44a1-8b0c-b4e231acbf93', 'd16f8c1b-da79-425d-8673-f9dd8367ea01', 'd177fba4-49aa-4c12-82d2-f16f5059df9c',
    'd1cf422c-0a9b-4290-9cdf-838921c67c08', 'd22f587a-de98-4f6d-be6f-19d9ed3df34e', 'd24260cc-7a80-4dac-b8f6-1bc2d6e3d475',
    'd2b76ddf-4712-40c6-9563-7bcb1529b1e1', 'd33fd38e-ff76-4d93-8e37-a2d8beec3e4f', 'd3bd761d-f19a-402e-83f7-7d666057496c',
    'd3dac411-bf9a-4c83-9351-c4c7029784f8', 'd443861b-c67d-4bef-8bed-6f3e8400967f', 'd461ba4a-4915-4331-91ba-4e522e2cfbb5',
    'd481c6e4-4b1c-4efc-8b41-408455a44135', 'd4c52b23-aef0-4463-b9c5-fb2ed4b13d10', 'd4ecc080-5d32-463c-b6ab-f7a8979acd62',
    'd578e8a4-0f14-47f3-8266-b6a299919c17', 'd6843dea-a0e1-435e-a584-ee3c3e40f900', 'd68b3d2b-43fe-4810-b66b-4b5cdceaf236',
    'd6c51986-9981-403b-808d-cfd4125121ca', 'd6d9ef49-32a8-4757-b4b6-2051078687de', 'd7074cc7-5d91-493e-a410-cfa9b9fda1e1',
    'd7112246-6b93-46ef-90f5-f50ab9cb2cc0', 'd7f85d3d-e58a-45c7-b8e6-f2ddea237577', 'd92cc690-47c8-4fb4-a035-41326ec4fe3d',
    'd92d36e4-b573-4e13-af45-b6e8ea2f5526', 'd95dedac-ef3b-4edb-bf41-b3337eda3c68', 'd9eb1e56-2bd9-4426-bfd5-81d92b89b86c',
    'daad7a04-dbc3-47a3-ac3e-61561b4e0736', 'db7871eb-c87e-49e4-bd8e-4a5c8fd5f840', 'dba1c87d-cd94-401e-8811-50a67e7fb688',
    'dc3f5aec-fe5c-4f26-911b-9f5cee43a920', 'dc7c65fe-85fb-4a81-a21e-638ff836ee30', 'dd5cafc8-fff6-46eb-8256-bce19ef8a2ca',
    'decbe7bd-7bab-4174-af34-43efb541b364', 'decd581b-3472-41dd-a760-951176e5005d', 'dee2c33d-0679-431b-93f9-2437eb262e95',
    'dfc7bb25-d976-47ac-b006-c90dd474b1ca', 'e0186c42-ea3d-4378-80ec-4c5bce314119', 'e03202cb-3fdd-4946-899f-dd813aaf82d1',
    'e0552cf4-d0a2-4b00-a819-0c6b249da9da', 'e0587c27-d540-40cc-98c4-330838478b4d', 'e0aa09a6-1b1d-42c4-83f6-9eaca1c091d8',
    'e0ddcfff-86ec-4055-beb7-718fb2fc070c', 'e147742e-9a70-4cdc-8700-897c6acbddfd', 'e1517408-9e4d-4bdb-8f0e-6782a95504de',
    'e18e4664-02eb-41b2-b5e9-a8c8fc935233', 'e18e48f5-8d5f-4cda-9d50-580135b732e8', 'e1c69c7b-bc65-4dd5-a39a-5b58b5b25936',
    'e265ab49-8029-4d78-b1be-6d4e77a131eb', 'e2d924a4-fda0-4aa3-a22d-e672277d90ab', 'e2e5cb55-0121-488a-aa99-1526cf7327c4',
    'e31b517b-a031-45c4-832f-3a81bad9a6f6', 'e3337fe3-5316-47ba-872f-8b2afd67e239', 'e36594c7-e3e6-4d49-a861-edf93ebe11ce',
    'e3687281-33d5-4a3b-93bd-41a67a2cc49a', 'e40d5040-6fbc-4bbb-8b50-03010d664596', 'e4211376-7d79-4474-a2fa-d5ffc305335d',
    'e421db91-a0a0-480a-8010-6c0168c2a455', 'e42fb782-88d7-4f0c-a90d-f81c442587d3', 'e48f6dc8-c756-4df2-81b6-b087056cd678',
    'e4e8b19c-dea3-41c2-97e1-c51d4a5a3194', 'e4f5dd25-5301-450b-87e6-ccff32a20197', 'e563351e-bcc6-4471-9a13-fc5616b4f54b',
    'e6336c16-4a09-4c2c-a3eb-5cc73cb56be6', 'e67b638e-0230-413a-b70c-7223c2b724e7', 'e6ccbfab-95db-40bc-a29b-e116abcc70ed',
    'e71f6da6-7864-409c-8f78-7d9f558ab331', 'e737e6bf-ea87-4a49-aa8c-2c53fcb4026d', 'e80162d2-42dc-4fb0-ae94-f352fa83a6cf',
    'e8469556-b210-4735-bbad-71813ecc326e', 'e851ec45-e047-4845-83c9-2c94f28ed90f', 'e875a283-24e8-4737-87e2-d07b938c9616',
    'e89c3cfe-653f-4f9f-964c-9070841473ab', 'e9173e44-e8c1-460d-85bd-e4317f78605f', 'ea2a9461-57c9-445a-b3ec-d477cc5cfbb0',
    'eac512c5-7574-4be3-a67d-9f18f7069d2e', 'ead79bd5-47c8-4e75-a138-ed2ea34e178e', 'eb497f2b-95c8-4839-bb20-bd35371ea043',
    'ebeb5683-b33f-410b-a9b3-12d23b6ab573', 'ec2639b6-3d21-48a0-b5f9-ba6e9091a2a0', 'ec6fba57-42be-4d50-ada7-79f4fc755f7e',
    'ed5b6908-821b-485a-84dd-7406d16d9c7f', 'ed9b6980-b0f9-4eb5-96ad-3cb3dc82d1b8', 'edc1fd30-3f19-4a48-85b2-65a91bdd12a5',
    'edc3e041-cb19-44ed-a681-f9fb93e6c4b2', 'ede912d0-9fa9-4bd7-b744-99ef1d3c330a', 'ef1f6e27-2b11-483c-8fae-526c83296cac',
    'f0daadc9-af09-44cb-b4c4-5fe83e5fb2c3', 'f0e72b9b-421e-44cc-9b82-3ea5eb081df4', 'f0ed78f3-f463-4aaf-86b2-0b1bc6d5d263',
    'f10a4a21-235a-4d0b-8c57-09dc251f15ca', 'f18f9c00-a3e0-4983-b62f-ee9c8d810801', 'f193dc09-073d-43ee-bd4c-e86209a1c710',
    'f1c3712d-a07e-49b8-b2b7-7188ee949b4c', 'f1e0c0ec-d383-417f-898d-8c1f240e559f', 'f2714082-efb0-4370-8b1e-8788e2b65d9b',
    'f2b8ff8f-1677-4ab0-99b1-75e6f50c0b0d', 'f2e67aef-5a9e-499d-9372-4d16696920da', 'f385da44-55cd-4b2d-929c-17476cac1bf2',
    'f401eccb-d75e-48fe-977d-20b0dac11d1b', 'f41d3db1-a05a-4956-afe3-32bb83a04e4c', 'f4774dd4-d96c-4a38-a9a6-7771c93fc382',
    'f4a33a9d-8d65-4594-8e0f-1f0c9bfa7c30', 'f585b637-7987-4272-bcb4-718c9e144953', 'f58eabb7-5b56-4648-9b8f-c2a5739c30b9',
    'f5cdfa6a-3120-4903-ad20-ef88efd4ca96', 'f65fe4e1-2951-4c9f-91e0-6bc409ccf93d', 'f6d41d7f-dea4-44e6-928f-e05b8491c33b',
    'f7909946-921a-4702-b1b0-41057b70955b', 'f7acd8a2-c390-4057-aff7-b060110b60d5', 'f7b793a8-aad2-4aa1-8a33-12cecd56fa5f',
    'f80f74b2-3dd3-4829-b76f-29fcfb640e44', 'f81e0e30-ca7f-45c0-89ca-4b97b655199f', 'f854d9cb-9513-493f-b74d-f02fdf94471d',
    'f86f9c68-3cd5-4705-ac31-331c12766a33', 'f8b67299-2eab-4984-b82b-5bd93077f4a4', 'f8d680a5-d86d-49ff-8899-efc0a879be4a',
    'f8e2f80f-ea83-4d25-b017-5860523538c9', 'f96d62bf-294e-487e-b89b-52a5bb4693a2', 'fa982dc7-7083-4e31-86c1-27a2feb1feed',
    'fab40eda-e270-4561-a65b-4c737bfe670e', 'fafc9b62-cf22-41c5-a8ae-4e46b0f70246', 'fb2058e2-204b-47b8-b9e0-fd5fee283fb8',
    'fbeee454-6687-4d68-8bdf-ffd91813528d', 'fc2a1268-244f-4775-9955-249be7daee33', 'fc664c64-fe22-426a-8aa9-ef5f31eac54d',
    'fc6fabb6-ced9-418f-9687-e2d5c5919340', 'fca8fb80-ae0d-4122-914a-8f1c34ca266f', 'fce584be-6e2b-434c-92a1-55e3020a40a6',
    'fd27a820-8dd0-4b5f-bdc1-7cb88f13c25b', 'fd71e1a5-da04-4c4a-9a89-af12ead8b6c4', 'fdd5b373-7424-471b-ac80-8534fd68e728',
    'fee09c44-c22c-45ac-93e5-ae7a1a96f1c5', 'fefb44fe-bcd7-4fb9-bd3d-fd9335f3cbd3', 'ff360999-bf3e-46a8-b45c-c25f45a4818c',
    'ff67b3c2-4759-4d71-acb2-b0da11cc991c', 'ff8be15a-aa8b-4aae-9707-fa09b1aa2ebe', 'ffa10b9c-6b1f-4707-8982-5ab50003e736',
    'ffc461ee-fc4b-4a55-8c5b-772687e13759', 'ffd02b1d-d0d3-41dc-a18b-db2448bc4ee9', 'ffd2d451-722d-4e76-b083-2dfb8ed5cb75'
]) as id;

-- viajes → deporte: 2
insert into fase3g_excepciones (id, vieja, nueva)
select id::uuid, 'viajes', 'deporte' from unnest(array[
    '1f027e00-1f07-4dc3-8f1d-8e08c3e73316', '9147b980-8854-46ec-b98e-af7f084c23aa'
]) as id;

-- deporte → vida: 5
insert into fase3g_excepciones (id, vieja, nueva)
select id::uuid, 'deporte', 'vida' from unnest(array[
    '24074c77-1d45-4adc-87e5-acf26def6709', '41368c43-c85d-4388-b366-68a25eeb93d5', '52d2bb2e-8477-42dd-a796-8a23f93ea982',
    '8484b2bc-6802-4571-8aa4-a359f3aa4dcb', '94891337-c55a-45b9-9989-d9177ede27e8'
]) as id;

-- musica → vida: 13
insert into fase3g_excepciones (id, vieja, nueva)
select id::uuid, 'musica', 'vida' from unnest(array[
    '09dfd9b1-e12b-44f5-8db8-d431b8b6e5ee', '0e3fa103-5f37-4ac3-ba64-1daa2546088d', '1b8bd42f-1326-40d1-9877-3cd6eecc8e02',
    '21fa1db9-be75-4265-947e-f5ee493071ee', '28a5bde9-994b-4a03-9692-8910b7835c7f', '3c47032c-018a-4bcd-954b-9f3248f8d3e5',
    '4dedce07-9335-47dc-8c63-94ad60f6e6e8', '6bf6b400-badd-4231-b65b-8e51044d6b69', '95300869-149c-425b-b8a8-322bc0068adf',
    '98efc771-4653-4804-9d33-a72e5c000241', 'b4324086-654e-44d6-9969-f8bc450cd7a2', 'bd7d8cad-31d0-4c91-8729-9d49789f9fe6',
    'f7bb4612-2c12-4eff-b95f-afe23473e055'
]) as id;

-- cultura → eventos: 146
insert into fase3g_excepciones (id, vieja, nueva)
select id::uuid, 'cultura', 'eventos' from unnest(array[
    '00b27dc4-f9e8-4f29-8413-643740d35a71', '02d82b81-033c-4724-b0bc-34040d7d800f', '0398a81a-39a9-4724-888c-efc2555243b3',
    '04533964-1c73-4790-a6bb-e3f06e00285a', '04db1f07-1c4f-4aa6-9fcb-83532e74c742', '0fe56e1e-4b26-4924-af8b-bf73974d70c1',
    '107d8d78-5e23-41b7-9901-974412f52ce3', '12bcedf4-b8ed-4544-853f-7d5a3e0afc8d', '13419611-eb07-4b2c-99fc-8d3a3ae2d42b',
    '14d99d17-00bc-4ac3-9a14-f3b0bc681d56', '15a3249a-724c-4ce5-be14-128c059fe921', '1c9ffd20-b9cb-4b51-9c1f-5513ab4341b3',
    '1e54c407-dd89-4029-98dc-32e863e28668', '1ea4400c-5f21-4de4-b3dd-b811036941f4', '2243d29e-ff75-4c45-8a6c-e422f7eb695b',
    '228d2ed9-0963-4f37-913b-52d379b7f8e1', '2316b07c-41cd-4e89-a6f5-65c30cd73fad', '25a3bb5b-e61c-4353-81ff-bc3e2c564aae',
    '25d07259-9d83-4dc5-b26b-ea2a609bd6a1', '26bf6e54-1aa8-485b-815b-0eb431c85604', '282f7166-fb55-4756-80f4-64d999949842',
    '29b7c4dd-4c34-43d5-8c97-479046a4544a', '2ad9b88e-ccd2-4b12-a9ee-91586e2b8955', '2cb6619f-869e-402e-8019-8a3be52eb540',
    '2dcd41ee-2945-4f77-922a-7af776026071', '2f51c484-1c9b-4295-9f0f-f19c5957cc38', '30638884-5100-4fbc-a391-49de7a3a07c6',
    '306aa444-4215-417a-b7d1-f1607e218cc2', '33d69ee4-9ad5-4189-a532-6f8edb1ee138', '346b1148-328e-4e20-943c-4239c0c48264',
    '358cd8b1-16f3-40e6-af8e-22f16e43a222', '37c606b9-7d8c-46fb-a0f4-4989672e6711', '37d3f6f5-b69b-4c8d-a318-e6570a13b6c6',
    '380a9063-67f3-40ea-ace5-73f87d2c791f', '3b43ba13-4823-4fcf-887d-7be73fc4e229', '3f014a2c-c6fc-4ba6-a7c3-3c1fb5a492d3',
    '3f39a1c8-94c4-44d4-b295-3d359d97aa34', '3f45bebb-4a4f-4faa-9eab-a582071244bc', '3f801c68-96ff-46be-86aa-3c2046efc127',
    '41f81ee5-dd4d-4fca-b892-e89c1daebb41', '43d896b5-862d-4b27-9834-6459a02a0259', '440e2ffb-9db1-44de-977c-9d5fcffd94c4',
    '471235df-289d-469b-a46e-0f17b04d98ae', '49e8052d-bd62-43ae-ae29-0a82b3de5724', '50926e60-9840-4377-b4d5-3798405865bc',
    '50e5d662-d43a-437f-9b70-830a7b29560b', '54b4f9a2-8bc5-476e-98d4-2ed9fd77bdcc', '55426ea7-e538-482e-b81a-5ea1afce1419',
    '57fae99a-42db-4ee4-90a3-fdd05fdcf87f', '583dd316-1da5-4e56-ab63-d53a6ef75c60', '5895e712-4440-4325-8498-baddc138f99e',
    '58c37191-f50a-4ac0-925a-9b3613b9a200', '58dc57d3-dbb5-4acc-aaac-6953da976c92', '5a4a2b35-893c-44f1-9146-f3acadda2905',
    '5e3c4036-136f-4f51-9b15-b1429e12e286', '5e683920-26e1-4b41-95ee-a8b41b51abf7', '6226362c-2818-451d-9a1a-8d3c6952df64',
    '63424813-d660-42b1-8c4c-02aa85ff9441', '6433f781-3d20-435f-a75a-22d083a2ee81', '6630bc50-8089-4097-a6a0-54746c6e5b5e',
    '667a98f4-19e9-4207-a739-7b0b5433294e', '66c30683-bd3f-4fd6-94b4-b8c54e4df438', '6761d6fd-8db2-4d8c-93c8-fd2b794dc4a5',
    '687f0fd7-bdc8-4d46-93f0-3bbd6ef7d9f1', '69a76671-b736-4708-ab84-90561c575a98', '6b94692a-a60f-4d65-b48b-496ef149e292',
    '6da2900d-4d86-4d51-adc1-c4a5f6ec113f', '6fd9c4f0-8aaa-4a28-98e5-5aad58b89d66', '7676a4d5-f6f4-4f73-a456-6484d83b8240',
    '786e0f8d-c515-490e-922b-aeb3489f9fdd', '79c0b2f7-e0f7-4ce3-b811-78fd26759586', '7add02b5-345c-4c8c-a5b2-f24cbf203f89',
    '7b375048-065e-4f1e-905c-7bb7138ab486', '7b68eeae-a991-4e6e-b586-2248a65d92a5', '7b98d11f-77b1-4939-ae72-6375d0b61371',
    '7e5c5b3a-d69f-44cb-aa2a-fc791944b04c', '80977315-e093-47e1-a4cf-894d40aa9583', '818285fc-b5b9-489d-a299-e063a33dc90e',
    '82249203-c7a5-453c-af62-b34422398d5f', '852c6608-edec-4be5-86bc-deec3d2aecdc', '887356c1-58b6-4c24-be0a-dfaae19f416a',
    '8af64a55-72b9-47f5-84f5-079056f458ec', '8d72f79d-58c7-4124-8e34-de9477207820', '8e625711-4214-43e4-8688-5e1201d39d54',
    '923f9eb2-ea0c-4ec5-9574-e76249e98abe', '9269b19b-dcde-4073-8575-fb414ec5cddb', '97c9d14d-9923-4eae-94c5-9bf7364d6fff',
    '9a76a5a7-1393-459b-8368-4a11e49054c3', '9c0bb5fc-0426-4893-8742-941fc411e3cb', '9d6ff536-564a-4650-ae48-522ed565f870',
    '9e43f374-da1b-4a4a-b601-bd3d70d59b92', '9eaef0ce-231a-44d4-8be5-ca4c59921bfb', 'a0c4a182-25c4-485a-b672-8a78262a8a03',
    'a6510552-c2c1-44f2-99d1-6e839a68b7a0', 'a73aecfb-a7e3-4cec-ad1d-b4b15d63cd71', 'ae9e4eeb-80ab-4ecd-a5cc-f79761ad9ae0',
    'afb517d3-8c14-425d-8601-37b981872e6b', 'b4b58a21-ebca-4228-bfda-cdd6afca8737', 'b654e1da-53ba-4b2b-8504-67c21fa21fea',
    'b875dc0b-8d6d-4c08-b6ea-e4f0ee699870', 'bced9afd-6562-4303-a7f0-57a9f4ddb5be', 'bd67c452-8520-4eb3-8d4f-0b6926660907',
    'c3ac97e1-9f95-40bd-b41d-e44b2340e550', 'c418024f-2e70-4a96-95b4-b7561e75c8bc', 'c53286a3-d930-4c2e-be51-baf06c4208dc',
    'cab59ce9-6dff-4b52-b7ea-10cfddb21af3', 'cb203eb3-d4a8-498d-9ed2-2e07a91b6d66', 'cb7923fb-2164-4322-ac58-8fbcb3e803a7',
    'cc79d6e8-247c-4772-9966-71ded24403e7', 'd05b100f-2b99-4857-a0d3-fd2175e72328', 'd2870a4b-45e3-4b17-90d7-91c00fc4890c',
    'd3a525a6-1663-45ef-bdc5-f2bc79aa651f', 'd460b0cb-d9a9-4191-b686-aa55dd3844d7', 'd9b17827-c24a-4c07-a20b-0c5db40dd0ae',
    'db213c23-9658-4411-a872-879d2ece1935', 'dd42b5aa-65b4-48e0-996a-5d842caffa13', 'de8f1106-706e-4b84-b407-42014519ab54',
    'e0e6992a-a8f7-4341-98ab-e18178e96775', 'e0f3af41-5dc4-4798-9a7d-e6130e97d0f4', 'e202cb77-bbb8-4579-b25a-e4fc45d082eb',
    'e26d78e6-0928-417a-9acc-50cf0d4fb124', 'e2c3f38d-fd32-4143-b9ce-a0e3f64a7c82', 'e34663a3-1326-40b3-aed1-8b98e25e0cb5',
    'e3499d58-c69a-4bda-b1d0-0a783286af0a', 'e55b74a5-9b70-4aec-bd51-2adf51216070', 'e64886ad-be35-4fad-98f3-df725d47a437',
    'e68f18ee-cd10-4643-b9d6-c14e2fad626e', 'e830f8db-9dca-495e-aef9-9772d5d6d18c', 'e903ddc2-04e2-4963-ab19-b38d9c20afb2',
    'e9062ba6-7ec7-45a0-a09c-e25468b85282', 'ef61b2f4-bc37-4058-8eeb-31fbb72c2771', 'efe9591d-c62f-44bc-aaab-069b5fce1903',
    'f07272fa-3b32-4558-a68f-3617f90ebb28', 'f160c820-d7ec-4e98-bf58-2871e3c3a90d', 'f16e3cfc-1df1-4aaf-803c-85e1e3a07b6a',
    'f1b22b3e-d9d7-4e73-a215-6d24073718b4', 'f1daa84c-f767-40bc-9d63-733141ebfe72', 'f336c339-84cc-4e49-809c-0242388c50f9',
    'f477fe9e-7d7f-4552-8bb9-61f7bf252c3d', 'f64eb4aa-990d-4e32-af84-68c3c9f01b65', 'f853f779-79af-4ab6-ac6b-b7a6a47243a9',
    'f862e0eb-1933-4079-be07-388cba7fda13', 'f913d216-1ea6-4095-880d-af8e073ffc3f', 'fcc4e699-5b32-4b0d-8d78-4ebe8864bea7',
    'fd5eff4d-6ee8-4628-9da1-42bee72f5163', 'fe5d5102-b80c-490e-9108-b7faf6da96fc'
]) as id;

-- aventura → deporte: 96
insert into fase3g_excepciones (id, vieja, nueva)
select id::uuid, 'aventura', 'deporte' from unnest(array[
    '010ee423-a515-4e74-860d-693fa0f7a9a7', '052a499e-d9fe-41b0-98ca-3c6f1ace31a4', '071d8ef6-a162-41f6-97c3-79eda0d83605',
    '08e4a087-b9b8-4400-b5b1-6afb42f9af4b', '0a7d2281-fcf9-4818-b2c8-937067445b17', '0af0ad2a-561e-4dc5-be41-d0f60aeb9bcf',
    '0fe10bd4-3a5c-4674-8cec-aab4b2db1476', '17881745-f840-46d4-8977-765ac3e00433', '17ada2c7-dd9f-4054-b0b9-fe02ba096c1c',
    '1a2f93ee-bc74-4c2d-ada9-f9d3aca9c08a', '1c303ef1-6bac-4f19-a8de-5d8a4798db42', '1d23485a-3df4-458e-b2da-b4dcaf3b9f70',
    '1e5206ad-222f-4371-99d0-851ae6298ad9', '2210ed54-d385-428f-8b20-8f6307686ed6', '288613af-0a06-466e-82ba-2d484484378f',
    '2db1a7bd-6cf2-404d-8ced-0b326e0b66e5', '2dd181f4-347c-4d4f-81d2-a81825941236', '2f440bb9-04da-4756-baac-8478da2b1f44',
    '32164f7d-d47c-4faf-b2ae-e5025fc826ce', '36fae76d-f662-4e41-bad5-d63bdad2409e', '3ad958bf-7181-4f97-b8b5-94d0f3d38d26',
    '4031ae75-cf30-4120-8309-00934f1a46de', '406f12bf-a8f6-4ec8-8d8d-87fb59556eea', '409c92d1-40ac-447c-ae8a-eccd9b810bf7',
    '41b0b003-e580-4f8c-ac83-545589931212', '4405ee60-afdc-407d-acf4-43b29bfa1fdb', '46f311f0-a5b0-49c7-9a6c-ce401a6adc4f',
    '49abf112-d46e-40dd-b7e5-05a3b06e7900', '49e6cdae-f9ca-4775-9bb3-acca24dfaa37', '57c24875-bef9-4ba6-a359-976cf100efd1',
    '58981f5c-544a-44d8-9e60-e15f7b84d537', '5b8be06a-5e37-42e9-bb69-db40206128f5', '5e165800-4d7b-4bc3-bd4d-8462738b8b67',
    '607f7f2d-60d6-4b10-b670-f24b984c1273', '61009360-77f6-439c-b11a-bd3646352636', '6142cb11-6597-4c31-9b0f-fccdd7d5865c',
    '620ba48c-5e5c-4ef9-930c-683124754696', '63070be7-c322-4eb8-b65a-cc670d1f391d', '632bafc0-1162-462d-9298-232d659219ce',
    '66ad33b7-8755-464b-b25e-f08e39f2692b', '6de774ff-f865-405a-8bd2-4eecdd794e89', '707de985-8924-417b-8df8-bc9034459ce2',
    '727d3439-c1b8-4a33-8225-28694d512d12', '74aba4ff-00c8-4c03-9d68-9419634afbdd', '765e1f43-8d21-45ba-84b1-0d3beceab10b',
    '78ea562c-9bad-443d-b9d6-6ee6405b7272', '7b46bbad-fe1d-4c33-aff4-e4e40114bb22', '7f858f2d-9c84-4dba-ab51-aeb398b9395e',
    '80f5eacc-90dd-41d0-b8eb-6e56d337e3a8', '860f14f1-68db-4e6e-865c-b440b71bc692', '89f165ec-fc43-4bdb-af1b-df7544b69b1b',
    '8e039bc8-ac42-4eb2-b225-7e4e5d1b2a93', '942c037c-7995-4c76-b62b-fa9dd8b64480', 'a04172b7-337b-41a2-b4cc-5eb60176e591',
    'a756ae41-b64b-4b4c-90b0-3bc5eced180f', 'a7985978-af83-4398-a798-d7a1e1769423', 'a80f1a41-8b78-47b0-b422-4da3c30ae4b9',
    'aa6abd60-f42e-40b3-b0c2-7a6708da0090', 'acb92198-870e-40f4-bdcb-c75581405bc8', 'ad1e1a65-77d5-4bf1-a8bf-a834290bf9c8',
    'ae7b06e7-c1f0-41b7-b95a-d71cd196a0de', 'ae91447c-2adc-4bd8-ac65-a36c990e62eb', 'afc94375-17c2-47a4-94b8-3931c2e54a60',
    'b23d4a6c-f5ec-463b-96fd-311638bfe195', 'b4a53ec9-0a40-420f-b293-db3ac26bdcfc', 'b9a7ee86-d780-47f3-86f9-0863226a5ffd',
    'ba4f9350-eb10-4b3b-93f8-96f4125dbe69', 'bc32c603-be91-405c-9b7f-da47cebce100', 'bfaa2f10-693f-42e5-87e6-13ef67893106',
    'c0d125e1-4498-4ad5-86bf-70252cb1c174', 'c187854a-fee2-45fe-bd4b-e4301192352a', 'c41dd08b-16c2-47e8-9c90-f17d790a17d0',
    'c4d6abcd-8c41-435c-a6a3-7f7a8f6a45d5', 'c7b67156-cc61-4906-a7fb-7ff60aa9fe87', 'c88555bb-9293-4ac6-9a5b-2cf18f7d5f9a',
    'c9a020cc-9b13-4fe9-bbcd-872613484375', 'cee50ddb-d5e2-4990-a018-ff997e5682e6', 'd4ad85dd-660d-453e-9b8b-e5cba977e061',
    'd563cb90-67eb-47d9-b6b7-76372a649268', 'd7a0072d-7eb7-40f5-9026-0b63cdddf7e4', 'd8e0ecee-6535-4f1f-8517-57db20b691a8',
    'd980df04-43ee-4429-9d32-8f35dda48ecc', 'd99a9df6-19c0-4afd-9169-644fce617202', 'dd38e6be-a17d-425f-9ce4-17d0cb600670',
    'de6369ea-4f19-438a-bf29-18274433aed6', 'dfe589af-eba5-4fbd-9377-a23094c6dd47', 'dff70e37-7afb-49db-b106-0b585716fd99',
    'ec143f71-f38e-4ffa-888c-0cbae47ad07b', 'ee4c4672-b438-4c7d-9fb9-482d3d7da5b9', 'f0080dfc-c34c-4a70-9e11-9811bdbf775d',
    'f076b6bb-9ba7-4932-8867-3c08a89dbb43', 'f334afb9-394b-46b5-83c4-92fa7a7c90c6', 'f5d39b11-fd60-42c0-93af-c98eed4ba711',
    'fac41ae2-5dba-4bfb-8ccf-013f81f34d39', 'fb60fb67-c477-46c6-8f30-9ab5fe8d506f', 'fccc9803-3035-4bfa-af64-8ea41d23d8fb'
]) as id;

-- aventura → vida: 9
insert into fase3g_excepciones (id, vieja, nueva)
select id::uuid, 'aventura', 'vida' from unnest(array[
    '279e8517-b526-4dc7-ad5d-3065aa2671ea', '371dff3b-c73c-4260-a176-4f34ccb8b9ab', '46571607-4766-4964-9a40-a1e32533bd7d',
    '6b8c3c30-24e1-48d2-8232-4952d856a025', '81fe7d4f-a042-4c03-b313-fad26c462bf5', 'aaa59203-bc9e-4649-b746-95353999f746',
    'ca2cfa26-c0b8-46b0-83d2-c3ec36ba46fe', 'dbec7bde-339d-4717-a294-284a6047586e', 'f33caf89-3fef-4983-83da-69f16d49f579'
]) as id;

update gooals_v2 g set categoria = e.nueva
from fase3g_excepciones e
where g.id = e.id and g.categoria = e.vieja;

do $$
declare
  movidas int;
begin
  select count(*) into movidas from gooals_v2 g join fase3g_excepciones e on e.id = g.id and g.categoria = e.nueva;
  if movidas <> 1159 then raise exception 'excepciones: esperaba 1159 movidas, hay %', movidas; end if;
end $$;

-- El resto, por categoría vieja. Las que ya se llaman igual (viajes, deporte,
-- gastronomia) no necesitan línea.
update gooals_v2 set categoria = 'eventos' where categoria = 'musica';  -- 40
update gooals_v2 set categoria = 'viajes' where categoria = 'cultura';  -- 291
update gooals_v2 set categoria = 'naturaleza' where categoria = 'aventura';  -- 120
update gooals_v2 set categoria = 'eventos' where categoria = 'espectaculos';  -- 808


-- ── 4. Marcar las dudosas ──────────────────────────────────
-- 519 filas. Siguen verificadas y visibles: solo se marcan para repasarlas.
update gooals_v2 set categoria_dudosa = true where id in (select unnest(array[
    '00a52740-e740-4ba2-a70b-7afa7c794710', '010d6d60-4bab-42b2-8125-d4a30979bfbc', '021dde16-284f-4640-90ef-13ba0989ebab',
    '02830458-d423-46fb-9417-c5f291d719d7', '02ae6b54-8bc5-405f-ba77-7847102bfcb0', '034884c9-8d3f-496b-b25e-0a9cab3006e2',
    '03cfeb2c-08cf-41a4-b3ef-d9165843ac2b', '0438fc47-ffb8-422c-9681-4b8c4d23231f', '04842375-56bb-4e6f-8f15-35bba7da0c32',
    '05f59db7-60e3-4769-9466-ef74fa17f089', '05fc1ebd-a72f-466e-9adf-3bc0f9f744a1', '067be553-59cc-47b0-9463-603199b36347',
    '06dfc6e4-6245-439c-b916-b1f1fb7b4963', '070918f4-42ba-4987-8217-40c103f61052', '074a669b-4583-4ff0-b946-19de7a03a0f6',
    '093b0159-21ca-4b37-b0ec-588d45f03b2f', '096b0fc2-3319-4156-8b75-78651c81e65e', '0a5d03a3-ad34-49df-a46e-a39876c621c5',
    '0a6e77c8-eef8-4b0e-827a-e6c23b28651a', '0aa082f3-2713-4c2c-8e8d-f5387d4e43d2', '0b336f4e-30b2-429b-b08c-98a4d2f3f61e',
    '0b9258ba-a989-48ef-954c-92e9ff629d97', '0bcf4786-84c7-4b53-be21-4d735c8de6ff', '0be4cd3e-6064-479a-a9e9-68fd29d12ea5',
    '0c248450-f0a1-4326-afaf-40c8e7fd2b13', '0d2ce8bb-a5c3-4595-9205-943ec94c33eb', '0d8a8d74-ffa8-4a21-bcba-dce07746bcab',
    '0d9c6375-6538-4ffd-a3bd-cc210066113b', '0f66b1d2-df49-4fc9-8af9-440625446526', '0f8dac9e-8e25-4129-a9f5-a4a36aec8f17',
    '0ff34ea2-908c-4604-a4e1-c0e050629eee', '10b1e6d5-179a-444c-85a7-bd8db56e373c', '1104342c-f2ec-49dc-926a-fdf5bd069595',
    '1240ad35-81b1-41ce-96d6-a3ebe0bfbbee', '12f24715-9a53-4907-a873-70513d716705', '13137346-190a-4092-89e4-d1e81d020669',
    '138da594-d04a-4d40-9725-67f756aa033a', '13f11aca-b656-4889-9551-8da4bbde7b46', '1517f8a9-d914-44cb-a77e-dadccd5c1348',
    '151a1cb3-3fd1-4117-87c3-ee07675abb8a', '156034e0-e841-4260-a0e8-792a043ef3f7', '15c2cb96-2111-4c77-a12e-7bb41bf21c24',
    '15db02a7-e973-4255-8bbc-d769993be94f', '175b015f-176c-4794-8e79-9b42a440d34f', '1766112c-fc05-4f0b-84be-5791cba58850',
    '17d121c1-6a04-4a49-83d0-a94068c7816e', '18d8db4d-c5ec-439f-af3e-af1f32d44d4c', '19245091-7043-4872-a3c4-b381199f27f5',
    '193def5e-f335-415a-9258-94bd20a29900', '194c36b3-ec65-40c6-bc86-6e757df3a5f4', '1b9546cf-f2a5-4197-b4d0-118b529096a8',
    '1c766eb8-c74a-4b2d-825c-92ff5f1443eb', '1c7ef0c3-9aa2-43a3-9ee0-8273824debfa', '1d14df76-edfd-4a51-8c92-edab121aba0f',
    '1e689f68-1d73-414b-a18c-2e4299047d93', '1ea7e815-3913-4a00-b2ee-cc3de5d805dc', '1ef52601-506c-4122-994d-8af8597e2104',
    '1fb1d548-9047-45e7-b79c-cc47bbc3d1a7', '209d5be1-8e4e-458c-92b1-745ddeacd68a', '21e64aa5-a924-4eb3-b62e-377936fc3051',
    '22e9fa3a-6125-40f8-b865-49d2dc594dcc', '24376de6-40de-4d69-81f1-799e67b07feb', '24835b6f-313d-4a00-b768-269a3b869a9a',
    '24b9a541-d4ec-47b2-8be2-468819d6c0a0', '251ae322-3bb3-4974-9770-bd37690a5699', '258650e8-cd7a-4a5d-99ed-e8d4671f5563',
    '25eb6bcf-6ef9-4226-beaa-14a7e8dc0224', '2665068c-5e21-4bce-9e0b-a5d31a0abc16', '2790e173-f02b-4a9c-9062-70b134bf0cd8',
    '27998168-f229-4d5a-838a-10d13f793fe8', '27dc6a2b-de92-4a2f-9032-1836cd790826', '27e1a72d-87e9-436f-a089-3e2b5d3072a3',
    '28ff5ec7-ea5a-4bfd-bdd8-ea9513231359', '290aed73-6b96-4734-aca5-c93c07ab0f47', '294ab9ac-7f1f-485a-aea0-c51f8cb7eeea',
    '299b8173-cab9-498c-a567-f1d18d6ae870', '29e69066-2a4f-415f-9bb1-63b2117bcab7', '2a166938-fee1-42a1-bfe0-493d75eaff7b',
    '2b1ee373-e96a-4ef7-872d-aed58bfd7822', '2b4dd7e1-542a-4b8c-91f1-aa047decd9ec', '2cc496d7-9600-4f5b-a6c2-9b78f1984339',
    '2cd87143-07f3-4e14-8bf1-c2f38b53f183', '2cedf30c-3eca-472a-b054-40b8cd4b9ede', '30a345f4-b931-4f42-bbd0-22de97173360',
    '31110374-fb2a-4b56-a43d-5679c8af1cd7', '31369b5b-39a3-4283-9866-9c3a4f22f1d1', '3186b55c-31b0-4f34-9ab5-cf63afd60831',
    '31c2090f-b586-4308-99b6-7b7007abfe14', '31e76af0-fc15-4a5c-b6a5-d2e846d043ac', '3200068c-acff-4333-bee4-64702e005632',
    '322face7-db80-49cc-99b7-4a703a15a136', '32652852-e234-480f-8f93-6e601c5df9e6', '32a9fae3-319c-4173-b3b8-831f3b87392a',
    '3362d1a0-59f7-4c6a-9b2b-a26953680a46', '339ee392-55d1-4995-970a-ddbc85b54d86', '33af2d80-8bb9-45dd-8cf6-37aada03414c',
    '33d0d809-10ac-4732-b7b5-24160554eef8', '33ee87fc-8ea2-4764-abe5-6cf3c1ad5414', '3501e3a9-615b-4eb2-a629-52159457fff6',
    '35b4fe3c-f98f-4339-9fe4-f266ffe4b52e', '35ea93ba-712a-4ae2-9d43-6fc8a5a989c6', '3653657b-bdc9-4e83-81c4-31b8193068b6',
    '365c5575-4222-4d47-bfaa-5ec8b2bcd97b', '36b85790-e952-4b41-99de-ed46f820ca42', '36efbf80-1e27-467d-b575-41c7a2daddd8',
    '36fd0614-3c60-445d-b4d2-36dc89344dcd', '37922c40-6f58-4ed2-9fb6-6715635eb111', '3792ead2-8a59-48e2-a7af-bf09a6230ac5',
    '37a9e169-aee6-4bf6-9a17-2c11a3342cba', '37af7a1b-75bf-4cb3-9b9a-c5da37615b43', '383c0434-6213-4b94-bb44-f57a6c62ee7d',
    '388f2a19-8032-4e72-a9bd-472225c68319', '390afcde-9de7-471b-bbb7-a8e789b505ec', '39741421-6e6e-44c8-ba3b-f4dda3da041b',
    '3995ae44-8292-412a-b99d-37c20a56e81b', '3a0effdf-9fd7-41fc-aad8-bbf287f7eed1', '3a58e7d1-ca21-4164-8e20-1ca61c1a3986',
    '3a7bf7e6-0785-47d2-9f84-dd73a75decc4', '3aa18088-7996-4c4f-96af-1b68c3153795', '3aa1e882-3214-4801-b1c9-0bef900d7f2d',
    '3af5feae-53b7-4084-9a7e-49cf12943838', '3b3c758b-27d8-41d2-a3c4-6c628663de94', '3bcd0b41-3af1-49a9-9bd7-8cf83682344c',
    '3bea07d9-6c32-43b5-bbec-5f12593b55a2', '3c38be9b-8847-46a3-b899-8b6f27668fc9', '3c9505e7-c4c8-469d-ae03-b6309cf6492f',
    '3d145da1-e674-43b4-aea7-0a2436c7976a', '3d17f999-7170-42b1-90c2-9a9798cfb100', '3d4043ee-261c-4331-91b2-094f5741ba7a',
    '3d5e9d54-e946-4714-b8de-12d7f51644a7', '3d673a30-fe01-4b7c-99de-0725ec65dd9e', '3e3efa48-5c18-4e6d-af0d-d0ae59cd0a2d',
    '3f5b631f-b10e-4e2d-9edd-5e9dd3d5f7be', '3f6b04af-f51c-4c83-8c0a-1f42b0d1500f', '41bd1c73-51b2-43fc-a9be-783e95cc50f8',
    '42e9df73-f374-4aad-a9f8-88145babff21', '42ea6182-6b80-4bc1-b519-c1e94789e667', '4316d487-ca71-4b3e-9365-a989e3f89af2',
    '436649a6-da64-4bf9-8ac6-b0ffad85fc8a', '438254e9-6ea0-42ae-ab32-fdffb99b1acb', '444c8e4b-fe4a-4e42-93b3-76f92e8c65bb',
    '4523fee0-c1eb-4585-be40-9e052d7789d4', '452527da-7c68-446f-8a28-5e326db90cfc', '46a1be63-94e3-44ab-b6a1-f2ec9aa44724',
    '477629f1-4dfe-40aa-90ae-9e8574b23854', '47c0cfe3-ea63-4c15-a766-5064d4a0b20b', '48bf9369-e60e-4514-aecd-373a5fee7aa7',
    '48c6f0f5-9172-4094-9e5b-563b2f1613f8', '4925d6bb-8d7d-4ac0-a7a4-4f33cb364793', '492b71f2-ff0a-4ca8-9e10-7ec99a41cd64',
    '49bfac97-a09a-44cb-927f-3458a2d4534c', '4a04b558-7986-4632-aa20-d804b9310626', '4c61f2fd-fd9c-432d-943b-92a0fda8693c',
    '4ca949ca-7b56-47f5-9bb0-3c306e56e9df', '4d1d8236-fd7c-431a-be52-e28546393f69', '4dc89bc1-bd49-4e79-a50d-bf9d7c2cbfa7',
    '4e237b8d-aeb0-4fb6-bf30-0e11a9606723', '4e3534a6-f15f-4a81-b0e2-7d7854b9c2f2', '4e4616eb-a57c-442f-9fa3-747c742fdf92',
    '4e51fa66-2971-4f47-b186-da59f0afa94f', '4e7ce038-646d-4c2a-87b0-048a4403b907', '4e813237-e284-4610-85ee-c92e2100a72b',
    '4e9def77-7549-4252-8988-7b6cac49fd4a', '4eeb610c-e645-4cb7-9bc8-03dab5514625', '4f10e05e-7241-42eb-a0f1-5a22c4fc2d86',
    '4fea8fdd-957b-4521-b2a9-389bf24096dc', '5156dec3-f550-47a3-b4c7-e62d86fefe26', '5163e4a0-874f-4707-a42d-9d92200f9877',
    '518aa6af-bb43-4d1c-a467-da95641e3c8f', '5274fe2b-1a1d-4570-80d5-a9b0a3673b3f', '52b6f2ca-902e-4cea-990f-a8b629b6db35',
    '54784266-f8df-4e9f-a738-fa8095789933', '5548ca4b-5245-4b21-93a4-228ca72df388', '55bb9d21-ec67-4286-9684-2d67c7a74e74',
    '55d2b951-b991-4487-99ad-2f1e7e0f6f7f', '568c4866-6acd-4a18-8595-39a942349f65', '571e4e29-0b92-4b10-abb4-d655b57ebfeb',
    '575c0fa0-68fc-4d57-a976-d242cf6a41ce', '58236d8a-6d3b-4518-ba51-b943c435ded3', '584f1b58-4e21-4a33-bc3a-d327063f16dc',
    '590e0666-5d00-43c5-8812-4feef116f57d', '592547d1-7d3f-44b1-a10a-59ee56b47d77', '5cdef81c-909e-4915-8862-b8c39fc89fab',
    '5d17c122-0502-4da8-8f4c-1c922662d163', '5dc61df8-7d05-46e3-a416-befd142b55ee', '5ddce2a5-71d2-43f3-b7b0-d138f9ce437a',
    '5f316979-9786-465a-ba66-9aef6e984032', '5f7716a8-1aa5-4e13-8f9d-5bad75c31411', '60d384fd-bb08-4283-9089-14b644b61e05',
    '6122ebb7-de1d-42dc-a3f4-759d0d2c228c', '624a77c2-4a41-406f-b45e-9dbfb5b1cc90', '6309b249-5eaf-46c7-bb7b-2d555bf5b203',
    '63d8c03e-dc2d-4643-a879-e628496a9e28', '6439b3bd-07b8-4772-a976-4fdbb383c3ae', '65f0dd11-8b3e-4f43-93a5-eb4e0a9cd068',
    '66eb800e-e638-4355-a54d-9da9598f6c0d', '67386580-ee23-4a2b-9a00-0d41da909e2c', '6769163d-8c0a-47eb-ac1d-512f8d7e6e79',
    '67774c3b-5f2a-4f42-9559-8cddf79f6340', '68efba18-0124-4b93-ab54-ee9505f07c90', '69a63613-2161-42b2-a7cc-2c4595924262',
    '6a2dc060-895b-4038-82ea-ad059227eaff', '6a8a41e8-b1fd-49e6-a0de-fcbd8aa5993e', '6ab07e70-1716-4288-9d5c-08663fb5340c',
    '6adbee5d-f992-4a2d-b5fc-4f046ccb0c02', '6bef89e8-6cb6-44d9-9ed2-212b938c8c71', '6c6ab95c-eb68-4259-bc27-49bf3060270a',
    '6d46d356-5a13-47f9-814c-598beabdbd96', '6d6cea69-5171-4944-baf6-dc4c50f6a37d', '6e21cc01-6b0e-47b6-9afd-7460b7840a7f',
    '6e81fc33-e284-40f1-88a7-656abae281ef', '6ee24254-9719-4756-b09f-800e1ee09eec', '6ee9462f-10e5-4b25-9fbb-3f64fedf6ab2',
    '6ef8b8f7-0e32-4334-8320-9762185a8bdf', '6efad178-d5f8-477d-9ad2-494f24359486', '6f56ba31-4230-434f-a1ef-e7d1a4a20c0a',
    '7087fe69-374e-4a1d-b8ce-45d2683ebc40', '70c8ee8d-d56f-4022-9490-13af5437d150', '70caaf15-8ce5-42bf-93d0-33820812f8a1',
    '70e78920-afa5-43ab-ac93-7c1d08e103da', '70f42ad9-6e7f-4445-9418-5d7e71cbb352', '710759c6-2dbe-442c-bc67-0b6c31d9d7bc',
    '71d8afca-04a9-4f25-8f96-0e98f35a322d', '720450d5-db75-48db-9449-c6440b46020e', '72313f31-650f-48bc-8c34-1969e7ea6fff',
    '7391bc82-7e21-4de3-b570-f7c4f9a5ec48', '74c99dcb-4405-4a16-9447-9903cfb0f01b', '74e4c4d3-4e4a-4421-9100-8d9c163a0fa5',
    '74f94440-2045-40a9-aa8c-e4ac2869e620', '7696d69d-1692-451b-8a79-de782748d23a', '76a55640-af02-4b1a-87a1-2abbd6bff895',
    '77011829-4ead-4d55-b018-145583461e8f', '77f7d3ba-671f-45cb-b183-9c815b6cddca', '782213c2-141b-4493-af91-ff367bdb1809',
    '78fa3ec6-8082-4787-ac66-d88980350ef4', '7924fe2b-b396-40e0-a85d-4025ab0c1d2b', '79463985-2c58-4439-bd92-227cf5205ab5',
    '7b1bdf3a-e6d5-4830-a09d-a4549ef91096', '7b2560d0-0fae-455e-a398-3d3cd9a9635d', '7b68eeae-a991-4e6e-b586-2248a65d92a5',
    '7b6a961c-60f5-4849-b6c3-ce6b54e421a2', '7ba5a6e1-f119-49f3-a85b-2c1716481729', '7baf56c0-006c-4893-a78d-92be77f6040d',
    '7bc380ab-ec52-47f0-8796-ec192550840b', '7bcb66f4-d989-4256-80e8-1bcda49c4f79', '7c00b06a-0c3b-4114-9405-66a119b35f27',
    '7c45b4f9-ed67-480d-983b-415c6e650103', '7c4c0f88-99c7-4d0c-a035-99b54143c7af', '7decd017-9fd2-4e9f-9d39-6372907f6235',
    '7dfd4c3f-6acb-46e2-b698-c8100d365bd1', '7ea2571b-8075-40aa-9c20-ba1f4e17598e', '7ee825f2-5e0c-45db-9ed9-8bf6c76ffc12',
    '7f58ad69-e37e-480a-9fb9-532c75563a65', '7fcdc4df-de99-4aea-9e9f-e0d9f18e1293', '7fe33ec8-ac05-4517-b559-502ffc939978',
    '80090759-b8d9-4ab0-a65c-ca3326d27245', '80e30d2f-c330-420c-968f-6ee03301ae61', '8102f84c-1a01-4c44-b9f9-d45e70f55d5f',
    '81136dc4-d212-4244-b196-cfb017916ebd', '813e49f2-a386-46c8-8afe-47cbac6c8821', '81bcffdd-08a2-45e6-856b-cda8543765bc',
    '82177e6c-b851-438e-8e69-494386daa335', '823db510-1df3-4df2-847c-97317e0ba2fb', '839125b3-b0a3-456d-abfd-82f151bfa25a',
    '83cfbf91-3825-4261-9fec-e556bc8c3893', '83d35b7f-2244-47a2-97e4-a6d08467e035', '8402e8aa-fd05-49ab-b147-15e06f2c2a92',
    '843d72c7-0f54-4cea-8b38-74eb197d45e4', '848c3d96-5acf-448b-8bbb-7c389f60ad8b', '84d55de0-8199-43fb-b25b-bfd9d212f020',
    '8512f741-62f5-4f1b-9019-1fcbadc7de43', '8542cc18-edca-4cb6-9c48-827acf5071cd', '85ee1557-b46d-421b-9ac4-9557b7e56dfe',
    '863f7a5e-b447-4200-8614-66c9f2ec70b2', '8645ddf2-5bc8-4f35-9431-b927fe9c8927', '8683dd85-dee6-459e-adf9-1a1503b0152b',
    '86a3615a-8f6b-4dd4-ba43-dd9560dbc5ec', '8707d490-1934-4f94-b6a2-a8c236832deb', '87512cd7-3729-4bb4-972d-5ee6e2edd055',
    '87b14d40-3060-47cb-90ac-25712b087ba4', '87e9e53a-cd09-48ad-bc8d-2246666e04f1', '882f9150-a5f9-42f6-b778-cb2ecdbf2284',
    '88aa2741-50be-4e73-a00c-51797aab88c7', '89d54990-cc55-47db-83e3-b523dadd7f44', '8a907469-979f-4b34-8294-433a9383cf97',
    '8ae47e40-4be9-4fad-8f9c-823331c427d4', '8b0d70ca-ede9-4ccf-a02a-f6a226558642', '8b1ad827-e405-4945-924b-5f4c18aa7f27',
    '8b48cfad-a3e3-4d67-9551-691defaf2b61', '8bae65df-bd20-4dd5-a128-7ef21c3cac5c', '8c2f2902-663e-4954-bc77-1f5d2eac0f9c',
    '8d732eb6-b608-4c0a-996d-b66a0f7370c1', '8ddeb81f-454a-400e-bc6e-693b5409ce27', '8e060ee0-af3e-485d-8564-27af10a4b645',
    '90027424-94eb-418d-b4c8-1cc6e548fcd7', '9046da6e-0489-4c9b-a721-00fd17932a4a', '905d940d-6078-448d-ab8d-990b74ece171',
    '91585da8-1228-4630-b400-28bd7492b029', '91e6b825-1496-4cb1-bd03-6f50efec415d', '922eabf6-b0b0-4892-889a-69c2482329dc',
    '928cdeff-c838-42a8-8c33-0bca774b5488', '93167527-8523-48fb-90f7-60558bd57a49', '932d5a92-8cda-434b-999a-9c9c2ced2839',
    '93cd1354-fee3-435d-a29b-a0fae83a5fdb', '945feebc-0096-440b-ac8f-a42d5508a5ae', '946d0a84-aa5a-4f4b-ba6f-7a4976ed741c',
    '947c0a8b-3cf9-4d3c-aa1e-1d6785945749', '947f38a9-fbce-4817-818f-bc3ebee60ba1', '950371c0-a416-47e6-8d0a-8e904bbf6883',
    '9590767e-5a25-4112-aca8-514abfc383c5', '960404f8-96ea-4687-b18b-95fe69c9b6ba', '9686dd1e-a8a1-46eb-b928-8976b3bc9329',
    '972dab25-f58d-4b8d-887f-ddf6b74b515b', '9736125d-d923-42b6-abf6-5a7bccdc58ca', '980df8f4-f2e6-4364-81b6-1b244e0ad415',
    '9968fc08-290e-4540-982e-85e8945ad234', '9a6a5a9f-b5be-4962-b73a-205abfa32ab6', '9af93362-70dc-4136-99be-b4e832a5cbaa',
    '9b23b1dc-6d6b-4cc8-b653-aefb666f34ab', '9b3f10b0-276d-4711-b792-442334e7a613', '9b77728b-e9fe-4a05-b1d4-644c53573583',
    '9bb3cb1e-05b4-489b-bd94-e2d03f3df60c', '9c6f5ce7-f20f-4e77-b75b-acb40fc31289', '9ea57290-1429-426b-95c2-169c96337807',
    '9f91f684-52a6-43c9-83be-f9f270f3d098', '9fe853cb-8b2e-44d7-b866-6925d525a4ff', 'a167b2fb-40dd-4cb1-9573-eedfd1b43de8',
    'a211b089-3b4c-439d-b657-342a6d65ee5c', 'a2245bdd-369e-4817-8333-f827abd669b2', 'a2864a99-764c-43e1-9054-dda630e17345',
    'a3395cad-ea48-4b7a-9be2-a940decff289', 'a37e3d64-67fe-4ace-96fa-c543d47addd3', 'a3a1ae13-bd8c-4af3-8e6b-4f4fc6fcf0c0',
    'a453e0a3-77fb-4797-a916-9e8342da9f45', 'a4a259ab-454f-4171-a3c5-955910d25dc2', 'a5530de3-6a39-45de-ab01-c88fa0db1811',
    'a7665d47-a175-4632-9661-041f2fa22c6c', 'a7b22bfa-a024-4538-a5bf-083f37cd1cdc', 'a87fa6a8-5a64-476c-944c-32a2d590a0f9',
    'a8ec4537-d6a5-4ff7-865f-cd1e8228f38c', 'a940c955-3ca2-4227-b6d5-b89f03631c01', 'aa2b8977-a5af-4f90-902b-7fc901004ed0',
    'aa57ea3c-11a6-4036-8c42-ee4613ce9034', 'aa6bfa0e-cf6c-4acf-a8f7-6906c93333b8', 'ab2f8e39-7411-4d7f-97b1-25e89bb88590',
    'ab4f64e1-3d64-4b74-bd4a-d6e18c498434', 'ab9a0323-8a62-435a-818c-e04f7190c73c', 'aba6fe56-fef5-49ce-b3b2-6a409701974d',
    'abab57ad-6669-48ce-839c-ff1b6d78bd3f', 'ac835c6b-bcac-46c4-9b4e-395510c270f7', 'acc49891-689d-4d91-ba72-611162a850b9',
    'af371110-544d-45a5-a3b3-8b27e84971a9', 'af62f7de-1fa6-45d7-a36c-db82f40442af', 'b06dbb21-3a20-4efa-b5d1-89e8ac6da5d8',
    'b0c422db-676b-416c-b3e2-3f5a3d5a847a', 'b1c6d752-1623-49fd-b0c8-7e5c72f11c05', 'b24bb4bb-e792-4be5-8d9f-b5989df11a29',
    'b393d9bd-698b-43ea-b76f-d7404b5e62fb', 'b3d7df7b-5997-4a6c-a38b-75bd47fd97aa', 'b43aca96-b219-477f-931b-ed3ec0a61493',
    'b455a756-e0b6-49f9-b8c7-499ca247d4d9', 'b467977d-e058-4abc-9602-bcd04692c7c3', 'b57232ed-8b26-4efe-8f90-41c628b419ca',
    'b590f414-b58f-43a7-b2da-6a6991e1b8ac', 'b6a783e6-c141-4100-8069-a68b2e9ddb4c', 'b6e6e5e3-a68c-4c51-a528-6e61cbe04c3d',
    'b70c249f-2d60-4fc3-8ec4-28ff7a859e54', 'b757afa4-5e0c-4e5f-b98f-265853aaa926', 'b8618f76-d03d-4f71-b871-663384dfcfd1',
    'b971006f-0b8c-4193-9ec5-bb48857b5f23', 'bb594d76-8d6e-4345-9157-9008ed4f134f', 'bc12b279-b901-47e1-a1a6-2811fa073100',
    'bc79ff80-33ee-4201-9fd9-abd79d0fad26', 'bd1a6571-b84a-4423-8f5e-79c4ee8c1d2f', 'bd4278e8-12b4-4021-a2a3-6d47671518a5',
    'bda1efe4-7e32-423e-a92d-8c3e08b6ebf1', 'be6c4860-4d06-44b7-8acc-c71d3189131a', 'bf4d7bb5-dc6f-4172-b1f6-97dc503d3132',
    'bf7e1e61-2da5-4886-88ba-ef33215d90e0', 'bf97c98f-e70c-4a8f-b153-d004c74c422e', 'c0a4e299-144d-4ae6-b66d-bd3889c1a06d',
    'c0ce0ea4-eaf1-4aa3-addc-6afc398f8ed7', 'c0edf434-6528-4237-bb8d-6b212c88da5a', 'c14cd792-8c23-41e6-8a9f-fa266c80ddd9',
    'c173950d-80ba-4341-994f-9fb03db414dd', 'c179a2f0-11bc-4626-a413-ed847342df7f', 'c1ae8456-93b9-4687-b745-467636b6d231',
    'c1d71afa-1e33-48d5-b377-f4b26f6ebca9', 'c1d73a58-93a7-46c6-b8ed-a754839ba747', 'c1fafccb-6911-4ef6-bac4-7a7c27c7b74e',
    'c2c1034a-bef7-443c-8cdc-4ecbbc9eccfd', 'c51ac09c-984c-4bb5-8563-ff4d8bb7cc6f', 'c56dfc0f-7e78-49f5-aa77-5e217017b90e',
    'c6074fd4-08a4-4a0c-a1dc-0f80db072ad8', 'c64b825b-0f83-4c07-b11f-c21c6d098021', 'c7c365ff-54f1-4f89-91a0-87ddcda1c609',
    'c811d228-a0f9-4401-b249-0bde6a56f007', 'c82f25d4-74b9-4ad1-8bdb-01a921e14dd6', 'c8b9eb51-b27b-41cf-92b5-538ece6a3773',
    'c966fc15-04b1-41a1-8ab6-dccf02a8e954', 'c98077cf-b010-4078-99b1-f06616cd3c1a', 'c998968c-7439-4e5e-bb76-b8d18e631919',
    'caa3472f-a84e-4d28-8a6f-bb0aa35fe781', 'cc72a23b-c095-4dee-acb1-0623e7a6581c', 'cc747a88-63db-415b-851e-ad849088a6fe',
    'cccf4ea5-dd27-48f3-8be7-9169b3163d45', 'ccf79dbd-2dc3-4850-a666-dac4daaaef95', 'cd92c264-ab30-41e4-b28a-cf5ee373e320',
    'ceaeeb71-f585-4c79-9f02-dad2a39dce67', 'cef30da3-5800-4960-8643-3a13d2506f48', 'cf30188f-0470-469d-b03c-45e7befefd71',
    'cf6792fc-2812-4d0b-b94a-2f2dac0d5b48', 'cf85c817-54bc-4dc8-93e3-43f2e0b5e7b1', 'cfca5eda-9efb-4b0a-8656-1f83137af06e',
    'd02a57f6-07ca-49d7-af09-be92eabf8028', 'd0a6f839-38af-4bda-b528-6489f1af6e6d', 'd118c74d-8564-4511-ad16-a41d0a1786b4',
    'd22d8fa4-df83-498e-9c37-79fa67df17fa', 'd257521b-2597-4bc8-b7f7-1377a342110a', 'd33fea8d-c746-43d6-a625-5f1580e948bd',
    'd4d80d19-a780-46d4-b898-9d8915fdb6d6', 'd519eece-72cc-4029-b2b5-7c7b7af408ee', 'd56508ed-1e68-44be-91c5-4e35835956fa',
    'd629598e-2ce9-4569-8d99-a34b667500ed', 'd6b9f24c-b8d5-42be-85d5-1ed038994231', 'd7040fe5-bb4a-4917-b38f-c196cb2d5bba',
    'd706373a-9a89-4f8c-a75a-5c1f6b5f7582', 'd737b931-a3ed-42e3-a309-f7286ea64922', 'd7670582-adfa-4434-95a1-38ceffb4e775',
    'd7fb8f03-65f8-42f0-a709-e1e37a0bbbf7', 'd82dbd19-25bf-4f96-8324-51d1426cda51', 'd83eae6a-7071-4340-865b-25bdda02f88d',
    'd8d0ed21-9d6a-47a9-8301-aa6b0fee0445', 'd990fef6-9f8e-4de7-ab06-4627483264d1', 'da4a7890-1eb8-463e-a227-9cea6568162d',
    'dad67395-4327-48e0-811d-0898d8a63d92', 'dadd07a6-09fd-451a-88fc-4ecb5353cf22', 'daeb42c9-b16b-4562-9cbd-370004e17425',
    'db5c893c-dc51-482c-ac83-41589d584a11', 'dc7a3c59-32b3-473c-a59b-76afcd088fcb', 'dce30757-333f-4654-b2ff-ce76919ec165',
    'dd4d15b7-2887-46e5-8c67-6d55b6459757', 'dd578a54-08e6-44f3-a829-43ddac5e96cd', 'de0ab0af-6c05-494b-8f9a-3de0e8d19e0c',
    'df13e2c3-076f-4184-9459-5a08c14af05f', 'df5d1b9a-2458-4a14-b7a6-2a38ef7693c2', 'df7b7983-3884-411f-92c4-a8c25ecedd51',
    'e0db82d6-dc43-4c6f-a82f-86c5eda67e2b', 'e2135772-789b-4cd9-9be6-12de37ce875b', 'e2779c9f-c1f4-46b7-a783-58e12e59585a',
    'e28e6cef-32c8-4bd8-9295-38f5bf4feea6', 'e2fe6267-89e5-4b85-b320-be9d30999d67', 'e399f067-a88b-4a98-8729-99cc05355298',
    'e3a65fef-b97b-49cc-9a42-bbed824b13dc', 'e3f9bf3d-0bb2-4182-afc9-f7a35ec154d2', 'e47e1b39-8541-48a4-9d0b-199dfc9cc9fd',
    'e4cba032-d876-475d-a636-14e589726308', 'e5501286-6b29-41dc-b269-464b3d79f3a4', 'e56b7865-29c0-4cfa-af94-96b461716406',
    'e57b0a33-492c-4547-8d27-10ba28038e65', 'e69cbae3-7cc9-42c7-ae63-9902c9ce1868', 'e7a9594a-afa4-472a-9359-b8fa74a6bf29',
    'e7bb02ca-ac2b-4a58-b854-3626075404bb', 'e84476b2-d1cb-43fa-8318-2dc57bffba39', 'e8b7725a-2a4c-4cb4-a7d6-d10825a0ac6b',
    'e959f323-59b2-4217-ac54-1d9010faffca', 'e9688009-fe61-43b6-a2db-81536bbd2c4e', 'ea423645-d622-46bf-a4f4-c6ee7136721a',
    'ea71d80d-b675-48dc-af17-f717daa020fe', 'ea80fcd3-d04f-4614-afef-e13e9f8d89da', 'eac5d268-8f31-41ab-8cc4-3b2e580b4c88',
    'ebf656c4-efef-489b-856f-a96222485e2c', 'ecb4af78-f682-4fcc-8ffe-0e105d49a501', 'ed1afd55-75d3-4f54-ad0d-5d715b8a3fee',
    'ed2e1b78-07b1-4a1d-8f37-81cc12f13fb8', 'ed52e835-5d9a-44ef-8faa-1cecae7bf4b1', 'ede483b7-4a87-46e0-a756-f2973c7c5604',
    'edf6f538-fcb0-4cc3-b528-47d3fcfaadb3', 'ee98a013-7c44-4093-b7b4-6b126ebdd152', 'eeec8f2d-06ab-4fe6-8dc0-223bf49927bd',
    'eeed370e-09ce-4be9-82a0-6056a68c5271', 'ef0e2ca4-57e7-41b2-8f7a-0b5723c59d8b', 'ef311001-59b6-4282-8ca6-cc97c90767ee',
    'efe94a0c-5715-4473-bf44-f059cc57d551', 'f017d2ee-85ab-4874-932b-59241fe02234', 'f0a29bfd-392d-4683-ade9-ddf074e07cd4',
    'f0d039be-0a03-467f-9d9c-df7bc82d70a8', 'f102d4ca-5cac-4dd1-b775-2ee3c2c3abe9', 'f166fde1-6d34-4ddb-bd61-41fc34fe890b',
    'f19a5b0f-95ef-4499-a674-babd907c15cb', 'f1cfd524-1b39-44c3-a6b1-af6601a9d4a1', 'f1feb384-cd07-436f-a06d-125a479f3121',
    'f24a385b-b6b3-46a5-8077-1eb025abdc04', 'f2a532bb-de99-4bf2-9624-338ea221c0fb', 'f2d9aedc-e6b9-4804-9105-517449da4111',
    'f301a301-3acd-4f86-ba0b-49d5f8470610', 'f387086e-8ac4-4ad3-8cc2-d15c35621bfe', 'f3bccbb4-ac3a-401d-87b9-47ae8e562490',
    'f411b9e7-fe54-4f9c-86a6-3533c5ea12e8', 'f4596626-721d-4a0d-8e6b-ea31b4ffb13c', 'f47a27bb-0f3e-46fb-ace0-e66ceda34c0f',
    'f5744a46-31db-4d65-a6c3-0d13dcec81e0', 'f6c022a9-6681-4dcb-a824-a605e3791576', 'f79e679e-ca1f-4ed9-b380-fbbf974986ff',
    'f7b84129-793b-4bc0-9ff5-9c8a1834fd38', 'f8dfafb7-bb4c-4478-8ac8-5fd80b116e4e', 'f8f451f8-9408-42f2-9ff9-a650ba943915',
    'f8f7adaf-a389-4703-ad82-a071ab1cfa65', 'f9aca6d9-d93f-40a4-9cc7-1427d9eaf43c', 'faeb4dfc-1df8-4ea6-92b9-85c9a576932b',
    'faeeadda-f958-4a4c-99ec-7ce7985ffd0d', 'faef0a8d-a51b-4818-8ff2-f7b90ed7078b', 'fc809d4a-e735-4cad-87ee-7f0afbab7b52',
    'fdd5b373-7424-471b-ac80-8534fd68e728', 'fe33320f-bcc1-4643-90fe-c12d21d161d6', 'fef0701a-e83c-4d77-87c7-e510dfcf92ca',
    'ff3198c4-7bce-4025-94f3-1585def51278', 'ff39115d-adae-4f49-ae4d-1be6ee126659', 'ff7d34dd-7118-49b6-bfa6-f5c37816e7cb'
]::uuid[]));


-- ── 5. Pines que hay que rehacer ───────────────────────────
-- 133 pines de viajes. La condición sobre geo evita pisar un pin que
-- alguien ya haya corregido a mano desde el panel.
update gooals_v2 set geo = 'rehacer'
where geo in ('fiable', 'revisar') and id in (select unnest(array[
    '05f59db7-60e3-4769-9466-ef74fa17f089', '08c14a72-3d04-4df0-ba33-d05b17439b35', '0c248450-f0a1-4326-afaf-40c8e7fd2b13',
    '0ddac44f-c668-4021-83ab-4f37d401299a', '0f49b4bc-c093-41f6-9b90-1d200d43fecd', '10b1e6d5-179a-444c-85a7-bd8db56e373c',
    '1104342c-f2ec-49dc-926a-fdf5bd069595', '125e6c60-efb1-4621-8b03-92a9361c2e32', '13137346-190a-4092-89e4-d1e81d020669',
    '150a799b-d030-4de2-ac35-23d87fcdda8e', '15c2cb96-2111-4c77-a12e-7bb41bf21c24', '15db02a7-e973-4255-8bbc-d769993be94f',
    '15f081b8-5f97-4f74-8b6b-ff07946eb448', '17ca1973-eef9-4589-977c-0bcef227b918', '18d8db4d-c5ec-439f-af3e-af1f32d44d4c',
    '1e8f32d9-05ba-40a9-b2dd-f724a4fa4ee0', '209d5be1-8e4e-458c-92b1-745ddeacd68a', '24376de6-40de-4d69-81f1-799e67b07feb',
    '24d4a6ac-dc3c-4085-be72-7e54bdb94f64', '258e9f3d-0c72-440f-82a0-2ff45707354d', '26b7e3f0-e22c-496b-a852-aea54bbdb426',
    '2790e173-f02b-4a9c-9062-70b134bf0cd8', '293a7029-87fe-4c0b-a19e-3a01eb426d48', '306c6e56-e9e3-4650-8b4b-ea83e0523539',
    '3186b55c-31b0-4f34-9ab5-cf63afd60831', '322face7-db80-49cc-99b7-4a703a15a136', '3387e3f7-ca51-485c-b380-13d2318cc326',
    '3501e3a9-615b-4eb2-a629-52159457fff6', '35b4fe3c-f98f-4339-9fe4-f266ffe4b52e', '36efbf80-1e27-467d-b575-41c7a2daddd8',
    '3786258a-86ab-4d17-b12b-81dcf767efd5', '38589cad-edb8-47ab-8c08-c51b1ff64057', '388f2a19-8032-4e72-a9bd-472225c68319',
    '3a55bd26-7c7b-4f2e-946e-cb74fbe039de', '3cdf6969-41a3-4048-9e82-dc5fcb164382', '3e3efa48-5c18-4e6d-af0d-d0ae59cd0a2d',
    '3f6b04af-f51c-4c83-8c0a-1f42b0d1500f', '446ade11-d37c-4759-8f26-d85242be280a', '48c6f0f5-9172-4094-9e5b-563b2f1613f8',
    '4d48dc57-5b14-443f-b50b-9d1d1e8444a9', '4e3534a6-f15f-4a81-b0e2-7d7854b9c2f2', '5156dec3-f550-47a3-b4c7-e62d86fefe26',
    '5163e4a0-874f-4707-a42d-9d92200f9877', '52021620-2a9c-47fc-b460-d2313f50fc01', '5274fe2b-1a1d-4570-80d5-a9b0a3673b3f',
    '57a77ee3-f51c-49fb-8713-be65f8a8129d', '58489b72-1116-4741-80db-f825746b4104', '584f1b58-4e21-4a33-bc3a-d327063f16dc',
    '58fdef8c-eabf-40a0-a5a1-587b134b03ce', '590e0666-5d00-43c5-8812-4feef116f57d', '5aa749df-58df-40e6-9b7f-f68a98e2ac08',
    '5cdef81c-909e-4915-8862-b8c39fc89fab', '5ecec8e6-8a00-42c5-b894-c70cb41697f4', '64e8ae96-c76d-4189-9fd9-992c3db5b846',
    '65f0dd11-8b3e-4f43-93a5-eb4e0a9cd068', '6716e896-872d-45ad-b860-c031411c41a9', '6a8bbbd1-773e-442e-9692-0e6c4eb3c821',
    '6bae5411-4ac7-4312-a479-aa5b370c03e2', '6bef89e8-6cb6-44d9-9ed2-212b938c8c71', '6ee24254-9719-4756-b09f-800e1ee09eec',
    '6ef8b8f7-0e32-4334-8320-9762185a8bdf', '6f56ba31-4230-434f-a1ef-e7d1a4a20c0a', '7098f922-89e5-445d-a1d5-3e5588e47a56',
    '70f42ad9-6e7f-4445-9418-5d7e71cbb352', '710759c6-2dbe-442c-bc67-0b6c31d9d7bc', '72313f31-650f-48bc-8c34-1969e7ea6fff',
    '784b327b-37cb-4711-9b57-4dd1b5dc9037', '7b8f57ad-5cbc-4ae4-af8b-43776a96ed76', '7ba8a64d-9a15-4ab6-a80e-4d502f36a4b7',
    '7decd017-9fd2-4e9f-9d39-6372907f6235', '7deff3b8-5f37-40fa-96b4-ccf9eabe9a9e', '81bcffdd-08a2-45e6-856b-cda8543765bc',
    '836ddf77-b966-4475-b82c-b43c99c2b63f', '8402e8aa-fd05-49ab-b147-15e06f2c2a92', '8542cc18-edca-4cb6-9c48-827acf5071cd',
    '87e9e53a-cd09-48ad-bc8d-2246666e04f1', '8a76d502-62a0-410b-b6c4-950caebdcd5f', '8aa9a5a6-397a-4ea2-a00e-7e7f6aeeb76f',
    '8dd1e017-8ed7-4492-b74d-9d43fbc748af', '9090ab1c-ac6a-4300-b7e0-b0f127ba0d15', '9289d8c5-242c-43d9-bb5b-1264cfe6e3ec',
    '93c17a05-8124-4e17-b687-e258cff5c5e1', '943f2822-6eaf-49eb-922d-5e1529c5ff02', '947c0a8b-3cf9-4d3c-aa1e-1d6785945749',
    '9686dd1e-a8a1-46eb-b928-8976b3bc9329', '980df8f4-f2e6-4364-81b6-1b244e0ad415', '99002c5a-5b2f-401d-84b7-c536780655a4',
    '9b3f10b0-276d-4711-b792-442334e7a613', '9b91941a-9e7d-4c34-afda-a6010bcad30e', '9bd0d269-8764-49b8-a5f1-2fa7255d05ac',
    '9dc77ab5-b253-4690-a40f-2f42c9c2fe60', '9dc87831-27be-4e6c-892b-7308f0e3c7bf', '9fcfee26-5807-450d-bdfb-dc4c0b9eb045',
    'a2864a99-764c-43e1-9054-dda630e17345', 'a32e1b79-7a91-4464-bea0-3ce0ad038e8e', 'a463fdf4-a954-476b-b90d-df5acaffe80e',
    'ab9a0323-8a62-435a-818c-e04f7190c73c', 'ac3c39a2-95b1-4cbd-9779-cd90d1808d27', 'b6ed4d49-28a2-4361-9695-8b01cbc8908a',
    'b70c249f-2d60-4fc3-8ec4-28ff7a859e54', 'bb2fd1b0-86f0-43f9-81bf-c581c37f4e68', 'bb4dd64e-7494-4698-bbbf-3bcbfe347987',
    'bda1efe4-7e32-423e-a92d-8c3e08b6ebf1', 'c0a4e299-144d-4ae6-b66d-bd3889c1a06d', 'c0c1cbc6-be3d-4566-b0fd-03991cc73a5e',
    'c1d71afa-1e33-48d5-b377-f4b26f6ebca9', 'c1fafccb-6911-4ef6-bac4-7a7c27c7b74e', 'c64b825b-0f83-4c07-b11f-c21c6d098021',
    'c93189c5-7a9b-41c2-9f03-1355e6f97c36', 'cb9a060a-f7f4-468b-9d0f-c0bb5d3cfc43', 'cf1ca97c-82f9-462c-b13e-8d3a7141cfc7',
    'd02a57f6-07ca-49d7-af09-be92eabf8028', 'd6b9f24c-b8d5-42be-85d5-1ed038994231', 'd6d9ef49-32a8-4757-b4b6-2051078687de',
    'd7fb8f03-65f8-42f0-a709-e1e37a0bbbf7', 'd83eae6a-7071-4340-865b-25bdda02f88d', 'd86cb8dc-46e6-4bd4-a761-37bb182c1933',
    'de34965f-e991-44e6-97f5-0e8ac3a0808e', 'e0aa09a6-1b1d-42c4-83f6-9eaca1c091d8', 'e3337fe3-5316-47ba-872f-8b2afd67e239',
    'e4cba032-d876-475d-a636-14e589726308', 'e4f5dd25-5301-450b-87e6-ccff32a20197', 'e67b638e-0230-413a-b70c-7223c2b724e7',
    'e84476b2-d1cb-43fa-8318-2dc57bffba39', 'ead79bd5-47c8-4e75-a138-ed2ea34e178e', 'ee98a013-7c44-4093-b7b4-6b126ebdd152',
    'efe94a0c-5715-4473-bf44-f059cc57d551', 'f0d039be-0a03-467f-9d9c-df7bc82d70a8', 'f1feb384-cd07-436f-a06d-125a479f3121',
    'f2685e0c-3fbc-41c5-bc52-ec55a3721265', 'f79e679e-ca1f-4ed9-b380-fbbf974986ff', 'f8f451f8-9408-42f2-9ff9-a650ba943915',
    'fa7f192a-933c-40ec-a6bb-2e52ce89ac99'
]::uuid[]));


-- ── 6. Ahora sí, la restricción ────────────────────────────
-- Después de mover las filas: antes habría rechazado las que aún tenían nombre viejo.
do $$
declare
  hay int;
begin
  select count(*) into hay from gooals_v2
  where categoria not in ('viajes', 'naturaleza', 'eventos', 'deporte', 'gastronomia', 'vida');
  if hay > 0 then raise exception 'quedan % filas con una categoría vieja', hay; end if;
  select count(*) into hay from gooals_v2 where categoria = 'viajes';
  if hay <> 1401 then raise exception 'viajes: esperaba 1401, hay %', hay; end if;
  select count(*) into hay from gooals_v2 where categoria = 'naturaleza';
  if hay <> 1008 then raise exception 'naturaleza: esperaba 1008, hay %', hay; end if;
  select count(*) into hay from gooals_v2 where categoria = 'eventos';
  if hay <> 994 then raise exception 'eventos: esperaba 994, hay %', hay; end if;
  select count(*) into hay from gooals_v2 where categoria = 'deporte';
  if hay <> 698 then raise exception 'deporte: esperaba 698, hay %', hay; end if;
  select count(*) into hay from gooals_v2 where categoria = 'gastronomia';
  if hay <> 598 then raise exception 'gastronomia: esperaba 598, hay %', hay; end if;
  select count(*) into hay from gooals_v2 where categoria = 'vida';
  if hay <> 27 then raise exception 'vida: esperaba 27, hay %', hay; end if;
  select count(*) into hay from gooals_v2 where categoria_dudosa;
  if hay <> 519 then raise exception 'dudosas: esperaba 519, hay %', hay; end if;
end $$;

alter table gooals_v2 drop constraint if exists gooals_v2_categoria_valida;
alter table gooals_v2 add constraint gooals_v2_categoria_valida
  check (categoria in ('viajes', 'naturaleza', 'eventos', 'deporte', 'gastronomia', 'vida'));

drop table fase3g_excepciones;

commit;


-- ── 7. Comprobación ────────────────────────────────────────
-- El editor solo enseña el resultado de la última consulta: lanza cada una por separado.
select categoria, count(*) as gooals, count(*) filter (where categoria_dudosa) as dudosas
from gooals_v2 group by 1 order by 2 desc;
--   viajes      |  1401 |  471
--   naturaleza  |  1008 |   42
--   eventos     |   994 |    6
--   deporte     |   698 |    0
--   gastronomia |   598 |    0
--   vida        |    27 |    0
--   (total 4726 · dudosas 519)

select geo, count(*) from gooals_v2 group by 1 order by 1;
--   rehacer: 133 (más los que hubieras marcado ya desde el panel)
