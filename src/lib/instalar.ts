/**
 * CUÁNDO SE LE OFRECE A ALGUIEN INSTALAR LA APP.
 *
 * Vive aquí y no dentro de `InstallBanner` para que quien marca el motivo —la
 * ficha de un gooal, al conseguirlo— no tenga que importarse el banner entero
 * con su barra de navegación detrás.
 *
 * ── LA REGLA ──────────────────────────────────────────────
 *
 * El banner salía en la primera pantalla de alguien que acababa de entrar, que
 * es justo el momento en que menos motivo hay: todavía no ha usado nada. Ahora
 * hace falta una de dos cosas, y las dos quieren decir lo mismo —que esto ya le
 * sirve de algo—:
 *
 *   · que vuelva (segunda visita), o
 *   · que haya conseguido su primer gooal.
 */

const VISITAS = 'install-visitas'
const MOTIVO = 'install-motivo'
const SESION_CONTADA = 'install-sesion-contada'

/**
 * Marca que esta persona ya tiene un motivo. Se llama al conseguir un gooal.
 *
 * Si no hay almacenamiento —modo privado— no pasa nada: se perderá el motivo y
 * como mucho se le ofrecerá más tarde. Nunca al revés.
 */
export function hayMotivoParaInstalar() {
  try { localStorage.setItem(MOTIVO, '1') } catch { /* modo privado */ }
}

/**
 * Cuenta esta visita (una vez por sesión) y dice si ya toca ofrecerlo.
 *
 * Lanza si no hay almacenamiento, y quien llama lo trata como un «hoy no»: sin
 * poder recordar un «no, gracias», enseñarlo en cada carga sería peor que no
 * enseñarlo nunca.
 */
export function tocaOfrecerInstalar(): boolean {
  let visitas = Number(localStorage.getItem(VISITAS) ?? 0)
  if (!sessionStorage.getItem(SESION_CONTADA)) {
    visitas += 1
    localStorage.setItem(VISITAS, String(visitas))
    sessionStorage.setItem(SESION_CONTADA, '1')
  }
  return visitas >= 2 || Boolean(localStorage.getItem(MOTIVO))
}
