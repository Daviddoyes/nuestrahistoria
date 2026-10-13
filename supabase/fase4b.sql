-- ═══════════════════════════════════════════════════════════
-- GooALS — Fase 4b: un código corto para el enlace de un gooal
--
-- SE PEGA ENTERO EN EL SQL EDITOR DE SUPABASE. No se ejecuta solo.
--
-- ── QUÉ RESUELVE ──────────────────────────────────────────
--
-- El enlace que se comparte hoy es así:
--
--   https://www.gooals.app/g/caf4f774-6fc1-441c-97ab-429c324496c3?de=david_3b72
--
-- Setenta y un caracteres. En WhatsApp se parte en dos líneas y PARECE SPAM —
-- y ese enlace es lo ÚNICO que ve alguien antes de decidir si pulsa: la
-- tarjeta con la foto la ve después, y solo si pulsa. Con un código corto
-- queda `gooals.app/g/k3m9x2?de=david_3b72`, cuarenta y uno, una línea.
--
-- ── POR QUÉ UN CÓDIGO Y NO EL TÍTULO ──────────────────────
--
-- Porque un título cambia. «Dormir en el refugio de Amitges» se puede
-- reescribir mañana, y todos los enlaces de ese gooal que ya estén en chats de
-- gente dejarían de funcionar — sin que nadie se entere, porque un enlace roto
-- no da ningún error en el sitio donde se rompió. El código se genera UNA VEZ
-- y no cambia nunca; el disparador de la sección 7 lo hace imposible, no solo
-- improbable.
--
-- ── Y EL UUID NO SE VA ────────────────────────────────────
--
-- La página `/g/<x>` acepta LAS DOS FORMAS, y eso se queda PARA SIEMPRE, no
-- como transición. Los enlaces que ya están en chats de gente tienen que
-- seguir funcionando dentro de dos años: el día que alguien decidiera «ya han
-- pasado meses, quito el uuid», rompería conversaciones de 2026 sin verlo.
--
-- ── ESTO NO ES UN SECRETO ─────────────────────────────────
--
-- Un código de seis caracteres se puede ADIVINAR probando, y hay que decirlo
-- aquí para que dentro de un año nadie lo trate como si fuera una contraseña.
-- Da igual: `gooals_v2` es la ÚNICA tabla del proyecto con lectura pública, y
-- el catálogo entero se puede leer desde el navegador con la clave pública de
-- todas formas. El código no protege nada porque no hay nada que proteger
-- detrás de él — es una dirección, como el número de un portal.
--
-- Lo que SÍ hay que cuidar es que no se convierta en otra cosa con el tiempo:
-- el día que un gooal lleve algo que no deba ver cualquiera, la cerradura
-- tendrá que ser una política de RLS, NUNCA que el código sea difícil de
-- acertar.
-- ═══════════════════════════════════════════════════════════


-- ── 1. LA COLUMNA ──────────────────────────────────────────
--
-- Nace permitiendo nulos a propósito: hay 5.240 filas que todavía no tienen
-- código, y ponerle `not null` ahora fallaría. Se le pone al final, en la
-- sección 6, cuando ya están todas rellenas.

alter table gooals_v2 add column if not exists codigo text;

comment on column gooals_v2.codigo is
  'El trozo corto de la dirección pública: /g/<codigo>. Se genera una vez y NO '
  'cambia nunca (disparador gooals_v2_codigo_no_cambia): un código que cambia '
  'rompe los enlaces que ya están en chats de gente. NO es un secreto — se '
  'puede adivinar probando, y da igual porque el catálogo es público.';


-- ── 2. EL GENERADOR ────────────────────────────────────────
--
-- El alfabeto tiene 28 caracteres y las ausencias son las tres decisiones:
--
--   · SIN `0`/`o` NI `1`/`l`/`i`, que se confunden al leerlos. Estos códigos
--     se dictan por teléfono y se reescriben a mano.
--   · SIN VOCALES, y esto no es manía: con vocales, seis caracteres al azar
--     pueden formar una palabra, y una palabra desafortunada en un enlace que
--     la gente comparte no se puede arreglar después sin romper ese enlace.
--     Sin vocales no hay palabra posible.
--   · TODO EN MINÚSCULAS. Una dirección que distingue mayúsculas es una
--     dirección que alguien va a escribir mal.
--
-- Quedan 28^6 = 481.890.304 combinaciones para 5.240 filas. La probabilidad de
-- que dos choquen es ridícula, y aun así se comprueba: «ridícula» no es «no
-- pasa», y el día que pase sin comprobarlo dos gooals compartirían dirección.

create or replace function codigo_gooal_nuevo()
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  alfabeto constant text := '23456789bcdfghjkmnpqrstvwxyz';
  cuantos  constant int  := length(alfabeto);
  intento  text;
begin
  loop
    intento := '';
    for i in 1..6 loop
      intento := intento || substr(alfabeto, 1 + floor(random() * cuantos)::int, 1);
    end loop;
    -- La variable se llama `intento` y no `codigo` A PROPÓSITO: con el mismo
    -- nombre que la columna, este `where` compararía la columna consigo misma
    -- y daría cierto siempre. El bucle no acabaría nunca.
    exit when not exists (select 1 from gooals_v2 g where g.codigo = intento);
  end loop;
  return intento;
end;
$$;


-- ── 3. EL ÍNDICE ÚNICO, ANTES DE RELLENAR ──────────────────
--
-- Va DELANTE del relleno y no detrás. Si fuera detrás, la comprobación del
-- generador sería la única red, y una comprobación que es la única red es una
-- comprobación en la que hay que confiar. Puesto antes, la base misma rechaza
-- un duplicado aunque el generador fallara.
--
-- Los nulos no estorban: en Postgres un índice único deja pasar todos los
-- nulos que quieras, así que convive con las 5.240 filas todavía vacías.

create unique index if not exists gooals_v2_codigo_unico on gooals_v2 (codigo);


-- ── 4. EL RELLENO DE LAS QUE YA HAY ────────────────────────
--
-- Fila a fila, y esto NO es por comodidad: un solo
-- `update ... set codigo = codigo_gooal_nuevo()` sobre todas las filas
-- generaría los 5.240 códigos contra la MISMA foto de la tabla, así que la
-- comprobación de «¿existe ya?» no vería ninguno de los que se acaban de
-- poner en esa misma sentencia. Dos filas podrían salir con el mismo código.
-- Es la comprobación a medias de siempre, disfrazada de optimización.
--
-- Con un update por fila, cada uno ve los anteriores.
--
-- Se rellenan TODAS, también las retiradas: así una que se vuelva a publicar
-- algún día ya trae el suyo, y la columna puede ser `not null` sin huecos.

do $$
declare
  fila   record;
  hechos int := 0;
begin
  for fila in select id from gooals_v2 where codigo is null loop
    update gooals_v2 set codigo = codigo_gooal_nuevo() where id = fila.id;
    hechos := hechos + 1;
  end loop;
  raise notice 'códigos puestos: %', hechos;
end;
$$;


-- ── 5. QUE LOS NUEVOS NAZCAN CON EL SUYO ───────────────────
--
-- ESTA SECCIÓN ES LA QUE NO PUEDE FALTAR. Con la columna obligatoria y sin
-- este disparador, crear un gooal desde el panel, por CSV o con «Generar con
-- IA» fallaría — y eso se descubriría usándolo, que es la peor forma de
-- descubrir nada.
--
-- Y VA ANTES DEL `not null` A PROPÓSITO, aunque leído seguido pareciera más
-- natural al revés: si este fichero se cortara a la mitad —un tiempo agotado,
-- una ventana cerrada— el orden contrario dejaría la columna obligatoria y sin
-- nadie que la rellene, o sea el panel roto. Con este orden, cortarse por
-- cualquier sitio deja la base funcionando.
--
-- Va en un disparador y no en un `default` porque el default no puede
-- reintentar si choca con el índice: el generador sí.

create or replace function gooals_v2_codigo_al_crear()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.codigo is null or btrim(new.codigo) = '' then
    new.codigo := codigo_gooal_nuevo();
  end if;
  return new;
end;
$$;

drop trigger if exists gooals_v2_codigo_al_crear on gooals_v2;
create trigger gooals_v2_codigo_al_crear
  before insert on gooals_v2
  for each row execute function gooals_v2_codigo_al_crear();


-- ── 6. Y AHORA SÍ, OBLIGATORIA ─────────────────────────────
--
-- Sin esto, una fila sin código daría `/g/undefined` el día que alguien la
-- comparta: un enlace roto que no falla en ningún sitio hasta que lo abre la
-- persona a la que se lo mandaste.

alter table gooals_v2 alter column codigo set not null;


-- ── 7. Y QUE NO CAMBIE NUNCA ───────────────────────────────
--
-- «No cambia nunca» escrito en un comentario es una intención. Escrito aquí es
-- un hecho: ni desde el panel, ni desde un guion, ni desde el editor de SQL
-- por descuido.
--
-- Deja pasar el caso de ponerlo cuando estaba vacío, que es lo que hace el
-- relleno de la sección 4 y lo que haría una fila que de algún modo se quedara
-- sin él.
--
-- SI ALGÚN DÍA HAY QUE CAMBIAR UN CÓDIGO DE VERDAD —y no se nos ocurre por
-- qué—, el camino es quitar el disparador, cambiarlo, volver a crearlo y
-- AVISAR de que los enlaces viejos de ese gooal han dejado de funcionar. Que
-- cueste tres pasos es el punto.

create or replace function gooals_v2_codigo_no_cambia()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if old.codigo is not null and new.codigo is distinct from old.codigo then
    raise exception 'El código de un gooal no se cambia: hay enlaces compartidos que dejarían de funcionar.';
  end if;
  return new;
end;
$$;

drop trigger if exists gooals_v2_codigo_no_cambia on gooals_v2;
create trigger gooals_v2_codigo_no_cambia
  before update on gooals_v2
  for each row execute function gooals_v2_codigo_no_cambia();


-- ── 8. LOS PERMISOS, EXPLÍCITOS ────────────────────────────
--
-- `gooals_v2` no tiene ninguna política de ESCRITURA —solo la de lectura
-- pública de los verificados—, así que la RLS ya impide escribir desde el
-- navegador. Esto es la SEGUNDA cerradura, y va escrita en vez de confiarse al
-- reparto por defecto: es exactamente lo que falló con `es_admin`.
--
-- Y LA PREMISA, QUE ES LA QUE SOSTIENE TODO ESTO, escrita aquí al lado para
-- que se pueda volver a comprobar y no haya que creérsela: el 13-10-2026 se
-- buscaron TODAS las escrituras sobre `gooals_v2` —ocho en la app (el panel,
-- la importación por CSV, los dos repasos de títulos, el recuento de
-- conseguidos) y cuatro en los guiones (la siembra, el geocodificador y los
-- dos de fotos)— y las doce usan la clave de servicio. Ninguna va con la clave
-- pública del navegador. La clave de servicio se salta los permisos, así que
-- nada de esto le afecta.
--
-- Si algún día eso dejara de ser verdad, lo que se rompe es lo de aquí abajo,
-- y se rompe RUIDOSAMENTE —un error al guardar—, que es la forma buena.
--
-- ── DOS TRAMPAS DE POSTGRES, Y LAS DOS MUERDEN AQUÍ ───────
--
-- 1. `revoke update (codigo)` NO HACE NADA si el rol tiene el update de toda
--    la tabla, que es justo lo que reparte Supabase por defecto. Un permiso
--    por columna no recorta uno de tabla: convive con él y pierde. Así que se
--    quita el de la tabla entera, que además es lo correcto — el navegador no
--    escribe NUNCA en el catálogo.
--
-- 2. Una función nueva nace con EXECUTE para PUBLIC. Quitárselo a `anon` y a
--    `authenticated` y quedarse tranquilo sería la comprobación a medias de
--    siempre: siguen pudiendo ejecutarla, por ser público. Hay que quitárselo
--    a PUBLIC. Por eso PUBLIC está también en el revoke de la tabla: para que
--    la comprobación B pueda decir «(nadie)» de verdad y no «nadie de los dos
--    que he mirado».
--
-- ── Y POR QUÉ TAMBIÉN EL INSERT Y EL DELETE ───────────────
--
-- No hacen falta para el código corto. Se quitan porque hoy son inofensivos
-- POR UNA RAZÓN QUE NO TIENE NADA QUE VER CON ELLOS: que esta tabla no tiene
-- ninguna política de escritura.
--
-- El día que alguien añada una política a `gooals_v2` por cualquier otro
-- motivo —una sugerencia que se guarde desde el navegador, un contador que se
-- escriba desde el cliente—, la puerta se abre SOLA, y nadie va a relacionar
-- las dos cosas: lo que se tocó fue una política, y lo que se abrió fue un
-- permiso que llevaba años ahí.
--
-- Es exactamente la forma que tenía el agujero de `es_admin`: la política era
-- correcta, y el que abría la puerta era un permiso que nadie estaba mirando
-- porque no parecía parte de la cerradura.

revoke insert, update, delete on gooals_v2 from public, anon, authenticated;
revoke execute on function codigo_gooal_nuevo() from public, anon, authenticated;


-- ═══════════════════════════════════════════════════════════
-- QUÉ COMPROBAR DESPUÉS DE PEGAR ESTO
--
-- Son TRES. La A dice que las piezas EXISTEN; la B, que están CERRADAS; la C
-- comprueba que los dos disparadores SE EJECUTAN, que es otra cosa — una pieza
-- que existe y no actúa se ve igual de bien en A.
-- ═══════════════════════════════════════════════════════════
--
-- ── A · ¿han entrado las piezas? ──────────────────────────
-- Una fila con SIETE «si». Si alguna dice «NO», eso es lo que falta.
--
-- select
--   case when exists (select 1 from information_schema.columns
--                     where table_name = 'gooals_v2' and column_name = 'codigo')
--        then 'si' else 'NO' end                                as columna,
--   case when exists (select 1 from pg_indexes
--                     where indexname = 'gooals_v2_codigo_unico')
--        then 'si' else 'NO' end                                as indice_unico,
--   case when exists (select 1 from pg_proc where proname = 'codigo_gooal_nuevo')
--        then 'si' else 'NO' end                                as generador,
--   case when exists (select 1 from pg_trigger
--                     where tgname = 'gooals_v2_codigo_al_crear' and not tgisinternal)
--        then 'si' else 'NO' end                                as disparador_crear,
--   case when exists (select 1 from pg_trigger
--                     where tgname = 'gooals_v2_codigo_no_cambia' and not tgisinternal)
--        then 'si' else 'NO' end                                as disparador_no_cambia,
--   case when (select count(*) from gooals_v2 where codigo is null) = 0
--        then 'si' else 'NO' end                                as todas_tienen,
--   case when (select count(*) from gooals_v2) =
--             (select count(distinct codigo) from gooals_v2)
--        then 'si' else 'NO' end                                as ninguno_repetido;
--
--
-- ── B · ¿están cerradas? ──────────────────────────────────
--
-- Misma forma que `supabase/consultas/cerradura-puntos.sql`. Tienen que salir
-- CINCO filas, en este orden, y las cinco tienen que decir que no hay nada:
--
--   codigo_gooal_nuevo · QUIÉN PUEDE EJECUTARLA  -> (nadie)
--   gooals_v2 · POLÍTICAS DE ESCRITURA           -> (ninguna)
--   gooals_v2 · QUIÉN PUEDE HACER DELETE         -> (nadie)
--   gooals_v2 · QUIÉN PUEDE HACER INSERT         -> (nadie)
--   gooals_v2 · QUIÉN PUEDE HACER UPDATE         -> (nadie)
--
-- Y OJO CON LEER LA DE LAS POLÍTICAS COMO LA RED DE LAS OTRAS. Es la trampa
-- entera: los tres permisos son inofensivos HOY porque no hay política de
-- escritura, que es una condición que no tiene nada que ver con ellos. El día
-- que alguien añada una política a esta tabla por otro motivo, la puerta se
-- abre sola y nadie va a relacionar las dos cosas — se tocó una política y se
-- abrió un permiso que llevaba años ahí. Por eso se quitan los tres, en vez de
-- apoyarse en la quinta fila.
--
-- Todas miran también a PUBLIC, no solo a `anon` y `authenticated`. Un permiso
-- concedido a PUBLIC lo tiene todo el mundo sin aparecer con su nombre: una
-- consulta que solo busca los dos roles diría «(nadie)» con la puerta abierta.
--
-- select 'codigo_gooal_nuevo'::text as pieza,
--        'QUIÉN PUEDE EJECUTARLA'::text as apartado,
--        coalesce(
--          (select string_agg(distinct grantee, ', ')
--             from information_schema.routine_privileges
--            where routine_name = 'codigo_gooal_nuevo'
--              and grantee in ('anon','authenticated','PUBLIC')),
--          '(nadie)')::text as detalle
-- union all
-- select 'gooals_v2', 'QUIÉN PUEDE HACER ' || p.privilegio,
--        coalesce(
--          (select string_agg(distinct grantee, ', ')
--             from information_schema.table_privileges
--            where table_schema = 'public' and table_name = 'gooals_v2'
--              and privilege_type = p.privilegio
--              and grantee in ('anon','authenticated','PUBLIC')),
--          '(nadie)')
--   from (values ('UPDATE'), ('INSERT'), ('DELETE')) as p(privilegio)
-- union all
-- select 'gooals_v2', 'POLÍTICAS DE ESCRITURA',
--        coalesce(
--          (select string_agg(policyname || ' (' || cmd || ')', ', ')
--             from pg_policies
--            where schemaname = 'public' and tablename = 'gooals_v2'
--              and cmd <> 'SELECT'),
--          '(ninguna)')
--  order by 1, 2;
--
-- Y EL SELECT NO SALE EN ESTA LISTA A PROPÓSITO: `gooals_v2` es la única tabla
-- del proyecto con lectura pública, y eso es lo que hace que el catálogo se
-- vea. Si algún día alguien «cierra» también el select por simetría, Explorar,
-- el mapa y el buscador se quedan en blanco.
--
--
-- ── C · LAS PRUEBAS DE VERDAD, UNA POR DISPARADOR ─────────
--
-- Son DOS porque son dos disparadores y hacen cosas distintas: uno pone el
-- código al crear y el otro impide cambiarlo. Una sola no prueba los dos.
--
--
--   C1 · EL CÓDIGO AL CREAR.  Se inserta un gooal de mentira SIN código y
--   tiene que salir con uno. Va dentro de una transacción que se deshace, así
--   que NO QUEDA NADA en el catálogo: es lo que dice el `rollback` del final.
--
--   begin;
--   insert into gooals_v2 (titulo, categoria, puntos, estado, ambito, activo)
--   values ('PRUEBA fase4b, se deshace', 'vida', 1, 'borrador', 'personal', false)
--   returning titulo, codigo;
--   rollback;
--
--   TIENE QUE DEVOLVER una fila con un `codigo` de seis caracteres, por
--   ejemplo `k3m9x2`. Si sale vacío o da error de nulo, el disparador de la
--   sección 5 no está actuando.
--
--   Y COMPRUEBA QUE EL ROLLBACK HA IDO: después, esto tiene que dar 0.
--
--   select count(*) from gooals_v2 where titulo = 'PRUEBA fase4b, se deshace';
--
--
--   C2 · QUE NO SE PUEDE CAMBIAR.  Se intenta cambiarle el código a un gooal
--   de verdad. Da error a propósito, y un error deshace la sentencia entera:
--   no queda nada escrito.
--
--   update gooals_v2 set codigo = 'zzzzzz'
--    where id = (select id from gooals_v2 order by created_at limit 1);
--
--   TIENE QUE RESPONDER:
--     ERROR: El código de un gooal no se cambia: hay enlaces compartidos que
--     dejarían de funcionar.
--
--
-- ── Y SI FALLA CON OTRO MENSAJE, NO HA PASADO LA PRUEBA ───
--
--   · C2 contesta «duplicate key ... gooals_v2_codigo_unico» -> habría
--     entrado por el índice, no por el disparador. El disparador NO está
--     actuando: prueba con otro valor que no exista.
--   · C1 da «null value in column "codigo"» -> la columna ya es obligatoria
--     pero el disparador de la sección 5 no se creó. Vuelve a pegar esa
--     sección.
--   · C1 da «null value in column "<otra cosa>"» -> no es este cambio: es que
--     esa columna es obligatoria y la prueba no la rellena. Añádela al insert
--     con cualquier valor; lo que se está mirando es el `codigo` que sale.
--   · «0 filas» en C2 -> la tabla está vacía o el `where` no encontró nada. No
--     se ha probado nada.
--
-- Un error no es una prueba superada: la prueba está superada si el error es
-- EL QUE ESPERABAS.
