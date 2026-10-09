'use client'

import { Check } from 'lucide-react'
import { MARCA, SUPERFICIE, TEXTO } from '@/lib/estilo'
import type { UsuarioMini } from '@/types/gooals'

type Props = {
  usuario: UsuarioMini
  siguiendolo: boolean | null
  seguidores: number
  siguiendo: number
  siguiendoAccion: boolean
  onSeguir: () => void
  onLista: (tipo: 'seguidores' | 'siguiendo') => void
}

/**
 * La cabecera del perfil de OTRA persona: quién es y el botón de seguirla.
 *
 * ── SIN FOTO AQUÍ ─────────────────────────────────────────
 *
 * Su foto está diez píxeles más abajo, en el centro de su universo y con el aro
 * de su nivel alrededor. Repetirla arriba era decir dos veces lo mismo y
 * empujar el universo —que es lo que de verdad cuenta quién es— fuera de la
 * primera pantalla.
 *
 * ── Y LOS SEGUIDORES SE QUEDAN, PERO PEQUEÑOS ─────────────
 *
 * La tentación era quitarlos. Serían dos cifras compitiendo con el único botón
 * que importa aquí, que es Seguir.
 *
 * No se quitan, y la razón es la base de datos: hoy hay **cero** seguimientos,
 * así que estas dos listas son literalmente **la única forma que tiene alguien
 * de descubrir a otra persona dentro de la app**. Quitar la única puerta de
 * descubrimiento en una app que todavía no tiene red es empeorar justo el
 * problema más grande que tiene.
 *
 * Así que se quedan, pero debajo del nombre y en pequeño: el botón manda y los
 * números acompañan. Si algún día hay otra forma de encontrarse, se revisa —
 * y entonces la razón de arriba habrá caducado, que es como caducan estas.
 */
export default function CabeceraPerfil({
  usuario, siguiendolo, seguidores, siguiendo, siguiendoAccion, onSeguir, onLista,
}: Props) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, paddingTop: 2 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: TEXTO.tituloGrande, fontWeight: 600, color: MARCA.sand, lineHeight: 1.2,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {usuario.nombre}
        </p>
        <p style={{
          fontSize: TEXTO.pie, color: MARCA.stone, marginTop: 1,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          @{usuario.username ?? usuario.nombre}
        </p>

        {/* 44 px de alto aunque la letra sea pequeña: es la zona mínima para
            acertar con el dedo. El margen negativo evita que engorde la cabecera. */}
        <div style={{ display: 'flex', gap: 14, margin: '-8px 0 -12px' }}>
          {([['seguidores', seguidores], ['siguiendo', siguiendo]] as const).map(([tipo, cuantos]) => (
            <button
              key={tipo}
              onClick={() => onLista(tipo)}
              className="active:opacity-60 transition-opacity"
              style={{ fontSize: TEXTO.pie, color: MARCA.stone, minHeight: 44, padding: 0, whiteSpace: 'nowrap' }}
            >
              {/* "1 seguidores" se lee mal y con la base de hoy es el caso
                  normal. "siguiendo" no cambia, que es un gerundio. */}
              <span style={{ color: '#A3B1AC', fontWeight: 600 }}>{cuantos}</span>{' '}
              {tipo === 'seguidores' && cuantos === 1 ? 'seguidor' : tipo}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={onSeguir}
        disabled={siguiendoAccion}
        className="transition-colors disabled:opacity-60"
        style={{
          height: 36, padding: '0 18px', borderRadius: 999, flexShrink: 0, marginTop: 2,
          fontSize: TEXTO.cuerpo, fontWeight: 650, display: 'flex', alignItems: 'center', gap: 6,
          ...(siguiendolo
            ? { background: 'transparent', border: `1px solid ${SUPERFICIE.linea}`, color: MARCA.sand }
            : { background: 'transparent', border: '1px solid rgba(0, 209, 167, .45)', color: MARCA.aurora }),
        }}
      >
        {siguiendolo ? <><Check className="w-4 h-4" /> Siguiendo</> : 'Seguir'}
      </button>
    </div>
  )
}
