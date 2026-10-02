import type { Metadata } from 'next'
import DownloadLanding from '@/components/DownloadLanding'

const TITLE = 'Instala gooals'
// Es lo que se ve en la tarjeta del enlace al compartirlo, así que dice lo que
// la app hace hoy, igual que la propia página.
const DESCRIPTION = 'Elige retos de verdad, consiéguelos y demuéstralo con una foto.'

// Esta URL se comparte desde la bio de Instagram y desde Stories, así que la
// tarjeta del enlace es la primera impresión: sin Open Graph, Instagram pinta
// un recuadro gris.
export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: 'gooals — Convierte tus intenciones en recuerdos.',
    description: DESCRIPTION,
    url: 'https://gooals.app/download',
    siteName: 'gooals',
    locale: 'es_ES',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'gooals — Convierte tus intenciones en recuerdos.',
    description: DESCRIPTION,
  },
  alternates: {
    canonical: 'https://gooals.app/download',
  },
}

export default function DownloadPage() {
  return <DownloadLanding />
}
