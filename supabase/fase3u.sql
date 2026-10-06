-- ═══════════════════════════════════════════════════════════
-- GooALS — Fase 3u: el cubo privado de las pruebas
--
-- Crea el cubo 'pruebas', PRIVADO, y le pone UNA sola política: cada persona
-- puede subir a su propia carpeta. Ninguna de leer.
--
-- ── POR QUÉ UN CUBO NUEVO Y NO CAMBIAR EL DE AHORA ─────────
--
-- Porque 'gooals-media' es público y se va a vaciar y borrar. Cambiarlo de
-- público a privado dejaría dentro ficheros cuyas direcciones ya se repartieron,
-- y el cubo seguiría llamándose igual en sitios que no hemos mirado. Un cubo
-- nuevo deja claro, mirando el nombre, si una foto está en el mundo de antes o
-- en el de ahora.
--
-- ── LAS DOS MITADES DE LA CERRADURA ────────────────────────
--
-- 1. EL CUBO ES PRIVADO. `public = false` no es una política: es el interruptor
--    que hace que Supabase deje de servir sus ficheros por dirección a secas.
--    A partir de ahí, la única forma de ver una foto es una dirección FIRMADA,
--    que caduca, y esas las da el servidor después de comprobar quién mira.
--
-- 2. NINGUNA POLÍTICA DE LECTURA. Sin política, nadie puede descargar nada con
--    la clave pública, ni siquiera lo suyo. Es a propósito: así solo hay UN
--    camino para ver una foto —el servidor— y no dos.
--
-- Y una SÍ de escritura, que hace falta: la foto se sube desde el navegador
-- porque una Server Action tiene límite de tamaño y un vídeo de nueve segundos
-- se lo come. La política copia la que ya tenía 'gooals-media', y está bien
-- pensada: solo dejar subir a la carpeta que lleva tu propio id.
--
-- Comprobado el 6-10-2026 contra 'gooals-media' con la sesión de un usuario
-- normal: subir a su carpeta ACEPTADO, a la de otro RECHAZADO, a la raíz
-- RECHAZADO, y borrar lo de otro no hizo nada.
--
-- ── LO QUE NO HACE ESTE FICHERO ────────────────────────────
--
-- No mueve ni un fichero ni toca ninguna fila. Eso lo hace después el guion
-- scripts/fotos-usuarios/mudanza.mjs, que además vacía 'gooals-media'.
--
-- SEGURIDAD: un único bloque "do". Se puede pegar dos veces.
-- ═══════════════════════════════════════════════════════════

do $$
declare
  antes_privado boolean;
  politicas     integer;
begin
  -- ── 1. El cubo ──────────────────────────────────────────
  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('pruebas', 'pruebas', false, 52428800,
          array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime'])
  on conflict (id) do update
    set public = false,
        file_size_limit = 52428800,
        allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime'];

  select public into antes_privado from storage.buckets where id = 'pruebas';
  if antes_privado is distinct from false then
    raise exception 'El cubo pruebas no ha quedado privado. No se sigue.';
  end if;

  -- ── 2. La única política: subir a tu propia carpeta ─────
  -- storage.foldername(name) parte la ruta; su primer trozo es la carpeta de
  -- primer nivel, que aquí es el id de quien sube. Comparar con auth.uid()
  -- impide dejar una foto en la carpeta de otra persona.
  drop policy if exists "subir solo a tu carpeta" on storage.objects;
  create policy "subir solo a tu carpeta" on storage.objects
    for insert to authenticated
    with check (bucket_id = 'pruebas' and (storage.foldername(name))[1] = auth.uid()::text);

  -- Y NINGUNA de select, update ni delete, a propósito. Para leer está la
  -- dirección firmada que da el servidor; para borrar, el servidor.
  drop policy if exists "leer pruebas" on storage.objects;

  select count(*) into politicas
  from pg_policies
  where schemaname = 'storage' and tablename = 'objects'
    and qual like '%pruebas%' or with_check like '%pruebas%';

  raise notice 'Cubo pruebas creado y privado. Politicas que lo nombran: % (debe ser 1, la de subir).', politicas;
end $$;


-- ═══════════════════════════════════════════════════════════
-- COMPROBACIÓN. Cada consulta por separado.
-- ═══════════════════════════════════════════════════════════

-- 1 · Los cubos y cuáles son públicos.
select id, public as publico, file_size_limit as tope_bytes
from storage.buckets order by id;
--   pruebas tiene que salir con publico = false.
--   catalogo y avatars, true. gooals-media seguirá ahí hasta que lo vacíe el guion.

-- 2 · Las políticas que tocan el cubo nuevo.
select policyname, cmd, roles::text, coalesce(qual, with_check) as condicion
from pg_policies
where schemaname = 'storage' and tablename = 'objects'
  and coalesce(qual, '') || coalesce(with_check, '') like '%pruebas%';
--   UNA fila: "subir solo a tu carpeta" | INSERT | {authenticated}
--   Si sale alguna de SELECT, el cubo estaría abierto por otro lado.

-- 3 · Todas las políticas de storage, para verlas de un vistazo.
select policyname, cmd, coalesce(qual, with_check) as condicion
from pg_policies where schemaname = 'storage' and tablename = 'objects'
order by policyname;
--   Aquí se ven también las que ya había para gooals-media y avatars.
--   Las de gooals-media se podrán quitar cuando el guion lo deje vacío.
