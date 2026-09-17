// Plantilla de los correos de Comunicaciones y validación de lo que escribe el
// admin. Sin nada de servidor: la usan la vista previa del panel (en el
// navegador) y el envío (en el servidor), así que lo que se ve es lo que llega.
//
// El enlace de baja NO se firma aquí (eso es node:crypto, de servidor): se recibe
// ya hecho. La vista previa pasa uno de mentira.

export type GrupoCorreo = 'todos' | 'activos' | 'inactivos' | 'sin_onboarding'

export const GRUPOS: { id: GrupoCorreo; nombre: string; descripcion: string }[] = [
  { id: 'todos', nombre: 'Todos', descripcion: 'Todas las cuentas' },
  { id: 'activos', nombre: 'Activos', descripcion: 'Han entrado en los últimos 30 días' },
  { id: 'inactivos', nombre: 'Inactivos', descripcion: 'No han entrado en los últimos 30 días' },
  { id: 'sin_onboarding', nombre: 'Sin onboarding', descripcion: 'No lo han terminado' },
]

export const esGrupo = (valor: unknown): valor is GrupoCorreo => GRUPOS.some(g => g.id === valor)
export const nombreGrupo = (grupo: string) => GRUPOS.find(g => g.id === grupo)?.nombre ?? grupo

/** Lo que escribe el admin. Nunca HTML: la plantilla lo escapa todo. */
export type ContenidoCorreo = {
  asunto: string
  /** Párrafos separados por una línea en blanco. Un salto simple es un salto dentro del párrafo. */
  cuerpo: string
  /** Vacíos si no hay botón. */
  botonTexto: string
  botonUrl: string
}

export const LIMITES = { asunto: 120, cuerpo: 5000, botonTexto: 40, botonUrl: 500 }

// ── Paleta definitiva de los correos ─────────────────────────────
// Sobre fondo claro. El turquesa Aurora (#00D1A7) NO se usa aquí: como texto
// sobre Sand no se lee, y como fondo de botón se volvía ilegible en los correos
// que Gmail oscurece. Para el verde de la marca y los enlaces va Aurora Dark.
const OBSIDIAN = '#0B0B0B'
const AURORA_DARK = '#009E7E'
const SAND = '#F5F5F2'
// Stone puro sobre blanco se queda corto de contraste para letra pequeña: en los
// correos, el gris del pie es un punto más oscuro.
const GRIS_PIE = '#5F6F6A'
const BLANCO = '#FFFFFF'
const LINEA = '#E4E4DF'

/**
 * El contenido tal como se guarda y se compara: sin espacios de sobra y con los
 * saltos de línea de Windows convertidos. Es lo que decide si "el texto de la
 * prueba" y "el texto a enviar" son el mismo; sin normalizar, un espacio al final
 * obligaría a repetir la prueba sin que nada visible haya cambiado.
 */
export function normalizarContenido(c: ContenidoCorreo): ContenidoCorreo {
  const cuerpo = c.cuerpo
    .replace(/\r\n?/g, '\n')
    .split(/\n[ \t]*\n+/)
    .map(p => p.split('\n').map(l => l.trim()).filter(Boolean).join('\n'))
    .filter(Boolean)
    .join('\n\n')
  const botonTexto = c.botonTexto.trim()
  const botonUrl = c.botonUrl.trim()
  // Un botón a medias (texto sin enlace o al revés) no se guarda como botón: lo para validarContenido.
  return { asunto: c.asunto.replace(/\s+/g, ' ').trim(), cuerpo, botonTexto, botonUrl }
}

export const mismoContenido = (a: ContenidoCorreo, b: ContenidoCorreo) => {
  const x = normalizarContenido(a)
  const y = normalizarContenido(b)
  return x.asunto === y.asunto && x.cuerpo === y.cuerpo && x.botonTexto === y.botonTexto && x.botonUrl === y.botonUrl
}

/** Lo que falta o sobra, en lenguaje llano. Vacío si se puede enviar. */
export function validarContenido(c: ContenidoCorreo): string[] {
  const n = normalizarContenido(c)
  const errores: string[] = []
  if (!n.asunto) errores.push('Falta el asunto.')
  else if (n.asunto.length > LIMITES.asunto) errores.push(`El asunto tiene ${n.asunto.length} caracteres; el máximo son ${LIMITES.asunto}.`)
  if (!n.cuerpo) errores.push('Falta el texto del correo.')
  else if (n.cuerpo.length > LIMITES.cuerpo) errores.push(`El texto tiene ${n.cuerpo.length} caracteres; el máximo son ${LIMITES.cuerpo}.`)

  if (n.botonTexto || n.botonUrl) {
    if (!n.botonTexto) errores.push('El botón necesita un texto.')
    else if (n.botonTexto.length > LIMITES.botonTexto) errores.push(`El texto del botón tiene ${n.botonTexto.length} caracteres; el máximo son ${LIMITES.botonTexto}.`)
    if (!n.botonUrl) errores.push('El botón necesita un enlace.')
    else if (n.botonUrl.length > LIMITES.botonUrl || !esEnlaceValido(n.botonUrl)) {
      errores.push('El enlace del botón tiene que empezar por https:// y ser una dirección completa.')
    }
  }
  return errores
}

/** Solo https: un "javascript:" o un http a secas en un correo masivo es un problema. */
function esEnlaceValido(url: string): boolean {
  try {
    const u = new URL(url)
    return u.protocol === 'https:' && Boolean(u.hostname.includes('.'))
  } catch {
    return false
  }
}

const escapar = (texto: string) => texto
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;')

export const parrafosDe = (cuerpo: string) => normalizarContenido({ asunto: '', cuerpo, botonTexto: '', botonUrl: '' }).cuerpo.split('\n\n').filter(Boolean)

/** Las piezas de cualquier correo de GooALS. El texto se escapa: nunca se pega HTML. */
export type PartesCorreo = {
  asunto: string
  /** Titular grande y opcional, solo en correos como la invitación. */
  titular?: string
  parrafos: string[]
  boton?: { texto: string; url: string }
  /** El pie, en gris pequeño. El enlace es opcional (la baja, o nada). */
  pie: { texto: string; enlace?: { texto: string; url: string } }
  /** Línea de "esto es una prueba" encima de todo. */
  avisoPrueba?: boolean
}

/**
 * LA plantilla de los correos de GooALS. La usan la invitación y las campañas:
 * quien recibe una invitación y luego un correo nuestro ve la misma marca.
 *
 * Tablas y estilos en línea, no CSS moderno: es lo único que respetan Gmail y
 * Outlook. El fondo va en la tabla Y en el body, porque algunos clientes ignoran
 * uno de los dos.
 */
export function htmlBase(partes: PartesCorreo): string {
  const titular = partes.titular
    ? `<h1 style="margin:0 0 16px 0;font-size:26px;line-height:1.25;font-weight:700;color:${OBSIDIAN};">${escapar(partes.titular)}</h1>`
    : ''
  const parrafos = partes.parrafos
    .map(p => `<p style="margin:0 0 18px 0;font-size:16px;line-height:1.65;color:${OBSIDIAN};">${escapar(p).replace(/\n/g, '<br>')}</p>`)
    .join('\n')
  const boton = partes.boton
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:10px 0 6px 0;"><tr>
        <td bgcolor="${OBSIDIAN}" style="border-radius:12px;background:${OBSIDIAN};">
          <a class="gooals-boton" href="${escapar(partes.boton.url)}" target="_blank" style="display:inline-block;padding:14px 26px;font-size:15px;font-weight:600;color:${SAND} !important;text-decoration:none;border-radius:12px;"><span style="color:${SAND} !important;">${escapar(partes.boton.texto)}</span></a>
        </td></tr></table>`
    : ''
  const enlacePie = partes.pie.enlace
    ? ` <a href="${escapar(partes.pie.enlace.url)}" target="_blank" style="color:${AURORA_DARK};text-decoration:underline;">${escapar(partes.pie.enlace.texto)}</a>.`
    : ''
  const avisoPrueba = partes.avisoPrueba
    ? `<tr><td style="padding:0 0 12px 0;font-size:12px;color:${GRIS_PIE};text-align:center;">Esto es una prueba. Así lo recibirá quien lo reciba, sin esta línea.</td></tr>`
    : ''

  // color-scheme "light only": le dice al cliente de correo que este correo está
  // pensado en claro y que no lo repinte. Lo respetan Apple Mail y Outlook. Las
  // apps de Gmail lo ignoran y oscurecen igual: por eso, además, el color del
  // texto del botón va con !important y repetido en un <span> dentro del enlace,
  // que es lo que Gmail respeta mejor.
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light only">
<title>${escapar(partes.asunto)}</title>
<style>
  :root { color-scheme: light only; supported-color-schemes: light only; }
  /* El botón es oscuro con texto claro: así aguanta tanto si el cliente respeta
     el modo claro como si oscurece el correo por su cuenta. El resto del texto NO
     se fuerza: si un cliente oscurece el fondo, tiene que poder aclarar la letra. */
  @media (prefers-color-scheme: dark) {
    .gooals-boton, .gooals-boton span { color: ${SAND} !important; }
  }
</style></head>
<body style="margin:0;padding:0;background:${SAND};font-family:Inter,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${SAND};">
  <tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;">
      ${avisoPrueba}
      <tr><td style="padding:0 4px 18px 4px;font-size:13px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;color:${AURORA_DARK};">GooALS</td></tr>
      <tr><td bgcolor="${BLANCO}" style="background:${BLANCO};border:1px solid ${LINEA};border-radius:16px;padding:32px 28px;">
        ${titular}
        ${parrafos}
        ${boton}
      </td></tr>
      <tr><td style="padding:20px 4px 0 4px;font-size:12px;line-height:1.6;color:${GRIS_PIE};">
        ${escapar(partes.pie.texto)}${enlacePie}
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`
}

/** La misma plantilla en texto plano. Sin ella, más correos acaban en spam. */
export function textoBase(partes: PartesCorreo): string {
  return [
    ...(partes.titular ? [partes.titular] : []),
    ...partes.parrafos,
    ...(partes.boton ? [`${partes.boton.texto}: ${partes.boton.url}`] : []),
    '—',
    partes.pie.texto + (partes.pie.enlace ? ` ${partes.pie.enlace.texto}: ${partes.pie.enlace.url}` : ''),
  ].join('\n\n')
}

// ── El correo de una campaña de Comunicaciones ───────────────────

const PIE_CAMPANA = 'Te escribimos porque tienes cuenta en GooALS.'

/** Las partes de una campaña: lo que escribe el admin, más el pie con la baja. */
function partesDeCampana(contenido: ContenidoCorreo, enlaceBaja: string, esPrueba?: boolean): PartesCorreo {
  const c = normalizarContenido(contenido)
  return {
    asunto: c.asunto,
    parrafos: parrafosDe(c.cuerpo),
    boton: c.botonTexto && c.botonUrl ? { texto: c.botonTexto, url: c.botonUrl } : undefined,
    pie: { texto: PIE_CAMPANA, enlace: { texto: 'No quiero recibir más correos', url: enlaceBaja } },
    avisoPrueba: esPrueba,
  }
}

export const htmlCorreo = (contenido: ContenidoCorreo, opciones: { enlaceBaja: string; esPrueba?: boolean }) =>
  htmlBase(partesDeCampana(contenido, opciones.enlaceBaja, opciones.esPrueba))

export const textoCorreo = (contenido: ContenidoCorreo, enlaceBaja: string) =>
  textoBase(partesDeCampana(contenido, enlaceBaja))
