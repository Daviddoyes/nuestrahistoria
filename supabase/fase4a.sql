-- ═══════════════════════════════════════════════════════════
-- GooALS — Fase 4a: el @usuario se puede cambiar, pero no robar
--
-- SE PEGA ENTERO EN EL SQL EDITOR DE SUPABASE. No se ejecuta solo.
--
-- ── QUÉ RESUELVE ──────────────────────────────────────────
--
-- Hoy el @usuario ya es único —`profiles_username_unico`, de la fase 3m, y
-- comprobado desde fuera el 13-10-2026: dos cuentas con el mismo nombre en
-- mayúsculas distintas se rechazan con un 23505—. Lo que NO hay es nada de
-- esto:
--
--   · que un @usuario abandonado quede RETIRADO. Sin eso, en cuanto alguien
--     se cambia el suyo, cualquiera puede coger el que acaba de soltar y
--     quedarse con su identidad: los enlaces viejos a /perfil?u=<ese> llevan
--     ahora a otra persona.
--   · que el FORMATO se cumpla de verdad. Hoy lo comprueba el onboarding, y
--     el navegador tiene `grant update (username)` desde la fase 3y: dos
--     líneas en la consola se saltan la pantalla entera.
--   · un LÍMITE de cambios. Si cambiarse el @usuario es gratis, basta con ir
--     cogiéndolos y soltándolos para retirarlos todos.
--
-- ── Y POR QUÉ NO SE LE QUITA EL PERMISO AL NAVEGADOR ──────
--
-- A `es_admin` y a `puntos_totales` se les quitó el `update` porque esas
-- columnas dan PODER: quien se las escribe se hace administrador o se infla el
-- marcador. El @usuario no: es la identidad de uno mismo, y cambiársela es
-- legítimo. Lo que no puede es MENTIR.
--
-- Así que la regla va donde no se puede esquivar —en un disparador de la
-- base—, y entonces el grant puede quedarse: da igual que la escritura venga
-- de la pantalla o de la consola, pasa por aquí igual. De paso, el onboarding
-- sigue funcionando sin tocarlo.
-- ═══════════════════════════════════════════════════════════


-- ── 1. LOS @USUARIOS RETIRADOS ─────────────────────────────
--
-- Un @usuario que alguien dejó NO vuelve al montón: queda apuntado aquí con el
-- dueño que tuvo. La clave primaria es el nombre YA NORMALIZADO (minúsculas y
-- sin espacios alrededor), que es exactamente la forma en que lo compara el
-- índice único de profiles. Si se guardara tal cual se escribió, «David» y
-- «david» serían dos filas distintas y el retiro no protegería de nada.
--
-- Sin políticas de RLS a propósito: esta tabla no la lee ni la escribe el
-- navegador, solo el disparador de aquí abajo y el servidor. Una tabla sin
-- políticas está cerrada, y eso es lo correcto.
create table if not exists usernames_retirados (
  username    text primary key,
  user_id     uuid references auth.users(id) on delete set null,
  retirado_at timestamptz not null default now()
);

-- De quién fue cada uno, para poder contestar «ese @usuario era tuyo» sin
-- recorrer la tabla entera.
create index if not exists usernames_retirados_user_idx
  on usernames_retirados (user_id);


-- ── 2. LOS NOMBRES RESERVADOS ──────────────────────────────
--
-- Dos grupos y conviene no mezclarlos al leerlos:
--
--   · los que suplantarían al equipo: admin, soporte, gooals…
--   · y las RUTAS DE LA APP: explorar, muro, perfil, inicio… Hoy el perfil se
--     abre con /perfil?u=<usuario>, así que no chocan con nada. Pero el día
--     que el perfil pase a ser /@usuario o /usuario —que es lo normal—, un
--     @usuario llamado «explorar» se comería una ruta. Reservarlos hoy cuesta
--     cero; quitárselo a alguien después, no.
create table if not exists usernames_reservados (
  username text primary key
);

insert into usernames_reservados (username) values
  ('admin'), ('administrador'), ('administracion'), ('root'), ('sistema'),
  ('soporte'), ('support'), ('ayuda'), ('help'), ('contacto'), ('info'),
  ('gooals'), ('gooal'), ('equipo'), ('team'), ('oficial'), ('staff'),
  ('moderador'), ('moderacion'), ('legal'), ('privacidad'), ('terminos'),
  ('api'), ('www'), ('app'), ('cdn'), ('static'), ('assets'),
  ('null'), ('undefined'), ('none'), ('anonimo'), ('usuario'), ('user'),
  ('yo'), ('me'), ('nuevo'), ('nueva'), ('test'), ('prueba'),
  -- las rutas de la app, por si el perfil pasa algún día a /@usuario
  ('inicio'), ('explorar'), ('muro'), ('mapa'), ('perfil'), ('onboarding'),
  ('auth'), ('invite'), ('baja'), ('download'), ('reset-password')
on conflict (username) do nothing;


-- ── 2bis. Y LAS DOS, CERRADAS. ESTO NO ES UN TRÁMITE ───────
--
-- > **Una tabla nueva no nace cerrada.** La RLS decide filas; los GRANT
-- > deciden columnas. Toda tabla nueva lleva su RLS y sus permisos revisados
-- > EN EL MISMO FICHERO QUE LA CREA, aunque lo que guarde parezca inofensivo.
--
-- En Supabase, una tabla nueva en `public` nace con permisos para `anon` y
-- `authenticated` — es exactamente como `es_admin` acabó siendo escribible por
-- cualquiera con la clave pública del navegador, que es la que va en el bundle.
--
-- Y aquí el daño sería peor que en una tabla cualquiera, porque estas dos SON
-- la cerradura:
--
--   · con INSERT en `usernames_reservados`, cualquiera se reserva todos los
--     nombres que quiera. La tabla que protege los nombres se convierte en el
--     arma para secuestrarlos.
--   · con INSERT en `usernames_retirados`, cualquiera «retira» el @usuario de
--     otra persona y le impide volver a usarlo.
--
-- Ninguna de las dos la toca el navegador: solo los disparadores de aquí
-- abajo, que van con `security definer` y por tanto corren con los permisos de
-- quien los creó, no con los de quien escribe. Así que se revoca TODO de
-- forma explícita en vez de confiar en el defecto — que es justo lo que falló
-- la otra vez.
alter table usernames_retirados  enable row level security;
alter table usernames_reservados enable row level security;

revoke all on table usernames_retirados  from anon, authenticated;
revoke all on table usernames_reservados from anon, authenticated;

-- Y sin ninguna política, a propósito: una tabla con RLS y sin políticas está
-- cerrada, y eso es lo correcto para lo que solo toca el servidor. No es un
-- olvido; no le añadas una «para que funcione».


-- ── 3. EL DISPARADOR: formato, retirados y un cambio cada 30 días ──
--
-- Las tres reglas juntas y en la base, que es donde no se pueden esquivar.
--
-- security definer para poder mirar `usernames_retirados`, que está cerrada; y
-- el search_path fijado, porque sin eso a una función security definer se la
-- engaña con una tabla falsa en otro esquema (mismo cuidado que en
-- `username_libre` de la fase 3m).
create or replace function username_al_cambiar()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  nuevo text;
  viejo text;
  ultimo timestamptz;
begin
  -- Nada que mirar si el @usuario no cambia. Importa que esta salida esté la
  -- primera: sin ella, CUALQUIER update de profiles —la foto, los intereses—
  -- chocaría con el límite de 30 días.
  if new.username is not distinct from old.username then
    return new;
  end if;

  nuevo := lower(btrim(new.username));
  viejo := lower(btrim(old.username));

  -- Se guarda normalizado. Así lo que hay en la tabla es siempre lo que se
  -- compara, y nadie se encuentra con que su «David» se buscaba como «david».
  new.username := nuevo;

  -- ── FORMATO ──
  if nuevo is null or nuevo = '' then
    raise exception 'El nombre de usuario no puede estar vacío.'
      using errcode = 'check_violation';
  end if;

  if length(nuevo) < 3 or length(nuevo) > 20 then
    raise exception 'El nombre de usuario tiene que medir entre 3 y 20 caracteres.'
      using errcode = 'check_violation';
  end if;

  -- Empieza por letra, sigue con letras, cifras o guiones bajos, y no acaba en
  -- guion bajo. Sin dos seguidos. Eso deja fuera «_», «__», «123» y «david_»,
  -- que no son el nombre de nadie.
  if nuevo !~ '^[a-z][a-z0-9_]{1,18}[a-z0-9]$' or nuevo like '%\_\_%' then
    raise exception 'El nombre de usuario solo puede llevar letras sin acentos, números y guiones bajos; tiene que empezar por una letra y no acabar en guion bajo.'
      using errcode = 'check_violation';
  end if;

  -- ── RESERVADOS ──
  if exists (select 1 from usernames_reservados r where r.username = nuevo) then
    raise exception 'Ese nombre de usuario está reservado.'
      using errcode = 'check_violation';
  end if;

  -- ── RETIRADOS ──
  --
  -- El de OTRA persona no se puede coger nunca. El propio sí: quien se
  -- arrepiente de un cambio tiene que poder volver al suyo, y volver a lo tuyo
  -- no es robarle nada a nadie.
  if exists (
    select 1 from usernames_retirados t
    where t.username = nuevo
      and (t.user_id is null or t.user_id <> new.id)
  ) then
    raise exception 'Ese nombre de usuario ya no está disponible.'
      using errcode = 'check_violation';
  end if;

  -- ── UN CAMBIO CADA 30 DÍAS ──
  --
  -- No es por molestar: sin esto, alguien puede ir cogiendo y soltando
  -- @usuarios para retirarlos en bloque y que nadie más pueda usarlos. Se mide
  -- sobre los retiros de esa persona, que es donde queda la huella.
  --
  -- El PRIMERO no cuenta: quien todavía no tiene @usuario —o lo recibe
  -- generado— no ha gastado ningún cambio.
  if viejo is not null and viejo <> '' then
    select max(t.retirado_at) into ultimo
      from usernames_retirados t
     where t.user_id = new.id;

    if ultimo is not null and ultimo > now() - interval '30 days' then
      raise exception 'Solo puedes cambiar tu nombre de usuario una vez cada 30 días. Podrás volver a cambiarlo el %.',
        to_char(ultimo + interval '30 days', 'DD/MM/YYYY')
        using errcode = 'check_violation';
    end if;

    -- Y el viejo queda retirado. Va DESPUÉS de todas las comprobaciones: si
    -- alguna falla, la transacción se deshace entera y no se retira nada.
    insert into usernames_retirados (username, user_id)
    values (viejo, new.id)
    on conflict (username) do update set user_id = excluded.user_id, retirado_at = now();
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_username_al_cambiar on profiles;

-- BEFORE UPDATE, no AFTER: hace falta poder corregir el valor (lo pasa a
-- minúsculas) y rechazarlo antes de que se escriba.
create trigger profiles_username_al_cambiar
  before update of username on profiles
  for each row
  execute function username_al_cambiar();


-- ── 4. Y AL DAR DE ALTA, QUE ES EL HUECO QUE QUEDABA ───────
--
-- El disparador de arriba solo mira los UPDATE, y por ahí se colaba lo que
-- más importa: el índice único impide repetir un @usuario VIVO, pero uno
-- retirado está libre para la base. Así que bastaba con crearse una cuenta
-- nueva y pedir el @usuario que alguien acababa de soltar — justo el robo de
-- identidad que la tabla de retirados existe para impedir.
--
-- ── POR QUÉ AQUÍ NO SE COMPRUEBA EL FORMATO ───────────────
--
-- A propósito, y no por dejadez. El único que inserta perfiles es la propia
-- app, con un @usuario que se inventa a partir del nombre; si este disparador
-- exigiera el formato, un nombre largo —hay uno de 33 caracteres— haría que
-- NO SE PUDIERA CREAR LA CUENTA. Y eso dependería de en qué orden se pegue
-- esto y se publique la app, que es una trampa que no hace falta montar.
--
-- Lo que protege de verdad —retirados y reservados— sí está, y no depende de
-- ningún orden. El formato lo garantiza el generador de la app, y el día que
-- se quiera también aquí, se añade cuando el generador esté publicado.
create or replace function username_al_crear()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  nuevo text;
begin
  if new.username is null or btrim(new.username) = '' then
    return new;   -- sin @usuario todavía; ya lo pondrá el onboarding
  end if;

  nuevo := lower(btrim(new.username));
  new.username := nuevo;

  if exists (select 1 from usernames_reservados r where r.username = nuevo) then
    raise exception 'Ese nombre de usuario está reservado.'
      using errcode = 'check_violation';
  end if;

  -- Aquí no hay excepción para «el propio»: una cuenta que se acaba de crear
  -- no puede tener un pasado.
  if exists (select 1 from usernames_retirados t where t.username = nuevo) then
    raise exception 'Ese nombre de usuario ya no está disponible.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_username_al_crear on profiles;

create trigger profiles_username_al_crear
  before insert on profiles
  for each row
  execute function username_al_crear();


-- ═══════════════════════════════════════════════════════════
-- QUÉ COMPROBAR DESPUÉS DE PEGAR ESTO
--
-- Son DOS consultas y hacen preguntas distintas. La primera dice que las
-- piezas EXISTEN; la segunda, que están CERRADAS. Las dos tienen que salir
-- bien: una tabla que existe y está abierta es peor que no tenerla.
-- ═══════════════════════════════════════════════════════════
--
-- ── A · ¿han entrado las piezas? ──────────────────────────
-- Una fila con CINCO «si». Si alguna dice «NO», eso es lo que falta.
--
-- select
--   case when to_regclass('public.usernames_retirados') is not null
--        then 'si' else 'NO' end                                as tabla_retirados,
--   case when (select count(*) from usernames_reservados) >= 40
--        then 'si' else 'NO' end                                as reservados_cargados,
--   case when exists (select 1 from pg_proc where proname = 'username_al_cambiar')
--        then 'si' else 'NO' end                                as funcion_cambiar,
--   case when exists (select 1 from pg_trigger
--                     where tgname = 'profiles_username_al_cambiar' and not tgisinternal)
--        then 'si' else 'NO' end                                as disparador_cambiar,
--   case when exists (select 1 from pg_trigger
--                     where tgname = 'profiles_username_al_crear' and not tgisinternal)
--        then 'si' else 'NO' end                                as disparador_crear;
--
--
-- ── B · ¿están cerradas? ──────────────────────────────────
--
-- Misma forma que `supabase/consultas/cerradura-puntos.sql`, que es la que ya
-- usamos para esto. Tienen que salir CUATRO filas:
--
--   usernames_reservados · RLS ENCENDIDA  -> SÍ
--   usernames_retirados  · RLS ENCENDIDA  -> SÍ
--   usernames_reservados · PERMISOS       -> (ninguno)
--   usernames_retirados  · PERMISOS       -> (ninguno)
--
-- Si en PERMISOS sale cualquier cosa —INSERT, SELECT, lo que sea— para `anon`
-- o para `authenticated`, esa tabla la puede tocar quien tenga la clave
-- pública del navegador, y entonces la cerradura es el arma.
--
-- with t as (select unnest(array['usernames_retirados','usernames_reservados']) as tabla)
-- select c.relname::text as tabla,
--        'RLS ENCENDIDA'::text as apartado,
--        (case when c.relrowsecurity then 'SÍ' else 'NO — abierta de par en par' end)::text as detalle
--   from pg_class c
--   join pg_namespace n on n.oid = c.relnamespace
--  where n.nspname = 'public' and c.relname in (select tabla from t)
-- union all
-- select t.tabla, 'PERMISOS de anon y authenticated',
--        coalesce(
--          (select string_agg(distinct g.grantee || ': ' || g.privilege_type, ', ')
--             from information_schema.role_table_grants g
--            where g.table_schema = 'public' and g.table_name = t.tabla
--              and g.grantee in ('anon','authenticated')),
--          '(ninguno)')
--   from t
--  order by 1, 2;
--
--
-- ── C · LAS PRUEBAS DE VERDAD, UNA POR REGLA ──────────────
--
-- Distintas de que las piezas existan: éstas comprueban que el disparador SE
-- EJECUTA Y RECHAZA. Son DOS porque son dos reglas, y una sola no las prueba
-- las dos — el disparador las mira EN ORDEN y la primera que salta tapa a las
-- que vienen detrás.
--
-- (Eso mismo invalidó la primera versión de esta prueba, que usaba '__' y
-- decía esperar el mensaje del formato: '__' mide dos caracteres, así que
-- salta el largo y al formato no se llega NUNCA. El resultado esperado era
-- imposible, y una prueba así no falla: confunde.)
--
-- Cambia <TU_EMAIL> por el tuyo en las dos. Las dos dan error a propósito, y
-- nada queda escrito: un error deshace la sentencia entera.
--
--
--   C1 · EL LARGO.  'ab' mide dos.
--
--   update profiles set username = 'ab' where email = '<TU_EMAIL>';
--
--   TIENE QUE RESPONDER:
--     ERROR: El nombre de usuario tiene que medir entre 3 y 20 caracteres.
--
--
--   C2 · EL FORMATO.  'ab_' mide tres —así que pasa el largo— y acaba en
--   guion bajo, que es lo que no se puede.
--
--   update profiles set username = 'ab_' where email = '<TU_EMAIL>';
--
--   TIENE QUE RESPONDER:
--     ERROR: El nombre de usuario solo puede llevar letras sin acentos,
--     números y guiones bajos; tiene que empezar por una letra y no acabar en
--     guion bajo.
--
--
-- ── Y SI FALLA CON OTRO MENSAJE, NO HA PASADO LA PRUEBA ───
--
-- Esto importa más de lo que parece. Un error distinto significa que ni
-- siquiera se ha llegado a la regla que se quería probar, y el fallo de verdad
-- queda tapado por el rojo del error:
--
--   · C2 contesta el mensaje del LARGO -> no es que haya pasado: es que la
--     regla del formato no se ha probado. Mira que hayas copiado 'ab_' y no
--     otra cosa.
--   · «column "email" does not exist» o 0 filas afectadas -> la sentencia no
--     encontró tu perfil. No se ha probado nada. Busca tu id con
--     `select id, email, username from profiles where email ilike '%algo%';`
--     y usa ese id en el where.
--   · «duplicate key ... profiles_username_unico» -> habría entrado por el
--     índice, no por el disparador. El disparador NO está actuando.
--   · cualquier otro -> léelo entero antes de darlo por bueno.
--
-- Un error no es una prueba superada: la prueba está superada si el error es
-- EL QUE ESPERABAS.
