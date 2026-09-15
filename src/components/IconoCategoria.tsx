import { CATEGORIA_ICONO, TRAZO_ICONO_CATEGORIA, type CategoriaGooal } from '@/lib/gooals'

type Props = {
  categoria: CategoriaGooal
  /** Lado en píxeles. */
  tamano?: number
  /** Por defecto hereda el color del texto que lo rodea. */
  color?: string
}

/** El icono de una categoría, siempre con el mismo trazo. Decorativo: el nombre va al lado. */
export default function IconoCategoria({ categoria, tamano = 16, color = 'currentColor' }: Props) {
  const Icono = CATEGORIA_ICONO[categoria]
  return <Icono aria-hidden size={tamano} color={color} strokeWidth={TRAZO_ICONO_CATEGORIA} style={{ flexShrink: 0 }} />
}
