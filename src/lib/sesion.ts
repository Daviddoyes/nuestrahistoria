import { cache } from 'react'
import { createClient as createServerClient } from '@/lib/supabase/server'

/**
 * QUIÉN ES EL DE LA SESIÓN, PREGUNTADO UNA SOLA VEZ Y SIN SALIR A LA RED.
 *
 * Hasta el 13-10-2026 cada sitio que necesitaba saberlo llamaba a
 * `auth.getUser()`, y eso **manda una petición al servidor de Auth, siempre**.
 * En la pantalla de Inicio se preguntaba lo mismo SEIS veces: una por cada
 * acción, y `getInicio` otra más por dentro al llamar a `getPerfil`.
 *
 * ── LO QUE SE MIDIÓ ───────────────────────────────────────
 *
 * Seis llamadas seguidas con la misma sesión, contra este proyecto:
 *
 *   getUser     92  76  80  75  92  70 ms   (siempre va a la red)
 *   getClaims  106   1   1   2   2   1 ms   (la primera trae la clave pública)
 *
 * `getClaims()` comprueba la FIRMA del JWT aquí mismo, con la clave pública
 * del proyecto, que se descarga una vez y se guarda. Es una comprobación
 * criptográfica de verdad, no leer la cookie y creérsela: lo que no se puede
 * hacer nunca es `getSession()`, que devuelve lo que diga la cookie sin
 * comprobar nada.
 *
 * Solo funciona porque este proyecto firma con claves asimétricas; si firmara
 * con el secreto de siempre, `getClaims()` preguntaría al servidor igual que
 * `getUser()`. Por eso está MEDIDO y no supuesto: el día que eso cambie, esto
 * seguirá siendo correcto, solo que dejará de ser rápido.
 *
 * ── LO QUE SE PIERDE, QUE HAY QUE SABERLO ─────────────────
 *
 * `getUser()` pregunta al servidor, así que se entera AL INSTANTE de que una
 * cuenta se ha borrado o bloqueado. `getClaims()` da por buena la firma hasta
 * que el token caduca, como mucho una hora.
 *
 * Aquí eso no abre ningún agujero: ser admin se vuelve a leer de `profiles`
 * en cada comprobación (`esAdmin()`), así que quitarle el permiso a alguien
 * sigue siendo inmediato; y a una cuenta borrada no le quedan filas que tocar.
 * Pero queda escrito, porque es la diferencia de verdad entre las dos.
 *
 * ── Y EL `cache()`, QUE ES LA OTRA MITAD ──────────────────
 *
 * Lo envuelve `cache()` de React: dentro de UNA petición, pregunten los que
 * pregunten, se resuelve una sola vez. Entre peticiones distintas no comparte
 * nada — cada Server Action que manda el navegador es su propia petición, y
 * ahí no hay nada que compartir.
 */
export const idDeSesion = cache(async (): Promise<string | null> => {
  const supa = await createServerClient()
  const { data, error } = await supa.auth.getClaims()
  if (error || !data?.claims) return null
  // `sub` es el id del usuario dentro del JWT, que es el mismo `user.id` que
  // devolvía `getUser()`.
  const sub = data.claims.sub
  return typeof sub === 'string' && sub.length > 0 ? sub : null
})
