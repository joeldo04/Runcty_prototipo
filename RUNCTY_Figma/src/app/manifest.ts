import type { MetadataRoute } from 'next'

// PWA: se instala desde el navegador (Android e iPhone) y abre directo en la app móvil.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/movil',
    name: 'RUNCTY · Corre con información',
    short_name: 'RUNCTY',
    description: 'Rutas, comunidad y herramientas de seguridad para correr en Loja, Ecuador.',
    lang: 'es',
    start_url: '/movil',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#000000',
    theme_color: '#f3f6fa',
    categories: ['sports', 'health', 'navigation'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
