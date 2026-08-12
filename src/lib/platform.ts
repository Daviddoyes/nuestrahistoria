/**
 * Detección de plataforma para el flujo de instalación de la PWA.
 * Todo lo de aquí lee `navigator`/`window`: llamar solo desde el cliente.
 */

export type Platform = 'ios' | 'android' | 'desktop'

function ua() {
  return navigator.userAgent.toLowerCase()
}

export function detectPlatform(): Platform {
  const s = ua()
  // iPadOS 13+ se anuncia como Macintosh; sin maxTouchPoints el iPad se
  // clasificaría como desktop y nunca vería las instrucciones.
  const isIOSDevice =
    /iphone|ipad|ipod/.test(s) ||
    (/macintosh/.test(s) && navigator.maxTouchPoints > 1)
  if (isIOSDevice) return 'ios'
  if (/android/.test(s)) return 'android'
  return 'desktop'
}

/**
 * Chrome/Firefox/Edge en iOS son WebKit por dentro, pero su menú compartir no
 * es el de Safari: las instrucciones de "Añadir a pantalla de inicio" no valen.
 */
export function isSafariIOS(): boolean {
  return detectPlatform() === 'ios' && !/crios|fxios|edgios/.test(ua())
}

export function isAndroidChrome(): boolean {
  const s = ua()
  return /android/.test(s) && /chrome/.test(s)
}

/** `standalone` es la variante propietaria de iOS, que no soporta display-mode. */
export function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as { standalone?: boolean }).standalone === true
  )
}
