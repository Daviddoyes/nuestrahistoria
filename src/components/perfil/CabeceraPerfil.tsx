'use client'

import { Check, Settings } from 'lucide-react'
import Avatar from '@/components/Avatar'
import type { UsuarioMini } from '@/types/gooals'

type Props = {
  usuario: UsuarioMini
  esPropio: boolean
  siguiendolo: boolean | null
  seguidores: number
  siguiendo: number
  siguiendoAccion: boolean
  onSeguir: () => void
  onAjustes: () => void
  onLista: (tipo: 'seguidores' | 'siguiendo') => void
}

/** Avatar, nombre, @usuario y contadores; a la derecha, ajustes o "Seguir". */
export default function CabeceraPerfil({
  usuario, esPropio, siguiendolo, seguidores, siguiendo, siguiendoAccion, onSeguir, onAjustes, onLista,
}: Props) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, paddingTop: 4 }}>
      {/* El anillo va por fuera con box-shadow y no con el `borde` de Avatar:
          ese borde crece con el tamaño (a 76 px saldría de 3 px) y va por dentro. */}
      <div style={{ borderRadius: '50%', boxShadow: `0 0 0 2px ${esPropio ? '#00D1A7' : '#2A2E2C'}`, margin: 2, flexShrink: 0 }}>
        <Avatar nombre={usuario.nombre} foto={usuario.foto_perfil_url} size={76} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: 21, fontWeight: 700, color: '#FFFFFF', lineHeight: 1.2,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {usuario.nombre}
        </p>
        <p style={{ fontSize: 13, color: '#7A8A85', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          @{usuario.username ?? usuario.nombre}
        </p>
        {/* 44 px de alto aunque el texto sea pequeño: es la zona mínima para
            acertar con el dedo. El margen negativo evita que engorde la cabecera. */}
        <div style={{ display: 'flex', gap: 12, margin: '-6px 0 -10px' }}>
          {(['seguidores', 'siguiendo'] as const).map(tipo => (
            <button
              key={tipo}
              onClick={() => onLista(tipo)}
              className="active:opacity-60 transition-opacity"
              style={{ fontSize: 13, color: '#A3B1AC', minHeight: 44, padding: 0 }}
            >
              <span style={{ color: '#FFFFFF', fontWeight: 700 }}>{tipo === 'seguidores' ? seguidores : siguiendo}</span> {tipo}
            </button>
          ))}
        </div>
      </div>

      {esPropio ? (
        <button
          onClick={onAjustes}
          aria-label="Ajustes"
          className="active:bg-[#1E2120] transition-colors"
          style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0, color: '#A3B1AC',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Settings className="w-5 h-5" />
        </button>
      ) : (
        <button
          onClick={onSeguir}
          disabled={siguiendoAccion}
          className="transition-colors disabled:opacity-60"
          style={{
            height: 44, padding: '0 16px', borderRadius: 12, flexShrink: 0,
            fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6,
            ...(siguiendolo
              ? { background: 'transparent', border: '1px solid #2A2E2C', color: '#FFFFFF' }
              : { background: '#00D1A7', border: '1px solid #00D1A7', color: '#0B0B0B' }),
          }}
        >
          {siguiendolo ? <><Check className="w-4 h-4" /> Siguiendo</> : 'Seguir'}
        </button>
      )}
    </div>
  )
}
