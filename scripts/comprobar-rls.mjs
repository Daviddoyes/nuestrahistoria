// Comprueba que las políticas de lectura están como deben.
//
// Se lanza ANTES de aplicar supabase/fase3m.sql (para ver el agujero) y DESPUÉS
// (para ver que se cerró). No cambia nada: solo lee, y la única cuenta que crea
// la borra al final.
//
//   node --env-file=.env.local scripts/comprobar-rls.mjs
//
// Qué comprueba, con las letras del encargo:
//   a) nadie de fuera lee correos
//   b) cada uno sigue viendo su propia ficha entera
//   d) la comprobación de username sigue funcionando
//
// La (c) —que los perfiles de otra gente se siguen viendo en la app— no se
// puede comprobar desde aquí: los sirve el servidor con la clave secreta, así
// que se mira en el navegador, entrando en el perfil de otra persona.

import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const publica = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const sec = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const anon = createClient(url, publica, { auth: { persistSession: false } })

/**
 * Mete una fila de cebo y NO SIGUE si no ha entrado.
 *
 * Una comprobación de "el anónimo no lee esta tabla" sobre una tabla vacía
 * pasa siempre, y no comprueba nada. Esto ya pasó: el cebo se insertaba en una
 * columna que no existía, nadie miraba el error, y la tabla parecía cerrada
 * cuando estaba abierta de par en par. Si el montaje falla, la prueba se para.
 */
async function poner(tabla, fila) {
  const { data, error } = await sec.from(tabla).insert(fila).select('*')
  if (error) throw new Error(`no se pudo poner el cebo en ${tabla}: ${error.message}`)
  const { count } = await sec.from(tabla).select('id', { count: 'exact', head: true })
  if (!count) throw new Error(`el cebo de ${tabla} no está en la tabla: la prueba no vale`)
  return data[0]
}
const quitar = (tabla, id) => sec.from(tabla).delete().eq('id', id)

let bien = 0
let total = 0
const comprobar = (etiqueta, cond, visto) => {
  total++
  if (cond) { bien++; console.log('  ✓ ' + etiqueta) }
  else console.log('  ✗ ' + etiqueta + (visto !== undefined ? '  → ' + JSON.stringify(visto).slice(0, 120) : ''))
}

// ── a) Sin sesión, desde fuera ──────────────────────────────
console.log('\na) Lo que ve cualquiera con la clave pública, sin entrar:')
const { data: perfiles } = await anon.from('profiles').select('id, email')
comprobar('no lee ningún perfil', (perfiles ?? []).length === 0, perfiles?.length)

// invitaciones_email está vacía, así que un "0 filas" no probaría nada: pasaría
// la prueba por no tener datos, no por estar cerrada. Se mete una invitación de
// mentira, se comprueba y se borra.
// La columna es email_destino, NO email. La primera versión de esto insertaba
// en "email", el insert fallaba, nadie miraba el error y el anónimo leía 0
// filas porque NO HABÍA NINGUNA. Daba un ✓ que no comprobaba nada y por poco
// nos deja un agujero abierto creyéndolo cerrado. De ahí la función de abajo:
// todo cebo se confirma antes de preguntar.
const cebo = await poner('invitaciones_email', { email_destino: 'cebo-de-prueba@gooals-prueba.invalid' })
const { data: vistas } = await anon.from('invitaciones_email').select('*')
comprobar('no lee invitaciones_email (con una invitación dentro)', (vistas ?? []).length === 0, vistas?.length)
const { data: tocada } = await anon.from('invitaciones_email').update({ usado: true }).eq('id', cebo.id).select('id')
comprobar('ni puede modificar una invitación', (tocada ?? []).length === 0, tocada)
await quitar('invitaciones_email', cebo.id)

const { data: sinFollows } = await anon.from('follows').select('*')
comprobar('no lee follows', (sinFollows ?? []).length === 0, sinFollows?.length)

// EL MURO YA NO SE LEE DESDE FUERA. Hasta el 7-10-2026 era público a propósito,
// y esta comprobación afirmaba lo contrario de lo que afirma ahora: que se leía.
// Se le dio la vuelta el mismo día que cayó la política, y no un rato después,
// porque una prueba que afirma lo contrario de lo que ya es cierto es peor que
// no tenerla: pasa, da confianza, y describe un mundo que no existe.
//
// Cambió porque las fotos de la gente dejaron de ser públicas: ahora cada una
// elige quién la ve, y un muro que cualquiera puede listar con la clave pública
// del navegador deja esa elección en nada.
const { data: muro } = await anon.from('muro_posts').select('*')
comprobar('el muro NO se lee desde fuera', (muro ?? []).length === 0, muro?.length)

// Misma historia: de aquí salían las rutas de las fotos y quién hizo qué.
const { data: logros } = await anon.from('user_gooals').select('*')
comprobar('ni los gooals conseguidos de la gente', (logros ?? []).length === 0, logros?.length)

// Y sin sesión no se escribe NADA, ni una columna. Se mira el código del error:
// un rechazo por permiso es 42501; si saliera "0 filas sin error", sería la RLS
// parándolo, que también vale pero es la otra cerradura y aquí se mira esta.
const { error: eAnonPerfil } = await anon.from('profiles').update({ nombre: 'intruso' }).neq('id', '00000000-0000-0000-0000-000000000000')
comprobar('sin sesión no puede escribir en profiles',
  Boolean(eAnonPerfil) && (eAnonPerfil.code === '42501' || /permission denied/i.test(eAnonPerfil.message)),
  eAnonPerfil?.code ?? 'NINGUNO')

const { error: eAnonGooals } = await anon.from('user_gooals').insert({ user_id: '00000000-0000-0000-0000-000000000000', gooal_id: '00000000-0000-0000-0000-000000000000' })
comprobar('ni en user_gooals',
  Boolean(eAnonGooals) && (eAnonGooals.code === '42501' || /permission denied/i.test(eAnonGooals.message)),
  eAnonGooals?.code ?? 'NINGUNO')

// Lo que SÍ tiene que seguir viéndose: el catálogo público.
const { data: cat } = await anon.from('gooals_v2').select('id').limit(5)
comprobar('el catálogo público sigue leyéndose', (cat ?? []).length > 0, cat?.length)

// ── b) y d) Con una cuenta de verdad ────────────────────────
const CORREO = `prueba-rls-${Date.now()}@gooals-prueba.invalid`
const CLAVE = `Pr${Math.random().toString(36).slice(2)}!9x`
let idPrueba = null

try {
  // email_confirm: true para que NO se mande ningún correo.
  const { data: creado, error } = await sec.auth.admin.createUser({ email: CORREO, password: CLAVE, email_confirm: true })
  if (error) throw new Error('no se pudo crear la cuenta de prueba: ' + error.message)
  idPrueba = creado.user.id
  await sec.from('profiles').insert({ id: idPrueba, nombre: 'Prueba RLS', email: CORREO, username: `prueba${Date.now()}` })

  const cli = createClient(url, publica, { auth: { persistSession: false } })
  const { error: eEntrar } = await cli.auth.signInWithPassword({ email: CORREO, password: CLAVE })
  if (eEntrar) throw new Error('la cuenta de prueba no pudo entrar: ' + eEntrar.message)

  console.log('\nb) Lo que ve esa cuenta, ya dentro:')
  const { data: mio } = await cli.from('profiles').select('id, nombre, email, codigo_invitacion').eq('id', idPrueba)
  comprobar('lee su propia ficha, con su correo dentro', (mio ?? []).length === 1 && mio[0].email === CORREO, mio)

  const { data: todos } = await cli.from('profiles').select('id, email')
  comprobar('y SOLO la suya: ni una fila más', (todos ?? []).length === 1, todos?.length)

  const { data: otro } = await cli.from('profiles').select('id, email').neq('id', idPrueba).limit(3)
  comprobar('no lee el correo de nadie más', (otro ?? []).length === 0, otro)

  // Y lo mismo con las tablas que el anónimo no podía ver: una política puede
  // estar abierta solo para quien tiene sesión, y entonces el anónimo da un
  // falso tranquilizador. Con 53 usuarios, "cualquiera con cuenta" es mucha gente.
  const cebo2 = await poner('invitaciones_email', { email_destino: 'cebo2-de-prueba@gooals-prueba.invalid' })
  const { data: invDentro } = await cli.from('invitaciones_email').select('*')
  comprobar('con sesión TAMPOCO lee las invitaciones de otros', (invDentro ?? []).length === 0, invDentro?.length)
  await quitar('invitaciones_email', cebo2.id)

  const { data: fw } = await cli.from('follows').select('*')
  comprobar('con sesión tampoco lee follows entera', (fw ?? []).length === 0, fw?.length)

  console.log('\nd) La comprobación del nombre de usuario:')
  const { data: inventado, error: e1 } = await cli.rpc('username_libre', { nombre_pedido: `nadie-${Date.now()}` })
  comprobar('un nombre inventado sale libre', !e1 && inventado === true, e1?.message ?? inventado)

  const { data: real } = await sec.from('profiles').select('username').not('username', 'is', null).neq('id', idPrueba).limit(1)
  const cogido = real?.[0]?.username
  const { data: ocupado } = await cli.rpc('username_libre', { nombre_pedido: cogido })
  comprobar(`uno ya cogido («${cogido}») sale ocupado`, ocupado === false, ocupado)
  const { data: mayus } = await cli.rpc('username_libre', { nombre_pedido: (cogido ?? '').toUpperCase() })
  comprobar('y en mayúsculas, también ocupado', mayus === false, mayus)

  // ── e) LA SEGUNDA CERRADURA: los permisos de columna ──────
  //
  // Hasta el 8-10-2026 este guion decía "15 de 15" mientras cualquiera con
  // sesión podía ponerse `es_admin = true` desde el navegador. No mentía: es
  // que solo miraba una de las dos cerraduras. La RLS decide QUÉ FILAS tocas;
  // el permiso de columna decide QUÉ COLUMNAS. Las políticas de `profiles`
  // estaban bien — cada uno su fila — y tu propia fila incluye tu `es_admin`.
  //
  // Se mira el error Y el valor. Un `update` que no toca nada por la RLS
  // devuelve 0 filas SIN error, y un permiso denegado devuelve error 42501: no
  // es lo mismo, y confundirlos daría por cerrada una tabla abierta. Por eso
  // después de cada intento se relee con la clave secreta: el error dice que lo
  // rechazó, el valor dice que de verdad no cambió.
  console.log('\ne) La segunda cerradura, la de las columnas:')

  const denegado = e => Boolean(e) && (e.code === '42501' || /permission denied/i.test(e.message ?? ''))
  const valorDe = async col => {
    const { data } = await sec.from('profiles').select(col).eq('id', idPrueba).maybeSingle()
    return data?.[col]
  }

  for (const [col, valor] of [['es_admin', true], ['puntos_totales', 9999], ['nivel', 'Leyenda']]) {
    const antes = await valorDe(col)
    const { error } = await cli.from('profiles').update({ [col]: valor }).eq('id', idPrueba)
    const despues = await valorDe(col)
    comprobar(`no puede escribirse profiles.${col}`,
      denegado(error) && despues === antes,
      { rechazo: error?.code ?? 'NINGUNO', antes, despues })
  }

  // Y el otro lado, que es la mitad que de verdad hace falta: lo que el
  // navegador SÍ escribe tiene que seguir funcionando. Si esto falla, editar
  // perfil está roto y el arreglo se pasó de frenada.
  const nuevoNombre = 'Prueba RLS ' + Date.now()
  const { error: eNombre } = await cli.from('profiles').update({ nombre: nuevoNombre }).eq('id', idPrueba)
  comprobar('pero SÍ puede cambiarse el nombre (editar perfil)',
    !eNombre && (await valorDe('nombre')) === nuevoNombre, eNombre?.message)

  // user_gooals: cerrada entera. Ni leer, ni escribirse un conseguido con los
  // puntos que uno quiera, que es por lo que se cerró.
  const { data: unGooal } = await sec.from('gooals_v2').select('id').eq('activo', true).eq('estado', 'verificado').limit(1).maybeSingle()
  const { error: eIns } = await cli.from('user_gooals')
    .insert({ user_id: idPrueba, gooal_id: unGooal.id, estado: 'completado', puntos_ganados: 999 })
  const { count: filasSuyas } = await sec.from('user_gooals').select('id', { count: 'exact', head: true }).eq('user_id', idPrueba)
  comprobar('no puede insertarse un gooal conseguido con los puntos que quiera',
    denegado(eIns) && filasSuyas === 0,
    { rechazo: eIns?.code ?? 'NINGUNO', filasQueLeHanQuedado: filasSuyas })

  const { error: eLeer } = await cli.from('user_gooals').select('*').limit(1)
  comprobar('ni leer user_gooals con sesión', denegado(eLeer), eLeer?.code ?? 'NINGUNO')
} catch (e) {
  console.error('\nERROR en la parte con sesión:', e.message)
  console.error('(si fase3m.sql no está aplicado todavía, la función username_libre no existe: es normal)')
} finally {
  if (idPrueba) {
    await sec.from('profiles').delete().eq('id', idPrueba)
    await sec.auth.admin.deleteUser(idPrueba)
  }
  const { count } = await sec.from('profiles').select('id', { count: 'exact', head: true })
  console.log(`\nLimpieza: cuenta de prueba borrada. Perfiles en la base: ${count}`)
  console.log(`\n${bien}/${total} comprobaciones bien`)
}
