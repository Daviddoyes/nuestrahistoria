import { esAdmin } from '@/lib/admin-auth'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { leerHistorial, recuentoGrupos } from '@/lib/comunicaciones'
import Comunicaciones from '@/components/admin/comunicaciones/Comunicaciones'

export const metadata = { title: 'Comunicaciones · GooALS Admin' }

/**
 * Tiempo máximo de las Server Actions de esta página (el envío va dentro). Con
 * lotes de 100 y 600 ms entre lotes, 300 s dan para decenas de miles de correos.
 * Si aun así se cortara, la campaña queda como parada y se reanuda sin repetir a nadie.
 */
export const maxDuration = 300

export default async function AdminComunicacionesPage() {
  // El layout decide qué se pinta, pero no protege la lectura: esto va antes de tocar la base.
  if (!await esAdmin()) return null

  const service = createServiceRoleClient()
  let datos
  try {
    const [historial, grupos] = await Promise.all([leerHistorial(service), recuentoGrupos(service)])
    datos = { historial, grupos }
  } catch (e) {
    console.error('[admin/comunicaciones]', e)
    const faltaTabla = e instanceof Error && /emails_campanas|campana_id/.test(e.message)
    return (
      <p role="alert" style={{ fontSize: 14, lineHeight: 1.6, color: '#FF5252', background: 'rgba(255,82,82,0.12)', borderRadius: 12, padding: '12px 14px' }}>
        {faltaTabla
          ? 'Falta la tabla de campañas en la base: pega supabase/fase3i.sql en el SQL Editor de Supabase y recarga.'
          : 'No se pudo cargar esta pestaña. Recarga la página para intentarlo de nuevo.'}
      </p>
    )
  }

  return <Comunicaciones historial={datos.historial} grupos={datos.grupos} configurado={Boolean(process.env.RESEND_API_KEY)} />
}
