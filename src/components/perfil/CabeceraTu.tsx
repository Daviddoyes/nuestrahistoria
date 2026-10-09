'use client'

import Universo from '@/components/perfil/Universo'
import { CATEGORIA_LABEL, type CategoriaGooal } from '@/lib/gooals'
import { HUECO, MARCA, RADIO, SUPERFICIE, TEXTO, PESO } from '@/lib/estilo'
import { progresoNivel } from '@/lib/niveles'
import type { ConteoCategoria } from '@/types/gooals'

type Props = {
  /** Solo el nombre y la foto: es lo único que se pinta, el avatar del centro. */
  nombre: string
  foto: string | null
  conseguidos: number
  pendientes: number
  amigos: number
  puntos: number
  conteos: ConteoCategoria[]
  intereses: CategoriaGooal[]
  /** El día uno es el único botón de la pantalla, y lleva al buscador. */
  onBuscar: () => void
  /** "Amigos" abre las dos listas: quién te sigue y a quién sigues. */
  onAmigos: () => void
}

/**
 * El día uno es no haber conseguido NADA todavía.
 *
 * Se mide por los gooals conseguidos y no por los puntos aunque hoy den lo
 * mismo: los puntos son una consecuencia, y el día que haya puntos por otra
 * cosa —una racha, invitar a alguien— seguiría siendo el día uno de verdad.
 *
 * Vive aquí y se exporta porque la pantalla entera cambia con esto, no solo la
 * cabecera: abajo, en vez de la lista vacía, van gooals para empezar.
 */
export const esDiaUno = (conseguidos: number) => conseguidos === 0

/**
 * La parte de arriba de TU perfil: el titular, el universo y las tres cifras.
 *
 * ── POR QUÉ EL TITULAR CAMBIA ─────────────────────────────
 *
 * Con gooals conseguidos, arriba va tu nivel y cuánto te falta para el
 * siguiente: eso es lo que da ganas de conseguir otro.
 *
 * El día uno, no. Ahí el nivel sería «Principiante», y recibir a alguien con la
 * palabra «principiante» y seis ceros es decirle lo que le falta. Así que el
 * titular pasa a ser **lo que tiene por delante**: los gooals que el onboarding
 * le dejó pendientes. Y si no dijo ni un interés —hay tres cuentas así—, ni
 * eso: entonces lo honesto es pedirle que elija por dónde empezar.
 *
 * El perfil de OTRA persona no usa este componente: allí no hay día uno que
 * recibir ni intereses que enseñar, y la cabecera de siempre (foto, nombre,
 * @usuario, seguidores) sigue siendo la que hace falta.
 */
export default function CabeceraTu({
  nombre, foto, conseguidos, pendientes, amigos, puntos, conteos, intereses, onBuscar, onAmigos,
}: Props) {
  const progreso = progresoNivel(puntos)
  const diaUno = esDiaUno(conseguidos)
  const sabemosAlgoDeEl = intereses.length > 0 && pendientes > 0

  const titular = !diaUno ? progreso.actual.nombre
    : sabemosAlgoDeEl ? `${pendientes} por hacer`
      : 'Elige por dónde empezar'

  return (
    <div>
      {/* ── El titular ───────────────────────────────────── */}
      <div style={{ textAlign: 'center', paddingTop: HUECO.apretado }}>
        <p
          className="fuente-titular"
          style={{
            fontSize: 20, fontWeight: 650, lineHeight: 1,
            letterSpacing: '.1em', textIndent: '.1em', textTransform: 'uppercase',
          }}
        >
          {titular}
        </p>

        {!diaUno ? (
          <p style={{ marginTop: 6, fontSize: TEXTO.pie, color: MARCA.stone, fontWeight: 500, lineHeight: 1 }}>
            {puntos} puntos
            {progreso.siguiente
              ? <> · <span style={{ color: MARCA.aurora, fontWeight: PESO.medio }}>
                  faltan {progreso.faltan} para {progreso.siguiente.nombre}
                </span></>
              : <> · <span style={{ color: MARCA.aurora, fontWeight: PESO.medio }}>nivel máximo</span></>}
          </p>
        ) : sabemosAlgoDeEl ? (
          <p style={{ marginTop: 6, fontSize: TEXTO.pie, color: MARCA.stone, fontWeight: 500, lineHeight: 1 }}>
            elegidos por lo que te interesa
          </p>
        ) : null}
      </div>

      {/* ── El universo ──────────────────────────────────── */}
      <div style={{ marginTop: 18 }}>
        <Universo
          conteos={conteos}
          intereses={intereses}
          foto={foto}
          nombre={nombre}
          // El día uno el aro va vacío: con 0 puntos un arco al 0 % no se
          // distingue de uno roto, y además no hay nada que haya avanzado.
          porcentajeNivel={diaUno ? null : progreso.porcentaje}
          resumen={resumirUniverso(conteos, intereses)}
        />
      </div>

      {/* ── Las tres cifras ──────────────────────────────── */}
      <div
        style={{
          marginTop: 14, display: 'flex', height: 74, overflow: 'hidden',
          background: SUPERFICIE.panel, border: `1px solid ${SUPERFICIE.linea}`, borderRadius: RADIO.tarjeta,
        }}
      >
        {([
          ['Conseguidos', conseguidos, null],
          ['Pendientes', pendientes, null],
          // Amigos se toca y abre las dos listas. El número es uno —amigo es
          // seguirse los dos— pero detrás hay dos listas, y si esta puerta no
          // estuviera no habría ninguna otra forma de llegar a ellas.
          ['Amigos', amigos, onAmigos],
        ] as const).map(([texto, valor, alPulsar], i) => {
          const dentro = (
            <>
              <span
                className="fuente-titular"
                style={{
                  fontSize: 20, fontWeight: PESO.fuerte, letterSpacing: '-.03em', lineHeight: 1,
                  // El día uno, los pendientes en verde para que se mire ahí... pero
                  // solo si hay alguno. Un cero en verde llama la atención hacia
                  // algo que no existe, y eso se vio en la captura de la cuenta
                  // sin intereses: tres ceros y uno de ellos iluminado.
                  color: diaUno && texto === 'Pendientes' && valor > 0 ? MARCA.aurora : MARCA.sand,
                }}
              >
                {valor}
              </span>
              <span style={{
                fontSize: TEXTO.micro, textTransform: 'uppercase', letterSpacing: '.075em',
                textIndent: '.075em', color: MARCA.stone, fontWeight: 500,
              }}>
                {texto}
              </span>
            </>
          )

          const estilo: React.CSSProperties = {
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 3,
            ...(i > 0 ? { borderLeft: `1px solid ${SUPERFICIE.linea}` } : {}),
          }

          return alPulsar
            ? (
              <button
                key={texto}
                onClick={alPulsar}
                aria-label="Ver seguidores y seguidos"
                className="transition-colors active:bg-[#1C201E]"
                style={estilo}
              >
                {dentro}
              </button>
            )
            : <div key={texto} style={estilo}>{dentro}</div>
        })}
      </div>

      {/* ── El día uno, lo que de verdad desatasca ───────── */}
      {/* Lo que le falta a alguien recién llegado no es explorar: es marcar algo
          que YA ha hecho. Un gooal conseguido llena su primera burbuja, le da
          puntos y nivel, y la pantalla deja de estar vacía. Por eso el único
          botón no dice "Explorar", dice qué buscar. */}
      {diaUno && (
        <button
          onClick={onBuscar}
          className="transition-opacity active:opacity-70"
          style={{
            marginTop: 16, width: '100%', height: 52, borderRadius: RADIO.tarjeta,
            border: `1px solid ${'rgba(0, 209, 167, .42)'}`, background: 'rgba(0, 209, 167, .08)',
            fontSize: TEXTO.cuerpo, fontWeight: 650, color: MARCA.aurora,
          }}
        >
          Busca algo que ya hayas hecho
        </button>
      )}
    </div>
  )
}

/**
 * El universo contado con palabras, para quien no ve el dibujo.
 *
 * Las seis siempre y en el orden de las agujas del reloj desde arriba, que es
 * el orden en el que están pintadas: una lista ordenada por número diría algo
 * distinto de lo que se ve.
 */
function resumirUniverso(conteos: ConteoCategoria[], intereses: CategoriaGooal[]): string {
  const orden: CategoriaGooal[] = ['vida', 'viajes', 'naturaleza', 'eventos', 'gastronomia', 'deporte']
  const porCategoria = new Map(conteos.map(c => [c.categoria, c.conseguidos]))

  const partes = orden.map(c => {
    const n = porCategoria.get(c) ?? 0
    if (n > 0) return `${CATEGORIA_LABEL[c]} ${n}`
    return `${CATEGORIA_LABEL[c]} ninguno${intereses.includes(c) ? ', te interesa' : ''}`
  })
  return `Tus gooals conseguidos por categoría: ${partes.join('. ')}.`
}
