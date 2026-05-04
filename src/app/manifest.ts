import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Nuestros Planes',
    short_name: 'Planes',
    description: 'Nuestros Planes',
    start_url: '/planes',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#3D5A4C',
    theme_color: '#3D5A4C',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
