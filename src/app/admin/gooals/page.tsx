import GooalsV2Section from '@/components/admin/GooalsV2Section'
import SugerenciasSection from '@/components/admin/SugerenciasSection'

export const metadata = { title: 'Gooals · GooALS Admin' }

/**
 * Pestaña Gooals: el catálogo y las sugerencias.
 *
 * No lee datos aquí: cada sección los pide a /api/admin/*, y esas rutas
 * comprueban esAdmin() en cada llamada.
 */
export default function AdminGooalsPage() {
  return (
    <>
      <GooalsV2Section />
      <div style={{ height: 1, background: '#2A2E2C', margin: '28px 0' }} />
      <SugerenciasSection />
    </>
  )
}
