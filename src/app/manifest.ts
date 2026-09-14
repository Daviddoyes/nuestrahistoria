import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'GooALS',
    short_name: 'GooALS',
    description: 'Convierte tus intenciones en recuerdos.',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0B0B0B',
    theme_color: '#00D1A7',
    // Generados con scripts/generar-iconos.mjs. En una carpeta y con nombre
    // nuevo a propósito: los móviles cachean el icono de una PWA instalada, y
    // con la misma URL podrían seguir enseñando el de la marca anterior.
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
