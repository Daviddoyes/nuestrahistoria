-- ═══════════════════════════════════════════════════════════
-- GooALS — Fase 3v: quitar las políticas del cubo que ya no existe
--
-- 'gooals-media' está vaciado y borrado: sus dos ficheros se mudaron a
-- 'logros-privados', las filas apuntan a la ruta nueva y las tres pantallas se
-- comprobaron DESPUÉS del vaciado.
--
-- Pero sus políticas siguen en storage.objects. No protegen nada —el cubo no
-- existe— y dejan la puerta vieja entornada: el día que alguien cree un cubo
-- con ese mismo nombre, nacería con los permisos de antes sin que nadie lo
-- decida. Una regla que sobrevive a lo que regulaba es de las que confunden.
--
-- ── NO SE BORRA A CIEGAS ───────────────────────────────────
--
-- El bloque solo quita políticas que nombren 'gooals-media', y antes comprueba
-- que el cubo no existe. Si alguien lo hubiera vuelto a crear, se para: eso
-- significaría que las reglas sí están regulando algo.
--
-- SEGURIDAD: un único bloque "do". Se puede pegar dos veces.
-- ═══════════════════════════════════════════════════════════

do $$
declare
  existe   integer;
  quitadas integer := 0;
  p        record;
begin
  select count(*) into existe from storage.buckets where id = 'gooals-media';
  if existe > 0 then
    raise exception 'El cubo gooals-media existe. Si ha vuelto, sus politicas si regulan algo: no se tocan.';
  end if;

  -- Se quitan por su condición y no por su nombre: así cae cualquiera que lo
  -- mencione, se llame como se llame.
  for p in
    select policyname
    from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and coalesce(qual, '') || coalesce(with_check, '') like '%gooals-media%'
  loop
    execute format('drop policy if exists %I on storage.objects', p.policyname);
    quitadas := quitadas + 1;
    raise notice 'Quitada la politica "%"', p.policyname;
  end loop;

  raise notice 'Politicas de gooals-media quitadas: %.', quitadas;
end $$;


-- ═══════════════════════════════════════════════════════════
-- COMPROBACIÓN. Cada consulta por separado.
-- ═══════════════════════════════════════════════════════════

-- 1 · Que no queda ninguna que lo nombre.
select policyname, cmd, coalesce(qual, with_check) as condicion
from pg_policies
where schemaname = 'storage' and tablename = 'objects'
  and coalesce(qual, '') || coalesce(with_check, '') like '%gooals-media%';
--   Ninguna fila.

-- 2 · Todas las políticas de storage que quedan.
select policyname, cmd, roles::text, coalesce(qual, with_check) as condicion
from pg_policies where schemaname = 'storage' and tablename = 'objects'
order by policyname;
--   La de "subir solo a tu carpeta" (INSERT, logros-privados) y las que hubiera
--   para avatars. Ninguna de SELECT sobre logros-privados: si aparece una, el
--   cubo estaria abierto por otro lado.

-- 3 · Y los cubos que quedan.
select id, public as publico from storage.buckets order by id;
--   avatars, catalogo, fotos, momentos: publico = true
--   logros-privados: publico = false
--   gooals-media NO debe aparecer.
