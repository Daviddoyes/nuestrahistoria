import type { Metadata } from 'next'
import DownloadLanding from '@/components/DownloadLanding'

const TITLE = 'Instala GooALS'
const DESCRIPTION = 'Crea tu bucket list, vívela y compártela.'

// Esta URL se comparte desde la bio de Instagram y desde Stories, así que la
// tarjeta del enlace es la primera impresión: sin Open Graph, Instagram pinta
// un recuadro gris.
export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: 'GooALS — Convierte tus intenciones en recuerdos.',
    description: DESCRIPTION,
    url: 'https://gooals.app/download',
    siteName: 'GooALS',
    locale: 'es_ES',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GooALS — Convierte tus intenciones en recuerdos.',
    description: DESCRIPTION,
  },
  alternates: {
    canonical: 'https://gooals.app/download',
  },
}

export default function DownloadPage() {
  return <DownloadLanding />
}
