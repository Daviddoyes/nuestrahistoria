// Qué hacer cuando una API dice «ahora no».
//
// ── POR QUÉ ESTO ESTÁ AQUÍ Y NO DENTRO DE CADA GUION ──────
//
// Porque ya se escribió tres veces y la tercera salió mal.
//
// El 8-10-2026 se aprendió, midiéndolo, que un 429 no es un fallo: es un freno
// por ventana de tiempo, y hay que esperar, reinsistir y además BAJAR EL RITMO
// del bucle entero, porque seguir a toda velocidad con los demás garantiza el
// siguiente freno. Se arregló `comprobar-rls.mjs`, se escribió la lección en
// CLAUDE.md... y unas horas después el guion que genera las imágenes perdió
// cuatro de trece, y luego cuatro de cinco, por tener sus propias esperas de
// 4s/12s/30s copiadas a mano.
//
// No se había olvidado la lección. La lección vivía en CLAUDE.md y la espera
// vivía dentro de cada guion. **Una lección escrita en un fichero no se aplica
// sola al guion siguiente; un módulo compartido sí.**
//
// Lo usan: scripts/comprobar-rls.mjs, scripts/fotos-catalogo/candidatas.mjs y
// scripts/fotos-ia/probar-estilos.mjs.

/** Lo que se espera antes de cada reintento. Largo a propósito: una espera
 *  corta cae dentro de la misma ventana que acaba de frenarte. */
export const ESPERAS = [10000, 30000, 60000, 120000]

/**
 * ¿Esto es un freno o es un fallo?
 *
 *   429 y 5xx → «ahora no». No dicen nada de lo que pediste: se reintenta.
 *   400, 404, 403 → eso es lo que pediste. Reintentarlo da exactamente lo
 *   mismo, y además se paga dos veces.
 */
export const esFreno = estado => estado === 429 || estado >= 500

export const dormir = ms => new Promise(r => setTimeout(r, ms))

/**
 * Un control de frenos para un bucle.
 *
 *   const frenos = crearFrenos()
 *   for (const cosa of lista) {
 *     await frenos.antesDePedir()              // el ritmo, si lo hay
 *     const r = await frenos.intentar(async () => {
 *       const resp = await fetch(...)
 *       if (esFreno(resp.status)) return { freno: 'responde ' + resp.status }
 *       if (!resp.ok) return { fallo: 'responde ' + resp.status }
 *       return { bien: await resp.json() }
 *     })
 *   }
 *
 * `intentar` devuelve lo que devuelva la función, salvo que se agoten los
 * reintentos: entonces devuelve `{ agotado: true, motivo }`. Lo que se agota
 * NO es un fallo y no debe contarse como tal — es que no se pudo comprobar, y
 * eso se dice aparte.
 */
export function crearFrenos({ esperas = ESPERAS, ritmoMaximo = 20000, paso = 4000, alFrenar = null } = {}) {
  let ritmo = 0
  let frenazos = 0

  return {
    /** Cuántas veces nos han frenado. Se cuenta para poder decirlo al final:
     *  si no se cuenta, no se sabe si el «todo bien» costó cero o cuarenta. */
    get frenazos() { return frenazos },
    get ritmo() { return ritmo },

    /** El ritmo del bucle, si ya nos han frenado alguna vez. */
    async antesDePedir() { if (ritmo) await dormir(ritmo) },

    async intentar(hacer) {
      let ultimo = null
      for (let intento = 0; intento <= esperas.length; intento++) {
        if (intento) await dormir(esperas[intento - 1])
        const r = await hacer(intento)
        if (r && r.freno) {
          ultimo = r.freno
          frenazos++
          ritmo = Math.min(ritmoMaximo, ritmo + paso)
          if (alFrenar) alFrenar(r.freno, intento, ritmo)
          continue
        }
        return r
      }
      return { agotado: true, motivo: ultimo + ' después de ' + (esperas.length + 1) + ' intentos' }
    },
  }
}
