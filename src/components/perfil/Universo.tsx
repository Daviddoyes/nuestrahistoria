'use client'

import Avatar from '@/components/Avatar'
import { CATEGORIAS, CATEGORIA_COLOR, CATEGORIA_LABEL, type CategoriaGooal } from '@/lib/gooals'
import { MARCA } from '@/lib/estilo'
import type { ConteoCategoria } from '@/types/gooals'

/**
 * El universo del perfil: tu foto en el centro con el aro del nivel, y las seis
 * categorías alrededor, cada una del tamaño de lo que has hecho en ella.
 *
 * ── LAS TRES COSAS QUE NO SON DECORACIÓN ──────────────────
 *
 * 1 · EL TAMAÑO VA CON LA RAÍZ, NO CON EL NÚMERO. Lo que compara el ojo de una
 *     burbuja es el ÁREA, no el ancho. Si el ancho fuese proporcional, siete
 *     gooals ocuparían cuarenta y nueve veces el sitio de uno y la pantalla
 *     estaría exagerando. Con la raíz, el área sí dice la verdad.
 *
 * 2 · LAS SEIS POSICIONES EXISTEN SIEMPRE, en los tres estados. Nunca falta
 *     una. Así el hueco deja de ser un hueco y pasa a ser la tercera forma de
 *     la misma gramática.
 *
 * 3 · Y SON FIJAS PARA TODOS. Deporte está en el mismo sitio en tu perfil y en
 *     el de cualquiera: es lo que permite comparar dos personas de un vistazo
 *     sin leer ni un número.
 *
 *     OJO, que esto es fácil de romper sin querer: `contarPorCategoria()`
 *     devuelve las categorías ORDENADAS POR NÚMERO, de más a menos. Este
 *     componente no mira el orden del array, busca cada categoría por su
 *     nombre. Si alguien lo «simplifica» recorriendo la lista tal como llega,
 *     las posiciones empiezan a bailar según lo que cada uno haya hecho y se
 *     pierde lo único que hacía comparables dos perfiles.
 */

// ── La geometría, medida sobre el dibujo ──────────────────
const NUCLEO = 100
/** A qué distancia del centro está cada burbuja. Las seis, a la misma. */
const ORBITA = 112

/**
 * EL DIÁMETRO MÁXIMO DE UNA BURBUJA.
 *
 * Sin techo, 22,5·raíz(n) no para nunca: con 120 gooals en una categoría la
 * burbuja mide 246 px y se sale de CUALQUIER móvil, incluido uno de 430.
 *
 * Por encima de este tamaño la burbuja deja de crecer y **el número de dentro
 * sigue diciendo la verdad**. Sí, eso significa que alguien con 60 en viajes y
 * alguien con 200 se verán igual de grandes, y es aceptable: lo que este dibujo
 * compara son las seis categorías de UNA persona, y en el extremo alto esa
 * comparación ya está saturada de todas formas — entre 60 y 200 el ojo tampoco
 * sabría leer la diferencia en un círculo.
 *
 * PROVISIONAL: el número exacto está sin decidir. Los otros tamaños de este
 * dibujo (30 para uno, 26 para la vacía) se eligieron MIRÁNDOLOS, y este se
 * elige igual. Hay capturas de tres candidatos —80, 100 y 120— a 320 y a 430 px
 * en "Claude outputs/techo-*.png".
 */
const MAXIMO = 100

/** Lo que ocupa el nombre de la categoría debajo (o encima) de su burbuja. */
const ESPACIO_ETIQUETA = 18

/**
 * El alto del lienzo y el centro NO se escriben a mano: se calculan.
 *
 * Estaban puestos a 290 y 136, medidos sobre el dibujo, y eso es exactamente lo
 * que se rompe en cuanto otro número se mueve: con los tamaños de hoy, la
 * etiqueta de la burbuja de arriba (vida, que lleva su nombre ENCIMA) ya se
 * salía 5 px por el techo sin que nada lo dijera.
 *
 * Derivándolos, cambiar el máximo o la órbita ajusta el lienzo solo y no se
 * puede desajustar.
 */
const ALTO = 2 * (ORBITA + MAXIMO / 2 + ESPACIO_ETIQUETA)
const CENTRO_Y = ALTO / 2

/**
 * El ángulo de cada categoría, en grados y con el 0 a la derecha: una cada 60°,
 * vida arriba y eventos abajo.
 *
 * Esta tabla es lo que hace comparables dos perfiles, así que es la misma para
 * todo el mundo y no se ordena por nada. No se toca.
 */
const ANGULO: Record<CategoriaGooal, number> = {
  vida: -90,
  viajes: -30,
  naturaleza: 30,
  eventos: 90,
  gastronomia: 150,
  deporte: 210,
}

/** El diámetro de una burbuja con gooals dentro: 22,5 × raíz(gooals), con techo. */
const diametroLleno = (gooals: number) => Math.min(MAXIMO, 22.5 * Math.sqrt(gooals))

/**
 * Los dos tamaños que la fórmula no decide, y el orden entre ellos SÍ importa:
 *
 *   30 px   un solo gooal (la fórmula daría 22,5, que se queda enano)
 *   26 px   ninguno
 *
 * La vacía es MÁS PEQUEÑA que la de un gooal a propósito: **así un 0 nunca se
 * puede confundir con un 1.** Si midieran lo mismo, los dos estados se verían
 * iguales de lejos, que es como se mira un perfil. No las igualéis.
 */
const DIAMETRO_UNO = 30
const DIAMETRO_VACIA = 26
/** La de «esto me interesa»: el tamaño de un gooal, porque es lo que promete. */
const DIAMETRO_INTERES = 30

/**
 * La letra de dentro: de 10 px en la más pequeña a 20 px en una de 60, que es
 * lo que mide el dibujo. Crece con la burbuja, no de golpe.
 */
const letraDe = (diametro: number) => Math.round(Math.max(10, 10 + (diametro - DIAMETRO_VACIA) * (10 / 34)))

type Props = {
  /** Lo conseguido por categoría. Llega ordenado por número: NO se usa el orden. */
  conteos: ConteoCategoria[]
  /**
   * Lo que dijo en el alta que le interesa. En el perfil ajeno llega null y las
   * categorías a cero salen en gris: de otra persona no sabes qué le apetece.
   */
  intereses: CategoriaGooal[] | null
  foto: string | null
  nombre: string
  /**
   * Lo que lleva del nivel, de 0 a 100. **null el día uno**: el aro se pinta
   * vacío, sin arco verde, porque todavía no hay nada que medir.
   */
  porcentajeNivel: number | null
  /** Para el lector de pantalla, que de un dibujo no saca nada. */
  resumen: string
}

export default function Universo({ conteos, intereses, foto, nombre, porcentajeNivel, resumen }: Props) {
  const porCategoria = new Map(conteos.map(c => [c.categoria, c.conseguidos]))
  const interesadas = new Set(intereses ?? [])

  const burbujas = CATEGORIAS.map(categoria => {
    const gooals = porCategoria.get(categoria) ?? 0
    const interesa = gooals === 0 && interesadas.has(categoria)

    const diametro = gooals > 1 ? diametroLleno(gooals)
      : gooals === 1 ? DIAMETRO_UNO
        : interesa ? DIAMETRO_INTERES : DIAMETRO_VACIA

    const radianes = (ANGULO[categoria] * Math.PI) / 180
    return {
      categoria, gooals, interesa, diametro,
      // Desde el centro de la pantalla, no desde un ancho fijo: así el universo
      // queda centrado en cualquier móvil.
      dx: ORBITA * Math.cos(radianes),
      dy: ORBITA * Math.sin(radianes),
    }
  })

  // La circunferencia del aro: r = 46.5 sobre un lienzo de 100. Se calcula aquí
  // para no dejar el 292.2 escrito a mano, que es un número que nadie reconoce.
  const ARO = 2 * Math.PI * 46.5

  return (
    <div role="img" aria-label={resumen} style={{ position: 'relative', width: '100%', height: ALTO }}>
      {/* ── El núcleo: la foto y el aro del nivel ────────── */}
      <div
        style={{
          position: 'absolute', left: '50%', marginLeft: -NUCLEO / 2,
          top: CENTRO_Y - NUCLEO / 2, width: NUCLEO, height: NUCLEO,
        }}
      >
        {/* 6 px por dentro: es el hueco que deja respirar al aro. */}
        <div style={{ position: 'absolute', inset: 6 }}>
          {/* neutro: ver Avatar. Un disco verde aquí tapa el aro del nivel, que
              es del mismo verde y va dibujado justo encima. */}
          <Avatar nombre={nombre} foto={foto} size={NUCLEO - 12} neutro />
        </div>
        <svg viewBox="0 0 100 100" aria-hidden style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
          {/* La pista siempre, también el día uno: es lo que dice que hay un
              camino. Sin ella, un aro vacío parece una foto a la que le falta algo. */}
          <circle cx="50" cy="50" r="46.5" fill="none" stroke="rgba(245,245,242,.1)" strokeWidth="3" />
          {porcentajeNivel !== null && (
            <circle
              cx="50" cy="50" r="46.5" fill="none"
              stroke={MARCA.aurora} strokeWidth="3" strokeLinecap="round"
              strokeDasharray={ARO}
              strokeDashoffset={ARO * (1 - Math.max(0, Math.min(100, porcentajeNivel)) / 100)}
              // Para que el arco empiece arriba y no a las tres en punto.
              transform="rotate(-90 50 50)"
            />
          )}
        </svg>
      </div>

      {/* ── Las seis categorías ──────────────────────────── */}
      {burbujas.map(b => (
        <div
          key={b.categoria}
          style={{
            position: 'absolute',
            left: '50%', marginLeft: b.dx - b.diametro / 2,
            top: CENTRO_Y + b.dy - b.diametro / 2,
            width: b.diametro, height: b.diametro, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: letraDe(b.diametro),
            letterSpacing: '-.03em', lineHeight: 1,
            ...(b.gooals > 0
              // Llena del color de su categoría, con el número en el fondo de la
              // app: sobre estos seis colores, el texto oscuro es el que se lee.
              ? { background: CATEGORIA_COLOR[b.categoria], color: MARCA.obsidian, fontWeight: 700 }
              : b.interesa
                ? { border: `1.5px dashed ${conAlfa(MARCA.aurora, 0.5)}`, color: MARCA.aurora, fontWeight: 600 }
                : { border: `1.5px dashed ${conAlfa(MARCA.stone, 0.42)}`, color: MARCA.stone, fontWeight: 600 }),
          }}
        >
          {b.gooals > 0 ? b.gooals : b.interesa ? '+' : '0'}
          <span
            aria-hidden
            style={{
              position: 'absolute', left: '50%', transform: 'translateX(-50%)',
              // La de arriba lleva su nombre ENCIMA: debajo se le montaría con
              // el aro del nivel.
              ...(ANGULO[b.categoria] === -90
                ? { bottom: 'calc(100% + 5px)' }
                : { top: 'calc(100% + 5px)' }),
              fontSize: 9, fontWeight: 600, letterSpacing: '.05em', textIndent: '.05em',
              textTransform: 'uppercase', color: MARCA.stone, whiteSpace: 'nowrap',
            }}
          >
            {CATEGORIA_LABEL[b.categoria]}
          </span>
        </div>
      ))}
    </div>
  )
}

/** Un color de la paleta con transparencia, para no escribir rgba a mano. */
function conAlfa(hex: string, alfa: number) {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alfa})`
}
